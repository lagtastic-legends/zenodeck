setTimeout(() => process.exit(1), 15000).unref();

import { strict as assert } from "node:assert";
import {
  EIGHT_D_SLOWED_REVERB_STUDIO_PRESET,
  EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET,
  SLOWED_REVERB_PRESETS,
  buildFXRackFilterChain,
} from "../src/lib/audio/fx-rack-engine";
import {
  build8DSlowedReverbFilter,
  getAudioFilterGraph,
} from "../src/lib/audio-dsp";

console.log("=== RUNNING 8D SPATIAL + SLOWED & REVERB DSP VERIFICATION ===");

// 1. Verify Preset A (Studio Balanced)
console.log("\n[1/6] Validating EIGHT_D_SLOWED_REVERB_STUDIO_PRESET structure and parameters...");
assert(EIGHT_D_SLOWED_REVERB_STUDIO_PRESET, "EIGHT_D_SLOWED_REVERB_STUDIO_PRESET must exist");
assert.equal(EIGHT_D_SLOWED_REVERB_STUDIO_PRESET.modules.length, 4, "Must contain 4 stages (Tempo, Spatial, Reverb, Limiter)");
assert.equal(EIGHT_D_SLOWED_REVERB_STUDIO_PRESET.modules[0].id, "tempo-changer", "Stage 1 must be tempo-changer");
assert.equal(EIGHT_D_SLOWED_REVERB_STUDIO_PRESET.modules[1].id, "spatial-8d", "Stage 2 must be spatial-8d");
assert.equal(EIGHT_D_SLOWED_REVERB_STUDIO_PRESET.modules[2].id, "reverb", "Stage 3 must be reverb");
assert.equal(EIGHT_D_SLOWED_REVERB_STUDIO_PRESET.modules[3].id, "master-limiter", "Stage 4 must be master-limiter");

const studioTempo = EIGHT_D_SLOWED_REVERB_STUDIO_PRESET.modules[0].params;
assert.equal(studioTempo.tempo, 0.87, "Studio tempo must be 0.87");
assert.equal(studioTempo.preservePitch, false, "Studio preservePitch must be false");

const studioSpatial = EIGHT_D_SLOWED_REVERB_STUDIO_PRESET.modules[1].params;
assert.equal(studioSpatial.orbitRateHz, 0.12, "Studio orbit rate must be 0.12Hz");
assert.equal(studioSpatial.panDepth, 0.88, "Studio pan depth must be 0.88");
assert.equal(studioSpatial.haasDelayMs, 0.35, "Studio Haas delay must be 0.35ms");
assert.equal(studioSpatial.rearHeadLowpassHz, 7200, "Studio rear lowpass must be 7200Hz");
assert.equal(studioSpatial.bassMonoCrossoverHz, 120, "Studio bass crossover must be 120Hz");

const studioReverb = EIGHT_D_SLOWED_REVERB_STUDIO_PRESET.modules[2].params;
assert.equal(studioReverb.preDelayMs, 35, "Studio pre-delay must be 35ms");
assert.equal(studioReverb.reverberance, 46, "Studio reverberance must be 46");
assert.equal(studioReverb.roomScale, 92, "Studio roomScale must be 92");
assert.equal(studioReverb.hfDamping, 65, "Studio hfDamping must be 65%");
assert.equal(studioReverb.stereoDepth, 100, "Studio stereoDepth must be 100");
assert.equal(studioReverb.wetGainDb, -5.5, "Studio wetGainDb must be -5.5dB");
assert.equal(studioReverb.wetHighPassHz, 140, "Studio wetHighPassHz must be 140Hz");
console.log("✓ Preset A (Studio Balanced) passed verification.");

// 2. Verify Preset B (Deep Hypnotic)
console.log("\n[2/6] Validating EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET structure and parameters...");
assert(EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET, "EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET must exist");
assert.equal(EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET.modules[0].id, "tempo-changer", "Stage 1 must be tempo-changer");
assert.equal(EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET.modules[1].id, "spatial-8d", "Stage 2 must be spatial-8d");
assert.equal(EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET.modules[2].id, "reverb", "Stage 3 must be reverb");
assert.equal(EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET.modules[3].id, "master-limiter", "Stage 4 must be master-limiter");

const hypTempo = EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET.modules[0].params;
assert.equal(hypTempo.tempo, 0.84, "Hypnotic tempo must be 0.84");
assert.equal(hypTempo.preservePitch, false, "Hypnotic preservePitch must be false");

const hypSpatial = EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET.modules[1].params;
assert.equal(hypSpatial.orbitRateHz, 0.09, "Hypnotic orbit rate must be 0.09Hz");
assert.equal(hypSpatial.panDepth, 0.94, "Hypnotic pan depth must be 0.94");
assert.equal(hypSpatial.haasDelayMs, 0.45, "Hypnotic Haas delay must be 0.45ms");
assert.equal(hypSpatial.rearHeadLowpassHz, 5800, "Hypnotic rear lowpass must be 5800Hz");
assert.equal(hypSpatial.bassMonoCrossoverHz, 120, "Hypnotic bass crossover must be 120Hz");

const hypReverb = EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET.modules[2].params;
assert.equal(hypReverb.preDelayMs, 28, "Hypnotic pre-delay must be 28ms");
assert.equal(hypReverb.reverberance, 56, "Hypnotic reverberance must be 56");
assert.equal(hypReverb.roomScale, 100, "Hypnotic roomScale must be 100");
assert.equal(hypReverb.hfDamping, 70, "Hypnotic hfDamping must be 70%");
assert.equal(hypReverb.stereoDepth, 100, "Hypnotic stereoDepth must be 100");
assert.equal(hypReverb.wetGainDb, -4.0, "Hypnotic wetGainDb must be -4.0dB");
assert.equal(hypReverb.wetHighPassHz, 150, "Hypnotic wetHighPassHz must be 150Hz");
console.log("✓ Preset B (Deep Hypnotic) passed verification.");

// 3. Verify Preset Registry
console.log("\n[3/6] Validating SLOWED_REVERB_PRESETS registry mapping...");
assert(SLOWED_REVERB_PRESETS["8d-slowed-reverb-studio"], "Must register 8d-slowed-reverb-studio");
assert(SLOWED_REVERB_PRESETS["8d-slowed-reverb-hypnotic"], "Must register 8d-slowed-reverb-hypnotic");
console.log("✓ Preset registry mapping verified.");

// 4. Verify FX Rack Filter Chain Output
console.log("\n[4/6] Validating buildFXRackFilterChain for 8D Spatial + Slowed & Reverb...");
const fxChain = buildFXRackFilterChain(EIGHT_D_SLOWED_REVERB_STUDIO_PRESET);
const fxChainStr = fxChain.join(";");
assert(fxChainStr.includes("asetrate=44100*0.8700"), "FX Rack generates asetrate=44100*0.8700");
assert(fxChainStr.includes("aresample=44100"), "FX Rack resamples to 44100");
assert(fxChainStr.includes("lowpass=f=120"), "FX Rack 120Hz mono sub-bass lowpass");
assert(fxChainStr.includes("highpass=f=120"), "FX Rack 120Hz spatial highpass");
assert(fxChainStr.includes("apulsator=mode=sine:hz=0.12:amount=0.88"), "FX Rack 0.12Hz 88% orbit panner");
assert(fxChainStr.includes("adelay=35|35"), "FX Rack 35ms pre-delay");
assert(fxChainStr.includes("highpass=f=140"), "FX Rack 140Hz wet highpass");
assert(fxChainStr.includes("volume=-5.5dB"), "FX Rack -5.5dB wet gain");
assert(fxChainStr.includes("alimiter=limit=0.944"), "FX Rack broadcast limiter");
console.log("✓ FX Rack filter chain passed all assertions.");

// 5. Verify build8DSlowedReverbFilter() in audio-dsp.ts
console.log("\n[5/6] Validating build8DSlowedReverbFilter default output in audio-dsp.ts...");
const filterArray = build8DSlowedReverbFilter();
const filterGraph = filterArray.join(";");

assert(filterGraph.includes("asetrate=44100*0.87"), "Must contain asetrate=44100*0.87");
assert(filterGraph.includes("aresample=44100"), "Must contain aresample=44100");
assert(filterGraph.includes("lowpass=f=120"), "Must contain lowpass=f=120");
assert(filterGraph.includes("apulsator=mode=sine:hz=0.12:amount=0.88"), "Must contain apulsator=mode=sine:hz=0.12:amount=0.88");
assert(filterGraph.includes("adelay=35|35"), "Must contain adelay=35|35");
assert(filterGraph.includes("highpass=f=140"), "Must contain highpass=f=140");
assert(filterGraph.includes("volume=-5.5dB"), "Must contain volume=-5.5dB");
assert(filterGraph.includes("alimiter=limit=0.944"), "Must contain alimiter=limit=0.944");
console.log("✓ build8DSlowedReverbFilter filtergraph verified.");

// 6. Verify getAudioFilterGraph delegation
console.log("\n[6/6] Validating getAudioFilterGraph delegation for combined modes...");
const slowedCombined = getAudioFilterGraph("slowed-reverb", { is8DCombined: true }).join(";");
assert(slowedCombined.includes("asetrate=44100*0.87"), "getAudioFilterGraph('slowed-reverb') contains asetrate=44100*0.87");
assert(slowedCombined.includes("apulsator=mode=sine:hz=0.12:amount=0.88"), "getAudioFilterGraph('slowed-reverb') contains apulsator");
assert(slowedCombined.includes("adelay=35|35"), "getAudioFilterGraph('slowed-reverb') contains adelay=35|35");

const spatialCombined = getAudioFilterGraph("spatial-8d", { is8DCombined: true }).join(";");
assert(spatialCombined.includes("asetrate=44100*0.87"), "getAudioFilterGraph('spatial-8d') contains asetrate=44100*0.87");
assert(spatialCombined.includes("apulsator=mode=sine:hz=0.12:amount=0.88"), "getAudioFilterGraph('spatial-8d') contains apulsator");
assert(spatialCombined.includes("adelay=35|35"), "getAudioFilterGraph('spatial-8d') contains adelay=35|35");

console.log("\n============================================================");
console.log("ALL 8D SPATIAL + SLOWED & REVERB TESTS PASSED (100% GREEN)!");
console.log("============================================================");

process.exit(0);
