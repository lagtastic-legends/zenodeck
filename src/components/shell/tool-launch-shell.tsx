"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
import { ArrowLeft, Sparkles, ChevronLeft } from "lucide-react";
import { App as CapacitorApp } from "@capacitor/app";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useEdgeSwipeBack } from "@/hooks/use-edge-swipe-back";
import {
  APP_LAUNCH_SPRING,
  WORKSPACE_HYDRATE_TRANSITION,
  WORKSPACE_EXIT_TRANSITION,
  GPU_ACCELERATED_STYLE,
  getZenoShellLayoutId,
  getZenoIconLayoutId,
  getZenoTitleLayoutId,
} from "@/constants/motion";

export interface ToolLaunchShellProps {
  toolId: string | null;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function ToolLaunchShell({
  toolId,
  title,
  subtitle,
  icon,
  onClose,
  headerActions,
  children,
}: ToolLaunchShellProps) {
  const [isWorkspaceHydrated, setIsWorkspaceHydrated] = useState(false);

  // Left-to-right mobile edge swipe gesture engine
  const { swipeX, isSwiping, touchHandlers } = useEdgeSwipeBack({
    enabled: Boolean(toolId),
    onBack: () => {
      void useNavStore.getState().handleBack();
    },
  });

  // Pull-to-dismiss motion values
  const dragY = useMotionValue(0);
  const shellScale = useTransform(dragY, [0, 260], [1, 0.9]);
  const shellBorderRadius = useTransform(dragY, [0, 180], [0, 28]);

  // Phase A -> Phase B Post-Settle Double-RAF Hydration Lifecycle
  const triggerSmoothHydration = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsWorkspaceHydrated(true);
      });
    });
  }, []);

  useEffect(() => {
    if (!toolId) {
      setIsWorkspaceHydrated(false);
      dragY.set(0);
      return;
    }

    setIsWorkspaceHydrated(false);
    dragY.set(0);

    // Safety fallback timer (240ms post-settle; safety fallback threshold reference: 180)
    const timer = window.setTimeout(() => {
      triggerSmoothHydration();
    }, 240);

    return () => window.clearTimeout(timer);
  }, [toolId, dragY, triggerSmoothHydration]);

  // Sub-Phase 4: Intercept Android Hardware Back Gesture via @capacitor/app & NavStack
  useEffect(() => {
    if (!toolId) return;

    let listenerHandle: { remove: () => Promise<void> } | null = null;
    let isMounted = true;

    CapacitorApp.addListener("backButton", () => {
      void useNavStore.getState().handleBack();
    })
      .then((handle) => {
        if (isMounted) {
          listenerHandle = handle;
        } else {
          handle.remove();
        }
      })
      .catch(() => {
        // Fallback for non-Capacitor browser environments
      });

    return () => {
      isMounted = false;
      if (listenerHandle) {
        listenerHandle.remove().catch(() => {});
      }
    };
  }, [toolId, onClose]);

  const handleHeaderDrag = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const clampedY = Math.max(0, info.offset.y);
      dragY.set(clampedY);
    },
    [dragY]
  );

  const handleHeaderDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 90 || info.velocity.y > 550) {
        onClose();
      } else {
        animate(dragY, 0, { type: "spring", stiffness: 500, damping: 35 });
      }
    },
    [dragY, onClose]
  );

  return (
    <AnimatePresence>
      {toolId && (
        <motion.section
          key={toolId}
          layoutId={getZenoShellLayoutId(toolId)}
          transition={APP_LAUNCH_SPRING}
          initial={{ opacity: 0.92 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.16, ease: [0.32, 0.72, 0, 1] } }}
          onLayoutAnimationComplete={triggerSmoothHydration}
          onAnimationComplete={triggerSmoothHydration}
          {...touchHandlers}
          style={{
            ...GPU_ACCELERATED_STYLE,
            scale: shellScale,
            borderRadius: shellBorderRadius,
          }}
          className="fixed inset-0 z-50 flex flex-col bg-[#090D0C] text-[#F7E7CE] overflow-hidden border border-[#A79277]/20"
        >
          {/* Edge Swipe Back Chevron Indicator */}
          <AnimatePresence>
            {isSwiping && swipeX > 8 && (
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: Math.min(1, swipeX / 40), x: Math.min(swipeX * 0.4, 20) }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.1 }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-[#102C26]/95 border border-[#F7E7CE]/40 text-[#F7E7CE] shadow-2xl backdrop-blur-md pointer-events-none"
              >
                <ChevronLeft className="h-6 w-6 animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Velocity Pull-to-Dismiss Header & Drag Pill */}
          <motion.header
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDrag={handleHeaderDrag}
            onDragEnd={handleHeaderDragEnd}
            className="relative z-20 flex flex-col select-none bg-[#102C26] border-b border-[#A79277]/20 px-3 sm:px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 touch-none"
          >
            {/* Tactile Pull Handle Pill */}
            <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-[#A79277]/45" />

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => void useNavStore.getState().handleBack()}
                  aria-label="Back to ZenoDeck Hub"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#090D0C]/60 border border-[#A79277]/30 text-[#F7E7CE] active:scale-95 transition-transform cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>

                {/* getZenoIconLayoutId(toolId) — single-surface FLIP avoids child icon distortion */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#102C26] border border-[#F7E7CE]/20 text-[#F7E7CE]"
                >
                  {icon ?? <Sparkles className="h-5 w-5 text-[#F7E7CE]" />}
                </div>

                <div className="min-w-0">
                  {/* getZenoTitleLayoutId(toolId) — single-surface FLIP avoids child font snapping */}
                  <h2
                    className="truncate text-base font-bold tracking-tight text-[#F7E7CE]"
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="truncate text-xs text-[#A79277]">{subtitle}</p>
                  )}
                </div>
              </div>

              {headerActions && (
                <div className="flex items-center gap-2 shrink-0">
                  {headerActions}
                </div>
              )}
            </div>
          </motion.header>

          {/* Two-Phase Deferred Hydration Body */}
          <div className="relative flex-1 overflow-y-auto overflow-x-hidden pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
            <AnimatePresence mode="sync">
              {!isWorkspaceHydrated ? (
                <motion.div
                  key="zeno-shell-skeleton"
                  initial={{ opacity: 0.85 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: WORKSPACE_EXIT_TRANSITION }}
                  className="p-5 space-y-4"
                >
                  <div className="h-44 w-full rounded-2xl bg-[#102C26]/40 border border-[#A79277]/20" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-24 rounded-2xl bg-[#102C26]/25 border border-[#A79277]/15" />
                    <div className="h-24 rounded-2xl bg-[#102C26]/25 border border-[#A79277]/15" />
                  </div>
                  <div className="h-14 w-full rounded-xl bg-[#F7E7CE]/10" />
                </motion.div>
              ) : (
                <motion.div
                  key="zeno-hydrated-workspace"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: WORKSPACE_EXIT_TRANSITION }}
                  transition={WORKSPACE_HYDRATE_TRANSITION}
                  className="h-full w-full"
                >
                  {children}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
