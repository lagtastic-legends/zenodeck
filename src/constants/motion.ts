import type { CSSProperties } from "react";
import type { Transition } from "framer-motion";

/**
 * 120Hz Tuned FLIP App-Launch Spring
 * Critically-damped, zero-overshoot silk curve that settles cleanly without tail micro-jitter.
 */
export const APP_LAUNCH_SPRING: Transition = {
  type: "spring",
  stiffness: 360,
  damping: 36,
  mass: 0.72,
  restDelta: 0.005,
  restSpeed: 0.005,
};

/**
 * Recessed Background Hub Depth Parallax Spring
 */
export const HUB_PARALLAX_SPRING: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 35,
  mass: 0.8,
  restDelta: 0.005,
  restSpeed: 0.005,
};

/**
 * Phase-B Post-Hydration Workspace Crossfade
 */
export const WORKSPACE_HYDRATE_TRANSITION: Transition = {
  duration: 0.14,
  ease: [0.22, 1, 0.36, 1],
};

/**
 * Fast Unmount Transition so heavy Wasm/WebAudio views clear before shell shrink
 */
export const WORKSPACE_EXIT_TRANSITION: Transition = {
  duration: 0.06,
  ease: "easeOut",
};

/**
 * Deterministic Shared Layout ID Generators
 */
export const getZenoShellLayoutId = (toolId: string) => `zeno-shell-${toolId}`;
export const getZenoIconLayoutId = (toolId: string) => `zeno-icon-${toolId}`;
export const getZenoTitleLayoutId = (toolId: string) => `zeno-title-${toolId}`;

/**
 * Hardware Layer Promotion Style (pure compositor transform and containment)
 */
export const GPU_ACCELERATED_STYLE: CSSProperties = {
  willChange: "transform, opacity",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  transform: "translateZ(0)",
  contain: "layout style paint",
};
