"use client";

import { useState, useRef, useEffect, ChangeEvent, DragEvent, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Download,
  Eraser,
  Sparkles,
  Database,
  Check,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ImagePlus,
  ShieldCheck,
  Scan,
  Zap,
  Split,
  ChevronRight,
  Crosshair,
  Wand2,
  Maximize2,
  Hand,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useWorkstationStore } from "@/hooks/useWorkstationStore";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { PresetSelectorModal, type PresetItem } from "@/components/ui/preset-selector-modal";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/format";
import { useVault } from "@/lib/vault/vault-context";
import {
  detectAiWatermark,
  detectWatermarkAtPoint,
  generativeEraseWatermark,
  createRegionThumbnail,
  type WatermarkZone,
  type DetectedWatermark,
  type InpaintCoverage,
} from "@/lib/imaging/ai-watermark";

const WATERMARK_PRESETS: PresetItem[] = [
  {
    id: "auto-smart-inpaint",
    title: "Smart Auto-Detection",
    subtitle: "AI edge analysis with balanced inpainting for logos & stamps",
    category: "AI Smart",
    badge: "AUTO DETECT",
    badgeColor: "emerald",
    engineTier: "turbo",
    params: { zone: "auto", coverage: "balanced" },
    config: { zone: "auto", coverage: "balanced" },
  },
  {
    id: "four-corners-guard",
    title: "Four-Corner Purge",
    subtitle: "Aggressive multi-corner scan for broadcast tags and timestamps",
    category: "Broadcast",
    badge: "4-CORNER",
    badgeColor: "violet",
    engineTier: "high",
    params: { zone: "four_corners", coverage: "deep" },
    config: { zone: "four_corners", coverage: "deep" },
  },
  {
    id: "subtle-feather",
    title: "Gentle Edge Feather",
    subtitle: "Soft gradient blending for translucent text watermarks",
    category: "Subtle",
    badge: "GENTLE",
    badgeColor: "cyan",
    engineTier: "standard",
    params: { zone: "auto", coverage: "gentle" },
    config: { zone: "auto", coverage: "gentle" },
  },
  {
    id: "stock-photo-center",
    title: "Central Stamp Inpaint",
    subtitle: "Deep inpainting targeting large diagonal watermark stamps",
    category: "Stock Watermark",
    badge: "CENTER",
    badgeColor: "amber",
    engineTier: "ultra",
    params: { zone: "center", coverage: "deep" },
    config: { zone: "center", coverage: "deep" },
  },
];

export function WatermarkRemover() {
  const { toast } = useToast();
  const { save } = useVault();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [cleanedSrc, setCleanedSrc] = useState<string | null>(null);
  const [cleanedBlob, setCleanedBlob] = useState<Blob | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);

  const [detection, setDetection] = useState<DetectedWatermark | null>(null);
  const [selectedZone, setSelectedZone] = useState<WatermarkZone>("auto");
  const [coverage, setCoverage] = useState<InpaintCoverage>("balanced");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [processingTimeMs, setProcessingTimeMs] = useState<number | null>(null);

  // Comparison & Mobile "Hold to Compare" State
  const [viewMode, setViewMode] = useState<"compare" | "cleaned" | "original">("cleaned");
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // Tap ripple effect indicator
  const [tapRipple, setTapRipple] = useState<{ x: number; y: number } | null>(null);

  // Vault state
  const [vaultState, setVaultState] = useState<"idle" | "saved">("idle");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);

  useEffect(() => {
    const handoff = useWorkstationStore.getState().consumeHandoffFile();
    if (handoff?.file) {
      const f = handoff.file instanceof File
        ? handoff.file
        : new File([handoff.file], handoff.filename, { type: handoff.mimeType });
      if (f.type.startsWith("image/")) {
        handleFile(f);
      }
    }
  }, []);

  const handleApplyPreset = (p: PresetItem) => {
    if (p.config) {
      if (p.config.zone) {
        setSelectedZone(p.config.zone as WatermarkZone);
        if (imageFile) {
          processImageCore(imageFile, p.config.zone as WatermarkZone, undefined, p.config.coverage as InpaintCoverage || coverage);
        }
      }
      if (p.config.coverage) {
        setCoverage(p.config.coverage as InpaintCoverage);
      }
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);
  const originalSrcRef = useRef<string | null>(null);
  const cleanedSrcRef = useRef<string | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (originalSrcRef.current) {
        try { URL.revokeObjectURL(originalSrcRef.current); } catch {}
        originalSrcRef.current = null;
      }
      if (cleanedSrcRef.current) {
        try { URL.revokeObjectURL(cleanedSrcRef.current); } catch {}
        cleanedSrcRef.current = null;
      }
    };
  }, []);

  /* Step back: Return from cleaned comparison view back to editor */
  useEffect(() => {
    if (cleanedBlob && !isProcessing) {
      return useNavStore.getState().registerStepHandler(() => {
        if (cleanedSrcRef.current) {
          try { URL.revokeObjectURL(cleanedSrcRef.current); } catch {}
          cleanedSrcRef.current = null;
        }
        setCleanedBlob(null);
        setCleanedSrc(null);
        setViewMode("cleaned");
        return true;
      });
    }
  }, [cleanedBlob, isProcessing]);

  /* Guard active watermark removal session from accidental discard */
  useEffect(() => {
    if (isProcessing) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: "AI watermark removal is currently in progress. Leaving now will cancel the process. Are you sure you want to go back?",
      }));
    }
    if (imageFile) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: `You have loaded "${imageFile.name}" in Watermark Remover. Going back will discard your edits. Are you sure you want to proceed?`,
      }));
    }
  }, [imageFile, isProcessing]);

  /**
   * Executes AI detection and Generative Background/Subject Inpainting
   */
  const processImageCore = useCallback(
    async (
      file: File,
      zone: WatermarkZone = "auto",
      customPoint?: { x: number; y: number },
      currentCoverage: InpaintCoverage = coverage
    ) => {
      setIsProcessing(true);
      setIsScanning(true);
      setVaultState("idle");
      const startTime = performance.now();

      try {
        let url = originalSrcRef.current;
        if (!url) {
          url = URL.createObjectURL(file);
          originalSrcRef.current = url;
          setOriginalSrc(url);
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load image into memory"));
          img.src = url;
        });

        setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });

        // 1. Target Detection
        let detected: DetectedWatermark;
        if (customPoint) {
          detected = detectWatermarkAtPoint(img, customPoint.x, customPoint.y, 44);
        } else {
          detected = detectAiWatermark(img, zone);
        }
        setDetection(detected);

        // Visual scan feedback
        await new Promise((r) => setTimeout(r, 160));
        setIsScanning(false);

        // 2. Generative Inpainting Engine (Samsung Galaxy S26 Ultra style)
        const workCanvas = document.createElement("canvas");
        workCanvas.width = img.naturalWidth;
        workCanvas.height = img.naturalHeight;
        const ctx = workCanvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Could not initialize 2D canvas");

        ctx.drawImage(img, 0, 0);

        // Capture original zoomed thumbnail
        const originalThumb = createRegionThumbnail(workCanvas, detected.box, 16);

        // Run Generative Background & Subject Inpainting
        generativeEraseWatermark(workCanvas, detected.box, {
          coverage: currentCoverage,
          grainMatch: true,
        });

        // Capture cleaned thumbnail
        const cleanedThumb = createRegionThumbnail(workCanvas, detected.box, 16);

        detected.originalThumbnail = originalThumb;
        detected.cleanedThumbnail = cleanedThumb;
        setDetection({ ...detected });

        // Export result
        const blob = await new Promise<Blob | null>((resolve) => {
          workCanvas.toBlob(
            (b) => resolve(b),
            file.type === "image/png" ? "image/png" : "image/jpeg",
            0.96
          );
        });

        if (!blob) throw new Error("Failed to generate image blob");

        if (cleanedSrcRef.current) {
          try { URL.revokeObjectURL(cleanedSrcRef.current); } catch {}
          cleanedSrcRef.current = null;
        }
        const resultUrl = URL.createObjectURL(blob);
        cleanedSrcRef.current = resultUrl;
        setCleanedSrc(resultUrl);
        setCleanedBlob(blob);

        const elapsed = Math.round(performance.now() - startTime);
        setProcessingTimeMs(elapsed);

        toast({
          title: "Generative AI Erased",
          description: `${detected.label} removed & background reconstructed in ${elapsed}ms.`,
        });
      } catch (err: any) {
        console.error("AI Watermark error:", err);
        toast({
          title: "Processing Failed",
          description: err?.message || "Could not process image.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        setIsScanning(false);
      }
    },
    [toast, coverage]
  );

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select a JPG, PNG, or WebP image.",
        variant: "destructive",
      });
      return;
    }
    if (originalSrcRef.current) {
      try { URL.revokeObjectURL(originalSrcRef.current); } catch {}
      originalSrcRef.current = null;
    }
    if (cleanedSrcRef.current) {
      try { URL.revokeObjectURL(cleanedSrcRef.current); } catch {}
      cleanedSrcRef.current = null;
    }
    setImageFile(file);
    processImageCore(file, selectedZone);
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleZoneChange = (zone: WatermarkZone) => {
    setSelectedZone(zone);
    if (imageFile) {
      processImageCore(imageFile, zone, undefined, coverage);
    }
  };

  const handleCoverageChange = (cov: InpaintCoverage) => {
    setCoverage(cov);
    if (imageFile) {
      processImageCore(imageFile, selectedZone, undefined, cov);
    }
  };

  /**
   * Direct Tap-To-Erase on Mobile / Desktop Preview
   */
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (viewMode === "compare") return;
    if (!imageFile || !imageDimensions || !imageElementRef.current) return;

    const rect = imageElementRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < 0 || clickX > rect.width || clickY < 0 || clickY > rect.height) return;

    // Show ripple feedback
    setTapRipple({ x: e.clientX - (containerRef.current?.getBoundingClientRect().left || 0), y: e.clientY - (containerRef.current?.getBoundingClientRect().top || 0) });
    setTimeout(() => setTapRipple(null), 600);

    const naturalX = Math.round((clickX / rect.width) * imageDimensions.w);
    const naturalY = Math.round((clickY / rect.height) * imageDimensions.h);

    setSelectedZone("custom");
    processImageCore(imageFile, "custom", { x: naturalX, y: naturalY }, coverage);
  };

  const handleDownload = () => {
    if (!cleanedBlob || !imageFile) return;
    const cleanName = `cleaned_${imageFile.name.replace(/\.[^/.]+$/, "")}.png`;
    void import("@/lib/native-save").then((m) => m.nativeSave(cleanedBlob, cleanName));
    useSaveDialogStore.getState().showSuccess({
      filename: cleanName,
      directory: "Pictures",
      fileSize: cleanedBlob.size,
      blob: cleanedBlob,
    });
  };

  const saveToVault = async () => {
    if (!cleanedBlob || !imageFile) return;
    const cleanName = `cleaned_${imageFile.name.replace(/\.[^/.]+$/, "")}.png`;
    const item = await save({
      name: cleanName,
      blob: cleanedBlob,
      mime: cleanedBlob.type,
      size: cleanedBlob.size,
    });
    if (item) setVaultState("saved");
  };

  const resetAll = () => {
    if (originalSrcRef.current) {
      try { URL.revokeObjectURL(originalSrcRef.current); } catch {}
      originalSrcRef.current = null;
    }
    if (cleanedSrcRef.current) {
      try { URL.revokeObjectURL(cleanedSrcRef.current); } catch {}
      cleanedSrcRef.current = null;
    }
    setImageFile(null);
    setOriginalSrc(null);
    setCleanedSrc(null);
    setCleanedBlob(null);
    setDetection(null);
    setVaultState("idle");
    setProcessingTimeMs(null);
    setSelectedZone("auto");
  };

  // Slider controls for Split Compare
  const updateSliderFromEvent = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const pct = (x / rect.width) * 100;
    setSliderPos(Math.max(2, Math.min(98, pct)));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDraggingSlider(true);
    updateSliderFromEvent(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingSlider) return;
    updateSliderFromEvent(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDraggingSlider(false);
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 overflow-y-auto p-2 sm:p-6 lg:p-8 transition-colors duration-300",
        isDragOver ? "bg-fuchsia-500/5" : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Header Card (Compact on mobile when image loaded) */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-4 sm:p-6 shadow-[0_2px_24px_rgba(217,70,239,0.06)] transition-all duration-200",
          isDragOver
            ? "border-fuchsia-500 border-dashed bg-fuchsia-500/10"
            : "border-border/60 bg-card/40"
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 sm:size-10 place-items-center rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400 shadow-sm shrink-0">
              <Wand2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                  AI Watermark Eraser
                </h2>
                <span className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/20 px-2 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold text-fuchsia-300">
                  Galaxy AI Logic
                </span>
              </div>
              <p className="font-sans text-[11px] sm:text-xs text-muted-foreground line-clamp-1">
                Auto-detects watermarks & reconstructs matching photo background
              </p>
            </div>
          </div>

          {detection && (
            <div className="flex items-center gap-1.5 self-start rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1 font-mono text-[10px] sm:text-[11px] font-semibold text-fuchsia-300 sm:self-auto">
              <Zap className="size-3 text-fuchsia-400 animate-pulse shrink-0" />
              <span className="truncate max-w-[220px]">{detection.label}</span>
              {processingTimeMs && <span className="opacity-60">· {processingTimeMs}ms</span>}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-10 sm:min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 sm:px-5 font-display text-xs sm:text-sm font-semibold tracking-wide text-white shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="size-3.5 sm:size-4" />
            {imageFile ? "UPLOAD ANOTHER" : "SELECT IMAGE"}
          </button>

          <button
            type="button"
            onClick={() => setIsPresetModalOpen(true)}
            className="flex min-h-10 sm:min-h-11 items-center justify-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-3.5 font-display text-xs font-semibold text-fuchsia-300 hover:bg-fuchsia-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="size-3.5" />
            <span>PRESETS</span>
          </button>

          {cleanedSrc && (
            <>
              <button
                onClick={handleDownload}
                className="flex min-h-10 sm:min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-pulse/40 bg-pulse/15 px-3 sm:px-5 font-display text-[11px] sm:text-xs font-bold tracking-[0.14em] text-pulse transition-colors hover:bg-pulse/25 sm:flex-none"
              >
                <Download className="size-3.5 sm:size-4" /> SAVE TO DEVICE
              </button>

              <button
                onClick={() => void saveToVault()}
                disabled={vaultState === "saved"}
                className={cn(
                  "flex min-h-10 sm:min-h-11 items-center justify-center gap-2 rounded-xl border px-3 sm:px-5 font-display text-[11px] sm:text-xs font-bold tracking-[0.14em] transition-colors",
                  vaultState === "saved"
                    ? "border-pulse/40 bg-pulse/10 text-pulse"
                    : "border-border bg-card/40 text-muted-foreground hover:border-fuchsia-400/40 hover:text-fuchsia-300"
                )}
              >
                {vaultState === "saved" ? (
                  <Check className="size-3.5 sm:size-4" strokeWidth={3} />
                ) : (
                  <Database className="size-3.5 sm:size-4" />
                )}
                <span>{vaultState === "saved" ? "VAULTED" : "VAULT"}</span>
              </button>

              <button
                onClick={resetAll}
                className="flex min-h-10 sm:min-h-11 items-center justify-center rounded-xl border border-border bg-secondary px-3 font-display text-xs font-bold text-foreground transition-transform hover:scale-[1.02]"
                title="Reset Image"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty Drop Zone State */}
      {!imageFile && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "group flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer min-h-[320px]",
            isDragOver
              ? "border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-300 scale-[0.99]"
              : "border-border/60 bg-background/40 text-muted-foreground hover:border-fuchsia-500/40 hover:bg-background"
          )}
        >
          <div className="grid size-14 sm:size-16 place-items-center rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400 shadow-inner transition-transform group-hover:scale-110">
            <Sparkles className="size-7 sm:size-8" />
          </div>
          <div className="space-y-1">
            <p className="font-display text-sm sm:text-base font-bold text-foreground">
              {isDragOver ? "Drop image to erase" : "Drag & drop image here"}
            </p>
            <p className="font-sans text-xs text-muted-foreground/80 max-w-sm">
              Works with DALL-E, Midjourney, Bing, Meta AI, or any ✦ AI logo. Generatively restores the photo background.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fuchsia-300">
              Generative Subject Synthesis
            </span>
            <span className="rounded-full border border-border/50 bg-secondary px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              100% On-Device · Web & APK
            </span>
          </div>
        </div>
      )}

      {/* Active Processing / Fullscreen Mobile Optimized Preview */}
      {imageFile && (originalSrc || cleanedSrc) && (
        <div className="flex flex-1 flex-col gap-3">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-card/40 p-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background p-0.5 text-xs">
              <button
                onClick={() => setViewMode("cleaned")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 font-sans font-medium text-[11px] sm:text-xs transition-colors",
                  viewMode === "cleaned"
                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="size-3" /> Cleaned
              </button>
              <button
                onClick={() => setViewMode("compare")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1 font-sans font-medium text-[11px] sm:text-xs transition-colors",
                  viewMode === "compare"
                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Split className="size-3" /> Split Slider
              </button>
              <button
                onClick={() => setViewMode("original")}
                className={cn(
                  "rounded-md px-2.5 py-1 font-sans font-medium text-[11px] sm:text-xs transition-colors",
                  viewMode === "original"
                    ? "bg-fuchsia-500/20 text-fuchsia-300"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Original
              </button>
            </div>

            {/* Smart Target Zone Selector */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {(
                [
                  { id: "auto", label: "✨ Auto" },
                  { id: "top-right", label: "✦ Top-Right" },
                  { id: "bottom-right", label: "↘ Bottom-Right" },
                  { id: "bottom-left", label: "↙ Bottom-Left" },
                ] as const
              ).map((z) => (
                <button
                  key={z.id}
                  disabled={isProcessing}
                  onClick={() => handleZoneChange(z.id)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-2.5 py-1 font-mono text-[10px] sm:text-[11px] transition-colors disabled:opacity-50",
                    selectedZone === z.id
                      ? "bg-fuchsia-600 text-white font-bold shadow-sm"
                      : "border border-border/50 bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Visual Display (Optimized for Android APK screen height & touch) */}
          <div
            ref={containerRef}
            onClick={handleImageClick}
            onPointerDown={viewMode === "compare" ? handlePointerDown : undefined}
            className={cn(
              "relative flex flex-1 select-none items-center justify-center overflow-hidden rounded-2xl border border-border/60 bg-black/80 p-2 shadow-2xl min-h-[380px] sm:min-h-[500px]",
              viewMode === "compare" ? "cursor-ew-resize" : "cursor-crosshair"
            )}
          >
            {/* AI Scanning / Processing Radar */}
            <AnimatePresence>
              {(isScanning || isProcessing) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/80 backdrop-blur-md"
                >
                  <div className="relative grid size-16 place-items-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-fuchsia-500/20" />
                    <Scan className="size-8 animate-pulse text-fuchsia-400" />
                  </div>
                  <div className="text-center px-4">
                    <p className="font-display text-sm font-bold text-white tracking-wide">
                      RECONSTRUCTING BACKGROUND & SUBJECT…
                    </p>
                    <p className="mt-1 font-mono text-xs text-fuchsia-300">
                      Erasing watermark and generating photo-matching background
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tap Ripple Indicator */}
            {tapRipple && (
              <div
                className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{ left: tapRipple.x, top: tapRipple.y }}
              >
                <div className="size-16 rounded-full border-2 border-fuchsia-400 bg-fuchsia-500/30 animate-ping" />
              </div>
            )}

            {/* Display View: Cleaned Result (Default) */}
            {viewMode === "cleaned" && cleanedSrc && (
              <div className="relative flex items-center justify-center max-h-[62vh] sm:max-h-[72vh] w-full">
                <img
                  ref={imageElementRef}
                  src={isHoldingOriginal ? originalSrc || cleanedSrc : cleanedSrc}
                  alt="Cleaned Result"
                  className="max-h-[62vh] sm:max-h-[72vh] max-w-full rounded-xl border border-border/30 object-contain shadow-2xl"
                />

                {/* Floating "Hold to Compare" Button on Mobile */}
                <button
                  type="button"
                  onMouseDown={() => setIsHoldingOriginal(true)}
                  onMouseUp={() => setIsHoldingOriginal(false)}
                  onTouchStart={() => setIsHoldingOriginal(true)}
                  onTouchEnd={() => setIsHoldingOriginal(false)}
                  className={cn(
                    "absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] sm:text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95",
                    isHoldingOriginal
                      ? "border-amber-400 bg-amber-500/80 text-white"
                      : "border-fuchsia-400/50 bg-black/70 text-fuchsia-300 hover:bg-black/90"
                  )}
                >
                  <Hand className="size-3" />
                  <span>{isHoldingOriginal ? "SHOWING ORIGINAL" : "HOLD TO COMPARE"}</span>
                </button>
              </div>
            )}

            {/* Display View: Original Image */}
            {viewMode === "original" && originalSrc && (
              <div className="relative flex items-center justify-center max-h-[62vh] sm:max-h-[72vh] w-full">
                <img
                  ref={imageElementRef}
                  src={originalSrc}
                  alt="Original"
                  className="max-h-[62vh] sm:max-h-[72vh] max-w-full rounded-xl border border-border/30 object-contain shadow-2xl"
                />
                {detection && (
                  <div className="absolute top-3 right-3 rounded-lg border border-fuchsia-500/80 bg-fuchsia-500/25 px-2.5 py-1 font-mono text-[10px] font-bold text-fuchsia-200 backdrop-blur-md">
                    WATERMARK DETECTED
                  </div>
                )}
              </div>
            )}

            {/* Display View: Interactive Split Slider Mode */}
            {viewMode === "compare" && originalSrc && cleanedSrc && (
              <div className="relative max-h-[62vh] sm:max-h-[72vh] max-w-full overflow-hidden rounded-xl border border-border/30 shadow-2xl">
                {/* Base Layer: Cleaned */}
                <img
                  ref={imageElementRef}
                  src={cleanedSrc}
                  alt="Cleaned"
                  className="max-h-[62vh] sm:max-h-[72vh] w-auto max-w-full object-contain pointer-events-none"
                />

                {/* Clipped Top Layer: Original */}
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={originalSrc}
                    alt="Original"
                    className="max-h-[62vh] sm:max-h-[72vh] w-auto max-w-none object-contain"
                  />
                  <div className="absolute top-3 left-3 rounded-md bg-black/80 px-2 py-0.5 font-mono text-[9px] font-bold text-white/90 backdrop-blur-sm">
                    BEFORE
                  </div>
                </div>

                <div className="absolute top-3 right-3 rounded-md bg-fuchsia-600/90 px-2 py-0.5 font-mono text-[9px] font-bold text-white backdrop-blur-sm pointer-events-none">
                  AFTER (AI ERASED)
                </div>

                {/* Slider Handle Line */}
                <div
                  className="absolute top-0 bottom-0 z-20 w-0.5 bg-gradient-to-b from-fuchsia-400 via-white to-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.8)]"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-full border-2 border-white bg-fuchsia-600 text-white shadow-xl">
                    <Split className="size-3.5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Micro Hint & Area Inspection */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1 text-fuchsia-300">
              <Crosshair className="size-3 shrink-0" />
              Tap anywhere on photo to pinpoint & erase custom objects or logos
            </span>
            {imageDimensions && (
              <span className="opacity-70 text-[10px]">
                {imageDimensions.w} × {imageDimensions.h} px
              </span>
            )}
          </div>

          {/* Area Inspection Card */}
          {detection && detection.originalThumbnail && detection.cleanedThumbnail && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/40 p-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
                  <span className="font-display text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground truncate">
                    Inspection: {detection.label}
                  </span>
                </div>
                <p className="font-sans text-[10px] text-muted-foreground truncate">
                  Close-up view of generative background reconstruction
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="size-11 sm:size-12 overflow-hidden rounded-lg border border-red-500/40 bg-black shadow-inner">
                    <img
                      src={detection.originalThumbnail}
                      alt="Before"
                      className="size-full object-cover"
                    />
                  </div>
                  <span className="font-mono text-[8px] uppercase text-red-400">Before</span>
                </div>

                <ChevronRight className="size-3 text-muted-foreground/40" />

                <div className="flex flex-col items-center gap-0.5">
                  <div className="size-11 sm:size-12 overflow-hidden rounded-lg border border-emerald-500/50 bg-black shadow-inner">
                    <img
                      src={detection.cleanedThumbnail}
                      alt="After"
                      className="size-full object-cover"
                    />
                  </div>
                  <span className="font-mono text-[8px] uppercase text-emerald-400 font-semibold">After</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <PresetSelectorModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        toolId="watermark-remover"
        toolTitle="AI Watermark Inpaint Presets"
        subtitle="Detection heuristics and generative filling profiles"
        presets={WATERMARK_PRESETS}
        selectedPresetId={WATERMARK_PRESETS.find(p => p.config?.zone === selectedZone && p.config?.coverage === coverage)?.id}
        onSelectPreset={handleApplyPreset}
        currentConfig={{ zone: selectedZone, coverage }}
      />
    </div>
  );
}
