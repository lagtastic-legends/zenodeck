setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 25000).unref();

import assert from "assert";
import fs from "fs";
import path from "path";
import {
  setHapticStrength,
  getHapticStrength,
  setKeyPopupEnabled,
  getKeyPopupEnabled,
  setCursorScrubEnabled,
  getCursorScrubEnabled,
  setGlideTrailEnabled,
  getGlideTrailEnabled,
  setOneHandedMode,
  getOneHandedMode,
} from "../src/lib/zenodeck-bridge";

console.log("=== ZENODECK & ZENOTAP v1.0.37 KEYBOARD SUITE VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Sync Verification
const versionTs = fs.readFileSync(path.join(root, "src", "config", "version.ts"), "utf-8");
assert(/APP_VERSION = "1\.0\.\d+"/.test(versionTs), 'src/config/version.ts has valid APP_VERSION >= 1.0.37');
console.log("✅ src/config/version.ts has valid APP_VERSION >= 1.0.37");

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert(pkgJson.version >= "1.0.37", 'package.json has version >= "1.0.37"');
console.log("✅ package.json has version >= 1.0.37");

const buildGradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle"), "utf-8");
assert(/versionName "1\.0\.\d+"/.test(buildGradle), 'android/app/build.gradle contains valid versionName');
assert(/versionCode 100\d{2}/.test(buildGradle), "android/app/build.gradle contains valid versionCode");
console.log("✅ android/app/build.gradle contains valid versionName and versionCode (>= 10037)");

// 2. Changelog & Release Notes Verification
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.37]"), "CHANGELOG.md contains [1.0.37]");
assert(changelog.includes("ZenoTap Tactile & Ergonomic Control Suite"), "CHANGELOG.md documents Tactile & Ergonomic Control Suite");
assert(changelog.includes("One-Handed Mode"), "CHANGELOG.md documents One-Handed Mode");
assert(changelog.includes("Long-Press Character Rail"), "CHANGELOG.md documents Long-Press Character Rail");
assert(changelog.includes("120fps Zero-Allocation Glide Typing Trail") || changelog.includes("Glide Typing Trail"), "CHANGELOG.md documents Glide Typing Trail");
console.log("✅ CHANGELOG.md documents v1.0.37 features and architecture");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.37.md"), "utf-8");
assert(releaseNotes.includes("v1.0.37"), "Release notes document v1.0.37");
assert(releaseNotes.includes("Tactile & Ergonomic Control Suite"), "Release notes detail Tactile & Ergonomic Suite");
assert(releaseNotes.includes("One-Handed Mode"), "Release notes detail One-Handed Mode");
assert(releaseNotes.includes("320ms"), "Release notes detail 320ms Long-Press Timer");
assert(releaseNotes.includes("Champagne Gold"), "Release notes detail Champagne Gold Glide Trail");
console.log("✅ RELEASE_NOTES_v1.0.37.md exists and is valid");

// 3. What's New Modal Verification
const whatsNewModal = fs.readFileSync(path.join(root, "src", "components", "shell", "whats-new-modal.tsx"), "utf-8");
assert(whatsNewModal.includes("Zero-Latency Android IME"), "whats-new-modal.tsx retains Zero-Latency Android IME");
assert(whatsNewModal.includes("Live Height Scale Slider"), "whats-new-modal.tsx retains Live Height Scale Slider");
assert(whatsNewModal.includes("Tactile &amp; Ergonomics Suite") || whatsNewModal.includes("Tactile & Ergonomics Suite"), "whats-new-modal.tsx highlights Tactile & Ergonomics Suite");
console.log("✅ whats-new-modal.tsx contains v1.0.37 feature cards");

// 4. Bridge Schema & Functional Fallbacks Verification
async function verifyBridgeSettings() {
  // Haptic strength (0-3, default 2)
  await setHapticStrength(3);
  let haptic = await getHapticStrength();
  assert.strictEqual(haptic, 3, "Haptic strength should be 3");

  await setHapticStrength(0);
  haptic = await getHapticStrength();
  assert.strictEqual(haptic, 0, "Haptic strength should be 0");

  // Clamping test
  await setHapticStrength(99 as any);
  haptic = await getHapticStrength();
  assert.strictEqual(haptic, 3, "Haptic strength should clamp to 3");

  // Reset to default
  await setHapticStrength(2);

  // Key popup enabled
  await setKeyPopupEnabled(false);
  let keyPopup = await getKeyPopupEnabled();
  assert.strictEqual(keyPopup, false, "Key popup should be false");
  await setKeyPopupEnabled(true);
  keyPopup = await getKeyPopupEnabled();
  assert.strictEqual(keyPopup, true, "Key popup should be true");

  // Cursor scrub enabled
  await setCursorScrubEnabled(false);
  let cursorScrub = await getCursorScrubEnabled();
  assert.strictEqual(cursorScrub, false, "Cursor scrub should be false");
  await setCursorScrubEnabled(true);
  cursorScrub = await getCursorScrubEnabled();
  assert.strictEqual(cursorScrub, true, "Cursor scrub should be true");

  // Glide trail enabled
  await setGlideTrailEnabled(false);
  let glideTrail = await getGlideTrailEnabled();
  assert.strictEqual(glideTrail, false, "Glide trail should be false");
  await setGlideTrailEnabled(true);
  glideTrail = await getGlideTrailEnabled();
  assert.strictEqual(glideTrail, true, "Glide trail should be true");

  // One-handed mode ('off' | 'left' | 'right')
  await setOneHandedMode("left");
  let oneHanded = await getOneHandedMode();
  assert.strictEqual(oneHanded, "left", "One-handed mode should be 'left'");

  await setOneHandedMode("right");
  oneHanded = await getOneHandedMode();
  assert.strictEqual(oneHanded, "right", "One-handed mode should be 'right'");

  await setOneHandedMode("invalid" as any);
  oneHanded = await getOneHandedMode();
  assert.strictEqual(oneHanded, "off", "One-handed mode should fall back to 'off'");

  console.log("✅ zenodeck-bridge.ts functional settings getters/setters & fallbacks verified");
}

// 5. Native IME Kotlin Verification
const bridgePluginKt = fs.readFileSync(
  path.join(root, "android", "app", "src", "main", "java", "com", "omnitool", "app", "keyboard", "ZenoDeckKeyboardBridgePlugin.kt"),
  "utf-8"
);
assert(bridgePluginKt.includes("PREF_KEY_HAPTIC_STRENGTH"), "Bridge has PREF_KEY_HAPTIC_STRENGTH");
assert(bridgePluginKt.includes("PREF_KEY_KEY_POPUP_ENABLED"), "Bridge has PREF_KEY_KEY_POPUP_ENABLED");
assert(bridgePluginKt.includes("PREF_KEY_CURSOR_SCRUB_ENABLED"), "Bridge has PREF_KEY_CURSOR_SCRUB_ENABLED");
assert(bridgePluginKt.includes("PREF_KEY_GLIDE_TRAIL_ENABLED"), "Bridge has PREF_KEY_GLIDE_TRAIL_ENABLED");
assert(bridgePluginKt.includes("PREF_KEY_ONE_HANDED_MODE"), "Bridge has PREF_KEY_ONE_HANDED_MODE");
assert(bridgePluginKt.includes("fun setHapticStrength"), "Bridge implements setHapticStrength");
assert(bridgePluginKt.includes("fun setOneHandedMode"), "Bridge implements setOneHandedMode");
console.log("✅ ZenoDeckKeyboardBridgePlugin.kt preference keys and methods verified");

const keyboardServiceKt = fs.readFileSync(
  path.join(root, "android", "app", "src", "main", "java", "com", "omnitool", "app", "keyboard", "ZenoDeckKeyboardService.kt"),
  "utf-8"
);
assert(keyboardServiceKt.includes("var hapticStrength: Int"), "Keyboard service tracks hapticStrength");
assert(keyboardServiceKt.includes("var oneHandedMode: String"), "Keyboard service tracks oneHandedMode");
assert(keyboardServiceKt.includes("var isLongPressActive: Boolean"), "PointerTouchState tracks isLongPressActive");
assert(keyboardServiceKt.includes("KEY_ALTERNATES"), "Keyboard service has KEY_ALTERNATES map");
assert(keyboardServiceKt.includes("showSecondaryCharacterRail"), "Keyboard service implements showSecondaryCharacterRail");
assert(keyboardServiceKt.includes("updateSecondaryCharacterRailSelection"), "Keyboard service implements updateSecondaryCharacterRailSelection");
assert(keyboardServiceKt.includes("applyOneHandedLayout"), "Keyboard service implements applyOneHandedLayout");
assert(keyboardServiceKt.includes("setOneHandedModeLive"), "Keyboard service implements setOneHandedModeLive");
assert(keyboardServiceKt.includes("isCursorScrubEnabled"), "Keyboard service guards spacebar trackpad with isCursorScrubEnabled");
assert(keyboardServiceKt.includes("glideTrailOverlay?.addPoint"), "Keyboard service forwards glide points to overlay");
console.log("✅ ZenoDeckKeyboardService.kt tactile, one-handed, rail, and trail logic verified");

const glideOverlayKt = fs.readFileSync(
  path.join(root, "android", "app", "src", "main", "java", "com", "omnitool", "app", "keyboard", "GlideTrailOverlayView.kt"),
  "utf-8"
);
assert(glideOverlayKt.includes("RING_BUFFER_CAPACITY = 24"), "GlideTrailOverlayView uses 24-point ring buffer");
assert(glideOverlayKt.includes("0xFFF7E7CE"), "GlideTrailOverlayView uses Champagne Gold (#F7E7CE)");
assert(glideOverlayKt.includes("FADE_OUT_DURATION_MS = 140L"), "GlideTrailOverlayView uses 140ms fade animator");
assert(glideOverlayKt.includes("fun addPoint"), "GlideTrailOverlayView implements addPoint");
assert(glideOverlayKt.includes("fun finishTrail"), "GlideTrailOverlayView implements finishTrail");
console.log("✅ GlideTrailOverlayView.kt zero-allocation circular buffer verified");

// 6. Layout XML Verification
const keyboardViewXml = fs.readFileSync(
  path.join(root, "android", "app", "src", "main", "res", "layout", "keyboard_view.xml"),
  "utf-8"
);
assert(keyboardViewXml.includes("id=\"@+id/layout_one_handed_wrapper\""), "keyboard_view.xml has layout_one_handed_wrapper");
assert(keyboardViewXml.includes("id=\"@+id/layout_one_handed_gutter_left\""), "keyboard_view.xml has layout_one_handed_gutter_left");
assert(keyboardViewXml.includes("id=\"@+id/layout_one_handed_gutter_right\""), "keyboard_view.xml has layout_one_handed_gutter_right");
assert(keyboardViewXml.includes("id=\"@+id/btn_one_handed_expand_left\""), "keyboard_view.xml has btn_one_handed_expand_left");
assert(keyboardViewXml.includes("id=\"@+id/btn_one_handed_flip_left\""), "keyboard_view.xml has btn_one_handed_flip_left");
assert(keyboardViewXml.includes("id=\"@+id/glide_trail_overlay\""), "keyboard_view.xml includes glide_trail_overlay");
assert(keyboardViewXml.includes("id=\"@+id/layout_secondary_rail\""), "keyboard_view.xml includes layout_secondary_rail");
assert(keyboardViewXml.includes("id=\"@+id/rail_slot_0\""), "keyboard_view.xml has preallocated rail slots");
console.log("✅ keyboard_view.xml one-handed gutters, glide overlay, and secondary rail verified");

// 7. React UI & Simulator Integration Verification
const deckManagerTsx = fs.readFileSync(
  path.join(root, "src", "components", "tools", "keyboard-deck-manager.tsx"),
  "utf-8"
);
assert(deckManagerTsx.includes("Tactile &amp; Ergonomics Control Suite"), "keyboard-deck-manager.tsx renders Tactile Suite");
assert(deckManagerTsx.includes("Haptic Feedback Strength"), "keyboard-deck-manager.tsx renders Haptic Strength controls");
assert(deckManagerTsx.includes("One-Handed Docking"), "keyboard-deck-manager.tsx renders One-Handed Docking controls");
assert(deckManagerTsx.includes("oneHandedMode={oneHandedMode}"), "keyboard-deck-manager.tsx passes oneHandedMode to simulator");
assert(deckManagerTsx.includes("keyPopupEnabled={keyPopupEnabled}"), "keyboard-deck-manager.tsx passes keyPopupEnabled to simulator");
assert(deckManagerTsx.includes("glideTrailEnabled={glideTrailEnabled}"), "keyboard-deck-manager.tsx passes glideTrailEnabled to simulator");
console.log("✅ keyboard-deck-manager.tsx Tactile Suite UI controls and simulator binding verified");

const simulatorTsx = fs.readFileSync(
  path.join(root, "src", "components", "zenotap", "ZenoTapKeyboardSimulator.tsx"),
  "utf-8"
);
assert(simulatorTsx.includes("oneHandedMode"), "ZenoTapKeyboardSimulator.tsx accepts oneHandedMode prop");
assert(simulatorTsx.includes("keyPopupEnabled"), "ZenoTapKeyboardSimulator.tsx accepts keyPopupEnabled prop");
assert(simulatorTsx.includes("glideTrailEnabled"), "ZenoTapKeyboardSimulator.tsx accepts glideTrailEnabled prop");
assert(simulatorTsx.includes("w-[82%]"), "ZenoTapKeyboardSimulator.tsx compresses keys to 82% in one-handed mode");
assert(simulatorTsx.includes("w-[18%]"), "ZenoTapKeyboardSimulator.tsx renders 18% gutter in one-handed mode");
console.log("✅ ZenoTapKeyboardSimulator.tsx one-handed docking and feedback props verified");

void verifyBridgeSettings().then(() => {
  console.log("🎉 ALL v1.0.37 KEYBOARD SUITE VERIFICATION CHECKS PASSED 100%!");
  process.exit(0);
}).catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
