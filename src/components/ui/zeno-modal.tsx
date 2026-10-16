"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { X } from "lucide-react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";

export type ZenoModalBadgeTone = "emerald" | "cyan" | "violet" | "amber" | "rose" | "zinc";
export type ZenoModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ZenoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  badgeTone?: ZenoModalBadgeTone;
  size?: ZenoModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClassName?: string; // e.g. "sm:max-w-md", "sm:max-w-xl", "sm:max-w-2xl"
  overlayId?: string;
  showCloseButton?: boolean;
  preventBackdropClose?: boolean;
}

const TONE_CLASSES: Record<ZenoModalBadgeTone, string> = {
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  violet: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  rose: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  zinc: "border-border/60 bg-secondary text-muted-foreground",
};

const SIZE_CLASSES: Record<ZenoModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-2xl",
  full: "sm:max-w-4xl",
};

export function ZenoModal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  badgeTone = "zinc",
  size,
  children,
  footer,
  maxWidthClassName = "sm:max-w-lg",
  overlayId = "zeno-modal",
  showCloseButton = true,
  preventBackdropClose = false,
}: ZenoModalProps) {
  const effectiveMaxWidth = size ? SIZE_CLASSES[size] : maxWidthClassName;
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const haptics = useHaptics();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Body scroll lock & haptic notification on open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      haptics.impact("light");
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, haptics]);

  // Back button & Escape key integration
  useEffect(() => {
    if (!isOpen) return;

    const unregisterBack = useNavStore.getState().registerOverlay(overlayId, () => {
      haptics.impact("light");
      onClose();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        haptics.impact("light");
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unregisterBack();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, overlayId, haptics]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.y > 100 || info.velocity.y > 400) {
      haptics.impact("medium");
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (preventBackdropClose) return;
    if (e.target === e.currentTarget) {
      haptics.impact("light");
      onClose();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pointer-events-auto"
        >
          {/* Backdrop with ambient blur and theme-adaptive darkening */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-background/80 dark:bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container: Bottom sheet on mobile (<640px), Floating HUD on tablet/desktop (>=640px) */}
          <motion.div
            ref={modalRef}
            drag={isMobile ? "y" : false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={isMobile ? handleDragEnd : undefined}
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.94, y: 14 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`relative flex flex-col w-full ${effectiveMaxWidth} max-h-[92dvh] sm:max-h-[86dvh] rounded-t-3xl sm:rounded-2xl border-t sm:border border-border/80 bg-card/95 text-foreground backdrop-blur-2xl shadow-2xl overflow-hidden`}
          >
            {/* Top Drag Indicator Pill (Mobile only) */}
            <div className="flex sm:hidden justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <span className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Pinned Sticky Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6 sm:py-4 border-b border-border/60 bg-card/70 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {icon && (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary shadow-xs">
                    {icon}
                  </div>
                )}
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm sm:text-base font-bold text-foreground tracking-wide truncate">
                      {title}
                    </h3>
                    {badge && (
                      <div className="shrink-0">
                        {React.isValidElement(badge) ? (
                          badge
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border font-mono text-[9px] font-bold uppercase tracking-wider ${
                              TONE_CLASSES[badgeTone] || TONE_CLASSES.zinc
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {subtitle && (
                    <div className="font-mono text-[11px] text-muted-foreground truncate">
                      {subtitle}
                    </div>
                  )}
                </div>
              </div>

              {showCloseButton && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.impact("light");
                    onClose();
                  }}
                  aria-label="Close dialog"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95 cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              )}
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 min-h-0">
              {children}
            </div>

            {/* Pinned Sticky Footer */}
            {footer && (
              <div className="border-t border-border/60 bg-card/90 px-4 py-3 sm:px-6 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
