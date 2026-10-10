/**
 * Unit & Integration Test Suite: FX Rack, Multi-Band Mastering, & Stem Separation
 * ===============================================================================
 */

import {
  buildMultiBandMasteringFilterGraph,
  LUFS_PROFILE_SPECS,
  DEFAULT_MASTERING_CONFIG,
} from "../src/lib/audio/multiband-mastering";
import {
  buildSingleStemFilter,
  buildSinglePassStemSeparationArgs,
  STEM_DEFINITIONS,
  DEFAULT_STEM_MIXER_STATE,
} from "../src/lib/audio/stem-separator";
import {
  buildFXRackFilterChain,
  DEFAULT_FX_RACK_CONFIG,
} from "../src/lib/audio/fx-rack-engine";
import { FXRackConfig, StemType, LufsTargetProfile } from "../src/lib/audio/dsp-types";

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    console.error(`  ✗ FAIL: ${msg}${detail ? ` -> ${detail}` : ""}`);
    process.exit(1);
  }
}

console.log("=== 1. Testing Multi-Band Mastering Engine ===");

// 1.1 All LUFS profiles verified
const profiles: LufsTargetProfile[] = ["streaming", "club_edm", "audiophile", "broadcast_voice"];
for (const p of profiles) {
  const spec = LUFS_PROFILE_SPECS[p];
  assert(spec !== undefined, `LUFS profile '${p}' is defined`);
  assert(spec.targetLufs <= -9.0 && spec.targetLufs >= -18.0, `Target LUFS for '${p}' is in broadcast range (${spec.targetLufs})`);
  assert(spec.truePeakCeilingDb <= -0.2 && spec.truePeakCeilingDb >= -1.5, `True peak ceiling for '${p}' is compliant`);

  const filters = buildMultiBandMasteringFilterGraph({ lufsProfile: p });
  assert(filters.length >= 6, `Profile '${p}' generates full multi-stage filtergraph`);
  const filterStr = filters.join(",");
  assert(filterStr.includes(`loudnorm=I=${spec.targetLufs.toFixed(1)}`), `Profile '${p}' applies exact LUFS target`);
  assert(filterStr.includes("alimiter=level_in=1.0"), `Profile '${p}' terminates with lookahead limiter`);
  assert(filterStr.includes("highpass=f=22:p=2"), "Mastering includes 22Hz 2-pole subsonic DC guard");
}

// 1.2 Analog warmth & saturation scaling
const cleanMaster = buildMultiBandMasteringFilterGraph({ analogWarmth: 0.0 });
assert(!cleanMaster.some((f) => f.includes("asoftclip=")), "Warmth 0.0 emits no asoftclip filter");

const warmMaster = buildMultiBandMasteringFilterGraph({ analogWarmth: 0.8 });
assert(warmMaster.some((f) => f.includes("asoftclip=type=tan:param=1.60")), "Warmth 0.8 applies tuned softclip saturation");

console.log("\n=== 2. Testing 4-Track Stem Separation Engine ===");

// 2.1 Stems verified
const stemTypes: StemType[] = ["vocals", "bass", "drums", "instruments"];
for (const s of stemTypes) {
  assert(STEM_DEFINITIONS[s] !== undefined, `Stem definition for '${s}' is present`);
  const stemFilters = buildSingleStemFilter(s);
  assert(stemFilters.length >= 3, `Stem '${s}' filterchain has multi-stage processing`);
  const stemStr = stemFilters.join(",");
  assert(stemStr.includes("alimiter=level_in=1.0"), `Stem '${s}' includes limiter protection`);
}

// 2.2 Bass stem Linkwitz-Riley & mono folding
const bassFilters = buildSingleStemFilter("bass").join(",");
assert(bassFilters.includes("lowpass=f=180:p=2,lowpass=f=180:p=2"), "Bass stem applies 4th-order Linkwitz-Riley 24dB/oct cutoff");
assert(bassFilters.includes("pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1"), "Bass stem folds sub-frequencies strictly to mono");

// 2.3 Single-pass multi-output stem synthesis
const singlePass = buildSinglePassStemSeparationArgs("input.wav", "output-stem", "mp3");
assert(singlePass.args.includes("-filter_complex"), "Single-pass stem separation uses -filter_complex");
assert(singlePass.args.some((a) => a.includes("asplit=4[in_voc][in_bas][in_dru][in_ins]")), "Single-pass stem separation splits input stream into 4 branches");
assert(singlePass.outputFiles.vocals === "output-stem-vocals.mp3", "Vocals output path matches target");
assert(singlePass.outputFiles.bass === "output-stem-bass.mp3", "Bass output path matches target");
assert(singlePass.outputFiles.drums === "output-stem-drums.mp3", "Drums output path matches target");
assert(singlePass.outputFiles.instruments === "output-stem-instruments.mp3", "Instruments output path matches target");

console.log("\n=== 3. Testing Modular Real-Time FX Rack Engine ===");

// 3.1 Bypass behavior
const bypassedRack: FXRackConfig = { ...DEFAULT_FX_RACK_CONFIG, isBypassed: true };
const bypassedFilters = buildFXRackFilterChain(bypassedRack);
assert(bypassedFilters.length === 0, "Bypassed FX Rack returns 0 filters (fast-path)");

// 3.2 Multi-module cascade
const activeRack: FXRackConfig = {
  ...DEFAULT_FX_RACK_CONFIG,
  isBypassed: false,
  masterGainDb: 1.5,
  modules: DEFAULT_FX_RACK_CONFIG.modules.map((m) => {
    if (m.id === "bass-booster") return { ...m, enabled: true };
    if (m.id === "equalizer") return { ...m, enabled: true, params: { gains: [4, 0, 0, 0, 0, 0, 0, 0, 2, 3] } };
    if (m.id === "saturation") return { ...m, enabled: true, params: { warmth: 0.5 } };
    if (m.id === "reverb") return { ...m, enabled: true };
    return m;
  }),
};

const activeFilters = buildFXRackFilterChain(activeRack);
const activeStr = activeFilters.join(",");
assert(activeStr.includes("bass=g="), "FX Rack includes Bass Booster module");
assert(activeStr.includes("equalizer=f=32"), "FX Rack includes Equalizer 32Hz band");
assert(activeStr.includes("equalizer=f=16000"), "FX Rack includes Equalizer 16kHz band");
assert(!activeStr.includes("equalizer=f=1000"), "FX Rack prunes 0dB Equalizer band (fast-path)");
assert(activeStr.includes("asoftclip="), "FX Rack includes Saturation module");
assert(activeStr.includes("aecho="), "FX Rack includes Reverb module");
assert(activeStr.includes("volume=1.5dB"), "FX Rack applies master gain adjustment");
assert(activeStr.includes("alimiter="), "FX Rack terminates with master peak limiter");

console.log(`\n==================================================`);
console.log(`ALL FX RACK & MASTERING TESTS PASSED! (${passed}/${total})`);
console.log(`==================================================\n`);
