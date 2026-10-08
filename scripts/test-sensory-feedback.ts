/**
 * Test Suite for ZenoDeck Sensory Feedback Engine (Phases 1 - 4)
 */

import { HAPTIC_PATTERNS, isVibrationSupported, triggerHaptic, cancelHaptic } from "../src/lib/sensory/haptic-patterns";

function runSensoryTests() {
  console.log("=== Testing ZenoDeck Sensory Feedback Engine ===");

  // 1. Verify exact millisecond haptic arrays
  console.log("1. Validating Haptic Patterns...");
  const expectedPatterns = {
    lightTap: [10],
    toggleOn: [15, 30, 15],
    toggleOff: [10, 40, 10],
    success: [30, 60, 50],
    error: [20, 20, 20, 20, 20, 20],
  };

  for (const [key, expected] of Object.entries(expectedPatterns)) {
    const actual = (HAPTIC_PATTERNS as any)[key];
    if (!actual || JSON.stringify(actual) !== JSON.stringify(expected)) {
      console.error(`[FAIL] Pattern ${key} does not match exact specification. Expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
      process.exit(1);
    }
    console.log(`  ✓ PASS: Haptic pattern '${key}' matches exact ms array: ${JSON.stringify(actual)}`);
  }

  // 2. Verify Silent Degradation on non-vibrating platforms
  console.log("2. Validating Silent Degradation...");
  try {
    const supported = isVibrationSupported();
    console.log(`  ✓ PASS: isVibrationSupported() handled cleanly in runtime (result: ${supported})`);

    // Must not throw in Node / non-browser environment
    triggerHaptic("lightTap");
    triggerHaptic("toggleOn");
    triggerHaptic("toggleOff");
    triggerHaptic("success");
    triggerHaptic("error");
    cancelHaptic();
    console.log("  ✓ PASS: triggerHaptic and cancelHaptic fail silently without throwing exceptions");
  } catch (err) {
    console.error("[FAIL] triggerHaptic threw an error in unsupported environment:", err);
    process.exit(1);
  }

  console.log("\n*** ALL SENSORY FEEDBACK TESTS PASSED (100%)! ***\n");
}

runSensoryTests();
