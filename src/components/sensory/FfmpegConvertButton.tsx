"use client";

/**
 * ============================================================================
 * ZenoDeck Sensory Architecture — Phase 4: Component Integration Example
 * File: src/components/sensory/FfmpegConvertButton.tsx
 * ============================================================================
 * Demonstrates useSensoryFeedback integration with Framer Motion:
 * - Hover / TouchDown: Crisp mechanical tap (10ms haptic + audio click)
 * - Click / Submit: Resonant processStart charging hum & haptic ramp
 * - Processing: Active animated state with Framer Motion spring physics
 * - Success: Harmonic fanfare chime + ascending haptic fanfare
 * - Error: Dual alert tone + 6-pulse stutter buzz
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, CheckCircle2, AlertCircle, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

export type ConvertStatus = "idle" | "processing" | "success" | "error";

export interface FfmpegConvertButtonProps {
  label?: string;
  onConvert?: () => Promise<boolean>;
  simulateError?: boolean;
  className?: string;
}

export function FfmpegConvertButton({
  label = "Convert Stream with FFmpeg WASM",
  onConvert,
  simulateError = false,
  className = "",
}: FfmpegConvertButtonProps) {
  const {
    triggerTap,
    triggerProcessStart,
    triggerSuccess,
    triggerError,
  } = useSensoryFeedback();

  const [status, setStatus] = useState<ConvertStatus>("idle");
  const [progress, setProgress] = useState(0);

  const handleClick = async () => {
    if (status === "processing") return;

    if (status === "success" || status === "error") {
      // Reset with tactile detent
      triggerTap();
      setStatus("idle");
      setProgress(0);
      return;
    }

    // 1. Fire initialization sensory feedback simultaneously
    triggerProcessStart();
    setStatus("processing");
    setProgress(15);

    try {
      if (onConvert) {
        const ok = await onConvert();
        if (!ok) throw new Error("Conversion aborted");
      } else {
        // Simulate async multi-threaded WASM transcoding steps
        await new Promise((r) => setTimeout(r, 600));
        setProgress(45);
        triggerTap({ volume: 0.4 }); // Intermediate progress detent

        await new Promise((r) => setTimeout(r, 700));
        setProgress(85);
        triggerTap({ volume: 0.5 });

        await new Promise((r) => setTimeout(r, 500));
        setProgress(100);

        if (simulateError) {
          throw new Error("Transcode buffer parity failed");
        }
      }

      // 2. Fire success fanfare & ascending haptics
      triggerSuccess();
      setStatus("success");
    } catch {
      // 3. Fire dual alert tone & 6-pulse stutter buzz
      triggerError();
      setStatus("error");
    }
  };

  return (
    <div className={`relative inline-flex flex-col items-center gap-2 select-none ${className}`}>
      <motion.button
        type="button"
        onClick={handleClick}
        onHoverStart={() => {
          if (status === "idle") {
            triggerTap({ volume: 0.35, hapticOnly: false });
          }
        }}
        onTapStart={() => {
          triggerTap({ volume: 0.8 });
        }}
        disabled={status === "processing"}
        whileHover={status === "idle" ? { scale: 1.02 } : {}}
        whileTap={status === "idle" ? { scale: 0.96 } : {}}
        className={`relative overflow-hidden rounded-2xl px-6 py-3.5 font-display text-sm font-bold tracking-wide transition-all shadow-elevation2 cursor-pointer ${
          status === "idle"
            ? "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white shadow-red-500/25 hover:shadow-red-500/40 border border-red-400/30"
            : status === "processing"
            ? "bg-card/90 text-foreground border border-primary/40 shadow-primary/20"
            : status === "success"
            ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/25 border border-emerald-400/40"
            : "bg-gradient-to-r from-rose-700 to-red-800 text-white shadow-red-500/25 border border-red-500/40"
        }`}
      >
        {/* Animated Progress Bar Fill during WASM execution */}
        {status === "processing" && (
          <motion.div
            className="absolute inset-0 bg-primary/20"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          />
        )}

        <div className="relative z-10 flex items-center justify-center gap-2.5">
          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.span
                key="idle"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2"
              >
                <Cpu className="size-4 text-amber-300" />
                <span>{label}</span>
                <Sparkles className="size-3.5 text-amber-200" />
              </motion.span>
            )}

            {status === "processing" && (
              <motion.span
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 text-primary font-mono text-xs font-semibold"
              >
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>TRANSMUXING IN WEBASSEMBLY… ({progress}%)</span>
              </motion.span>
            )}

            {status === "success" && (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 font-display text-xs"
              >
                <CheckCircle2 className="size-4 text-emerald-200" />
                <span>CONVERTED SUCCESSFULLY · CLICK TO RESET</span>
              </motion.span>
            )}

            {status === "error" && (
              <motion.span
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-2 font-display text-xs"
              >
                <AlertCircle className="size-4 text-rose-200" />
                <span>PROCESSING ERROR · CLICK TO RETRY</span>
                <RotateCcw className="size-3.5 ml-1 text-rose-200" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.button>

      {/* Sensory Telemetry Subtitle */}
      <span className="font-mono text-[10px] text-muted-foreground/80 flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Sensory Feedback Active · 0ms Web Audio + Capacitor Haptics</span>
      </span>
    </div>
  );
}
