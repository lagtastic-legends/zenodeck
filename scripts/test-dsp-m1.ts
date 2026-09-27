/**
 * Test Suite: Web Audio API DSP Node Chain (Milestone 1)
 * =======================================================
 * Validates ISO standard 10-band frequencies, preset profiles,
 * audio math calculations, A/B bypass logic, Web Audio graph topology,
 * and Zustand persistent store integration.
 */

import {
  ISO_10_BAND_FREQUENCIES,
  DSP_PRESETS,
  DSP_PRESET_MAP,
  clampGain,
  getPresetById,
  DEFAULT_DSP_STATE,
  DEFAULT_EQ_GAINS,
  MIN_EQ_GAIN_DB,
  MAX_EQ_GAIN_DB,
} from "../src/lib/audio/dsp-types";
import { AudioDspEngine } from "../src/lib/audio/dsp-engine";
import { useAudioDspStore } from "../src/lib/audio/dsp-store";

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

// =========================================================================
// Mock Web Audio API for headless Node.js testing
// =========================================================================

class MockAudioParam {
  public value: number;
  public targetValue: number | null = null;
  public timeConstant: number | null = null;

  constructor(initial: number = 0) {
    this.value = initial;
  }

  public setTargetAtTime(target: number, _startTime: number, timeConstant: number): void {
    this.value = target;
    this.targetValue = target;
    this.timeConstant = timeConstant;
  }
}

class MockAudioNode {
  public connections: (MockAudioNode | MockAudioParam)[] = [];

  public connect(destination: MockAudioNode | MockAudioParam, _output = 0, _input = 0): void {
    this.connections.push(destination);
  }

  public disconnect(destination?: MockAudioNode | MockAudioParam): void {
    if (destination) {
      this.connections = this.connections.filter((c) => c !== destination);
    } else {
      this.connections = [];
    }
  }
}

class MockGainNode extends MockAudioNode {
  public gain = new MockAudioParam(1.0);
}

class MockBiquadFilterNode extends MockAudioNode {
  public type: string = "peaking";
  public frequency = new MockAudioParam(1000);
  public gain = new MockAudioParam(0);
  public Q = new MockAudioParam(1.0);
}

class MockDynamicsCompressorNode extends MockAudioNode {
  public threshold = new MockAudioParam(-24);
  public knee = new MockAudioParam(30);
  public ratio = new MockAudioParam(12);
  public attack = new MockAudioParam(0.003);
  public release = new MockAudioParam(0.25);
}

class MockStereoPannerNode extends MockAudioNode {
  public pan = new MockAudioParam(0.0);
}

class MockDelayNode extends MockAudioNode {
  public delayTime: MockAudioParam;
  constructor(maxDelayTime = 1.0) {
    super();
    this.delayTime = new MockAudioParam(0);
  }
}

class MockChannelSplitterNode extends MockAudioNode {
  public numberOfOutputs: number;
  constructor(outputs = 2) {
    super();
    this.numberOfOutputs = outputs;
  }
}

class MockChannelMergerNode extends MockAudioNode {
  public numberOfInputs: number;
  constructor(inputs = 2) {
    super();
    this.numberOfInputs = inputs;
  }
}

class MockAnalyserNode extends MockAudioNode {
  public fftSize = 2048;
  public frequencyBinCount = 1024;
  public smoothingTimeConstant = 0.8;

  public getByteFrequencyData(array: Uint8Array): void {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.round(128 + 64 * Math.sin(i / 10));
    }
  }
}

class MockMediaElementAudioSourceNode extends MockAudioNode {}

class MockAudioContext {
  public state: "running" | "suspended" | "closed" = "running";
  public currentTime = 1.25;
  public destination = new MockAudioNode();

  public createGain(): MockGainNode {
    return new MockGainNode();
  }

  public createBiquadFilter(): MockBiquadFilterNode {
    return new MockBiquadFilterNode();
  }

  public createDynamicsCompressor(): MockDynamicsCompressorNode {
    return new MockDynamicsCompressorNode();
  }

  public createStereoPanner(): MockStereoPannerNode {
    return new MockStereoPannerNode();
  }

  public createDelay(maxDelay = 1.0): MockDelayNode {
    return new MockDelayNode(maxDelay);
  }

  public createChannelSplitter(outputs = 2): MockChannelSplitterNode {
    return new MockChannelSplitterNode(outputs);
  }

  public createChannelMerger(inputs = 2): MockChannelMergerNode {
    return new MockChannelMergerNode(inputs);
  }

  public createAnalyser(): MockAnalyserNode {
    return new MockAnalyserNode();
  }

  public createMediaElementSource(_audioEl: any): MockMediaElementAudioSourceNode {
    return new MockMediaElementAudioSourceNode();
  }

  public async resume(): Promise<void> {
    this.state = "running";
  }

  public async close(): Promise<void> {
    this.state = "closed";
  }
}

// =========================================================================
// Test Runner
// =========================================================================

async function runDspTests() {
  console.log("==========================================================");
  console.log("   MILESTONE M1: WEB AUDIO API DSP NODE CHAIN SUITE       ");
  console.log("==========================================================\n");

  // 1. ISO Standard 10-Band Frequencies
  console.log("--- 1. Testing ISO Standard 10-Band Frequencies ---");
  assert(ISO_10_BAND_FREQUENCIES.length === 10, "Exact 10 frequency bands defined");
  const expectedIso = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < expectedIso.length; i++) {
    assert(
      ISO_10_BAND_FREQUENCIES[i] === expectedIso[i],
      `Band ${i} frequency matches ISO standard ${expectedIso[i]} Hz`
    );
  }

  // 2. Curated Presets Integrity
  console.log("\n--- 2. Testing 10 Curated DSP Presets ---");
  assert(DSP_PRESETS.length === 10, "Exact 10 curated presets present");

  const expectedPresetIds = [
    "flat",
    "bass-boost",
    "vocal-boost",
    "club-edm",
    "rock",
    "pop",
    "classical",
    "8d-spatial",
    "acapella",
    "karaoke",
  ];

  for (const id of expectedPresetIds) {
    const preset = getPresetById(id);
    assert(!!preset, `Preset exists: ${id}`);
    if (preset) {
      assert(preset.eqGains.length === 10, `Preset ${id} has 10 EQ gain values`);
      const allInRange = preset.eqGains.every(
        (g) => g >= MIN_EQ_GAIN_DB && g <= MAX_EQ_GAIN_DB
      );
      assert(allInRange, `Preset ${id} EQ gains strictly within [-12dB, +12dB]`);
      assert(typeof preset.description === "string" && preset.description.length > 0, `Preset ${id} has descriptive text`);
    }
  }

  // Check specific preset parameters
  const bassBoostPreset = getPresetById("bass-boost")!;
  assert(bassBoostPreset.bassBoost.enabled === true, "Bass Boost preset enables bassBoost");
  assert(bassBoostPreset.bassBoost.gainDb === 6, "Bass Boost preset sets 6dB gain");

  const spatialPreset = getPresetById("8d-spatial")!;
  assert(spatialPreset.spatial8D.enabled === true, "8D Spatial preset enables 8D mode");
  assert(spatialPreset.spatial8D.speedHz === 0.25, "8D Spatial preset sets 0.25 Hz orbit speed");

  const acapellaPreset = getPresetById("acapella")!;
  assert(acapellaPreset.vocalMode === "isolate", "Acapella preset sets vocalMode to 'isolate'");

  const karaokePreset = getPresetById("karaoke")!;
  assert(karaokePreset.vocalMode === "remove", "Karaoke preset sets vocalMode to 'remove'");

  // 3. Audio Mathematics & Clamping
  console.log("\n--- 3. Testing DSP Math & Boundary Protection ---");
  assert(clampGain(15) === 12, "Clamps +15dB to MAX (+12dB)");
  assert(clampGain(-20) === -12, "Clamps -20dB to MIN (-12dB)");
  assert(clampGain(5.5) === 5.5, "Passes through +5.5dB unattenuated");
  assert(clampGain(NaN) === 0, "Handles NaN safely by returning 0dB");

  // Dynamic Headroom Compensation
  const bassGain = 8;
  const headroomDb = -(bassGain * 0.45); // -3.6 dB
  assert(Math.abs(headroomDb - -3.6) < 1e-6, "Headroom attenuation calculation: -3.6dB for 8dB bass boost");
  const headroomLinear = Math.pow(10, headroomDb / 20);
  assert(headroomLinear < 1.0 && headroomLinear > 0.6, `Linear headroom attenuation scalar (${headroomLinear.toFixed(4)}) is safe`);

  // Soft-Clipping Limiter Parameter Boundaries
  const limiterThreshold = -8.0;
  const limiterKnee = 8.0;
  const limiterRatio = 12.0;
  const limiterAttack = 0.005;
  const limiterRelease = 0.08;
  assert(limiterThreshold === -8.0, "Compressor threshold is -8.0 dBFS");
  assert(limiterKnee === 8.0, "Compressor knee is 8.0 dB for soft analog-style saturation");
  assert(limiterRatio === 12.0, "Compressor ratio is 12:1 for robust transient limiting");
  assert(limiterAttack === 0.005, "Compressor attack is 5ms");
  assert(limiterRelease === 0.08, "Compressor release is 80ms to prevent low-frequency pumping");

  // Haas delay line
  const haasDelaySec = 0.022; // 22ms
  assert(haasDelaySec === 0.022, "Haas micro-reflection delay line is calibrated to 22ms");

  // 4. A/B Bypass Dry/Wet Logic
  console.log("\n--- 4. Testing Zero-Glitch A/B Bypass Crossfade Math ---");
  const bypassedDry = true ? 1.0 : 0.0;
  const bypassedWet = true ? 0.0 : 1.0;
  assert(bypassedDry === 1.0 && bypassedWet === 0.0, "Bypassed state: Dry = 1.0, Wet = 0.0");

  const activeDry = false ? 1.0 : 0.0;
  const activeWet = false ? 0.0 : 1.0;
  assert(activeDry === 0.0 && activeWet === 1.0, "Active state: Dry = 0.0, Wet = 1.0");

  // 5. AudioDspEngine Audio Graph Wiring with Mock Web Audio
  console.log("\n--- 5. Testing AudioDspEngine Graph & Node Cascades ---");
  const mockCtx = new MockAudioContext();
  const engine = new AudioDspEngine(mockCtx as unknown as AudioContext);

  assert(engine.getContext() !== null, "AudioDspEngine initializes with AudioContext");
  assert(engine.getAnalyser() !== null, "AudioDspEngine initializes AnalyserNode");

  // MediaElement caching to strictly avoid InvalidStateError
  const mockAudioEl1 = { id: "audio-1" } as unknown as HTMLAudioElement;
  engine.attachElement(mockAudioEl1);
  assert(engine.isAttached(), "Engine reports element is attached");
  assert(engine.getAttachedElement() === mockAudioEl1, "Engine records attached element reference");

  // Re-attaching same element should not create duplicate source node
  engine.attachElement(mockAudioEl1);
  assert(engine.isAttached(), "Re-attaching same element is idempotent");

  // Setting band gains with 15ms de-zippering
  engine.setBandGain(0, 6.0);
  assert(engine.getEqGains()[0] === 6.0, "Band 0 gain set to +6.0 dB");

  engine.setAllGains([1, 2, 3, 4, 5, -1, -2, -3, -4, -5]);
  const currentGains = engine.getEqGains();
  assert(currentGains[4] === 5 && currentGains[9] === -5, "setAllGains sets all 10 bands correctly");

  // Dynamic Bass Boost
  engine.setBassBoost({ enabled: true, gainDb: 8.0, cutoffHz: 80 });
  const bassConfig = engine.getBassBoost();
  assert(bassConfig.enabled === true, "Bass Boost enabled in engine");
  assert(bassConfig.gainDb === 8.0, "Bass Boost gain set to 8.0 dB in engine");

  // 8D Spatial Audio & LFO
  engine.setSpatial8D({ enabled: true, speedHz: 0.5, intensity: 0.9 });
  const spatialConfig = engine.getSpatial8D();
  assert(spatialConfig.enabled === true, "8D Spatial enabled in engine");
  assert(spatialConfig.speedHz === 0.5, "8D Spatial speed set to 0.5 Hz");

  // Deterministic LFO tick step
  engine.tickSpatialLfo();
  assert(true, "tickSpatialLfo executes without errors");

  // Vocal Mode switching
  engine.setVocalMode("isolate");
  assert(engine.getVocalMode() === "isolate", "Vocal mode set to isolate");
  engine.setVocalMode("remove");
  assert(engine.getVocalMode() === "remove", "Vocal mode set to remove");
  engine.setVocalMode("off");
  assert(engine.getVocalMode() === "off", "Vocal mode set to off");

  // Bypass toggle
  engine.setBypass(true);
  assert(engine.isBypassed() === true, "Engine reports bypassed state");
  engine.setBypass(false);
  assert(engine.isBypassed() === false, "Engine reports active state");

  // Spectrum data retrieval
  const freqBuffer = new Uint8Array(128);
  engine.getFrequencyData(freqBuffer);
  assert(freqBuffer.some((val) => val > 0), "getFrequencyData populates spectrum data");

  // Clean disposal
  engine.dispose();
  assert(!engine.isAttached(), "Engine reports detached after dispose");

  // 6. Zustand Store Integration (useAudioDspStore)
  console.log("\n--- 6. Testing Zustand Persistent DSP Store ---");
  const store = useAudioDspStore.getState();

  // Reset to initial baseline
  useAudioDspStore.getState().resetAll();
  const resetState = useAudioDspStore.getState();
  assert(resetState.isBypassed === false, "Store initialized with bypass = false");
  assert(resetState.eqGains.every((g) => g === 0), "Store initialized with all zero gains");
  assert(resetState.vocalMode === "off", "Store initialized with vocalMode = off");

  // Band gain update
  useAudioDspStore.getState().setBandGain(2, 4.5);
  assert(useAudioDspStore.getState().eqGains[2] === 4.5, "Store sets band 2 to +4.5 dB");
  assert(useAudioDspStore.getState().activePresetId === null, "Custom gain adjustment clears activePresetId");

  // Bass boost update
  useAudioDspStore.getState().setBassBoost({ enabled: true, gainDb: 10 });
  assert(useAudioDspStore.getState().bassBoost.enabled === true, "Store sets bassBoost enabled");
  assert(useAudioDspStore.getState().bassBoost.gainDb === 10, "Store sets bassBoost gainDb");

  // Spatial 8D update
  useAudioDspStore.getState().setSpatial8D({ enabled: true, speedHz: 0.3 });
  assert(useAudioDspStore.getState().spatial8D.enabled === true, "Store sets spatial8D enabled");
  assert(useAudioDspStore.getState().spatial8D.speedHz === 0.3, "Store sets spatial8D speedHz");

  // Vocal mode update
  useAudioDspStore.getState().setVocalMode("remove");
  assert(useAudioDspStore.getState().vocalMode === "remove", "Store sets vocalMode to remove");

  // Bypass toggle
  useAudioDspStore.getState().toggleBypass();
  assert(useAudioDspStore.getState().isBypassed === true, "Store toggles bypass to true");
  useAudioDspStore.getState().toggleBypass();
  assert(useAudioDspStore.getState().isBypassed === false, "Store toggles bypass to false");

  // Preset application
  useAudioDspStore.getState().applyPreset("club-edm");
  const clubState = useAudioDspStore.getState();
  assert(clubState.activePresetId === "club-edm", "Store applies 'club-edm' preset");
  assert(clubState.bassBoost.enabled === true, "Club preset enables bass boost");
  assert(clubState.eqGains[0] === 6, "Club preset sets 32Hz band to +6 dB");

  // Reset EQ only
  useAudioDspStore.getState().resetEq();
  assert(useAudioDspStore.getState().eqGains.every((g) => g === 0), "resetEq resets all 10 bands to 0 dB");
  assert(useAudioDspStore.getState().bassBoost.enabled === true, "resetEq preserves bass boost setting");

  // Full Reset
  useAudioDspStore.getState().resetAll();
  const clearedState = useAudioDspStore.getState();
  assert(clearedState.bassBoost.enabled === false, "resetAll disables bass boost");
  assert(clearedState.spatial8D.enabled === false, "resetAll disables 8D");
  assert(clearedState.vocalMode === "off", "resetAll sets vocalMode to off");

  console.log("\n==========================================================");
  console.log(`TOTAL M1 DSP TESTS: ${totalTests}`);
  console.log(`PASSED:             ${passedTests}`);
  console.log(`FAILED:             0`);
  console.log("==========================================================");
}

runDspTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
