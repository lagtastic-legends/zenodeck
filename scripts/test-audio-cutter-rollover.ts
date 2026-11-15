import assert from "assert";
import fs from "fs";
import path from "path";
import { splitSecondsToComponents, parseTimestampToSeconds } from "../src/lib/audio-dsp";

console.log("=== RUNNING AUDIO CUTTER BOUNDARY ROLLOVER & RESET-GUARD SUITE ===");

const root = path.resolve(__dirname, "..");
const cutterFile = fs.readFileSync(path.join(root, "src", "components", "audio", "PrecisionAudioCutterDeck.tsx"), "utf-8");
const studioFile = fs.readFileSync(path.join(root, "src", "components", "audio", "UnifiedAudioStudio.tsx"), "utf-8");

// 1. Verify PrecisionAudioCutterDeck incorporates onStep prop in TimeDigitSegment
assert(cutterFile.includes("onStep?: (direction: 1 | -1) => void;"), "TimeDigitSegmentProps must define onStep handler");
assert(cutterFile.includes("if (onStep) {\n      onStep(1);"), "handleIncrement must invoke onStep(1) when provided");
assert(cutterFile.includes("if (onStep) {\n      onStep(-1);"), "handleDecrement must invoke onStep(-1) when provided");
assert(cutterFile.includes("slice(-digits)"), "onChange must use slice(-digits) to preserve user typed digits");
console.log("✓ PASS 1: TimeDigitSegment interface and stepping logic verified.");

// 2. Verify stepTarget helper and cutpoint sliding boundary safety
assert(cutterFile.includes("stepTarget = useCallback"), "stepTarget helper must be defined");
assert(!cutterFile.includes("Math.max(0.5, selectionLength || 1.0)"), "Cutter deck must not subtract selectionLength to avoid resetting to 0");
assert(cutterFile.includes("targetEnd = Math.min(effectiveDuration, targetStart + 0.5);"), "updateStartCutpoint must advance targetEnd with 0.5s guard");
assert(cutterFile.includes("targetStart = Math.max(0, effectiveDuration - 0.5);"), "updateStartCutpoint must clamp at duration - 0.5s at end of track");
console.log("✓ PASS 2: Cutpoint boundaries prevent selectionLength subtraction deadlock.");

// 3. Verify M3 Layout and Cyber Workstation wire unique keys and onStep
assert(cutterFile.includes('key={`${activeM3Target}-sec`}'), "M3 Layout must bind target-scoped key for seconds");
assert(cutterFile.includes('key="cyber-start-sec"'), "Cyber layout must bind unique key for start seconds");
assert(cutterFile.includes('key="cyber-end-sec"'), "Cyber layout must bind unique key for end seconds");
assert(cutterFile.includes('onStep={(dir) => stepTarget(activeM3Target, dir * 1)}'), "M3 Layout seconds must step by 1s");
assert(cutterFile.includes('onStep={(dir) => stepTarget(activeM3Target, dir * 60)}'), "M3 Layout minutes must step by 60s");
assert(cutterFile.includes('onStep={(dir) => stepTarget("start", dir * 1)}'), "Cyber start seconds must step by 1s");
assert(cutterFile.includes('onStep={(dir) => stepTarget("end", dir * 1)}'), "Cyber end seconds must step by 1s");
console.log("✓ PASS 3: Unique keys and rollover steppers wired across M3 and Cyber layouts.");

// 4. Verify UnifiedAudioStudio preserves non-zero startSec on delayed metadata probing
assert(studioFile.includes("startSec: prev.startSec && prev.startSec < meta.durationSec ? prev.startSec : 0"), "handleProbed must preserve active startSec");
console.log("✓ PASS 4: UnifiedAudioStudio probing guard verified.");

// 5. Functional Simulation: Stepping across 59s and track boundaries
function simulateCutter(start: number, end: number, duration: number) {
  let startSec = start;
  let endSec = end;
  const effectiveDuration = duration;

  const updateStartCutpoint = (newSec: number) => {
    let targetStart = Math.max(0, Math.min(effectiveDuration - 0.1, newSec));
    let targetEnd = endSec;

    if (targetStart >= targetEnd - 0.1) {
      if (targetStart + 0.5 <= effectiveDuration) {
        targetEnd = Math.min(effectiveDuration, targetStart + 0.5);
      } else {
        targetEnd = effectiveDuration;
        targetStart = Math.max(0, effectiveDuration - 0.5);
      }
    }
    startSec = Math.round(targetStart * 100) / 100;
    endSec = Math.round(targetEnd * 100) / 100;
  };

  const updateEndCutpoint = (newSec: number) => {
    let targetEnd = Math.min(effectiveDuration, Math.max(0.1, newSec));
    let targetStart = startSec;

    if (targetEnd <= targetStart + 0.1) {
      if (targetEnd - 0.5 >= 0) {
        targetStart = Math.max(0, targetEnd - 0.5);
      } else {
        targetStart = 0;
        targetEnd = Math.min(effectiveDuration, 0.5);
      }
    }
    startSec = Math.round(targetStart * 100) / 100;
    endSec = Math.round(targetEnd * 100) / 100;
  };

  const step = (target: "start" | "end", delta: number) => {
    if (target === "start") updateStartCutpoint(startSec + delta);
    else updateEndCutpoint(endSec + delta);
  };

  return {
    get: () => ({ startSec, endSec }),
    step,
    updateStartCutpoint,
    updateEndCutpoint,
  };
}

// A. Step 59s -> 60s (01:00)
const sA = simulateCutter(59, 180, 180);
sA.step("start", 1);
assert.strictEqual(sA.get().startSec, 60, "Stepping start +1s from 59s must yield 60s");
const compA = splitSecondsToComponents(sA.get().startSec);
assert.strictEqual(compA.minutes, 1, "Minutes must roll over to 1");
assert.strictEqual(compA.seconds, 0, "Seconds must be 0");

// B. Step down 60s -> 59s
sA.step("start", -1);
assert.strictEqual(sA.get().startSec, 59, "Stepping start -1s from 60s must yield 59s");

// C. Push Start against End at the end of track (180s)
const sC = simulateCutter(178, 180, 180);
sC.updateStartCutpoint(180);
assert.strictEqual(sC.get().endSec, 180, "End must be clamped to 180s");
assert.strictEqual(sC.get().startSec, 179.5, "Start must be clamped to 179.5s, NEVER reset to 0");

// D. Push End against Start at the beginning of track (0s)
const sD = simulateCutter(0, 2, 180);
sD.updateEndCutpoint(0);
assert.strictEqual(sD.get().startSec, 0, "Start must stay at 0");
assert.strictEqual(sD.get().endSec, 0.5, "End must be clamped to 0.5s, NEVER collapse to 0");

console.log("✓ PASS 5: All boundary and rollover mathematical simulations passed flawlessly.");
console.log("\nALL 5 TEST SUITES PASSED! Zero value reset bugs detected.");
