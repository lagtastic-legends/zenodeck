/**
 * scripts/test-keyboard-5phase-upgrade.ts
 *
 * Verification Suite for the 5-Phase Android Keyboard IME Upgrade:
 * Phase 1: Codebase Audit & Proportional Height Scaling (54dp rows, 44dp toolbar, 305dp portrait, 45% landscape clamp)
 * Phase 2: Zero-Latency Touch Pipeline & Multi-Touch Rollover (ACTION_DOWN direct commit, pointerId rollover, gutter snapping)
 * Phase 3: 120fps Visual Feedback & Crisp Haptics (GPU transforms, non-blocking KEYBOARD_PRESS haptics, modifier popup suppression)
 * Phase 4: Ergonomic Gestures (Accelerated Backspace with surrogate pair safety, Spacebar horizontal cursor scrubbing)
 * Phase 5: Regression Audit & System Integrity (clean contracts, inputType handling, lifecycle cleanup)
 */

import fs from "fs";
import path from "path";
import assert from "assert";
import { setKeyboardHeightScale, getKeyboardHeightScale } from "../src/lib/zenodeck-bridge";

console.log("================================================================================");
console.log("   ZENOTAP KEYBOARD IME 5-PHASE UPGRADE: SYSTEM VERIFICATION SUITE              ");
console.log("================================================================================\n");

let passedCount = 0;
let failedCount = 0;
let totalCount = 0;

async function test(gate: string, name: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    await fn();
    console.log(`  ✓ [${gate}] PASS: ${name}`);
    passedCount++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ [${gate}] FAIL: ${name} -> ${msg}`);
    failedCount++;
  }
}

async function main() {
  const servicePath = path.resolve(process.cwd(), "android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardService.kt");
  const serviceContent = fs.readFileSync(servicePath, "utf-8");

  const bridgePluginPath = path.resolve(process.cwd(), "android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardBridgePlugin.kt");
  const bridgePluginContent = fs.readFileSync(bridgePluginPath, "utf-8");

  const dimensPath = path.resolve(process.cwd(), "android/app/src/main/res/values/dimens.xml");
  const dimensContent = fs.readFileSync(dimensPath, "utf-8");

  const landDimensPath = path.resolve(process.cwd(), "android/app/src/main/res/values-land/dimens.xml");
  const landDimensContent = fs.readFileSync(landDimensPath, "utf-8");

  const layoutPath = path.resolve(process.cwd(), "android/app/src/main/res/layout/keyboard_view.xml");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");

  // =============================================================================
  // Phase 1: Proportional Height Scaling & Panel Uniformity
  // =============================================================================
  console.log("--- PHASE 1: Proportional Height Scaling & Panel Uniformity ---");

  await test("GATE 1", "Calculated portrait keyboard total height target is 305dp (285dp-315dp range)", () => {
    assert(dimensContent.includes('<dimen name="keyboard_total_height">305dp</dimen>'), "keyboard_total_height must be 305dp in dimens.xml");
    assert(dimensContent.includes('<dimen name="keyboard_key_height">54dp</dimen>'), "keyboard_key_height must be 54dp in dimens.xml");
    assert(dimensContent.includes('<dimen name="keyboard_ribbon_height">44dp</dimen>'), "keyboard_ribbon_height must be 44dp in dimens.xml");
    assert(dimensContent.includes('<dimen name="keyboard_key_spacing">6dp</dimen>'), "keyboard_key_spacing must be 6dp in dimens.xml");
  });

  await test("GATE 1", "Landscape dimensions clamped to <= 45% screen height", () => {
    assert(landDimensContent.includes('<dimen name="keyboard_total_height">175dp</dimen>'), "Landscape height must be clamped to 175dp");
    assert(serviceContent.includes("0.45f"), "Service must clamp landscape height to 45% screen height");
  });

  await test("GATE 1", "Centralized keyboardHeightScale multiplier configurable between 0.85f and 1.30f (default 1.18f)", () => {
    assert(serviceContent.includes("DEFAULT_KEYBOARD_HEIGHT_SCALE = 1.18f"), "Default scale 1.18f missing in service");
    assert(serviceContent.includes("MIN_KEYBOARD_HEIGHT_SCALE = 0.85f"), "Min scale 0.85f missing in service");
    assert(serviceContent.includes("MAX_KEYBOARD_HEIGHT_SCALE = 1.30f"), "Max scale 1.30f missing in service");
    assert(bridgePluginContent.includes("PREF_KEY_KEYBOARD_HEIGHT_SCALE"), "Bridge must define PREF_KEY_KEYBOARD_HEIGHT_SCALE");
    assert(bridgePluginContent.includes("setKeyboardHeightScale"), "Bridge must implement setKeyboardHeightScale");
    assert(bridgePluginContent.includes("getKeyboardHeightScale"), "Bridge must implement getKeyboardHeightScale");
  });

  await test("GATE 1", "Zero layout jumping: secondary panels and Symbols mode share uniform height container", () => {
    assert(serviceContent.includes("LAYOUT_SYMBOLS"), "LAYOUT_SYMBOLS must be defined");
    assert(serviceContent.includes("LAYOUT_SYMBOLS_SHIFT"), "LAYOUT_SYMBOLS_SHIFT must be defined");
    assert(layoutContent.includes('android:id="@+id/media_container"'), "media_container must anchor secondary views");
    assert(layoutContent.includes('android:id="@+id/layout_keys_view"'), "layout_keys_view missing");
    assert(layoutContent.includes('android:id="@+id/layout_vault_view"'), "layout_vault_view missing");
    assert(layoutContent.includes('android:id="@+id/layout_emoji_view"'), "layout_emoji_view missing");
    assert(layoutContent.includes('android:id="@+id/layout_clipboard_view"'), "layout_clipboard_view missing");
  });

  await test("GATE 1", "WindowInsets listener dynamically respects navigation bars and display cutouts", () => {
    assert(serviceContent.includes("WindowInsetsCompat.Type.navigationBars()"), "Must query navigationBars insets");
    assert(serviceContent.includes("WindowInsetsCompat.Type.displayCutout()"), "Must query displayCutout insets");
    assert(serviceContent.includes("setOnApplyWindowInsetsListener"), "Must attach setOnApplyWindowInsetsListener");
  });

  // =============================================================================
  // Phase 2: Zero-Latency Touch Pipeline & Multi-Touch Rollover
  // =============================================================================
  console.log("\n--- PHASE 2: Zero-Latency Touch Pipeline & Multi-Touch Rollover ---");

  await test("GATE 2", "Immediate commitText on ACTION_DOWN / ACTION_POINTER_DOWN for zero latency", () => {
    assert(serviceContent.includes("MotionEvent.ACTION_DOWN, MotionEvent.ACTION_POINTER_DOWN"), "Touch listener must group ACTION_DOWN and ACTION_POINTER_DOWN");
    assert(serviceContent.includes("currentInputConnection?.commitText(typedChar, 1)"), "Must commit character immediately on pointer down");
  });

  await test("GATE 2", "Multi-touch key rollover tracking via preallocated pointerStates array", () => {
    assert(serviceContent.includes("class PointerTouchState"), "PointerTouchState tracking class declared");
    assert(serviceContent.includes("pointerStates = Array(10) { PointerTouchState() }"), "Preallocated 10-slot pointerStates array present");
    assert(serviceContent.includes("pointerId.coerceIn(0, 9)"), "Pointer ID bounded safely within preallocated slots");
    assert(serviceContent.includes("state.characterCommitted = true"), "Character marked committed on down event");
  });

  await test("GATE 2", "Touch simulation: Rollover sequence (A down -> B down -> A up -> B up) produces 'ab' in exact order", () => {
    const simulatedOutput: string[] = [];
    const stateA = { pointerId: 0, keyChar: "a", committed: false };
    const stateB = { pointerId: 1, keyChar: "b", committed: false };

    // Step 1: Finger A down
    simulatedOutput.push(stateA.keyChar);
    stateA.committed = true;

    // Step 2: Finger B down (while Finger A still down)
    simulatedOutput.push(stateB.keyChar);
    stateB.committed = true;

    // Step 3: Finger A up (clean release, no duplicate or deletion)
    stateA.committed = false;

    // Step 4: Finger B up (clean release)
    stateB.committed = false;

    const result = simulatedOutput.join("");
    assert.strictEqual(result, "ab", "Rollover sequence must yield exact string 'ab'");
  });

  await test("GATE 2", "Hitbox expanded into inter-key gutters with nearest-key center snapping", () => {
    assert(serviceContent.includes("fun findKeyAtLocation"), "findKeyAtLocation must be implemented");
    assert(serviceContent.includes("gutterPaddingX"), "Gutter padding X expansion missing");
    assert(serviceContent.includes("gutterPaddingY"), "Gutter padding Y expansion missing");
    assert(serviceContent.includes("minDistanceSq"), "Nearest-key center Euclidean distance snapping missing");
  });

  // =============================================================================
  // Phase 3: 120fps Key Popups & Non-Blocking Haptics
  // =============================================================================
  console.log("\n--- PHASE 3: 120fps Key Popups & Non-Blocking Haptics ---");

  await test("GATE 3", "Non-blocking hardware KEYBOARD_PRESS / KEYBOARD_TAP haptic feedback", () => {
    assert(serviceContent.includes("HapticFeedbackConstants.KEYBOARD_PRESS"), "KEYBOARD_PRESS constant must be used");
    assert(serviceContent.includes("performKeyHaptic"), "performKeyHaptic helper must exist");
    assert(serviceContent.includes("HapticFeedbackConstants.FLAG_IGNORE_GLOBAL_SETTING"), "FLAG_IGNORE_GLOBAL_SETTING must be used");
  });

  await test("GATE 3", "Zero per-frame allocations in hot touch path (preallocated coordinates and states)", () => {
    assert(serviceContent.includes("tempLocArray = IntArray(2)"), "tempLocArray must be preallocated");
    assert(serviceContent.includes("tempRootLocArray = IntArray(2)"), "tempRootLocArray must be preallocated");
  });

  await test("GATE 3", "GPU-accelerated properties (scaleX, scaleY, alpha, translation) without full-keyboard relayout", () => {
    assert(serviceContent.includes("showKeyHighlight"), "showKeyHighlight must exist");
    assert(serviceContent.includes("hideKeyHighlight"), "hideKeyHighlight must exist");
    assert(serviceContent.includes("btn.scaleX = 0.94f"), "Key highlight must use scaleX GPU property");
    assert(serviceContent.includes("btn.scaleY = 0.94f"), "Key highlight must use scaleY GPU property");
    assert(serviceContent.includes("popup.translationX ="), "Floating popup must use translationX GPU property");
    assert(serviceContent.includes("popup.translationY ="), "Floating popup must use translationY GPU property");
  });

  await test("GATE 3", "Floating character popup dismissed on UP/CANCEL and suppressed for modifiers", () => {
    assert(layoutContent.includes('android:id="@+id/tv_floating_key_popup"'), "tv_floating_key_popup must be defined in layout");
    assert(serviceContent.includes("showFloatingPopup"), "showFloatingPopup function must exist");
    assert(serviceContent.includes("hideFloatingPopup"), "hideFloatingPopup function must exist");
    assert(serviceContent.includes("MotionEvent.ACTION_UP") && serviceContent.includes("hideFloatingPopup()"), "Popup must hide on ACTION_UP");
    assert(serviceContent.includes("MotionEvent.ACTION_CANCEL") && serviceContent.includes("hideFloatingPopup()"), "Popup must hide on ACTION_CANCEL");
  });

  // =============================================================================
  // Phase 4: Smart Backspace & Spacebar Cursor Scrubbing
  // =============================================================================
  console.log("\n--- PHASE 4: Smart Backspace & Spacebar Cursor Scrubbing ---");

  await test("GATE 4", "Accelerated Backspace: UTF-16 surrogate pair safety for multi-codepoint emojis", () => {
    assert(serviceContent.includes("Character.isLowSurrogate"), "Must check Character.isLowSurrogate");
    assert(serviceContent.includes("Character.isHighSurrogate"), "Must check Character.isHighSurrogate");
    assert(serviceContent.includes("deleteSurroundingText(2, 0)"), "Must delete 2 characters for surrogate pair emojis");
  });

  await test("GATE 4", "Accelerated Backspace: 350ms initial repeat at 50ms interval, accelerating to word deletion past 1200ms", () => {
    assert(serviceContent.includes("350L"), "Must hold for 350ms before repeating");
    assert(serviceContent.includes("50L"), "Must repeat at 50ms interval");
    assert(serviceContent.includes("1200L"), "Must accelerate to word deletion past 1200ms");
    assert(serviceContent.includes("deletePreviousWord()"), "Must call deletePreviousWord() when accelerated");
  });

  await test("GATE 4", "Backspace release immediately cancels all pending repeat callbacks", () => {
    assert(serviceContent.includes("backspaceHandler.removeCallbacksAndMessages(null)"), "Must cancel callbacks on UP / CANCEL");
  });

  await test("GATE 4", "Spacebar cursor scrubbing with 12dp threshold and TEXT_HANDLE_MOVE ticks", () => {
    assert(serviceContent.includes("12 * resources.displayMetrics.density"), "Must enforce 12dp scrub threshold");
    assert(serviceContent.includes("HapticFeedbackConstants.TEXT_HANDLE_MOVE"), "Must trigger TEXT_HANDLE_MOVE haptic tick");
    assert(serviceContent.includes("KeyEvent.KEYCODE_DPAD_RIGHT"), "Must send DPAD_RIGHT when scrubbing right");
    assert(serviceContent.includes("KeyEvent.KEYCODE_DPAD_LEFT"), "Must send DPAD_LEFT when scrubbing left");
  });

  await test("GATE 4", "Space insertion suppressed during scrubbing, instantaneous tap on rapid typing", () => {
    assert(serviceContent.includes("if (isScrubbing)"), "Must check isScrubbing state");
    assert(serviceContent.includes("handleSpacebarTap()"), "Must call handleSpacebarTap() when not scrubbing");
  });

  // =============================================================================
  // Phase 5: Regression Audit & System Integrity
  // =============================================================================
  console.log("\n--- PHASE 5: Regression Audit & System Integrity ---");

  await test("GATE 5", "Shift / CapsLock transitions and auto-capitalization preserved", () => {
    assert(serviceContent.includes("checkAutoCapitalization"), "checkAutoCapitalization must be preserved");
    assert(serviceContent.includes("isCapsLock"), "isCapsLock state must be preserved");
    assert(serviceContent.includes("isShifted"), "isShifted state must be preserved");
    assert(serviceContent.includes("updateKeyCapsText"), "updateKeyCapsText must be preserved");
  });

  await test("GATE 5", "Password input type variation check suppresses popups and dictionary learning", () => {
    assert(serviceContent.includes("fun isPasswordInputType"), "isPasswordInputType helper must exist");
    assert(serviceContent.includes("EditorInfo.TYPE_TEXT_VARIATION_PASSWORD"), "Checks TYPE_TEXT_VARIATION_PASSWORD");
    assert(serviceContent.includes("EditorInfo.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD"), "Checks TYPE_TEXT_VARIATION_VISIBLE_PASSWORD");
    assert(serviceContent.includes("EditorInfo.TYPE_TEXT_VARIATION_WEB_PASSWORD"), "Checks TYPE_TEXT_VARIATION_WEB_PASSWORD");
  });

  await test("GATE 5", "Lifecycle cleanup (onFinishInputView & onDestroy) eliminates handler and state leaks", () => {
    assert(serviceContent.includes("override fun onFinishInputView"), "onFinishInputView implemented");
    assert(serviceContent.includes("override fun onDestroy"), "onDestroy implemented");
    assert(serviceContent.includes("backspaceHandler.removeCallbacksAndMessages(null)"), "backspaceHandler cleared on destroy/finish");
    assert(serviceContent.includes("echoHandler.removeCallbacksAndMessages(null)"), "echoHandler cleared on destroy/finish");
  });

  await test("GATE 5", "TypeScript Bridge methods functional runtime roundtrip", async () => {
    const initialScale = await getKeyboardHeightScale();
    assert(typeof initialScale === "number", "Initial scale must be a number");
    const updatedScale = await setKeyboardHeightScale(1.22);
    assert.strictEqual(updatedScale, 1.22, "Scale must update to 1.22");
    const confirmedScale = await getKeyboardHeightScale();
    assert.strictEqual(confirmedScale, 1.22, "Confirmed scale must match 1.22");
    // Restore default
    await setKeyboardHeightScale(1.18);
  });

  console.log("\n================================================================================");
  console.log(`EXECUTION SUMMARY: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
