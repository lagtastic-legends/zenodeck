"use client";

/**
 * ZenoDeck / ZenoTap — Smart Clipboard Listener Pill
 *
 * Monitors clipboard activity upon window focus or app resume.
 * Surfaces an ergonomic 1-tap action pill when copied media or image URLs
 * are detected, enabling headless background conversion ("Compress", "To GIF", "To Sticker").
 * Polished with Framer Motion spring physics and tactile sensory clicks.
 */

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clipboard, Image as ImageIcon, Zap, Sparkles, X } from "lucide-react";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

export type ClipboardActionType = "compress" | "to-gif" | "to-sticker";

export interface ZenoTapClipboardPillProps {
  onAction?: (action: ClipboardActionType, payload: Blob | string) => void;
  className?: string;
}

interface DetectedClipboardItem {
  type: "image" | "url" | "text";
  blob?: Blob;
  text?: string;
  previewUrl?: string;
}

export function ZenoTapClipboardPill({ onAction, className = "" }: ZenoTapClipboardPillProps) {
  const [detectedItem, setDetectedItem] = useState<DetectedClipboardItem | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const sensory = useSensoryFeedback();

  const inspectClipboard = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.clipboard) return;

    try {
      // 1. Try reading rich clipboard items (images, blobs)
      if (typeof navigator.clipboard.read === "function") {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imageType = item.types.find((t) => t.startsWith("image/"));
            if (imageType) {
              const blob = await item.getType(imageType);
              const previewUrl = URL.createObjectURL(blob);
              setDetectedItem({ type: "image", blob, previewUrl });
              setIsDismissed(false);
              return;
            }
          }
        } catch {
          // Fall through to text read if permissions restrict raw image read
        }
      }

      // 2. Try reading clipboard text (URLs, image links)
      if (typeof navigator.clipboard.readText === "function") {
        const text = (await navigator.clipboard.readText()).trim();
        const isMediaUrl =
          (text.startsWith("http://") || text.startsWith("https://")) &&
          (/\.(png|jpe?g|webp|gif|mp4|mov)($|\?)/i.test(text) ||
            /imgur|giphy|tenor|discordapp|cdn/i.test(text));

        if (isMediaUrl) {
          setDetectedItem({ type: "url", text });
          setIsDismissed(false);
          return;
        }
      }
    } catch {
      // Graceful silent fallback on permission deny
    }
  }, []);

  useEffect(() => {
    inspectClipboard();

    const handleFocus = () => {
      inspectClipboard();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
      if (detectedItem?.previewUrl) {
        URL.revokeObjectURL(detectedItem.previewUrl);
      }
    };
  }, [inspectClipboard, detectedItem?.previewUrl]);

  const handleTriggerAction = (action: ClipboardActionType) => {
    sensory.triggerTap();
    if (!detectedItem) return;

    const payload = detectedItem.blob || detectedItem.text || "";
    onAction?.(action, payload);
    setIsDismissed(true);
  };

  const handleDismiss = () => {
    sensory.triggerTap({ hapticOnly: true });
    setIsDismissed(true);
  };

  if (!detectedItem || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -14, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -14, scale: 0.94 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className={`relative flex items-center gap-2 rounded-full border border-cyan-500/35 bg-card/95 px-3.5 py-1.5 shadow-[0_4px_24px_rgba(6,182,212,0.18)] backdrop-blur-xl font-mono text-[11px] panel-hud ${className}`}
      >
        <div className="flex items-center gap-1.5 text-cyan-400 shrink-0">
          <Clipboard className="size-3.5 animate-pulse" />
          <span className="font-semibold text-[10px] tracking-wide uppercase">
            {detectedItem.type === "image" ? "Image Copied" : "Media Link"}
          </span>
        </div>

        <div className="h-3.5 w-px bg-border/60 mx-0.5" />

        <div className="flex items-center gap-1.5 shrink-0">
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => handleTriggerAction("compress")}
            className="flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-foreground hover:bg-secondary hover:text-white transition-colors cursor-pointer text-[10px]"
            title="Compress copied media"
          >
            <Zap className="size-2.5 text-amber-400" />
            <span>Compress</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => handleTriggerAction("to-gif")}
            className="flex items-center gap-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 hover:bg-indigo-500/30 transition-colors cursor-pointer text-[10px]"
            title="Convert to GIF for ZenoTap"
          >
            <Sparkles className="size-2.5 text-indigo-400" />
            <span>To GIF</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => handleTriggerAction("to-sticker")}
            className="flex items-center gap-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 hover:bg-emerald-500/30 transition-colors cursor-pointer text-[10px]"
            title="Convert to transparent Sticker"
          >
            <ImageIcon className="size-2.5 text-emerald-400" />
            <span>Sticker</span>
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.85 }}
          type="button"
          onClick={handleDismiss}
          className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Dismiss clipboard pill"
        >
          <X className="size-3" />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
