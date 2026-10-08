"use client";

/**
 * ============================================================================
 * ZenoDeck Sensory Architecture — Phase 3: The Unified Custom Hook
 * File: src/hooks/useSensoryFeedback.ts
 * ============================================================================
 * Unified sensory dispatch hook combining zero-latency Web Audio API pre-decoded
 * buffers with exact millisecond haptic tactile pulses.
 * - Simulates mechanical switch physics and high-precision tactile feedback.
 * - Fires audio and haptic feedback simultaneously.
 * - Exposes semantic methods: triggerTap, triggerToggle, triggerProcessStart,
 *   triggerSuccess, triggerError.
 */

import { useCallback } from "react";
import { useSensoryContext } from "@/components/sensory/SensoryProvider";
import { triggerHaptic, cancelHaptic } from "@/lib/sensory/haptic-patterns";

export interface SensoryFeedbackOptions {
  /** Optional volume multiplier for audio (0.0 to 1.0) */
  volume?: number;
  /** If true, fires only the haptic vibration pattern */
  hapticOnly?: boolean;
  /** If true, fires only the audio sound effect */
  audioOnly?: boolean;
}

export interface SensoryFeedbackHook {
  /** Crisp 10ms click on button hover, touch down, or mechanical keypress */
  triggerTap: (options?: SensoryFeedbackOptions) => void;
  /** State-aware mechanical switch actuation (rising on true, falling on false) */
  triggerToggle: (state: boolean, options?: SensoryFeedbackOptions) => void;
  /** Resonant charging hum & pulse on job submission / WASM processing boot */
  triggerProcessStart: (options?: SensoryFeedbackOptions) => void;
  /** Harmonic success chime + ascending tactile fanfare on job completion */
  triggerSuccess: (options?: SensoryFeedbackOptions) => void;
  /** Damped dual alert tone + rapid 6-pulse stutter buzz on failure or abort */
  triggerError: (options?: SensoryFeedbackOptions) => void;
  /** Stops any ongoing tactile vibration pattern */
  cancelHaptics: () => void;
  /** Whether sensory audio is currently muted */
  isMuted: boolean;
  /** Toggle or set sensory audio mute state */
  setMuted: (muted: boolean) => void;
  /** Master volume for sensory audio (0.0 to 1.0) */
  masterVolume: number;
  /** Set master volume for sensory audio */
  setMasterVolume: (volume: number) => void;
}

/**
 * useSensoryFeedback — Hook for synchronized audio-tactile sensory feedback.
 */
export function useSensoryFeedback(): SensoryFeedbackHook {
  const { playSound, isMuted, setMuted, masterVolume, setMasterVolume } =
    useSensoryContext();

  /**
   * 1. triggerTap: Light tap (10ms haptic + 25ms mechanical snap)
   */
  const triggerTap = useCallback(
    (options?: SensoryFeedbackOptions) => {
      if (!options?.audioOnly) {
        void triggerHaptic("lightTap");
      }
      if (!options?.hapticOnly) {
        playSound("tap", options?.volume ?? 1.0);
      }
    },
    [playSound]
  );

  /**
   * 2. triggerToggle: Toggle switch state actuation (rising detent on true, falling detent on false)
   */
  const triggerToggle = useCallback(
    (state: boolean, options?: SensoryFeedbackOptions) => {
      const hapticPattern = state ? "toggleOn" : "toggleOff";
      const soundId = state ? "toggleOn" : "toggleOff";

      if (!options?.audioOnly) {
        void triggerHaptic(hapticPattern);
      }
      if (!options?.hapticOnly) {
        playSound(soundId, options?.volume ?? 1.0);
      }
    },
    [playSound]
  );

  /**
   * 3. triggerProcessStart: Processing initialization hum & ramp pulse
   */
  const triggerProcessStart = useCallback(
    (options?: SensoryFeedbackOptions) => {
      if (!options?.audioOnly) {
        void triggerHaptic("processStart");
      }
      if (!options?.hapticOnly) {
        playSound("processStart", options?.volume ?? 1.0);
      }
    },
    [playSound]
  );

  /**
   * 4. triggerSuccess: Completion fanfare & ascending tactile confirmation
   */
  const triggerSuccess = useCallback(
    (options?: SensoryFeedbackOptions) => {
      if (!options?.audioOnly) {
        void triggerHaptic("success");
      }
      if (!options?.hapticOnly) {
        playSound("success", options?.volume ?? 1.0);
      }
    },
    [playSound]
  );

  /**
   * 5. triggerError: Dual alert tone & 6-pulse stutter buzz
   */
  const triggerError = useCallback(
    (options?: SensoryFeedbackOptions) => {
      if (!options?.audioOnly) {
        void triggerHaptic("error");
      }
      if (!options?.hapticOnly) {
        playSound("error", options?.volume ?? 1.0);
      }
    },
    [playSound]
  );

  return {
    triggerTap,
    triggerToggle,
    triggerProcessStart,
    triggerSuccess,
    triggerError,
    cancelHaptics: cancelHaptic,
    isMuted,
    setMuted,
    masterVolume,
    setMasterVolume,
  };
}
