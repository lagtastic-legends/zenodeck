setTimeout(() => {
  console.error("Test timed out after 15s");
  process.exit(1);
}, 15000).unref();

import {
  formatAdaptiveTimestamp,
  splitSecondsToComponents,
  parseTimestampToSeconds,
  buildTrimmerFilter,
  type TrimmerParams,
} from "../src/lib/audio-dsp";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error("ASSERTION FAILED:", msg);
    process.exit(1);
  }
}

console.log("=== Precision Audio Cutter Verification Suite ===");

// 1. Adaptive Timestamp Formatting Tests
console.log("Testing formatAdaptiveTimestamp...");
assert(formatAdaptiveTimestamp(0) === "00:00.00", "0 should format as 00:00.00");
assert(formatAdaptiveTimestamp(45.25) === "00:45.25", "45.25s should format as 00:45.25");
assert(formatAdaptiveTimestamp(124.5) === "02:04.50", "124.50s should format as 02:04.50");
assert(formatAdaptiveTimestamp(3665.12) === "01:01:05.12", "3665.12s (>1h) should format as 01:01:05.12");
assert(formatAdaptiveTimestamp(7384.05) === "02:03:04.05", "7384.05s (>2h) should format as 02:03:04.05");

// forceHours flag
assert(
  formatAdaptiveTimestamp(45.25, { forceHours: true }) === "00:00:45.25",
  "forceHours should force HH prefix even for short clips"
);

// includeMs flag
assert(
  formatAdaptiveTimestamp(124.5, { includeMs: false }) === "02:04",
  "includeMs: false should format as MM:SS"
);
console.log("formatAdaptiveTimestamp: PASS");

// 2. Component Split & Parse Roundtrip
console.log("Testing splitSecondsToComponents and parseTimestampToSeconds...");
const comp1 = splitSecondsToComponents(3665.12);
assert(comp1.hours === 1, "Hours should be 1");
assert(comp1.minutes === 1, "Minutes should be 1");
assert(comp1.seconds === 5, "Seconds should be 5");
assert(Math.abs(comp1.milliseconds - 120) < 5, "Milliseconds should be ~120");

const parsedSec1 = parseTimestampToSeconds(comp1);
assert(Math.abs(parsedSec1 - 3665.12) < 0.05, `Roundtrip seconds should match: got ${parsedSec1}`);

const comp2 = splitSecondsToComponents(45.75);
assert(comp2.hours === 0, "Hours should be 0 for < 1m");
assert(comp2.minutes === 0, "Minutes should be 0");
assert(comp2.seconds === 45, "Seconds should be 45");
assert(Math.abs(comp2.milliseconds - 750) < 5, "Milliseconds should be ~750");

const parsedSec2 = parseTimestampToSeconds(comp2);
assert(Math.abs(parsedSec2 - 45.75) < 0.05, `Roundtrip seconds should match: got ${parsedSec2}`);
console.log("Split & Parse Roundtrip: PASS");

// 3. DSP Filter Generation for 4 Cutout Action Modes
console.log("Testing buildTrimmerFilter for 4 cutout action modes...");

// Mode A: Keep Selection (Trim)
const keepParams: TrimmerParams = {
  startSec: 10.5,
  endSec: 45.2,
  cutMode: "keep",
  fadeInSec: 1.0,
  fadeOutSec: 1.5,
  volumeBoostDb: 2.0,
};
const keepFilters = buildTrimmerFilter(keepParams, 120);
assert(keepFilters.some((f) => f.includes("atrim=start=10.50:end=45.20")), "Keep mode must include atrim");
assert(keepFilters.some((f) => f.includes("asetpts=PTS-STARTPTS")), "Keep mode must reset PTS");
assert(keepFilters.some((f) => f.includes("afade=t=in")), "Keep mode must include fade in");
assert(keepFilters.some((f) => f.includes("afade=t=out")), "Keep mode must include fade out");
assert(keepFilters.some((f) => f.includes("volume=2.0dB")), "Keep mode must include volume boost");
console.log("CutMode 'keep': PASS");

// Mode B: Cut Out Middle (Splice)
const cutParams: TrimmerParams = {
  startSec: 20.0,
  endSec: 35.0,
  cutMode: "cut",
  fadeInSec: 0,
  fadeOutSec: 0,
};
const cutFilters = buildTrimmerFilter(cutParams, 120);
assert(
  cutFilters.some((f) => f.includes("aselect='not(between(t\\,20.00\\,35.00))'")),
  "Cut mode must include inverted aselect"
);
console.log("CutMode 'cut': PASS");

// Mode C: Silence Selection (Mute)
const silenceParams: TrimmerParams = {
  startSec: 15.0,
  endSec: 25.0,
  cutMode: "silence",
};
const silenceFilters = buildTrimmerFilter(silenceParams, 120);
assert(
  silenceFilters.some((f) => f.includes("between(t\\,15.00\\,25.00)") && f.includes("volume=0")),
  "Silence mode must mute specific interval without shortening audio"
);
console.log("CutMode 'silence': PASS");

// Mode D: Fade Envelope Only
const fadeParams: TrimmerParams = {
  startSec: 5.0,
  endSec: 50.0,
  cutMode: "fade_only",
  fadeInSec: 2.0,
  fadeOutSec: 3.0,
};
const fadeFilters = buildTrimmerFilter(fadeParams, 60);
assert(!fadeFilters.some((f) => f.includes("atrim=")), "Fade only must NOT trim timeline");
assert(fadeFilters.some((f) => f.includes("afade=t=in") && f.includes("curve=esin")), "Fade only must set in-point start");
assert(fadeFilters.some((f) => f.includes("afade=t=out") && f.includes("st=50.00")), "Fade only must set out-point start");
console.log("CutMode 'fade_only': PASS");

// 4. Full Track 2-Hour Audio Access (No 30s Cap)
const longTrackParams: TrimmerParams = {
  startSec: 1800, // 30 minutes in
  endSec: 5400,   // 1.5 hours in
  cutMode: "keep",
};
const longTrackFilters = buildTrimmerFilter(longTrackParams, 7200); // 2 hours
assert(
  longTrackFilters.some((f) => f.includes("atrim=start=1800.00:end=5400.00")),
  "Should allow 1.5 hour trim on 2 hour file"
);
console.log("Long Track (2hr) Audio Access: PASS");

console.log("ALL PRECISION AUDIO CUTTER VERIFICATIONS PASSED!");
process.exit(0);
