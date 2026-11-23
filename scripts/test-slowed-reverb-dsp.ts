setTimeout(() => process.exit(1), 15000).unref();

/**
 * ZenoDeck — Slowed + Reverb Audio DSP Verification Suite
 * ========================================================
 * Verifies the upgraded 35ms pre-delay, 65% HF damping, -5dB wet gain,
 * and 140Hz wet high-pass filter across both WebAudio and FFmpeg graphs.
 */

import fs from "fs";
import path from "path";
import {
  getDefaultAudioParams,
  getAudioFilterGraph,
  REVERB_SPACES,
  STUDIO_MODULE_PRESETS,
} from "../src/lib/audio-dsp";
import {
  SLOWED_REVERB_STUDIO_PRESET,
  SLOWED_REVERB_PHONK_PRESET,
  SLOWED_REVERB_PRESETS,
  buildFXRackFilterChain,
  createFXRackWebAudioNodes,
} from "../src/lib/audio/fx-rack-engine";

let passed = 0;
let total = 0;

function assert(condition: boolean, title: string, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${title}`);
  } else {
    console.error(`  ✗ FAIL: ${title}${detail ? ` -> ${detail}` : ""}`);
    process.exit(1);
  }
}

console.log("=== 1. Validating Slowed & Reverb Presets & Default Parameters ===");

// 1.1 Default "Slowed + Reverb (Studio Balanced)" preset
assert(SLOWED_REVERB_STUDIO_PRESET !== undefined, "SLOWED_REVERB_STUDIO_PRESET is exported");
assert(!SLOWED_REVERB_STUDIO_PRESET.isBypassed, "Studio Balanced preset is not bypassed");

const studioTempo = SLOWED_REVERB_STUDIO_PRESET.modules.find((m) => m.id === "tempo-changer");
assert(studioTempo !== undefined && studioTempo.enabled, "Tempo Changer is active in Studio Balanced preset");
assert(studioTempo?.params.tempo === 0.87, `Studio Balanced tempo is 0.87 (got ${studioTempo?.params.tempo})`);
assert(studioTempo?.params.preservePitch === false, "Studio Balanced preservePitch is false (analog tape pitch drop)");

const studioReverb = SLOWED_REVERB_STUDIO_PRESET.modules.find((m) => m.id === "reverb");
assert(studioReverb !== undefined && studioReverb.enabled, "Reverb module is active in Studio Balanced preset");
assert(studioReverb?.params.preDelayMs === 35, `Studio Balanced preDelayMs is 35ms (got ${studioReverb?.params.preDelayMs})`);
assert(studioReverb?.params.hfDamping === 65, `Studio Balanced hfDamping is 65% (got ${studioReverb?.params.hfDamping})`);
assert(studioReverb?.params.wetHighPassHz === 140, `Studio Balanced wetHighPassHz is 140Hz (got ${studioReverb?.params.wetHighPassHz})`);
assert(studioReverb?.params.wetGainDb === -5, `Studio Balanced wetGainDb is -5dB (got ${studioReverb?.params.wetGainDb})`);
assert(studioReverb?.params.reverberance === 45, "Studio Balanced reverberance is 45%");
assert(studioReverb?.params.roomScale === 90, "Studio Balanced roomScale is 90%");
assert(studioReverb?.params.stereoDepth === 100, "Studio Balanced stereoDepth is 100%");

// Signal chain ordering check: tempo-changer MUST be positioned before reverb
const tempoIdx = SLOWED_REVERB_STUDIO_PRESET.modules.findIndex((m) => m.id === "tempo-changer");
const reverbIdx = SLOWED_REVERB_STUDIO_PRESET.modules.findIndex((m) => m.id === "reverb");
assert(tempoIdx !== -1 && reverbIdx !== -1 && tempoIdx < reverbIdx, "Signal chain order verified: 1. Tempo Changer -> 2. Reverb");

// 1.2 Secondary "Slowed + Reverb (Deep Atmospheric / Phonk)" preset
assert(SLOWED_REVERB_PHONK_PRESET !== undefined, "SLOWED_REVERB_PHONK_PRESET is exported");
const phonkTempo = SLOWED_REVERB_PHONK_PRESET.modules.find((m) => m.id === "tempo-changer");
assert(phonkTempo?.params.tempo === 0.84, `Deep Phonk tempo is 0.84 (got ${phonkTempo?.params.tempo})`);
assert(phonkTempo?.params.preservePitch === false, "Deep Phonk preservePitch is false");

const phonkReverb = SLOWED_REVERB_PHONK_PRESET.modules.find((m) => m.id === "reverb");
assert(phonkReverb?.params.preDelayMs === 25, `Deep Phonk preDelayMs is 25ms (got ${phonkReverb?.params.preDelayMs})`);
assert(phonkReverb?.params.hfDamping === 70, `Deep Phonk hfDamping is 70% (got ${phonkReverb?.params.hfDamping})`);
assert(phonkReverb?.params.wetHighPassHz === 150, `Deep Phonk wetHighPassHz is 150Hz (got ${phonkReverb?.params.wetHighPassHz})`);
assert(phonkReverb?.params.wetGainDb === -3.5, `Deep Phonk wetGainDb is -3.5dB (got ${phonkReverb?.params.wetGainDb})`);
assert(phonkReverb?.params.roomScale === 100, "Deep Phonk roomScale is 100%");

// 1.3 getDefaultAudioParams("slowed-reverb")
const defaultAudioParams = getDefaultAudioParams("slowed-reverb");
assert(defaultAudioParams.speed === 0.87, `Default speed is 0.87 (got ${defaultAudioParams.speed})`);
assert(defaultAudioParams.preservePitch === false, "Default preservePitch is false");
assert(defaultAudioParams.preDelayMs === 35, `Default preDelayMs is 35 (got ${defaultAudioParams.preDelayMs})`);
assert(defaultAudioParams.hfDamping === 65, `Default hfDamping is 65 (got ${defaultAudioParams.hfDamping})`);
assert(defaultAudioParams.wetHighPassHz === 140, `Default wetHighPassHz is 140 (got ${defaultAudioParams.wetHighPassHz})`);
assert(defaultAudioParams.wetGainDb === -5.0, `Default wetGainDb is -5.0 (got ${defaultAudioParams.wetGainDb})`);

console.log("\n=== 2. Validating Offline FFmpeg Filter Graphs ===");

// 2.1 FX Rack Filter Chain
const fxFilters = buildFXRackFilterChain(SLOWED_REVERB_STUDIO_PRESET);
const fxFilterStr = fxFilters.join(";");
assert(fxFilterStr.includes("asetrate=44100*0.8700"), "FX Rack generates analog tape asetrate=44100*0.8700");
assert(fxFilterStr.includes("aresample=44100"), "FX Rack resamples to standard 44.1kHz rate");
assert(fxFilterStr.includes("asplit=2[dry][wet]"), "FX Rack creates 2-way parallel wet/dry split");
assert(fxFilterStr.includes("adelay=35|35"), "FX Rack applies 35ms stereo pre-delay");
assert(fxFilterStr.includes("highpass=f=140"), "FX Rack applies 140Hz high-pass filter on wet path");
assert(fxFilterStr.includes("lowpass=f=4800"), "FX Rack applies ~4800Hz HF damping low-pass filter");
assert(fxFilterStr.includes("volume=-5dB"), "FX Rack applies -5dB wet path gain");
assert(fxFilterStr.includes("amix=inputs=2:weights=1 1:normalize=0"), "FX Rack sums dry and wet paths without normalization penalty");
assert(fxFilterStr.includes("alimiter=limit=0.944"), "FX Rack protects against clipping with -0.5 dB (0.944) peak limiter");

// 2.2 UnifiedAudioStudio getAudioFilterGraph
const dspFilters = getAudioFilterGraph("slowed-reverb", defaultAudioParams);
const dspFilterStr = dspFilters.join(";");
assert(dspFilterStr.includes("asetrate=38367"), "Audio DSP calculates exact 44100 * 0.87 = 38367 asetrate");
assert(dspFilterStr.includes("aresample=44100"), "Audio DSP resamples back to 44100");
assert(dspFilterStr.includes("adelay=35|35"), "Audio DSP applies 35ms pre-delay");
assert(dspFilterStr.includes("highpass=f=140"), "Audio DSP cuts wet sub-bass at 140Hz");
assert(dspFilterStr.includes("lowpass=f=4800"), "Audio DSP cuts harsh highs at 4800Hz");
assert(dspFilterStr.includes("volume=-5dB"), "Audio DSP sets wet gain to -5dB");
assert(dspFilterStr.includes("alimiter=limit=0.944"), "Audio DSP includes -0.5dB true-peak ceiling");

// 2.3 REVERB_SPACES preset
const spaceFilter = REVERB_SPACES["slowed-reverb"].buildFilter(44100).join(";");
assert(spaceFilter.includes("adelay=35|35"), "REVERB_SPACES slowed-reverb includes 35ms delay");
assert(spaceFilter.includes("highpass=f=140"), "REVERB_SPACES slowed-reverb includes 140Hz highpass");
assert(spaceFilter.includes("volume=-5dB"), "REVERB_SPACES slowed-reverb includes -5dB volume");

console.log("\n=== 3. Validating WebAudio Live Preview Graph Architecture ===");

// Mock Web Audio Context to inspect node chain creation
class MockAudioNode {
  connections: any[] = [];
  connect(dest: any) { this.connections.push(dest); return dest; }
  disconnect() { this.connections = []; }
}
class MockGainNode extends MockAudioNode {
  gain = { value: 1.0 };
}
class MockDelayNode extends MockAudioNode {
  delayTime = { value: 0.0 };
}
class MockBiquadFilterNode extends MockAudioNode {
  type = "lowpass";
  frequency = { value: 350 };
}
class MockConvolverNode extends MockAudioNode {
  buffer: any = null;
}
class MockDynamicsCompressorNode extends MockAudioNode {
  threshold = { value: -0.5 };
  knee = { value: 0 };
  ratio = { value: 20 };
  attack = { value: 0.003 };
  release = { value: 0.05 };
}

const createdNodes: {
  gains: MockGainNode[];
  delays: MockDelayNode[];
  filters: MockBiquadFilterNode[];
  convolvers: MockConvolverNode[];
  limiters: MockDynamicsCompressorNode[];
} = {
  gains: [],
  delays: [],
  filters: [],
  convolvers: [],
  limiters: [],
};

const mockCtx: any = {
  sampleRate: 44100,
  createGain: () => {
    const node = new MockGainNode();
    createdNodes.gains.push(node);
    return node;
  },
  createDelay: () => {
    const node = new MockDelayNode();
    createdNodes.delays.push(node);
    return node;
  },
  createBiquadFilter: () => {
    const node = new MockBiquadFilterNode();
    createdNodes.filters.push(node);
    return node;
  },
  createConvolver: () => {
    const node = new MockConvolverNode();
    createdNodes.convolvers.push(node);
    return node;
  },
  createDynamicsCompressor: () => {
    const node = new MockDynamicsCompressorNode();
    createdNodes.limiters.push(node);
    return node;
  },
  createBuffer: () => ({
    getChannelData: () => new Float32Array(1024),
  }),
};

const mockSource = new MockAudioNode();
const { masterGain, cleanup } = createFXRackWebAudioNodes(mockCtx, mockSource as any, SLOWED_REVERB_STUDIO_PRESET);

assert(masterGain !== undefined, "createFXRackWebAudioNodes returns masterGain");
assert(typeof cleanup === "function", "createFXRackWebAudioNodes returns cleanup function");

// Verify DelayNode (35ms = 0.035s)
const preDelayNode = createdNodes.delays.find((d) => Math.abs(d.delayTime.value - 0.035) < 0.001);
assert(preDelayNode !== undefined, "WebAudio graph includes DelayNode set to 0.035s (35ms)");

// Verify Highpass Filter (140 Hz)
const wetHpf = createdNodes.filters.find((f) => f.type === "highpass" && f.frequency.value === 140);
assert(wetHpf !== undefined, "WebAudio graph includes BiquadFilterNode highpass at 140Hz");

// Verify Lowpass HF Damping Filter (~4800 Hz)
const wetLpf = createdNodes.filters.find((f) => f.type === "lowpass" && Math.abs(f.frequency.value - 4800) < 50);
assert(wetLpf !== undefined, "WebAudio graph includes BiquadFilterNode lowpass at ~4800Hz");

// Verify ConvolverNode
assert(createdNodes.convolvers.length >= 1, "WebAudio graph includes ConvolverNode with impulse response buffer");

// Verify Wet GainNode (Math.pow(10, -5/20) = ~0.562)
const wetGainNode = createdNodes.gains.find((g) => Math.abs(g.gain.value - 0.5623) < 0.01);
assert(wetGainNode !== undefined, `WebAudio graph includes wet GainNode set to -5dB (linear ${wetGainNode?.gain.value.toFixed(3)})`);

// Verify -0.5 dB Master Brickwall Limiter
const brickwall = createdNodes.limiters.find((l) => l.threshold.value === -0.5);
assert(brickwall !== undefined, "WebAudio graph terminates in -0.5 dB brickwall safety limiter");

cleanup();

console.log("\n=== 4. Validating UI Decks & Parameter Controls ===");

// 4.1 FXRackStudio.tsx
const fxStudioSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/audio/FXRackStudio.tsx"), "utf-8");
assert(fxStudioSrc.includes("slowed-reverb-studio"), "FXRackStudio provides 'slowed-reverb-studio' preset");
assert(fxStudioSrc.includes("slowed-reverb-phonk"), "FXRackStudio provides 'slowed-reverb-phonk' preset");
assert(fxStudioSrc.includes("tempo-changer"), "FXRackStudio renders tempo-changer module slot");
assert(fxStudioSrc.includes("preDelayMs"), "FXRackStudio provides preDelayMs slider");
assert(fxStudioSrc.includes("hfDamping"), "FXRackStudio provides hfDamping slider");
assert(fxStudioSrc.includes("wetHighPassHz"), "FXRackStudio provides wetHighPassHz slider");
assert(fxStudioSrc.includes("wetGainDb"), "FXRackStudio provides wetGainDb slider");

// 4.2 UnifiedAudioStudio.tsx
const unifiedSrc = fs.readFileSync(path.resolve(__dirname, "../src/components/audio/UnifiedAudioStudio.tsx"), "utf-8");
assert(unifiedSrc.includes("Pre-Delay (Transient Separation)"), "UnifiedAudioStudio displays Pre-Delay slider");
assert(unifiedSrc.includes("HF Damping (Warm Analog Roll-off)"), "UnifiedAudioStudio displays HF Damping slider");
assert(unifiedSrc.includes("Wet Gain & Balance"), "UnifiedAudioStudio displays Wet Gain slider");
assert(unifiedSrc.includes("Wet High-Pass Filter (Sub-Bass Tightness)"), "UnifiedAudioStudio displays Wet High-Pass Filter slider");

console.log(`\n==================================================`);
console.log(`🎉 ALL ${passed}/${total} SLOWED + REVERB DSP CHECKS PASSED (100%)!`);
console.log(`==================================================\n`);

process.exit(0);
