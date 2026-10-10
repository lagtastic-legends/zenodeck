"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Layers, Play } from "lucide-react";
import {
  type EditorTransition,
  TRANSITION_PRESETS,
} from "@/lib/video-engine/transitions";
import { useHaptics } from "@/hooks/use-haptics";

interface MobileTransitionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  transition: EditorTransition;
  onChangeTransition: (t: EditorTransition) => void;
  clipsCount: number;
  onTestPreview?: () => void;
}

/**
 * MobileTransitionsDrawer — Gesture-enabled bottom sheet for mobile transition selection.
 *
 * Designed for one-handed mobile touch interaction:
 * - Fluid spring slide-up and drag-down-to-dismiss.
 * - Tactile preset selection with category filters.
 * - Real-time duration adjustment slider with haptic feedback.
 */
export function MobileTransitionsDrawer({
  isOpen,
  onClose,
  transition,
  onChangeTransition,
  clipsCount,
  onTestPreview,
}: MobileTransitionsDrawerProps) {
  const haptics = useHaptics();

  // Escape key handler & scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Drawer Sheet Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transitions-drawer-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 400) {
                onClose();
              }
            }}
            className="relative z-10 w-full bg-[#181818] border-t border-white/10 rounded-t-3xl max-h-[82vh] flex flex-col shadow-2xl overflow-hidden pb-safe"
          >
            {/* Top ambient glow line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

            {/* Grab Handle */}
            <div className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-cyan-400" />
                <h3 id="transitions-drawer-title" className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                  Transitions Studio
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {onTestPreview && clipsCount > 1 && (
                  <button
                    onClick={() => {
                      onTestPreview();
                      void haptics.light();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold cursor-pointer"
                  >
                    <Play className="size-3 fill-current" />
                    <span>Preview</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  aria-label="Close transitions studio"
                  className="p-1 rounded-full bg-white/5 text-[#94A3B8] hover:text-white cursor-pointer transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {clipsCount < 2 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                  Transitions connect 2 or more clips. Tap <strong className="text-white">Split</strong> on the bottom deck first!
                </div>
              )}

              {/* Duration Slider */}
              <div className="bg-[#121212] p-3.5 rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#94A3B8] flex items-center gap-1.5">
                    <Sparkles className="size-3 text-cyan-400" />
                    Transition Duration
                  </span>
                  <span className="text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {transition.duration.toFixed(2)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={transition.duration}
                  onChange={(e) => {
                    onChangeTransition({
                      ...transition,
                      duration: parseFloat(e.target.value),
                    });
                    void haptics.selectionChanged();
                  }}
                  className="w-full accent-cyan-400 h-1.5 cursor-pointer bg-white/10 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono">
                  <span>0.2s Quick</span>
                  <span>0.5s Standard</span>
                  <span>1.0s Cinematic</span>
                </div>
              </div>

              {/* Transitions Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {TRANSITION_PRESETS.map((preset) => {
                  const isSelected = transition.type === preset.type;
                  return (
                    <button
                      key={preset.type}
                      onClick={() => {
                        onChangeTransition({ ...transition, type: preset.type });
                        void haptics.light();
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[88px] relative overflow-hidden active:scale-98 ${
                        isSelected
                          ? "bg-gradient-to-br from-blue-900/50 via-cyan-950/40 to-slate-900 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                          : "bg-[#121212] border-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-white font-mono">
                          {preset.label}
                        </span>
                        {isSelected && (
                          <span className="size-4 rounded-full bg-cyan-400 text-black flex items-center justify-center text-[10px] font-bold">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#94A3B8] line-clamp-2 mt-1">
                        {preset.description}
                      </p>
                      <span className="text-[9px] uppercase tracking-wider text-cyan-400/80 font-mono mt-1">
                        {preset.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
