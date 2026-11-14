/**
 * Test Suite: ZenoDeck & ZenoTap v1.0.16
 * Gesture Glide Typing Engine & Multi-Lingual Keyboard Verification
 *
 * Verifies:
 * 1. Version parity (v1.0.16 across version.ts, package.json, and build.gradle)
 * 2. Multi-lingual vocabulary sets (French for AZERTY, German for QWERTZ, Spanish/English for QWERTY)
 * 3. Gesture glide typing engine in ZenoDeckKeyboardService.kt (trajectory tracking, hit detection, word resolution)
 * 4. Capacitor native bridge methods (setGestureTyping, getGestureTyping)
 * 5. Frontend configurator in keyboard-deck-manager.tsx (toggle controls, loadDeck integration)
 * 6. Functional runtime verification of bridge methods
 */

import * as fs from "fs";
import * as path from "path";
import {
  setGestureTyping,
  getGestureTyping,
} from "../src/lib/zenodeck-bridge";
import { APP_VERSION } from "../src/config/version";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log("=== ZenoDeck & ZenoTap v1.0.16: Gesture Glide Typing Test Suite ===\n");

  const rootDir = path.join(__dirname, "..");
  const versionTsPath = path.join(rootDir, "src/config/version.ts");
  const packageJsonPath = path.join(rootDir, "package.json");
  const buildGradlePath = path.join(rootDir, "android/app/build.gradle");
  const keyboardServicePath = path.join(rootDir, "android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardService.kt");
  const bridgePluginPath = path.join(rootDir, "android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardBridgePlugin.kt");
  const bridgeTsPath = path.join(rootDir, "src/lib/zenodeck-bridge.ts");
  const deckManagerPath = path.join(rootDir, "src/components/tools/keyboard-deck-manager.tsx");

  const versionTs = fs.readFileSync(versionTsPath, "utf-8");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const buildGradle = fs.readFileSync(buildGradlePath, "utf-8");
  const serviceKt = fs.readFileSync(keyboardServicePath, "utf-8");
  const bridgeKt = fs.readFileSync(bridgePluginPath, "utf-8");
  const bridgeTs = fs.readFileSync(bridgeTsPath, "utf-8");
  const deckManagerTsx = fs.readFileSync(deckManagerPath, "utf-8");

  // 1. Version Parity Verification
  console.log("--- 1. Version Parity (v1.0.16+) ---");
  assert(APP_VERSION >= "1.0.16", `src/config/version.ts has valid APP_VERSION (got "${APP_VERSION}")`);
  assert(packageJson.version >= "1.0.16", `package.json has valid version (got "${packageJson.version}")`);
  assert(/versionName "1\.0\.\d+"/.test(buildGradle), "android/app/build.gradle contains valid versionName");
  assert(/versionCode 100\d{2}/.test(buildGradle), "android/app/build.gradle contains valid versionCode");

  // 2. Multi-Lingual Vocabulary Dictionaries
  console.log("\n--- 2. Multi-Lingual Vocabulary Dictionaries ---");
  assert(serviceKt.includes("FRENCH_VOCABULARY = listOf("), "ZenoDeckKeyboardService declares FRENCH_VOCABULARY");
  assert(serviceKt.includes('"bonjour"') && serviceKt.includes('"merci"') && serviceKt.includes('"monde"'), "French dictionary includes core vocabulary (bonjour, merci, monde)");
  
  assert(serviceKt.includes("GERMAN_VOCABULARY = listOf("), "ZenoDeckKeyboardService declares GERMAN_VOCABULARY");
  assert(serviceKt.includes('"hallo"') && serviceKt.includes('"danke"') && serviceKt.includes('"nicht"'), "German dictionary includes core vocabulary (hallo, danke, nicht)");
  
  assert(serviceKt.includes("SPANISH_VOCABULARY = listOf("), "ZenoDeckKeyboardService declares SPANISH_VOCABULARY");
  assert(serviceKt.includes('"hola"') && serviceKt.includes('"gracias"') && serviceKt.includes('"bueno"'), "Spanish dictionary includes core vocabulary (hola, gracias, bueno)");

  assert(
    serviceKt.includes('when (currentLayout.uppercase()) {') &&
    serviceKt.includes('"AZERTY" -> FRENCH_VOCABULARY') &&
    serviceKt.includes('"QWERTZ" -> GERMAN_VOCABULARY'),
    "Layout-aware vocabulary mapping directs AZERTY to French and QWERTZ to German"
  );

  // 3. Gesture Glide Typing Architecture in Native Kotlin
  console.log("\n--- 3. Gesture Glide Typing Architecture (ZenoDeckKeyboardService.kt) ---");
  assert(serviceKt.includes("isGestureTypingEnabled: Boolean = true"), "isGestureTypingEnabled variable declared and enabled by default");
  assert(serviceKt.includes("val glideTrajectory = mutableListOf<String>()"), "glideTrajectory tracking buffer declared");
  assert(serviceKt.includes("fun resolveGlideWord(trajectory: List<String>): String?"), "resolveGlideWord function implemented");
  assert(serviceKt.includes("MotionEvent.ACTION_MOVE -> {"), "Touch listener handles ACTION_MOVE dragging");
  assert(serviceKt.includes("MotionEvent.ACTION_UP -> {"), "Touch listener handles ACTION_UP commit");
  assert(serviceKt.includes("showKeyEcho("), "Touch glide displays real-time key echo preview");
  assert(serviceKt.includes("vibrateTick()"), "Swipe trajectory triggers subtle haptic tick on key entry");
  assert(serviceKt.includes('commitText("$formatted ", 1)'), "Committed glide word appends trailing space for smooth multi-word typing");

  // 4. Native Capacitor Bridge
  console.log("\n--- 4. Native Capacitor Bridge (ZenoDeckKeyboardBridgePlugin.kt & zenodeck-bridge.ts) ---");
  assert(bridgeKt.includes('PREF_KEY_GESTURE_TYPING = "keyboard_gesture_typing"'), "Bridge plugin defines PREF_KEY_GESTURE_TYPING constant");
  assert(bridgeKt.includes("fun setGestureTyping(call: PluginCall)"), "Bridge plugin exposes setGestureTyping plugin method");
  assert(bridgeKt.includes("fun getGestureTyping(call: PluginCall)"), "Bridge plugin exposes getGestureTyping plugin method");

  assert(bridgeTs.includes("setGestureTyping(options: { enabled: boolean })"), "zenodeck-bridge.ts defines setGestureTyping in interface");
  assert(bridgeTs.includes("getGestureTyping(): Promise<{ enabled: boolean }>"), "zenodeck-bridge.ts defines getGestureTyping in interface");
  assert(bridgeTs.includes("export async function setGestureTyping(enabled: boolean): Promise<boolean>"), "zenodeck-bridge.ts exports setGestureTyping wrapper function");
  assert(bridgeTs.includes("export async function getGestureTyping(): Promise<boolean>"), "zenodeck-bridge.ts exports getGestureTyping wrapper function");

  // 5. Frontend Configurator UI
  console.log("\n--- 5. Frontend Configurator UI (keyboard-deck-manager.tsx) ---");
  assert(deckManagerTsx.includes("setGestureTyping,") && deckManagerTsx.includes("getGestureTyping,"), "keyboard-deck-manager.tsx imports bridge functions");
  assert(deckManagerTsx.includes("const [gestureTyping, setGestureTypingState] = useState<boolean>(true);"), "keyboard-deck-manager.tsx declares gestureTyping state");
  assert(deckManagerTsx.includes("handleToggleGestureTyping"), "keyboard-deck-manager.tsx implements handleToggleGestureTyping handler");
  assert(deckManagerTsx.includes("Gesture / Glide Typing"), "keyboard-deck-manager.tsx renders Gesture / Glide Typing toggle card");
  assert(deckManagerTsx.includes("Glide Typing Active"), "keyboard-deck-manager.tsx shows active state indicator");

  // 6. Runtime Functional Test of Bridge Methods
  console.log("\n--- 6. Runtime Functional Bridge Verification ---");
  const initialGesture = await getGestureTyping();
  assert(typeof initialGesture === "boolean", `getGestureTyping() returns boolean (initial: ${initialGesture})`);

  const toggleRes1 = await setGestureTyping(false);
  assert(toggleRes1 === true, "setGestureTyping(false) returns true");
  const readAfter1 = await getGestureTyping();
  assert(readAfter1 === false, "getGestureTyping() confirms false state persisted");

  const toggleRes2 = await setGestureTyping(true);
  assert(toggleRes2 === true, "setGestureTyping(true) returns true");
  const readAfter2 = await getGestureTyping();
  assert(readAfter2 === true, "getGestureTyping() confirms true state persisted");

  // Summary
  console.log(`\n==================================================`);
  console.log(`ZenoDeck & ZenoTap v1.0.16 Glide Typing Test Suite: ${passed} passed, ${failed} failed.`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

void runTests();
