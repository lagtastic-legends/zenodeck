"use client";

/**
 * useMediaJob — declarative multi-pass ffmpeg job runner.
 *
 * A job = inputs to write → sequential exec passes → outputs to read →
 * virtual files to clean up. The hook exposes live phase, overall progress
 * (pass index + engine ratio), elapsed time, and resulting blob URLs.
 *
 * Every tool in the suite (converter, compressor, mute, GIF, future audio
 * suite) drives the engine exclusively through this hook.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useUIAudio } from "@/hooks/useUIAudio";
import { clamp } from "@/lib/format";
import { acquireWakeLock, releaseWakeLock } from "@/lib/wake-lock";
import { notifyJobSuccess, notifyJobError } from "@/lib/notifications";

export type JobPhase = "idle" | "writing" | "processing" | "reading" | "done" | "error";

export interface JobPass {
  /** Full argv array (without the implicit -y). */
  exec: string[];
  /** Short label shown while this pass runs, e.g. "Generating palette". */
  label?: string;
}

export interface JobInputFile {
  file: File | Blob;
  /** Custom virtual filename (default: file.name or "input.bin") */
  name?: string;
  /** Virtual mount point (default: "/mnt_0") */
  mountPoint?: string;
}

export interface JobSpec {
  write?: { path: string; data: Uint8Array }[];
  /** Zero-copy streaming input files mounted directly via WORKERFS */
  inputFiles?: JobInputFile[];
  passes: JobPass[];
  read: { path: string; mime: string; name: string }[];
  /** Virtual paths to unlink at the end (best-effort). */
  cleanup?: string[];
}

export interface JobOutput {
  name: string;
  blob: Blob;
  url: string;
  size: number;
  mime: string;
}

export function useMediaJob() {
  const { engine } = useFFmpegEngine();

  const [phase, setPhase] = useState<JobPhase>("idle");
  const [progress, setProgress] = useState(0); // overall 0..1
  const [passIndex, setPassIndex] = useState(0);
  const [passCount, setPassCount] = useState(0);
  const [passLabel, setPassLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<JobOutput[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);

  const busy = phase === "writing" || phase === "processing" || phase === "reading";
  const busyRef = useRef(false);
  const urlsRef = useRef<string[]>([]);
  const allocatedFilesRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { playSuccess, playError } = useUIAudio();
  const playSuccessRef = useRef(playSuccess);
  const playErrorRef = useRef(playError);

  useEffect(() => {
    playSuccessRef.current = playSuccess;
    playErrorRef.current = playError;
  }, [playSuccess, playError]);

  /* Revoke dangling blob URLs and clean orphaned virtual FS files on unmount. */
  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
      if (timerRef.current) clearInterval(timerRef.current);
      if (engine && allocatedFilesRef.current.size > 0) {
        allocatedFilesRef.current.forEach((filePath) => {
          try {
            void engine.deleteFile(filePath);
          } catch {
            /* virtual file already unlinked */
          }
        });
        allocatedFilesRef.current.clear();
      }
    };
  }, [engine]);

  const releaseOutputs = useCallback(() => {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlsRef.current = [];
    setOutputs([]);
  }, []);

  /* Register hierarchical navigation guards for active jobs & multi-step results */
  useEffect(() => {
    if (busy) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message:
          "A media processing job is actively running in WebAssembly. Leaving now will cancel the process. Are you sure you want to go back?",
      }));
    }
  }, [busy]);

  useEffect(() => {
    if (outputs.length > 0) {
      return useNavStore.getState().registerStepHandler(() => {
        releaseOutputs();
        return true;
      });
    }
  }, [outputs.length, releaseOutputs]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (startedAtRef.current !== null) {
      setElapsedMs(Date.now() - startedAtRef.current);
      startedAtRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    releaseOutputs();
    setPhase("idle");
    setProgress(0);
    setPassIndex(0);
    setPassCount(0);
    setPassLabel(null);
    setError(null);
    setElapsedMs(0);
  }, [releaseOutputs, stopTimer]);

  /* ---------------------------------------------------------------------- */
  /* run                                                                      */
  /* ---------------------------------------------------------------------- */
  const run = useCallback(
    async (spec: JobSpec) => {
      if (!engine) {
        setError("Engine is not online. Initialize it from the dashboard first.");
        setPhase("error");
        return;
      }
      if (busyRef.current) return;

      busyRef.current = true;
      await acquireWakeLock();
      releaseOutputs();
      setError(null);
      setProgress(0);
      setPassIndex(0);
      setPassCount(spec.passes.length);
      setElapsedMs(0);
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      timerRef.current = setInterval(() => {
        if (startedAtRef.current !== null) {
          setElapsedMs(Date.now() - startedAtRef.current);
        }
      }, 150);

      /* Per-job progress listener (engine ratio is per-pass). */
      const totalPasses = Math.max(spec.passes.length, 1);
      const currentPassRef = { current: 0 };
      const handler = ({ progress: p }: { progress: number; time: number }) => {
        const ratio = clamp(Number.isFinite(p) ? p : 0, 0, 1);
        setProgress((currentPassRef.current + ratio) / totalPasses);
      };
      engine.on("progress", handler);

      const capturedLogs: string[] = [];
      const logHandler = ({ message }: { type?: string; message: string }) => {
        if (message) capturedLogs.push(message);
      };
      const mountedDirs: string[] = [];

      try {
        /* 1 — stage inputs: zero-copy WORKERFS mounting for large files ------ */
        setPhase("writing");

        if (spec.inputFiles && spec.inputFiles.length > 0) {
          for (let i = 0; i < spec.inputFiles.length; i++) {
            const item = spec.inputFiles[i];
            const mountDir = item.mountPoint || `/mnt_${i}`;
            const virtualName =
              item.name || (item.file instanceof File ? item.file.name : `input_${i}.bin`);
            try {
              // Zero-copy WORKERFS mount — streams directly from disk via FileReaderSync!
              await engine.mount(
                "WORKERFS" as any,
                {
                  blobs: [{ name: virtualName, data: item.file }],
                } as any,
                mountDir as any,
              );
              mountedDirs.push(mountDir);
            } catch (mountErr) {
              // If WORKERFS mount is not supported on this platform/browser
              // and the file is reasonably sized (< 350 MB), fall back to memory write
              if (item.file.size < 350 * 1024 * 1024) {
                const targetPath = `${mountDir}/${virtualName}`;
                const buf = new Uint8Array(await item.file.arrayBuffer());
                await engine.writeFile(targetPath, buf);
                allocatedFilesRef.current.add(targetPath);
              } else {
                throw new Error(
                  `Unable to stream ${(item.file.size / (1024 * 1024 * 1024)).toFixed(1)} GB file into WebAssembly: ${mountErr instanceof Error ? mountErr.message : String(mountErr)}. Try closing other open tabs or apps.`,
                );
              }
            }
          }
        }

        if (spec.write) {
          for (const w of spec.write) {
            allocatedFilesRef.current.add(w.path);
            await engine.writeFile(w.path, w.data);
          }
        }

        /* 2 — sequential exec passes -------------------------------------- */
        setPhase("processing");
        for (let i = 0; i < spec.passes.length; i++) {
          currentPassRef.current = i;
          setPassIndex(i);
          setPassLabel(spec.passes[i].label ?? null);
          setProgress(i / totalPasses);
          const ret = await engine.exec(["-y", ...spec.passes[i].exec]);
          if (ret !== 0) {
            const isSilentStream = capturedLogs.some((l) =>
              /does not contain any stream|Output file #\d+ does not contain any stream|matches no streams|Cannot find a matching stream|filter.*matching stream was not found|Stream map '0:a'/i.test(l),
            );
            if (isSilentStream) {
              throw new Error(
                "Source video contains no audio track. Audio extraction cannot produce an audio file from a silent or video-only video.",
              );
            }
            const isCorruptOrTruncated = capturedLogs.some((l) =>
              /moov atom not found|Invalid data found when processing input|EBML header parsing failed|unexpected end of file|error reading header|End of file/i.test(l),
            );
            if (isCorruptOrTruncated) {
              throw new Error(
                "The source video file is incomplete or corrupted (e.g. truncated download). Please re-download the complete video before converting.",
              );
            }
            const isOOM = capturedLogs.some((l) =>
              /no space left on device|out of memory/i.test(l),
            );
            if (isOOM) {
              throw new Error(
                "WebAssembly memory limit reached while encoding output. For massive files (up to 20 GB), extracting audio or using a compact quality preset is recommended.",
              );
            }
            throw new Error(
              `FFmpeg exited with code ${ret} while ${spec.passes[i].label ?? "processing"}. Check the engine log for the failing command.`,
            );
          }
        }
        setProgress(1);

        /* 3 — read outputs back out --------------------------------------- */
        setPhase("reading");
        const collected: JobOutput[] = [];
        for (const r of spec.read) {
          allocatedFilesRef.current.add(r.path);
          const data = await engine.readFile(r.path, "binary");
          // Immediately delete file from WASM memory to free heap
          try {
            await engine.deleteFile(r.path);
            allocatedFilesRef.current.delete(r.path);
          } catch {}
          if (!(data instanceof Uint8Array) || data.byteLength === 0) {
            throw new Error(`Output "${r.name}" came back empty — conversion failed.`);
          }
          const blob = new Blob([data as unknown as BlobPart], { type: r.mime });
          const url = URL.createObjectURL(blob);
          urlsRef.current.push(url);
          collected.push({
            name: r.name,
            blob,
            url,
            size: blob.size,
            mime: r.mime,
          });
        }

        setOutputs(collected);
        setPhase("done");
        playSuccessRef.current();

        const firstName = collected[0]?.name || "Media File";
        const totalSizeStr = collected.reduce((acc, c) => acc + c.size, 0);
        void notifyJobSuccess(
          "Media Processing Complete",
          `Generated "${firstName}" (${(totalSizeStr / (1024 * 1024)).toFixed(1)} MB). Tap to view and save.`,
          { filename: firstName }
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err ?? "unknown job failure");
        setError(message);
        setPhase("error");
        playErrorRef.current();
        void notifyJobError("Processing Failed", message);
      } finally {
        engine.off("progress", handler);
        engine.off("log", logHandler);

        // Unmount zero-copy filesystems
        for (const dir of mountedDirs) {
          try {
            await engine.unmount(dir as any);
          } catch {}
          try {
            await engine.deleteDir(dir);
          } catch {}
        }

        /* 4 — aggressive virtual FS cleanup (prevent memory leaks) -------- */
        const filesToClean = new Set<string>([
          ...(spec.write ? spec.write.map((w) => w.path) : []),
          ...spec.read.map((r) => r.path),
          ...(spec.cleanup ?? []),
        ]);
        for (const p of filesToClean) {
          try {
            await engine.deleteFile(p);
            allocatedFilesRef.current.delete(p);
          } catch {
            /* virtual file already deleted or never created */
          }
        }
        stopTimer();
        busyRef.current = false;
        await releaseWakeLock();
      }
    },
    [engine, releaseOutputs, stopTimer],
  );

  return {
    phase,
    busy,
    progress,
    passIndex,
    passCount,
    passLabel,
    error,
    outputs,
    elapsedMs,
    run,
    reset,
  };
}
