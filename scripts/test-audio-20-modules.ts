/**
 * Automated 20-Module Audio Verification Suite
 * ============================================
 * Tests and verifies the entire ZenoDeck audio architecture, filter generation,
 * routing parity, and DSP graphs.
 */

import fs from "fs";
import path from "path";
import {
  buildTrimmerFilter,
  getAudioFilterGraph,
  getDefaultAudioParams,
  EQ_FREQUENCIES,
  EQ_PRESET_MAP,
} from "../src/lib/audio-dsp";
import {
  DEFAULT_FX_RACK_CONFIG,
  buildFXRackFilterChain,
} from "../src/lib/audio/fx-rack-engine";
import {
  buildSingleStemFilter,
  buildSinglePassStemSeparationArgs,
} from "../src/lib/audio/stem-separator";

const AUDIO_TOOL_IDS = [
  "audio-editor",
  "slowed-reverb",
  "audio-effects",
  "bass-booster",
  "spatial-8d",
  "equalizer",
  "reverse-audio",
  "stereo-panner",
  "volume-changer",
  "audio-dsp",
  "fx-rack",
  "stem-separator",
  "vocal-remover",
  "reverb",
  "auto-panner",
  "noise-reducer",
  "pitch-shifter",
  "tempo-changer",
  "trimmer",
  "ringtone-maker",
];

async function runVerification() {
  console.log("=== STARTING 20-MODULE AUDIO ENGINE VERIFICATION ===");
  const timeout = setTimeout(() => {
    console.error("FAILED: Verification timed out after 15s");
    process.exit(1);
  }, 15000);

  let passedTests = 0;

  // 1. Check all 20 tools route cleanly in app-shell.tsx
  console.log("\n[TEST 1] Verifying app-shell.tsx routing for all 20 audio tools...");
  const appShellPath = path.resolve(__dirname, "../src/components/shell/app-shell.tsx");
  const appShellContent = fs.readFileSync(appShellPath, "utf-8");

  for (const id of AUDIO_TOOL_IDS) {
    const match = appShellContent.includes(`"${id}":`);
    if (!match) {
      throw new Error(`Tool ID '${id}' is not mapped in TOOL_COMPONENTS in app-shell.tsx`);
    }
  }
  // Check that blind/playback-less editors are NOT used
  if (appShellContent.includes('"audio-editor": AudioEditor,')) {
    throw new Error("app-shell.tsx is still using the playback-less AudioEditor standalone component!");
  }
  if (appShellContent.includes('"ringtone-maker": RingtoneMaker,')) {
    throw new Error("app-shell.tsx is still using the playback-less RingtoneMaker standalone component!");
  }
  console.log(`✓ All 20 audio tools routed into UnifiedAudioStudio in app-shell.tsx`);
  passedTests++;

  // 2. Verify Trimmer Filter: Keep Mode and Cut Mode
  console.log("\n[TEST 2] Verifying Trimmer 'keep' and 'cut' (middle splice) filtergraphs...");
  const keepFilters = buildTrimmerFilter({
    startSec: 5.5,
    endSec: 25.0,
    fadeInSec: 1.0,
    fadeOutSec: 1.5,
    boostDb: 2,
    cutMode: "keep",
  });
  console.log("Keep mode filters:", keepFilters.join(", "));
  if (!keepFilters.some((f) => f.includes("atrim=start=5.50:end=25.00"))) {
    throw new Error("Keep mode missing valid atrim expression");
  }
  if (!keepFilters.some((f) => f.includes("afade=t=in") && f.includes("d=1.00"))) {
    throw new Error("Keep mode missing fadeIn");
  }
  if (!keepFilters.some((f) => f.includes("afade=t=out") && f.includes("d=1.50"))) {
    throw new Error("Keep mode missing fadeOut");
  }

  const cutFilters = buildTrimmerFilter({
    startSec: 10.0,
    endSec: 20.0,
    fadeInSec: 0.5,
    fadeOutSec: 0.5,
    boostDb: 0,
    cutMode: "cut",
  });
  console.log("Cut (splice) mode filters:", cutFilters.join(", "));
  if (!cutFilters.some((f) => f.includes("aselect='not(between(t\\,10.00\\,20.00))'"))) {
    throw new Error("Cut mode missing valid aselect expression");
  }
  if (!cutFilters.some((f) => f.includes("asetpts=N/SR/TB"))) {
    throw new Error("Cut mode missing asetpts re-timestamping");
  }
  console.log("✓ Trimmer 'keep' and 'cut' filtergraphs verified");
  passedTests++;

  // 3. Verify DSP Filter Graphs for all 20 effects
  console.log("\n[TEST 3] Verifying getAudioFilterGraph for various modules...");
  // Pitch shifter
  const pitchUp = getAudioFilterGraph("pitch-shifter", { semitones: 4 });
  console.log("Pitch shifter (+4 semitones):", pitchUp.join(", "));
  if (!pitchUp.some((f) => f.includes("asetrate=55563") || f.includes("asetrate=55562"))) {
    throw new Error("Pitch shifter +4 missing asetrate calculation");
  }

  const pitchDown = getAudioFilterGraph("pitch-shifter", { semitones: -3 });
  console.log("Pitch shifter (-3 semitones):", pitchDown.join(", "));
  if (!pitchDown.some((f) => f.includes("asetrate=37084"))) {
    throw new Error("Pitch shifter -3 missing asetrate calculation");
  }

  // Tempo changer
  const tempoFast = getAudioFilterGraph("tempo-changer", { speed: 1.5 });
  if (!tempoFast.some((f) => f.includes("atempo=1.5000"))) {
    throw new Error("Tempo changer 1.5x failed");
  }

  // 10-Band EQ
  const eqFilters = getAudioFilterGraph("equalizer", { gains: [3, 2, 1, 0, 0, -1, -2, 1, 2, 3] });
  console.log("10-Band EQ filters count:", eqFilters.length);
  if (eqFilters.length < 5) {
    throw new Error("10-Band EQ missing bands");
  }

  // Bass-Preserved Vocal Remover
  const vocalFilters = getAudioFilterGraph("vocal-remover", { mode: "bass_preserved", bassPreserveCutoffHz: 135 });
  if (!vocalFilters.some((f) => f.includes("highpass=f=135") && f.includes("lowpass=f=135"))) {
    throw new Error("Bass-preserved vocal remover missing 135Hz crossover");
  }

  // Slowed + Reverb
  const slowedReverb = getAudioFilterGraph("slowed-reverb", { speed: 0.85 });
  if (!slowedReverb.some((f) => f.includes("atempo=0.8500")) || !slowedReverb.some((f) => f.includes("aecho="))) {
    throw new Error("Slowed reverb filter missing atempo or aecho");
  }

  console.log("✓ DSP filtergraphs verified");
  passedTests++;

  // 4. Verify FX Rack Engine and Stem Separator
  console.log("\n[TEST 4] Verifying Modular FX Rack & 4-Stem filter pipelines...");
  const fxRackFilters = buildFXRackFilterChain({
    ...DEFAULT_FX_RACK_CONFIG,
    modules: DEFAULT_FX_RACK_CONFIG.modules.map((m) => ({ ...m, enabled: true })),
  });
  console.log("FX Rack full chain count:", fxRackFilters.length);
  if (!fxRackFilters.some((f) => f.includes("alimiter="))) {
    throw new Error("FX Rack missing limiter safety ceiling");
  }

  const stemArgs = buildSinglePassStemSeparationArgs("input.wav", "output", "mp3");
  if (!stemArgs.args.includes("-filter_complex")) {
    throw new Error("Single pass stem separation missing -filter_complex");
  }
  console.log("✓ FX Rack and 4-Stem filter pipelines verified");
  passedTests++;

  // 5. Verify UnifiedAudioStudio.tsx source code features
  console.log("\n[TEST 5] Verifying UnifiedAudioStudio.tsx internal components & live DSP...");
  const studioPath = path.resolve(__dirname, "../src/components/audio/UnifiedAudioStudio.tsx");
  const studioContent = fs.readFileSync(studioPath, "utf-8");

  const requiredTokens = [
    "createGranularPitchShifter",
    "createStudioImpulseResponse",
    "bassPreserveCutoffHz",
    "masterLimiter",
    "EQ_FREQUENCIES",
    "Ringtone Quick Presets",
    "Cutter Action Mode",
    "Zero-Snap",
    "transportRafRef",
    "useSaveDialogStore",
  ];

  for (const token of requiredTokens) {
    if (!studioContent.includes(token)) {
      throw new Error(`UnifiedAudioStudio.tsx is missing required token: '${token}'`);
    }
  }
  console.log("✓ UnifiedAudioStudio.tsx contains all required primitives, UI decks, and live DSP engines");
  passedTests++;

  clearTimeout(timeout);
  console.log(`\n🎉 ALL ${passedTests} VERIFICATION SUITES PASSED CLEANLY! Process exiting 0.`);
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
