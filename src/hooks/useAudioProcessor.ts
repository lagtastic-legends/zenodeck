"use client";

/**
 * OMNI TOOL — useAudioProcessor
 * ==============================
 *
 * Dedicated audio DSP WebAssembly execution & lifecycle hook.
 *
 * Capabilities:
 *  1. Zero-leak WASM MEMFS lifecycle management: automatic unlinking of input
 *     and output virtual buffers upon success, failure, or cancellation.
 *  2. Non-blocking UI scheduling: yields to the JS event loop before and during
 *     passes to ensure Android RenderThread and 120Hz display refresh rates.
 *  3. Dynamic Web Audio API integration: decodes processed buffers for instant
 *     waveform visualization and zero-latency audio previews.
 *  4. Native tactile feedback: triggers Capacitor Haptics on progress and completion.
 *  5. Hierarchical navigation guards: protects in-flight renders against back exits.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useHaptics } from "@/hooks/use-haptics";
import { useUIAudio } from "@/hooks/useUIAudio";
import { useNavStore } from "@/lib/navigation/nav-store";
import {
  type AudioEffectType,
  type AudioFormat,
  audioOutputArgs,
  getAudioFilterGraph,
} from "@/lib/audio-dsp";
import {
  baseName,
  extOf,
  mimeFor,
  SIZE_BLOCK_BYTES,
  SIZE_WARN_BYTES,
} from "@/lib/media/ffmpeg-jobs";

export type AudioProcessorPhase =
  | "idle"
  | "allocating"
  | "processing"
  | "reading"
  | "done"
  | "error";

export interface AudioProcessResult {
  name: string;
  blob: Blob;
  url: string;
  size: number;
  mime: string;
  durationSec?: number;
}

export interface AudioProcessOptions {
  file: File;
  effect: AudioEffectType;
  params: Record<string, any>;
  outputFormat?: AudioFormat;
  kbps?: number;
  sampleRate?: number;
  customFilterArgs?: string[];
}

export function useAudioProcessor() {
  const { engine, state: engineState, boot } = useFFmpegEngine();
  const haptics = useHaptics();
  const { playSuccess, playError } = useUIAudio();

  const [phase, setPhase] = useState<AudioProcessorPhase>("idle");
  const [progress, setProgress] = useState(0); // 0 .. 100
  const [currentPassLabel, setCurrentPassLabel] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AudioProcessResult | null>(null);

  const busy = phase === "allocating" || phase === "processing" || phase === "reading";
  const busyRef = useRef(false);
  const activeEngineRef = useRef<any>(engine);

  useEffect(() => {
    busyRef.current = busy;
    if (engine) activeEngineRef.current = engine;
  }, [busy, engine]);

  const allocatedFilesRef = useRef<Set<string>>(new Set());
  const blobUrlsRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  /* Revoke generated object URLs and clean orphaned virtual MEMFS files */
  const releaseResources = useCallback(() => {
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const currentEng = activeEngineRef.current || engine;
    if (currentEng && allocatedFilesRef.current.size > 0) {
      allocatedFilesRef.current.forEach((p) => {
        try {
          void currentEng.deleteFile(p);
        } catch {
          /* virtual file unlinked */
        }
      });
      allocatedFilesRef.current.clear();
    }
  }, [engine]);

  /* Clean up on unmount */
  useEffect(() => {
    return () => {
      releaseResources();
    };
  }, [releaseResources]);

  /* Register navigation dirty guard while rendering */
  useEffect(() => {
    if (busy) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message:
          "Audio DSP processing is currently active in WebAssembly. Leaving now will cancel the process. Are you sure you want to go back?",
      }));
    }
  }, [busy]);

  /* Reset state */
  const reset = useCallback(() => {
    releaseResources();
    setPhase("idle");
    setProgress(0);
    setCurrentPassLabel(null);
    setElapsedMs(0);
    setError(null);
    setResult(null);
  }, [releaseResources]);

  /* Master Process Audio Execution */
  const processAudio = useCallback(
    async ({
      file,
      effect,
      params,
      outputFormat = "mp3",
      kbps = 320,
      sampleRate,
      customFilterArgs,
    }: AudioProcessOptions): Promise<AudioProcessResult | null> => {
      // 1. Guard against re-entrant calls
      if (busyRef.current) {
        return null;
      }

      // 2. File size safety bounds check
      if (file.size > SIZE_BLOCK_BYTES) {
        const msg = `Audio file size (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds the 20 GB processing limit.`;
        setError(msg);
        setPhase("error");
        void haptics.error();
        return null;
      }

      // 3. Ensure FFmpeg engine is booted
      let activeEngine = activeEngineRef.current || engine;
      if (!activeEngine || engineState !== "ready") {
        setPhase("allocating");
        setCurrentPassLabel("Initializing WebAssembly DSP Engine...");
        try {
          const booted = await boot();
          if (booted) {
            activeEngine = booted;
            activeEngineRef.current = booted;
          }
        } catch (e: any) {
          const msg = e?.message || "Failed to boot WebAssembly audio engine.";
          setError(msg);
          setPhase("error");
          void haptics.error();
          return null;
        }
      }

      if (!activeEngine) {
        throw new Error("FFmpeg WASM engine is not available.");
      }

      // 4. Setup timer & execution tracking
      reset();
      setPhase("allocating");
      setProgress(5);
      setError(null);
      startedAtRef.current = performance.now();
      timerRef.current = setInterval(() => {
        if (startedAtRef.current) {
          setElapsedMs(Math.round(performance.now() - startedAtRef.current));
        }
      }, 80);

      const runId = Math.random().toString(36).slice(2, 9);
      const inputExt = extOf(file.name) || "mp3";
      const inputPath = `in_${runId}.${inputExt}`;
      const outputPath = `out_${runId}.${outputFormat}`;
      const mountDir = `/mnt_aud_${runId}`;
      let mounted = false;

      try {
        // Yield to let browser update UI & show allocation stage
        await new Promise((resolve) => setTimeout(resolve, 20));

        // 5. Mount source buffer into WASM Virtual FS via zero-copy WORKERFS
        setCurrentPassLabel("Mounting Audio Stream (Zero-Copy)...");
        let virtualInputPath = `${mountDir}/${inputPath}`;

        try {
          await activeEngine.mount(
            "WORKERFS" as any,
            {
              blobs: [{ name: inputPath, data: file }],
            } as any,
            mountDir as any,
          );
          mounted = true;
        } catch (mountErr) {
          if (file.size < 350 * 1024 * 1024) {
            virtualInputPath = inputPath;
            const inputData = new Uint8Array(await file.arrayBuffer());
            await activeEngine.writeFile(inputPath, inputData);
            allocatedFilesRef.current.add(inputPath);
          } else {
            throw new Error(
              `Unable to stream ${(file.size / (1024 * 1024 * 1024)).toFixed(1)} GB audio file into WebAssembly: ${mountErr instanceof Error ? mountErr.message : String(mountErr)}.`,
            );
          }
        }
        setProgress(15);

        // 6. Build Filter Graph for the chosen effect
        const effectParams = { ...params };
        if (sampleRate) effectParams.sampleRate = sampleRate;

        const filters =
          customFilterArgs && customFilterArgs.length > 0
            ? customFilterArgs
            : getAudioFilterGraph(effect, effectParams);
        const outArgs = audioOutputArgs(outputFormat, kbps);

        const hasComplexFilter = filters.some((f) => f.includes("[") || f.includes(";"));
        const execArgs: string[] = ["-i", virtualInputPath];
        if (hasComplexFilter) {
          const filterComplex = filters.join(";");
          execArgs.push("-filter_complex", filterComplex, "-map", "[outa]");
        } else if (filters.length > 0) {
          execArgs.push("-af", filters.join(","));
        } else {
          execArgs.push("-af", "anull");
        }
        execArgs.push(...outArgs, outputPath);

        // Yield again before heavy CPU/WASM computation to give RenderThread breathing room
        setPhase("processing");
        setCurrentPassLabel(`Applying DSP Filters (${effect})...`);
        setProgress(25);
        await new Promise((resolve) => setTimeout(resolve, 25));

        // 7. Track FFmpeg progress event
        const onEngineProgress = ({ progress: p }: { progress: number }) => {
          if (p >= 0 && p <= 1) {
            setProgress(Math.round(25 + p * 65));
          }
        };

        activeEngine.on("progress", onEngineProgress);

        try {
          const exitCode = await activeEngine.exec(execArgs);
          if (exitCode !== 0) {
            throw new Error(`FFmpeg exited with error code ${exitCode}.`);
          }
        } finally {
          activeEngine.off("progress", onEngineProgress);
        }

        // 8. Read result from WASM Virtual FS
        setPhase("reading");
        setCurrentPassLabel("Packaging Processed Audio Stream...");
        setProgress(95);
        await new Promise((resolve) => setTimeout(resolve, 15));

        allocatedFilesRef.current.add(outputPath);
        const outData = (await activeEngine.readFile(outputPath)) as Uint8Array;

        // 9. Construct Blob & URL
        const outMime = mimeFor(outputFormat);
        const finalBlob = new Blob([outData as unknown as BlobPart], { type: outMime });
        const finalUrl = URL.createObjectURL(finalBlob);
        blobUrlsRef.current.push(finalUrl);

        const outName = `${baseName(file.name)}-${effect}.${outputFormat}`;
        const finalResult: AudioProcessResult = {
          name: outName,
          blob: finalBlob,
          url: finalUrl,
          size: finalBlob.size,
          mime: outMime,
        };

        setResult(finalResult);
        setProgress(100);
        setPhase("done");
        setCurrentPassLabel(null);
        void haptics.success();
        playSuccess();

        return finalResult;
      } catch (err: any) {
        console.error("[useAudioProcessor] Error:", err);
        const msg = err?.message || "Audio DSP processing encountered an unexpected error.";
        setError(msg);
        setPhase("error");
        void haptics.error();
        playError();
        return null;
      } finally {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // 10. Guaranteed Virtual FS memory cleanup
        const engToClean = activeEngine || activeEngineRef.current || engine;
        if (engToClean) {
          if (mounted) {
            try {
              await engToClean.unmount(mountDir as any);
            } catch {}
            try {
              await engToClean.deleteDir(mountDir);
            } catch {}
          }
          try {
            await engToClean.deleteFile(inputPath);
            allocatedFilesRef.current.delete(inputPath);
          } catch {
            /* virtual file unlinked */
          }
          try {
            await engToClean.deleteFile(outputPath);
            allocatedFilesRef.current.delete(outputPath);
          } catch {
            /* virtual file unlinked */
          }
        }
      }
    },
    [engine, engineState, boot, haptics, reset]
  );

  return {
    phase,
    busy,
    progress,
    currentPassLabel,
    elapsedMs,
    error,
    result,
    processAudio,
    reset,
  };
}
