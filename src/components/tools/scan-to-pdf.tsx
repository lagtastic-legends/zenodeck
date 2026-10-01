"use client";

/**
 * SCAN → PDF — accepts scanned pages from two sources: live camera capture
 * (getUserMedia snapshot → JPEG page) or classic file upload. Optional
 * pixel-level contrast/brightness enhancement before compiling.
 */

import { motion } from "framer-motion";
import { Camera, CameraOff, ScanLine, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImageQueue, type QueuedImage } from "@/components/documents/image-queue";
import { PageOptions } from "@/components/documents/page-options";
import { ParamPanel, ParamToggle } from "@/components/audio/param-controls";
import { OutputCard } from "@/components/media/output-card";
import { useToast } from "@/hooks/use-toast";
import { useNavStore } from "@/lib/navigation/nav-store";
import type { JobOutput } from "@/hooks/use-media-job";
import { Capacitor } from "@capacitor/core";
import { ensureCameraPermission, openAppSettings } from "@/lib/permissions";
import {
  buildImagePdf,
  buildPdfOutput,
  enhanceImage,
  type Margin,
  type PageSize,
} from "@/lib/documents/pdf";

type Status = "idle" | "working" | "done" | "error";
type CameraState = "off" | "starting" | "live" | "denied";

let uid = 0;

export function ScanToPdf() {
  const { toast } = useToast();
  const [pages, setPages] = useState<QueuedImage[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<Margin>("edge");
  const [enhance, setEnhance] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<JobOutput | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [camera, setCamera] = useState<CameraState>("off");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pagesRef = useRef(pages);
  const outputRef = useRef(output);

  useEffect(() => {
    pagesRef.current = pages;
    outputRef.current = output;
  }, [pages, output]);

  const busy = status === "working";

  const reset = () => {
    if (output) URL.revokeObjectURL(output.url);
    setOutput(null);
    setStatus("idle");
    setPageCount(0);
    setError(null);
  };

  /* Camera lifecycle ------------------------------------------------------ */
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* Step back: Close camera if live before leaving */
  useEffect(() => {
    if (camera === "live") {
      return useNavStore.getState().registerStepHandler(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCamera("off");
        return true;
      });
    }
  }, [camera]);

  /* Guard scanned pages and active compilation */
  useEffect(() => {
    if (busy) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: "PDF compilation is in progress. Leaving now will cancel it. Are you sure you want to go back?",
      }));
    }
    if (pages.length > 0 && !output) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: `You have ${pages.length} scanned page${pages.length > 1 ? "s" : ""}. Going back will discard your document. Are you sure?`,
      }));
    }
  }, [busy, pages.length, output]);

  const startCamera = async () => {
    setCamera("starting");
    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        setCamera("denied");
        toast({
          title: "Camera permission required",
          description: "Please grant camera permission to scan documents.",
          variant: "destructive",
        });
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamera("live");
    } catch {
      setCamera("denied");
      toast({
        title: "Camera unavailable",
        description: "Permission denied or no camera — upload pages instead.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera("off");
  };

  const capturePage = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.92),
    );
    if (!blob) return;
    const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
    addFiles([new File([blob], `scan-${stamp}.jpg`, { type: "image/jpeg" })]);
  };

  /* Queue management ------------------------------------------------------- */
  useEffect(() => {
    return () => {
      pagesRef.current.forEach((p) => {
        try { URL.revokeObjectURL(p.previewUrl); } catch {}
      });
      if (outputRef.current) {
        try { URL.revokeObjectURL(outputRef.current.url); } catch {}
      }
    };
  }, []);  

  const addFiles = async (files: File[]) => {
    const prepared = enhance
      ? await Promise.all(files.map((f) => enhanceImage(f)))
      : files;
    setPages((prev) => [
      ...prev,
      ...prepared.map((file) => ({
        id: `scan-${++uid}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removePage = (id: string) => {
    setPages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const movePage = (id: string, dir: -1 | 1) => {
    setPages((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const compile = async () => {
    if (pages.length === 0) return;
    setStatus("working");
    setError(null);
    try {
      const staged: { file: File; bitmap: ImageBitmap }[] = [];
      for (const p of pages) {
        staged.push({ file: p.file, bitmap: await createImageBitmap(p.file) });
      }
      const { blob, pageCount: n } = await buildImagePdf(staged, { pageSize, margin });
      staged.forEach((s) => s.bitmap.close());
      if (output) URL.revokeObjectURL(output.url);
      setOutput(buildPdfOutput("omni-scan.pdf", blob));
      setPageCount(n);
      setStatus("done");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "compile failed");
      setError(message);
      setStatus("error");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* ------------------------------------------------------- input column */}
      <div className="space-y-5">
        {/* camera capture surface */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-neon/90">
              <Camera className="size-3.5" />
              capture station
            </p>
            {camera === "live" ? (
              <button
                onClick={stopCamera}
                className="flex min-h-9 items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/10 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300 hover:bg-red-500/20"
              >
                <CameraOff className="size-3.5" />
                stop
              </button>
            ) : (
              <button
                onClick={() => void startCamera()}
                disabled={busy || camera === "starting"}
                className="flex min-h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-primary hover:bg-primary/20 disabled:opacity-50"
              >
                <Camera className="size-3.5" />
                {camera === "starting" ? "starting…" : "start camera"}
              </button>
            )}
          </div>

          <div className="relative overflow-hidden rounded-lg border border-border/50 bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`aspect-video w-full object-cover ${camera === "live" ? "" : "hidden"}`}
              aria-label="Camera preview"
            />
            {camera !== "live" && (
              <div className="grid aspect-video w-full place-items-center p-4">
                <div className="flex flex-col items-center gap-2 max-w-64 text-center">
                  <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {camera === "denied"
                      ? "Camera blocked. Grant permission to capture documents with your camera."
                      : camera === "starting"
                        ? "Requesting camera…"
                        : "Camera off · Start it or upload scans below"}
                  </p>
                  {camera === "denied" && Capacitor.isNativePlatform() && (
                    <button
                      type="button"
                      onClick={() => void openAppSettings()}
                      className="rounded-lg border border-primary/40 bg-primary/20 px-3 py-1 font-mono text-[10px] uppercase font-bold tracking-wider text-primary hover:bg-primary/30 cursor-pointer"
                    >
                      Open Settings
                    </button>
                  )}
                </div>
              </div>
            )}
            {camera === "live" && (
              <>
                {/* framing corners */}
                <div aria-hidden className="pointer-events-none absolute inset-4">
                  <span className="absolute left-0 top-0 size-5 border-l-2 border-t-2 border-neon/70" />
                  <span className="absolute right-0 top-0 size-5 border-r-2 border-t-2 border-neon/70" />
                  <span className="absolute bottom-0 left-0 size-5 border-b-2 border-l-2 border-neon/70" />
                  <span className="absolute bottom-0 right-0 size-5 border-b-2 border-r-2 border-neon/70" />
                </div>
                <button
                  onClick={() => void capturePage()}
                  className="absolute bottom-3 left-1/2 flex min-h-10 -translate-x-1/2 items-center gap-2 rounded-full border border-neon/50 bg-background/70 px-5 font-mono text-[10px] uppercase tracking-[0.18em] text-neon backdrop-blur hover:bg-background/90"
                >
                  <ScanLine className="size-3.5" />
                  capture page
                </button>
              </>
            )}
          </div>
        </div>

        <ImageQueue
          images={pages}
          onAdd={(fs) => void addFiles(fs)}
          onRemove={removePage}
          onMove={movePage}
          disabled={busy}
          label="Drop scanned pages"
        />

        <ParamPanel title="scan processing">
          <ParamToggle
            label="Enhance pages"
            checked={enhance}
            onChange={setEnhance}
            disabled={busy}
            hint="pixel-level contrast ×1.18 + brightness lift for legible scans"
          />
          <PageOptions
            pageSize={pageSize}
            onPageSize={setPageSize}
            margin={margin}
            onMargin={setMargin}
            disabled={busy}
          />
        </ParamPanel>

        <motion.button
          onClick={() => void compile()}
          disabled={pages.length === 0 || busy}
          whileHover={pages.length === 0 || busy ? undefined : { scale: 1.02 }}
          whileTap={pages.length === 0 || busy ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <Wand2 className="size-4" />
          {busy ? "COMPILING…" : `COMPILE SCAN → ${pages.length || ""} PAGE PDF`}
        </motion.button>
      </div>

      {/* ------------------------------------------------------ output column */}
      <div className="space-y-4">
        {status === "working" && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 font-mono text-[11px] text-primary">
            enhancing · embedding pages · building document…
          </div>
        )}
        {status === "error" && error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-300" role="alert">
            {error}
          </p>
        )}
        {output && (
          <OutputCard
            output={output}
            onClear={reset}
            badge={`${pageCount} scanned page${pageCount === 1 ? "" : "s"}`}
            badgeTone="neon"
            extra={
              <object
                data={output.url}
                type="application/pdf"
                aria-label="PDF preview"
                className="h-64 w-full rounded-lg border border-border/50 bg-white"
              >
                <p className="p-3 font-mono text-[10px] text-muted-foreground">
                  inline preview unavailable — use the save button
                </p>
              </object>
            }
          />
        )}
        {!output && status === "idle" && (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60">
            <p className="font-mono text-[11px] text-muted-foreground/70">
              output lands here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
