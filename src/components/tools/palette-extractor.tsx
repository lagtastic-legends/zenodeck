"use client";

/**
 * COLOR PALETTE EXTRACTOR — downsamples the image onto a canvas, quantizes
 * pixels into RGB buckets (4 bits/channel), then picks visually distinct
 * colors by greedy distance selection. Copy any hex with one click.
 */

import { motion } from "framer-motion";
import { Check, Copy, Palette, UploadCloud, X, Sparkles, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ParamSelect } from "@/components/audio/param-controls";
import { useToast } from "@/hooks/use-toast";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useWorkstationStore } from "@/hooks/useWorkstationStore";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { PresetSelectorModal, type PresetItem } from "@/components/ui/preset-selector-modal";
import { formatBytes } from "@/lib/format";

const PALETTE_PRESETS: PresetItem[] = [
  {
    id: "minimal-5",
    title: "Minimal 5-Color Harmony",
    subtitle: "Dominant primary, secondary, and accent colors for brand kits",
    category: "Branding",
    badge: "5 SWATCHES",
    badgeColor: "emerald",
    engineTier: "turbo",
    params: { size: "5" },
    config: { size: "5" },
  },
  {
    id: "balanced-8",
    title: "Balanced 8-Tone Scale",
    subtitle: "Comprehensive UI color scheme with lights, darks, and accents",
    category: "UI Design",
    badge: "8 SWATCHES",
    badgeColor: "cyan",
    engineTier: "high",
    params: { size: "8" },
    config: { size: "8" },
  },
  {
    id: "detailed-12",
    title: "Deep 12-Shade Spectrum",
    subtitle: "Full photographic gamut extraction for illustrations and digital art",
    category: "Artwork",
    badge: "12 SWATCHES",
    badgeColor: "violet",
    engineTier: "ultra",
    params: { size: "12" },
    config: { size: "12" },
  },
];

interface Swatch {
  hex: string;
  rgb: [number, number, number];
  proportion: number;
}

const PALETTE_SIZES = ["5", "8", "10", "12"];

/* ------------------------------------------------------------------ */
/* Quantizer                                                           */
/* ------------------------------------------------------------------ */

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function distance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export async function extractPalette(
  file: File,
  count: number,
): Promise<Swatch[]> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 360;
  const scale = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D unavailable in this browser.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, w, h);

  /* 4 bits per channel quantization → 4096 buckets. */
  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // skip transparent
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.n += 1;
    } else {
      buckets.set(key, { r, g, b, n: 1 });
    }
    total += 1;
  }
  if (total === 0) return [];

  /* Sort buckets by frequency, greedily select distinct colors. */
  const sorted = [...buckets.values()]
    .map((bk) => ({
      rgb: [bk.r / bk.n, bk.g / bk.n, bk.b / bk.n] as [number, number, number],
      n: bk.n,
    }))
    .sort((a, b) => b.n - a.n);

  const selected: typeof sorted = [];
  const MIN_DIST = 64; // perceptual spacing between picked colors
  for (const cand of sorted) {
    if (selected.length >= count) break;
    const far = selected.every((s) => distance(s.rgb, cand.rgb) >= MIN_DIST);
    if (far) selected.push(cand);
  }
  /* Top up when the image is very monochrome. */
  for (const cand of sorted) {
    if (selected.length >= count) break;
    if (!selected.includes(cand)) selected.push(cand);
  }

  return selected.map((s) => ({
    hex: rgbToHex(s.rgb[0], s.rgb[1], s.rgb[2]),
    rgb: [
      Math.round(s.rgb[0]),
      Math.round(s.rgb[1]),
      Math.round(s.rgb[2]),
    ] as [number, number, number],
    proportion: s.n / total,
  }));
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function PaletteExtractor() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [size, setSize] = useState("8");
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  const dragDepth = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handoff = useWorkstationStore.getState().consumeHandoffFile();
    if (handoff?.file) {
      const f = handoff.file instanceof File
        ? handoff.file
        : new File([handoff.file], handoff.filename, { type: handoff.mimeType });
      if (f.type.startsWith("image/")) {
        acceptFile(f);
      }
    }
  }, []);

  const handleApplyPreset = (p: PresetItem) => {
    if (p.config?.size) {
      changeSize(String(p.config.size));
    }
  };

  const exportPaletteJson = () => {
    if (swatches.length === 0) return;
    const jsonStr = JSON.stringify(sortedSwatches, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const name = file ? `${file.name.replace(/\.[^/.]+$/, "")}-palette.json` : "palette.json";
    useSaveDialogStore.getState().showSuccess({
      filename: name,
      directory: "Documents",
      fileSize: blob.size,
      blob,
    });
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  /* Step back: Clear extracted swatches first if viewing results */
  useEffect(() => {
    if (swatches.length > 0 && !working) {
      return useNavStore.getState().registerStepHandler(() => {
        setSwatches([]);
        return true;
      });
    }
  }, [swatches.length, working]);

  /* Guard loaded image from accidental discard */
  useEffect(() => {
    if (file) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: `You have loaded "${file.name}". Going back will discard your image and extracted palette. Are you sure you want to proceed?`,
      }));
    }
  }, [file]);

  const runExtraction = async (f: File, count: number) => {
    setWorking(true);
    setError(null);
    try {
      const result = await extractPalette(f, count);
      setSwatches(result);
      if (result.length === 0) {
        setError("No opaque pixels found — is this a transparent image?");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err ?? "extraction failed");
      setError(message);
      setSwatches([]);
    } finally {
      setWorking(false);
    }
  };

  const acceptFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast({
        title: "Images only",
        description: "Drop a JPG, PNG or WebP to extract its palette.",
        variant: "destructive",
      });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setSwatches([]);
    void runExtraction(f, Number(size));
  };

  const changeSize = (v: string) => {
    setSize(v);
    if (file) void runExtraction(file, Number(v));
  };

  const copyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1400);
    } catch {
      toast({
        title: "Clipboard blocked",
        description: `Copy manually: ${hex}`,
      });
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const sortedSwatches = useMemo(
    () => [...swatches].sort((a, b) => b.proportion - a.proportion),
    [swatches],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* ------------------------------------------------------- input column */}
      <div className="space-y-5">
        {!file ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              dragDepth.current += 1;
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              dragDepth.current = Math.max(dragDepth.current - 1, 0);
              if (dragDepth.current === 0) setDragging(false);
            }}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            aria-label="Drop an image — click or drag"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            className={`group flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all ${
              dragging
                ? "border-primary bg-primary/10 glow-box-violet"
                : "border-border/80 bg-card/40 hover:border-primary/50"
            }`}
          >
            <motion.div
              animate={dragging ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
              className="grid size-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10"
            >
              <UploadCloud className="size-7 text-primary" strokeWidth={1.5} />
            </motion.div>
            <div>
              <p className="font-display text-sm font-bold tracking-wide text-foreground">
                Drop an image
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                instant scan · colors never leave the device
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-border/70 bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/30 bg-primary/10">
                <Palette className="size-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-xs font-medium text-foreground">
                  {file.name}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {formatBytes(file.size)} · {file.type || "image"}
                </p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setSwatches([]);
                  setError(null);
                }}
                aria-label="Remove image"
                className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-red-400/50 hover:text-red-300"
              >
                <X className="size-4" />
              </button>
            </div>
            { }
            <img
              src={previewUrl ?? ""}
              alt={file.name}
              className="max-h-64 w-full rounded-lg border border-border/50 object-contain"
            />
          </div>
        )}

        <div className="flex items-center justify-between pb-1 border-b border-border/40">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Extraction Palette</p>
          <button
            type="button"
            onClick={() => setIsPresetModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-mono font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer"
          >
            <Sparkles className="size-3" />
            <span>PRESETS</span>
          </button>
        </div>

        <ParamSelect
          label="Palette size"
          value={size}
          onChange={changeSize}
          disabled={working}
          options={PALETTE_SIZES.map((s) => ({ value: s, label: `${s} colors` }))}
        />

        {working && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4 font-mono text-[11px] text-primary">
            sampling pixels · quantizing 4096 buckets…
          </div>
        )}
        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-300" role="alert">
            {error}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload image file"
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {/* ------------------------------------------------------ output column */}
      <div className="space-y-4">
        {sortedSwatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5"
          >
            {/* proportion bar */}
            <div
              className="flex h-3 overflow-hidden rounded-full border border-border/50"
              role="img"
              aria-label="Color proportion bar"
            >
              {sortedSwatches.map((s) => (
                <span
                  key={s.hex}
                  style={{ width: `${s.proportion * 100}%`, background: s.hex }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">Sorted Swatches ({sortedSwatches.length})</span>
              <button
                type="button"
                onClick={exportPaletteJson}
                className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-mono font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer"
              >
                <Download className="size-3" />
                <span>SAVE PALETTE JSON</span>
              </button>
            </div>

            <ul className="scroll-hud grid max-h-96 gap-2 overflow-y-auto pr-1" aria-label="Extracted palette">
              {sortedSwatches.map((s, i) => (
                <motion.li
                  key={s.hex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <button
                    onClick={() => void copyHex(s.hex)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card/50 p-2.5 text-left transition-colors hover:border-primary/40"
                    aria-label={`Copy ${s.hex}`}
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-md border border-border/50"
                      style={{ background: s.hex }}
                    >
                      {copied === s.hex && (
                        <Check className="size-4 text-white mix-blend-difference" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-xs font-semibold text-foreground">
                        {s.hex}
                      </span>
                      <span className="block font-mono text-[10px] text-muted-foreground">
                        rgb({s.rgb.join(", ")})
                      </span>
                    </span>
                    <span className="shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                      {(s.proportion * 100).toFixed(1)}%
                    </span>
                    <Copy className={`size-3.5 shrink-0 ${copied === s.hex ? "text-pulse" : "text-muted-foreground/50"}`} />
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}

        {sortedSwatches.length === 0 && !working && !error && (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60">
            <p className="font-mono text-[11px] text-muted-foreground/70">
              palette lands here — click any swatch to copy
            </p>
          </div>
        )}
      </div>

      <PresetSelectorModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        toolId="palette-extractor"
        toolTitle="Palette Extraction Profiles"
        subtitle="Quantization depth and swatch count configurations"
        presets={PALETTE_PRESETS}
        selectedPresetId={PALETTE_PRESETS.find(p => p.config?.size === size)?.id}
        onSelectPreset={handleApplyPreset}
        currentConfig={{ size }}
      />
    </div>
  );
}
