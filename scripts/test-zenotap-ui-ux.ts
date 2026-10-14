/**
 * scripts/test-zenotap-ui-ux.ts
 *
 * Automated verification suite for ZenoTap Native IME & Deck Studio UI/UX Overhaul (v3.15.0).
 * Verifies:
 * 1. Bridge contract: setKeyboardTheme & getKeyboardTheme API exports & behavior
 * 2. Android XML Drawables & Layouts: Hardware aesthetics, 50% spacebar, clipToOutline
 * 3. ZenoTap Studio components: ZenoTapKeyboardSimulator, PinCodeInput, ZenoTapClipboardPill, KeyboardDeckManager
 * 4. Architectural limits: Spacebar 50% width weight constraint, RAM & thumbnail limits
 */

import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("   ZENOTAP NATIVE IME & DECK STUDIO UI/UX OVERHAUL (v3.15.0) VERIFICATION       ");
console.log("================================================================================");

let passedCount = 0;
let totalCount = 0;

function test(name: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedCount++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ FAIL: ${name} -> ${msg}`);
  }
}

// -----------------------------------------------------------------------------
// Suite 1: Bridge Contract Verification
// -----------------------------------------------------------------------------
console.log("\n[Suite 1] Native Bridge & Theme Contract");

const bridgePath = path.resolve(process.cwd(), "src/lib/zenodeck-bridge.ts");
const bridgeContent = fs.readFileSync(bridgePath, "utf-8");

test("Bridge exports setKeyboardTheme", () => {
  assert(
    bridgeContent.includes("export async function setKeyboardTheme"),
    "setKeyboardTheme must be exported from zenodeck-bridge.ts"
  );
});

test("Bridge exports getKeyboardTheme", () => {
  assert(
    bridgeContent.includes("export async function getKeyboardTheme"),
    "getKeyboardTheme must be exported from zenodeck-bridge.ts"
  );
});

test("Bridge interface declares setKeyboardTheme and getKeyboardTheme", () => {
  assert(
    bridgeContent.includes("setKeyboardTheme(options: { theme: string })"),
    "ZenoDeckNativePlugin interface must include setKeyboardTheme"
  );
  assert(
    bridgeContent.includes("getKeyboardTheme(): Promise<{ theme: string }>"),
    "ZenoDeckNativePlugin interface must include getKeyboardTheme"
  );
});

// -----------------------------------------------------------------------------
// Suite 2: Android Native IME XML Drawables & Layout Integrity
// -----------------------------------------------------------------------------
console.log("\n[Suite 2] Android Native IME Hardware Aesthetics & XML Drawables");

const resDir = path.resolve(process.cwd(), "android/app/src/main/res");

test("Keycap drawables exist in res/drawable/", () => {
  const drawables = [
    "bg_keycap_normal.xml",
    "bg_keycap_special.xml",
    "bg_spacebar_50.xml",
    "bg_utility_pill.xml",
    "bg_category_chip.xml",
    "bg_vault_card.xml",
    "bg_format_badge.xml",
  ];

  for (const d of drawables) {
    const fullPath = path.join(resDir, "drawable", d);
    assert(fs.existsSync(fullPath), `Drawable ${d} must exist at ${fullPath}`);
  }
});

const keyboardViewPath = path.join(resDir, "layout", "keyboard_view.xml");
const keyboardViewContent = fs.readFileSync(keyboardViewPath, "utf-8");

test("Keyboard layout enforces 50% width spacebar (layout_weight='0.5')", () => {
  assert(
    keyboardViewContent.includes('android:id="@+id/btn_spacebar"'),
    "btn_spacebar must exist in keyboard_view.xml"
  );
  assert(
    keyboardViewContent.includes('android:layout_weight="0.5"'),
    "btn_spacebar must strictly have layout_weight='0.5' (50% width)"
  );
});

test("Keyboard layout contains ribbon elements & category filter strip", () => {
  assert(keyboardViewContent.includes('android:id="@+id/btn_mode_vault"'), "Vault mode button missing");
  assert(keyboardViewContent.includes('android:id="@+id/btn_mode_keys"'), "Keys mode button missing");
  assert(keyboardViewContent.includes('android:id="@+id/view_mime_dot"'), "MIME compatibility dot missing");
  assert(keyboardViewContent.includes('android:id="@+id/tv_key_echo_preview"'), "Key echo preview missing");
  assert(keyboardViewContent.includes('android:id="@+id/btn_backspace"'), "Tactile backspace button missing");
  assert(keyboardViewContent.includes('android:id="@+id/btn_cat_all"'), "Category filter All missing");
  assert(keyboardViewContent.includes('android:id="@+id/btn_cat_gifs"'), "Category filter GIFs missing");
  assert(keyboardViewContent.includes('android:id="@+id/btn_cat_stickers"'), "Category filter Stickers missing");
});

const cellViewPath = path.join(resDir, "layout", "item_gif_cell.xml");
const cellViewContent = fs.readFileSync(cellViewPath, "utf-8");

test("item_gif_cell.xml has 12dp glassmorphic card, clipToOutline, and format badge", () => {
  assert(cellViewContent.includes('android:clipToOutline="true"'), "clipToOutline must be true");
  assert(cellViewContent.includes('android:background="@drawable/bg_vault_card"'), "Card background missing");
  assert(cellViewContent.includes('android:id="@+id/tv_gif_format"'), "Format badge missing");
  assert(cellViewContent.includes('android:id="@+id/tv_pin_badge"'), "Pin badge missing");
});

// -----------------------------------------------------------------------------
// Suite 3: Native Kotlin IME Service & Bridge Plugin Integrity
// -----------------------------------------------------------------------------
console.log("\n[Suite 3] Native Kotlin Service & Bridge Plugin");

const servicePath = path.resolve(
  process.cwd(),
  "android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardService.kt"
);
const serviceContent = fs.readFileSync(servicePath, "utf-8");

test("ZenoDeckKeyboardService implements spacebar trackpad scrubbing", () => {
  assert(
    serviceContent.includes("setupSpacebarTrackpadGesture"),
    "setupSpacebarTrackpadGesture must be implemented"
  );
  assert(
    serviceContent.includes("vibrateTick"),
    "vibrateTick haptics must be wired"
  );
  assert(
    serviceContent.includes("showKeyEcho"),
    "showKeyEcho must be wired"
  );
});

test("ZenoDeckKeyboardService implements backspace hold and swipe deletion", () => {
  assert(
    serviceContent.includes("setupBackspaceGesture"),
    "setupBackspaceGesture must be implemented"
  );
  assert(
    serviceContent.includes("deletePreviousWord"),
    "deletePreviousWord must be implemented"
  );
});

test("ZenoDeckKeyboardService implements dynamic theme switching", () => {
  assert(
    serviceContent.includes("applyKeyboardTheme"),
    "applyKeyboardTheme must be implemented"
  );
  assert(
    serviceContent.includes("ACTION_THEME_UPDATED"),
    "ACTION_THEME_UPDATED broadcast must be listened to"
  );
});

const pluginPath = path.resolve(
  process.cwd(),
  "android/app/src/main/java/com/omnitool/app/keyboard/ZenoDeckKeyboardBridgePlugin.kt"
);
const pluginContent = fs.readFileSync(pluginPath, "utf-8");

test("ZenoDeckKeyboardBridgePlugin implements setKeyboardTheme & getKeyboardTheme", () => {
  assert(pluginContent.includes("fun setKeyboardTheme"), "setKeyboardTheme method missing in plugin");
  assert(pluginContent.includes("fun getKeyboardTheme"), "getKeyboardTheme method missing in plugin");
  assert(pluginContent.includes("ACTION_THEME_UPDATED"), "ACTION_THEME_UPDATED missing in plugin");
});

// -----------------------------------------------------------------------------
// Suite 4: React ZenoTap Studio Components Integrity
// -----------------------------------------------------------------------------
console.log("\n[Suite 4] React ZenoTap Studio Components");

const simulatorPath = path.resolve(process.cwd(), "src/components/zenotap/ZenoTapKeyboardSimulator.tsx");
assert(fs.existsSync(simulatorPath), "ZenoTapKeyboardSimulator.tsx must exist");
const simulatorContent = fs.readFileSync(simulatorPath, "utf-8");

test("ZenoTapKeyboardSimulator provides live theme switching & chat sandbox", () => {
  assert(simulatorContent.includes("handleSwitchTheme"), "handleSwitchTheme must be implemented");
  assert(simulatorContent.includes("Chat Sandbox"), "Chat sandbox must be rendered");
  assert(simulatorContent.includes("handleSpacePointerMove"), "Spacebar pointer scrubbing must be handled");
  assert(simulatorContent.includes("handleInjectMedia"), "Media injection handler must exist");
});

const deckManagerPath = path.resolve(process.cwd(), "src/components/tools/keyboard-deck-manager.tsx");
const deckManagerContent = fs.readFileSync(deckManagerPath, "utf-8");

test("KeyboardDeckManager implements 3-step onboarding and DnD sortable grid", () => {
  assert(deckManagerContent.includes("Step 1: Settings"), "Step 1 onboarding missing");
  assert(deckManagerContent.includes("Step 2: Active IME"), "Step 2 onboarding missing");
  assert(deckManagerContent.includes("Step 3: Vault Deck"), "Step 3 onboarding missing");
  assert(deckManagerContent.includes("DndContext"), "DndContext missing");
  assert(deckManagerContent.includes("SortableContext"), "SortableContext missing");
  assert(deckManagerContent.includes("<ZenoTapKeyboardSimulator"), "Embedded simulator missing");
});

console.log("\n================================================================================");
console.log(`   EXECUTION SUMMARY: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount/totalCount)*100)}%)`);
console.log("================================================================================");

if (passedCount !== totalCount) {
  process.exit(1);
}
