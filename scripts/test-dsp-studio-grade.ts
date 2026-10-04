/**
 * Test Suite: Studio-Grade Audio DSP & Speed Optimizations
 * ==========================================================
 * Validates the studio-grade audio filter generation, zero-overhead
 * fast paths, anti-clipping true-peak limiters, and audio graph optimizations.
 */

import {
  AUDIO_TOOLS_CATALOG,
  getAudioFilterGraph,
  getDefaultAudioParams,
  buildBassFilter,
  buildReverbFilter,
  buildVocalRemoverFilter,
  buildVolumeChangerFilter,
  buildStereoPannerFilter,
  buildTempoChangerFilter,
  buildTrimmerFilter,
  buildSpatial8DFilter,
  buildAutoPannerFilter,
  buildEqualizerFilter,
  buildNoiseReducerFilter,
  buildPitchShifterFilter,
  buildReverseAudioFilter,
  REVERB_SPACES,
  BASS_BOOST_TIERS,
} from "../src/lib/audio-dsp";
import {
  volumeFilters,
  panFilters,
  bassFilters,
  trimFadeFilters,
  slowedFilters,
} from "../src/lib/audio/filters";
import { AudioDspEngine } from "../src/lib/audio/dsp-engine";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ""}`);
    process.exit(1);
  }
}

console.log("=== Testing Studio-Grade DSP: All 13 Audio Modules ===");

// 1. All 13 Catalog modules present and functional
assert(AUDIO_TOOLS_CATALOG.length === 13, "AUDIO_TOOLS_CATALOG contains exactly 13 modules");

for (const tool of AUDIO_TOOLS_CATALOG) {
  const defaultParams = getDefaultAudioParams(tool.id);
  assert(defaultParams !== undefined, `Module '${tool.id}' has default parameters`);
  const filters = getAudioFilterGraph(tool.id, defaultParams);
  assert(Array.isArray(filters), `Module '${tool.id}' returns filter array`);

  // Verify all presets for this tool
  for (const preset of tool.presets) {
    const mergedParams = { ...defaultParams, ...preset.params };
    const presetFilters = getAudioFilterGraph(tool.id, mergedParams);
    assert(Array.isArray(presetFilters), `Module '${tool.id}' preset '${preset.label}' emits valid filter graph`);
  }
}

console.log("\n=== Testing Studio-Grade Reverb: All 8 Space Models ===");

const spaceKeys = Object.keys(REVERB_SPACES) as (keyof typeof REVERB_SPACES)[];
assert(spaceKeys.length === 8, "Exactly 8 distinct reverb space models defined");

for (const key of spaceKeys) {
  const space = REVERB_SPACES[key];
  const filters = space.buildFilter(44100);
  assert(filters.length >= 2, `Reverb space '${space.name}' has multi-stage filter chain`);
  const filterStr = filters.join(",");
  assert(filterStr.includes("alimiter=limit=0.98"), `Reverb space '${space.name}' includes true-peak limiter protection`);
  assert(filterStr.includes("aecho="), `Reverb space '${space.name}' contains reflection network`);
}

console.log("\n=== Testing Studio-Grade Bass Booster & Dynamics ===");

const bassTier1 = buildBassFilter({ tier: 1, cutoff: 110, clarity: false });
assert(bassTier1.some((f) => f.includes("highpass=f=28:p=2")), "Bass Booster includes 28Hz 2-pole subsonic rumble filter");
assert(bassTier1.some((f) => f.includes("bass=g=3.5:f=110")), "Tier 1 produces +3.5dB low-shelf filter");
assert(bassTier1.some((f) => f.includes("alimiter=")), "Bass Booster terminates with broadcast peak limiter");

const bassTier5 = buildBassFilter({ tier: 5, cutoff: 55, clarity: true });
assert(bassTier5.some((f) => f.includes("treble=g=")), "Bass Booster clarity toggle engages treble presence shelf");
assert(bassTier5.some((f) => f.includes("volume=-")), "Bass Booster engages dynamic headroom pre-attenuation");

console.log("\n=== Testing Vocal Remover Bass Preservation Crossover ===");

const vocalBassPreserved = buildVocalRemoverFilter({ mode: "bass_preserved", bassPreserveCutoffHz: 150 });
const vocalFilterStr = vocalBassPreserved.join("");
assert(vocalFilterStr.includes("normalize=0"), "Bass-preserved mode includes normalize=0 to prevent -6dB volume halving");
assert(vocalFilterStr.includes("highpass=f=150:p=2"), "Highpass uses 2-pole Butterworth slope");
assert(vocalFilterStr.includes("lowpass=f=150:p=2"), "Lowpass uses 2-pole Butterworth slope");
assert(vocalFilterStr.includes("alimiter=limit=0.98"), "Terminates with true-peak limiter");

console.log("\n=== Testing Fast-Path Performance Optimizations ===");

// Fast-path: 0dB volume changer
const volNeutral = buildVolumeChangerFilter({ gainDb: 0, normalize: false });
assert(volNeutral.length === 0, "Volume Changer: 0dB gain yields 0 filters (fast-path zero-copy)");

// Positive volume changer must have limiter
const volBoost = buildVolumeChangerFilter({ gainDb: 6, normalize: false });
assert(volBoost.length === 2, "Volume Changer: +6dB boost yields 2 filters");
assert(volBoost[0] === "volume=6.0dB", "Volume boost sets volume");
assert(volBoost[1] === "alimiter=limit=0.98", "Volume boost includes lookahead peak limiter to eliminate clipping");

// Fast-path: Centered stereo panner
const panCenter = buildStereoPannerFilter({ balance: 0.0 });
assert(panCenter.length === 0, "Stereo Panner: Center (0.0) yields 0 filters (fast-path)");

const panHardLeft = buildStereoPannerFilter({ balance: -1.0 });
assert(panHardLeft.length === 2, "Stereo Panner: Panned yields 2 filters");

// Fast-path: 1.0x tempo changer
const tempoNeutral = buildTempoChangerFilter({ speed: 1.0 });
assert(tempoNeutral.length === 0, "Tempo Changer: 1.0x speed yields 0 filters (fast-path)");

const tempoSlow = buildTempoChangerFilter({ speed: 0.75 });
assert(tempoSlow.length === 1 && tempoSlow[0] === "atempo=0.7500", "Tempo Changer: 0.75x speed yields atempo filter");

// S-curve trimmer
const trimFades = buildTrimmerFilter({ startSec: 5, endSec: 25, fadeInSec: 1.0, fadeOutSec: 2.0, boostDb: 3 });
assert(trimFades.some((f) => f.includes("curve=esin")), "Trimmer uses studio S-curve (esin) fade transitions");
assert(trimFades.some((f) => f.includes("alimiter=limit=0.98")), "Trimmer with positive boost includes peak limiter");

console.log("\n=== Testing filters.ts Standalone Sync ===");

const fVolBoost = volumeFilters({ db: 10, normalize: false });
assert(fVolBoost.some((f) => f.includes("alimiter=limit=0.98")), "filters.ts volumeFilters includes limiter on boost");

const fPanCenter = panFilters({ balance: 0.0 });
assert(fPanCenter.length === 0, "filters.ts panFilters: 0 balance yields empty array");

const fTrimFade = trimFadeFilters({ startSec: 0, endSec: 10, fadeInSec: 0.5, fadeOutSec: 0.5 });
assert(fTrimFade.some((f) => f.includes("curve=esin")), "filters.ts trimFadeFilters uses S-curve fades");

console.log(`\n==========================================================`);
console.log(`TOTAL STUDIO-GRADE DSP TESTS: ${totalTests}`);
console.log(`PASSED:                       ${passedTests}`);
console.log(`FAILED:                       0`);
console.log(`==========================================================`);
