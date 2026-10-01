"use client";

/**
 * IMAGE → PDF — compile a queue of images into a single PDF, one page per
 * image, with page-size and margin control.
 */

import { motion } from "framer-motion";
import { FileImage } from "lucide-react";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { ImageQueue, type QueuedImage } from "@/components/documents/image-queue";
import { PdfVisualDeck } from "@/components/tools/pdf-visual-deck";
import { PageOptions } from "@/components/documents/page-options";
import { ParamPanel } from "@/components/audio/param-controls";
import { OutputCard } from "@/components/media/output-card";
import { useToast } from "@/hooks/use-toast";
import { useNavStore } from "@/lib/navigation/nav-store";
import type { JobOutput } from "@/hooks/use-media-job";
import { formatBytes } from "@/lib/format";
import {
  buildImagePdf,
  buildPdfOutput,
  type Margin,
  type PageSize,
} from "@/lib/documents/pdf";

type Status = "idle" | "working" | "done" | "error";

let uid = 0;

export function ImageToPdf() {
  const { toast } = useToast();
  const [images, setImages] = useState<QueuedImage[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<Margin>("normal");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<JobOutput | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const busy = status === "working";

  /* Real-time queued size tally */
  const totalSizeBytes = useMemo(
    () => images.reduce((acc, img) => acc + img.file.size, 0),
    [images]
  );

  /* Revoke dangling preview URLs & output URL */
  const imagesRef = useRef(images);
  const outputRef = useRef(output);

  useEffect(() => {
    imagesRef.current = images;
    outputRef.current = output;
  }, [images, output]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((i) => {
        try { URL.revokeObjectURL(i.previewUrl); } catch {}
      });
      if (outputRef.current) {
        try { URL.revokeObjectURL(outputRef.current.url); } catch {}
      }
    };
  }, []);  

  /* Guard queued images and active compilation */
  useEffect(() => {
    if (busy) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: "PDF compilation is in progress. Leaving now will cancel it. Are you sure you want to go back?",
      }));
    }
    if (images.length > 0 && !output) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: `You have ${images.length} image${images.length > 1 ? "s" : ""} queued for PDF compilation. Going back will discard them. Are you sure?`,
      }));
    }
  }, [busy, images.length, output]);

  const reset = useCallback(() => {
    setOutput((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setStatus("idle");
    setPageCount(0);
    setError(null);
  }, []);

  const addFiles = (files: File[]) => {
    setImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `img-${++uid}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveImage = (id: string, dir: -1 | 1) => {
    setImages((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const compile = async () => {
    if (images.length === 0) return;
    setStatus("working");
    setError(null);
    try {
      const staged: { file: File; bitmap: ImageBitmap }[] = [];
      for (const img of images) {
        staged.push({
          file: img.file,
          bitmap: await createImageBitmap(img.file),
        });
      }
      const { blob, pageCount: pages } = await buildImagePdf(staged, {
        pageSize,
        margin,
      });
      staged.forEach((s) => s.bitmap.close());
      if (output) URL.revokeObjectURL(output.url);
      setOutput(buildPdfOutput("omni-images.pdf", blob));
      setPageCount(pages);
      setStatus("done");
      toast({
        title: "PDF compiled",
        description: `${pages} page${pages === 1 ? "" : "s"} · ${(blob.size / 1024).toFixed(0)} KB`,
      });
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
        <ImageQueue
          images={images}
          onAdd={addFiles}
          onRemove={removeImage}
          onMove={moveImage}
          disabled={busy}
          label="Drop images to compile"
        />

        {images.length > 0 && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-card/60 border border-border/60 font-mono text-[11px] shadow-xs">
            <span className="text-muted-foreground flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span>Input Queue</span>
            </span>
            <span className="font-semibold text-foreground">
              {images.length} {images.length === 1 ? "page" : "pages"} · {formatBytes(totalSizeBytes)} · {pageSize.toUpperCase()}
            </span>
          </div>
        )}

        {images.length > 0 && (
          <PdfVisualDeck
            pages={images.map((img) => ({
              id: img.id,
              name: img.file.name,
              sizeBytes: img.file.size,
              dpi: 300,
              rotation: 0,
              previewUrl: img.previewUrl,
            }))}
            onRemovePage={removeImage}
          />
        )}

        <ParamPanel title="document setup">
          <PageOptions
            pageSize={pageSize}
            onPageSize={setPageSize}
            margin={margin}
            onMargin={setMargin}
            disabled={busy}
          />
          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            Each image becomes one page in queue order. “Fit to image” adopts
            each image’s own pixel dimensions as the page size.
          </p>
        </ParamPanel>

        <motion.button
          onClick={() => void compile()}
          disabled={images.length === 0 || busy}
          whileHover={images.length === 0 || busy ? undefined : { scale: 1.02 }}
          whileTap={images.length === 0 || busy ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <FileImage className="size-4" />
          {busy ? "COMPILING…" : `COMPILE ${images.length || ""} PAGE${images.length === 1 ? "" : "S"} → PDF`}
        </motion.button>
      </div>

      {/* ------------------------------------------------------ output column */}
      <div className="space-y-4">
        {status === "working" && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 font-mono text-[11px] text-primary">
            embedding bitmaps · building page tree…
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
            badge={`${pageCount} page${pageCount === 1 ? "" : "s"}`}
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
