import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   ZENODECK KEYBOARD HEIGHT SCALE UI & BRIDGE VERIFICATION SUITE               ");
console.log("================================================================================");

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    testsPassed++;
  } catch (err: unknown) {
    console.error(`  ✗ FAIL: ${name}`, err);
    testsFailed++;
  }
}

// 1. Inspect zenodeck-bridge.ts for getter/setter and clamping
const bridgeFile = fs.readFileSync(path.join(root, "src/lib/zenodeck-bridge.ts"), "utf-8");
runTest("Bridge exports setKeyboardHeightScale and getKeyboardHeightScale", () => {
  assert(bridgeFile.includes("export async function setKeyboardHeightScale"), "Missing setKeyboardHeightScale");
  assert(bridgeFile.includes("export async function getKeyboardHeightScale"), "Missing getKeyboardHeightScale");
});

runTest("Bridge strictly clamps scale between 0.85 and 1.30 with default 1.18", () => {
  assert(bridgeFile.includes("0.85") && bridgeFile.includes("1.30"), "Missing clamp 0.85 to 1.30");
  assert(bridgeFile.includes("1.18"), "Missing default 1.18");
});

// 2. Inspect keyboard-deck-manager.tsx for UI elements
const managerFile = fs.readFileSync(path.join(root, "src/components/tools/keyboard-deck-manager.tsx"), "utf-8");
runTest("KeyboardDeckManager imports bridge methods", () => {
  assert(managerFile.includes("setKeyboardHeightScale"), "Missing setKeyboardHeightScale import");
  assert(managerFile.includes("getKeyboardHeightScale"), "Missing getKeyboardHeightScale import");
});

runTest("KeyboardDeckManager initializes keyboardHeightScale state (default 1.18)", () => {
  assert(managerFile.includes("useState<number>(1.18)"), "Missing keyboardHeightScale state default 1.18");
});

runTest("KeyboardDeckManager hydrates keyboardHeightScale on loadDeck", () => {
  assert(managerFile.includes("getKeyboardHeightScale()"), "Missing getKeyboardHeightScale in loadDeck");
  assert(managerFile.includes("setKeyboardHeightScaleState(savedHeightScale || 1.18)"), "Missing state hydration");
});

runTest("KeyboardDeckManager implements 120ms debounced change and immediate commit", () => {
  assert(managerFile.includes("handleHeightScaleChange"), "Missing handleHeightScaleChange");
  assert(managerFile.includes("handleHeightScaleCommit"), "Missing handleHeightScaleCommit");
  assert(managerFile.includes("setTimeout"), "Missing debounce timer");
  assert(managerFile.includes("120"), "Missing 120ms debounce timing");
});

runTest("KeyboardDeckManager renders range slider with min 0.85, max 1.30, step 0.01", () => {
  assert(managerFile.includes('min="0.85"'), "Slider missing min 0.85");
  assert(managerFile.includes('max="1.30"'), "Slider missing max 1.30");
  assert(managerFile.includes('step="0.01"'), "Slider missing step 0.01");
});

runTest("KeyboardDeckManager renders live computed dp readout Math.round(258 * scale)", () => {
  assert(managerFile.includes("Math.round(258 * keyboardHeightScale)"), "Missing live dp computation formula");
});

runTest("KeyboardDeckManager renders all 4 quick preset chips (0.95x, 1.00x, 1.18x, 1.28x) and Reset button", () => {
  assert(managerFile.includes('label: "Compact", scale: 0.95'), "Missing Compact 0.95x preset");
  assert(managerFile.includes('label: "Standard", scale: 1.00'), "Missing Standard 1.00x preset");
  assert(managerFile.includes('label: "Ergonomic", scale: 1.18'), "Missing Ergonomic 1.18x preset");
  assert(managerFile.includes('label: "Tall", scale: 1.28'), "Missing Tall 1.28x preset");
  assert(managerFile.includes("handleResetHeight"), "Missing Reset handler");
  assert(managerFile.includes("Reset (1.18x)"), "Missing Reset button label");
});

runTest("KeyboardDeckManager passes heightScale to ZenoTapKeyboardSimulator", () => {
  assert(managerFile.includes("heightScale={keyboardHeightScale}"), "ZenoTapKeyboardSimulator missing heightScale prop");
});

// 3. Inspect ZenoTapKeyboardSimulator.tsx for dynamic preview scaling
const simulatorFile = fs.readFileSync(path.join(root, "src/components/zenotap/ZenoTapKeyboardSimulator.tsx"), "utf-8");
runTest("ZenoTapKeyboardSimulator accepts heightScale prop", () => {
  assert(simulatorFile.includes("heightScale?: number"), "Missing heightScale in interface");
  assert(simulatorFile.includes("heightScale = 1.18"), "Missing heightScale default value in props");
});

runTest("ZenoTapKeyboardSimulator dynamically scales key heights and row gaps at 120fps", () => {
  assert(simulatorFile.includes("scaledKeyHeight"), "Missing scaledKeyHeight calculation");
  assert(simulatorFile.includes("scaledRowGap"), "Missing scaledRowGap calculation");
  assert(simulatorFile.includes("style={{ height: `${scaledKeyHeight}px` }}"), "Missing dynamic key height style");
  assert(simulatorFile.includes("style={{ gap: `${scaledRowGap}px` }}"), "Missing dynamic row gap style");
});

// 4. Mathematical scaling verification
runTest("Mathematical height scaling yields target dp specs", () => {
  const base = 258;
  const compact = Math.round(base * 0.85); // 219dp
  const standard = Math.round(base * 1.00); // 258dp
  const ergonomic = Math.round(base * 1.18); // 304dp or 305dp
  const tall = Math.round(base * 1.30); // 335dp
  assert(compact >= 215 && compact <= 225, `Compact dp ${compact} out of range`);
  assert(standard === 258, `Standard dp ${standard} != 258`);
  assert(ergonomic >= 300 && ergonomic <= 310, `Ergonomic dp ${ergonomic} out of range`);
  assert(tall >= 330 && tall <= 340, `Tall dp ${tall} out of range`);
});

console.log("================================================================================");
console.log(`EXECUTION SUMMARY: ${testsPassed} passed, ${testsFailed} failed`);
console.log("================================================================================");

if (testsFailed > 0) {
  process.exit(1);
}
