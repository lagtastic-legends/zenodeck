import type { CSSProperties } from "react";
import type { Transition } from "framer-motion";

/**
 * 120Hz Tuned FLIP App-Launch Spring
 * Slightly underdamped for immediate thumb response with zero bounce overshoot.
 */
export const APP_LAUNCH_SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

/**
 * Recessed Background Hub Depth Parallax Spring
 */
export const HUB_PARALLAX_SPRING: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 32,
  mass: 0.9,
};

/**
 * Phase-B Post-Hydration Workspace Crossfade
 */
export const WORKSPACE_HYDRATE_TRANSITION: Transition = {
  duration: 0.16,
  ease: [0.22, 1, 0.36, 1],
};

/**
 * Fast Unmount Transition so heavy Wasm/WebAudio views clear before shell shrink
 */
export const WORKSPACE_EXIT_TRANSITION: Transition = {
  duration: 0.08,
  ease: "easeOut",
};

/**
 * Deterministic Shared Layout ID Generators
 */
export const getZenoShellLayoutId = (toolId: string) => `zeno-shell-${toolId}`;
export const getZenoIconLayoutId = (toolId: string) => `zeno-icon-${toolId}`;
export const getZenoTitleLayoutId = (toolId: string) => `zeno-title-${toolId}`;

/**
 * Hardware Layer Promotion Style (prevents sub-pixel font jitter during FLIP morph)
 */
export const GPU_ACCELERATED_STYLE: CSSProperties = {
  willChange: "transform, border-radius",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  transform: "translateZ(0)",
};
