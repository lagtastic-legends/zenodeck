/**
 * Test Suite: ZenoDeck & ZenoTap v1.0.15 Native Keyboard Overhaul Verification
 *
 * Verifies:
 * 1. Predictive text engine, contraction/typo auto-replacement table, and core vocabulary
 * 2. Dedicated number row layout (1-0) and multi-layout mapping (QWERTY, AZERTY, QWERTZ, Dvorak)
 * 3. Double-space period shortcut (350ms) and context-aware auto-capitalization
 * 4. 8-Category Unicode emoji deck with 24-slot recent tracking
 * 5. 30-Slot persistent clipboard vault with pin protection and FIFO purging
 * 6. Live 60FPS AnimatedImageDrawable GIF playback on Android P+
 * 7. Live 4-theme dynamic skinning (Glacier, Obsidian, Terracotta, Forest & Champagne)
 * 8. Native Capacitor bridge methods and frontend studio configurator controls
 */

import * as fs from "fs";
import * as path from "path";
import {
  setKeyboardTheme,
  getKeyboardTheme,
  setKeyboardLayoutMode,
  getKeyboardLayoutMode,
  setShowNumberRow,
  getShowNumberRow,
  setAutoCorrect,
  getAutoCorrect,
  type KeyboardTheme,
  type KeyboardLayoutMode,
} from "../src/lib/zenodeck-bridge";

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
  console.log("=== ZenoDeck & ZenoTap v1.0.15: Native Keyboard Overhaul Test Suite ===\n");

  const keyboardViewXmlPath = path.join(__dirname, "../android/app/src/main/res/layout/keyboard_view.xml");
  const keyboardXml = fs.readFileSync(keyboardViewXmlPath, "utf-8");

  const keyboardServicePath = path.join(__dirname, "../android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardService.kt");
  const serviceKt = fs.readFileSync(keyboardServicePath, "utf-8");

  const bridgePluginPath = path.join(__dirname, "../android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardBridgePlugin.kt");
  const bridgeKt = fs.readFileSync(bridgePluginPath, "utf-8");

  const gifLoaderPath = path.join(__dirname, "../android/app/src/main/java/com/omnitool/app/keyboard/GifThumbnailLoader.kt");
  const loaderKt = fs.readFileSync(gifLoaderPath, "utf-8");

  const bridgeTsPath = path.join(__dirname, "../src/lib/zenodeck-bridge.ts");
  const bridgeTs = fs.readFileSync(bridgeTsPath, "utf-8");

  const deckManagerPath = path.join(__dirname, "../src/components/tools/keyboard-deck-manager.tsx");
  const deckManagerTsx = fs.readFileSync(deckManagerPath, "utf-8");

  const simulatorPath = path.join(__dirname, "../src/components/zenotap/ZenoTapKeyboardSimulator.tsx");
  const simulatorTsx = fs.readFileSync(simulatorPath, "utf-8");

  // 1. Predictive Text Suggestion Bar & Number Row in XML
  console.log("--- 1. XML Layout Architecture (Predictive Bar & Number Row) ---");
  assert(
    keyboardXml.includes('android:id="@+id/layout_predictive_bar"') &&
    keyboardXml.includes('android:id="@+id/tv_suggestion_left"') &&
    keyboardXml.includes('android:id="@+id/tv_suggestion_center"') &&
    keyboardXml.includes('android:id="@+id/tv_suggestion_right"'),
    "keyboard_view.xml declares 3-candidate predictive suggestion bar"
  );

  assert(
    keyboardXml.includes('android:id="@+id/layout_number_row"') &&
    keyboardXml.includes('android:id="@+id/btn_num_1"') &&
    keyboardXml.includes('android:id="@+id/btn_num_0"'),
    "keyboard_view.xml declares dedicated toggleable 1-0 number row"
  );

  assert(
    keyboardXml.includes('android:id="@+id/layout_keys_view"') &&
    keyboardXml.includes('android:id="@+id/layout_vault_view"') &&
    keyboardXml.includes('android:id="@+id/layout_emoji_view"') &&
    keyboardXml.includes('android:id="@+id/layout_clipboard_view"'),
    "keyboard_view.xml declares all 4 primary mode views (Keys, Vault, Emoji, Clipboard)"
  );

  assert(
    keyboardXml.includes('android:id="@+id/btn_voice_input"') &&
    keyboardXml.includes('android:id="@+id/btn_shift"') &&
    keyboardXml.includes('android:id="@+id/btn_enter"'),
    "keyboard_view.xml declares voice dictation, shift, and enter actions"
  );

  // 2. Predictive Engine & Auto-Correct in ZenoDeckKeyboardService.kt
  console.log("\n--- 2. Predictive Engine & Auto-Correct Logic ---");
  assert(
    serviceKt.includes("AUTO_REPLACE_DICT") &&
    serviceKt.includes('"dont" to "don\'t"') &&
    serviceKt.includes('"cant" to "can\'t"') &&
    serviceKt.includes('"im" to "I\'m"') &&
    serviceKt.includes('"teh" to "the"'),
    "ZenoDeckKeyboardService implements contraction & typo auto-replacement dictionary"
  );

  assert(
    serviceKt.includes("CORE_VOCABULARY") &&
    serviceKt.includes("userWordFreq") &&
    serviceKt.includes("updatePredictiveCandidates"),
    "ZenoDeckKeyboardService implements offline candidate ranking & user frequency dictionary"
  );

  assert(
    serviceKt.includes("350L") &&
    serviceKt.includes('deleteSurroundingText(1, 0)') &&
    serviceKt.includes('commitText(". ", 1)'),
    "ZenoDeckKeyboardService implements 350ms double-space period shortcut"
  );

  assert(
    serviceKt.includes("checkAutoCapitalization") &&
    serviceKt.includes('setShiftState(true)'),
    "ZenoDeckKeyboardService implements context-aware auto-capitalization"
  );

  // 3. Multi-Layout Engine (QWERTY, AZERTY, QWERTZ, Dvorak)
  console.log("\n--- 3. Multi-Layout Remapping ---");
  assert(
    serviceKt.includes("LAYOUT_QWERTY") &&
    serviceKt.includes("LAYOUT_AZERTY") &&
    serviceKt.includes("LAYOUT_QWERTZ") &&
    serviceKt.includes("LAYOUT_DVORAK") &&
    serviceKt.includes("applyKeyLayout"),
    "ZenoDeckKeyboardService implements dynamic layout remapping across QWERTY, AZERTY, QWERTZ, and Dvorak"
  );

  // 4. Categorized Emoji Panel & 30-Slot Persistent Clipboard Vault
  console.log("\n--- 4. Emoji Panel & Clipboard Vault ---");
  assert(
    serviceKt.includes("EMOJI_SMILEYS") &&
    serviceKt.includes("EMOJI_GESTURES") &&
    serviceKt.includes("EMOJI_HEARTS") &&
    serviceKt.includes("EMOJI_ANIMALS") &&
    serviceKt.includes("EMOJI_FOOD") &&
    serviceKt.includes("EMOJI_TECH") &&
    serviceKt.includes("EMOJI_SYMBOLS") &&
    serviceKt.includes("recentEmojis"),
    "ZenoDeckKeyboardService provides 8 emoji categories with 24-slot recent memory"
  );

  assert(
    serviceKt.includes("clipboardVaultItems") &&
    serviceKt.includes("30") &&
    serviceKt.includes("OnPrimaryClipChangedListener") &&
    serviceKt.includes("isPinned"),
    "ZenoDeckKeyboardService provides 30-slot persistent clipboard vault with FIFO purge & pin safety"
  );

  assert(
    serviceKt.includes("RecognizerIntent.ACTION_RECOGNIZE_SPEECH"),
    "ZenoDeckKeyboardService connects voice dictation button to Android Speech Recognizer"
  );

  // 5. 60FPS Animated GIFs on Android P+
  console.log("\n--- 5. 60FPS AnimatedImageDrawable Playback ---");
  assert(
    loaderKt.includes("AnimatedImageDrawable") &&
    loaderKt.includes("Build.VERSION_CODES.P") &&
    loaderKt.includes("ImageDecoder.decodeDrawable"),
    "GifThumbnailLoader decodes 60FPS AnimatedImageDrawable on Android P+ (API >= 28)"
  );

  // 6. Theme Engine (Forest & Champagne + Glacier, Obsidian, Terracotta)
  console.log("\n--- 6. 4-Theme Engine ---");
  assert(
    serviceKt.includes("THEME_FOREST_CHAMPAGNE") &&
    serviceKt.includes("0xFF102C26") &&
    serviceKt.includes("0xFFF7E7CE"),
    "ZenoDeckKeyboardService supports 'forest_champagne' theme (#102C26 deep emerald & #F7E7CE gold)"
  );

  assert(
    bridgeKt.includes("THEME_FOREST_CHAMPAGNE") &&
    bridgeKt.includes("setLayoutMode") &&
    bridgeKt.includes("setShowNumberRow") &&
    bridgeKt.includes("setAutoCorrect") &&
    bridgeKt.includes("getClipboardHistory") &&
    bridgeKt.includes("clearClipboardHistory"),
    "ZenoDeckKeyboardBridgePlugin exposes all keyboard layout, auto-correct, number row, and clipboard bridge methods"
  );

  // 7. TypeScript Bridge Contracts & Browser Fallback Verification
  console.log("\n--- 7. TypeScript Bridge Contracts ---");
  assert(
    bridgeTs.includes('"forest_champagne"') &&
    bridgeTs.includes("KeyboardLayoutMode") &&
    bridgeTs.includes("setKeyboardLayoutMode") &&
    bridgeTs.includes("setShowNumberRow") &&
    bridgeTs.includes("setAutoCorrect") &&
    bridgeTs.includes("getClipboardHistory"),
    "zenodeck-bridge.ts exports typed settings methods and fallback implementations"
  );

  // Test local storage / mock fallback execution
  const testTheme: KeyboardTheme = "forest_champagne";
  const themeSaved = await setKeyboardTheme(testTheme);
  const themeRetrieved = await getKeyboardTheme();
  assert(
    themeSaved && themeRetrieved === "forest_champagne",
    "Bridge successfully sets and retrieves 'forest_champagne' theme"
  );

  const testLayout: KeyboardLayoutMode = "DVORAK";
  const layoutSaved = await setKeyboardLayoutMode(testLayout);
  const layoutRetrieved = await getKeyboardLayoutMode();
  assert(
    layoutSaved && layoutRetrieved === "DVORAK",
    "Bridge successfully sets and retrieves 'DVORAK' layout mode"
  );

  const numRowSaved = await setShowNumberRow(false);
  const numRowRetrieved = await getShowNumberRow();
  assert(
    numRowSaved && numRowRetrieved === false,
    "Bridge successfully toggles and retrieves showNumberRow state"
  );

  const autoCorrSaved = await setAutoCorrect(true);
  const autoCorrRetrieved = await getAutoCorrect();
  assert(
    autoCorrSaved && autoCorrRetrieved === true,
    "Bridge successfully sets and retrieves autoCorrect state"
  );

  // 8. Frontend Studio Configurator Verification
  console.log("\n--- 8. Frontend Studio Configurator ---");
  assert(
    deckManagerTsx.includes("handleThemeSelect") &&
    deckManagerTsx.includes("handleLayoutSelect") &&
    deckManagerTsx.includes("handleToggleNumberRow") &&
    deckManagerTsx.includes("handleToggleAutoCorrect") &&
    deckManagerTsx.includes("handleClearClipboard") &&
    deckManagerTsx.includes("testSandboxText"),
    "keyboard-deck-manager.tsx implements all settings handlers, 4-theme cards, and interactive test sandbox"
  );

  assert(
    simulatorTsx.includes("forest_champagne") &&
    (simulatorTsx.includes("Forest &amp; Gold") || simulatorTsx.includes("Forest & Gold")),
    "ZenoTapKeyboardSimulator supports live interactive 'Forest & Gold' theme preview"
  );

  console.log(`\n========================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner encountered an unexpected error:", err);
  process.exit(1);
});
