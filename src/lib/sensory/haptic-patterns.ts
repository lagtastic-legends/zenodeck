/**
 * ============================================================================
 * ZenoDeck Sensory Architecture — Phase 2: The Haptic Engine Map
 * File: src/lib/sensory/haptic-patterns.ts
 * ============================================================================
 * Strict millisecond vibration pattern definitions and safe execution engine.
 * - Enforces zero-allocation exact vibration arrays.
 * - Safely detects navigator.vibrate with graceful silent degradation.
 * - Seamlessly bridges with Capacitor Haptics on Android/iOS native runtime.
 */

import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Exact millisecond vibration arrays specified for tactile UI interactions.
 */
export const HAPTIC_PATTERNS = {
  /** Crisp 10ms click for button hover/touchdown/selection */
  lightTap: [10],
  /** Dual detent snap for state activation: [15ms pulse, 30ms pause, 15ms pulse] */
  toggleOn: [15, 30, 15],
  /** Asymmetric detent for state deactivation: [10ms pulse, 40ms pause, 10ms pulse] */
  toggleOff: [10, 40, 10],
  /** Ascending tactile fanfare: [30ms pulse, 60ms pause, 50ms pulse] */
  success: [30, 60, 50],
  /** Rapid stutter buzz: 6 x 20ms pulses interleaved with 20ms pauses */
  error: [20, 20, 20, 20, 20, 20],
  /** Charging pulse for process initialization */
  processStart: [15, 40, 25],
} as const;

export type HapticPatternName = keyof typeof HAPTIC_PATTERNS;
export type HapticVibrationPattern = readonly number[] | number[];

/**
 * Checks if the Web Vibration API is natively supported and enabled.
 */
export function isVibrationSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return typeof navigator.vibrate === "function";
}

/**
 * Checks if running inside a native mobile container (Capacitor Android/iOS).
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

/**
 * Executes a tactile haptic pattern with 100% silent degradation.
 * Never throws exceptions on non-vibrating devices, desktop browsers,
 * or environments with restricted user-activation permissions.
 *
 * @param pattern - Name of the pre-mapped pattern or custom millisecond array
 */
export async function triggerHaptic(
  pattern: HapticPatternName | HapticVibrationPattern
): Promise<void> {
  // Resolve array from pattern name or direct array
  const patternArray: readonly number[] =
    typeof pattern === "string"
      ? HAPTIC_PATTERNS[pattern]
      : pattern;

  if (!patternArray || patternArray.length === 0) return;

  // 1. Native Mobile Runtime (Capacitor Android APK / iOS)
  if (isNativePlatform()) {
    try {
      if (typeof pattern === "string") {
        switch (pattern) {
          case "lightTap":
            await Haptics.impact({ style: ImpactStyle.Light });
            return;
          case "toggleOn":
          case "toggleOff":
          case "processStart":
            await Haptics.impact({ style: ImpactStyle.Medium });
            return;
          case "success":
            await Haptics.notification({ type: NotificationType.Success });
            return;
          case "error":
            await Haptics.notification({ type: NotificationType.Error });
            return;
        }
      }

      // If array or unmapped pattern, fallback to selectionChanged or vibrate
      await Haptics.vibrate({
        duration: patternArray[0] || 10,
      });
      return;
    } catch {
      // Silently fall through to Navigator.vibrate
    }
  }

  // 2. Web Vibration API (Mobile Chrome, Firefox Android, Safari iOS where enabled)
  try {
    if (isVibrationSupported()) {
      // Clone array to mutable numbers for navigator.vibrate signature
      navigator.vibrate([...patternArray]);
    }
  } catch {
    // Fail silently without disrupting UI/thread execution
  }
}

/**
 * Cancels any currently active vibration pattern immediately.
 */
export function cancelHaptic(): void {
  try {
    if (isVibrationSupported()) {
      navigator.vibrate(0);
    }
  } catch {
    // Fail silently
  }
}
