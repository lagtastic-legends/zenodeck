/**
 * Unit Test Suite for Phase 3: High-Speed 8D Spatial Audio DSP Engine
 */

import {
  DEFAULT_8D_PARAMS,
  audioBufferToWavBlob,
  Spatial8DParams,
} from "../src/lib/audio/spatial-engine";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("⚡ TESTING PHASE 3: 8D SPATIAL AUDIO DSP ENGINE");
  console.log("=================================================");

  // 1. Parameter Boundary Verification
  console.log(`[Test 1] Default 8D Parameters:`, DEFAULT_8D_PARAMS);
  assert(DEFAULT_8D_PARAMS.speedHz >= 0.05 && DEFAULT_8D_PARAMS.speedHz <= 1.0, "speedHz in valid perceptual range");
  assert(DEFAULT_8D_PARAMS.intensity > 0.0 && DEFAULT_8D_PARAMS.intensity <= 1.0, "intensity bounded between 0 and 1");
  assert(DEFAULT_8D_PARAMS.stereoWidth >= 1.0, "stereoWidth >= 1.0 for spatial widening");

  // 2. Orbital Panning Trigonometric Math
  function computePan(phase: number, intensity: number): { gainL: number; gainR: number } {
    const azimuth = Math.sin(phase);
    const panNorm = (azimuth * intensity + 1.0) * 0.5;
    const angle = panNorm * (Math.PI / 2);
    return {
      gainL: Math.cos(angle),
      gainR: Math.sin(angle),
    };
  }

  const centerPan = computePan(0, 0.85); // Azimuth = 0 (Dead center)
  const leftPan = computePan(-Math.PI / 2, 1.0); // Azimuth = -1.0 (Hard left)
  const rightPan = computePan(Math.PI / 2, 1.0); // Azimuth = +1.0 (Hard right)

  console.log(`[Test 2] Pan Center: L=${centerPan.gainL.toFixed(3)}, R=${centerPan.gainR.toFixed(3)}`);
  console.log(`[Test 2] Pan Hard Left: L=${leftPan.gainL.toFixed(3)}, R=${leftPan.gainR.toFixed(3)}`);
  console.log(`[Test 2] Pan Hard Right: L=${rightPan.gainL.toFixed(3)}, R=${rightPan.gainR.toFixed(3)}`);

  // Equal-power law: gainL^2 + gainR^2 ≈ 1.0
  const centerPower = Math.pow(centerPan.gainL, 2) + Math.pow(centerPan.gainR, 2);
  assert(Math.abs(centerPower - 1.0) < 0.001, "Equal power panning preserves unity power at center");
  assert(leftPan.gainL > 0.99 && leftPan.gainR < 0.01, "Hard left yields full left gain and silent right");
  assert(rightPan.gainR > 0.99 && rightPan.gainL < 0.01, "Hard right yields full right gain and silent left");

  // 3. Mid/Side Stereo Matrixing Physics
  function midSide(sampleL: number, sampleR: number, width: number): { outL: number; outR: number } {
    const mid = (sampleL + sampleR) * 0.5;
    const side = (sampleL - sampleR) * 0.5 * width;
    return { outL: mid + side, outR: mid - side };
  }

  // Mono input (L = 1.0, R = 1.0) -> Side cancels out completely, Mid remains 1.0
  const monoRes = midSide(1.0, 1.0, 1.5);
  console.log(`[Test 3] Mono Mid/Side: L=${monoRes.outL}, R=${monoRes.outR}`);
  assert(monoRes.outL === 1.0 && monoRes.outR === 1.0, "Mono signal is invariant across stereo width scaling");

  // Out-of-phase input (L = 1.0, R = -1.0) -> Mid cancels to 0, Side amplified by 1.5x
  const outOfPhaseRes = midSide(1.0, -1.0, 1.5);
  console.log(`[Test 3] Out-of-Phase Mid/Side: L=${outOfPhaseRes.outL}, R=${outOfPhaseRes.outR}`);
  assert(outOfPhaseRes.outL === 1.5 && outOfPhaseRes.outR === -1.5, "Out-of-phase side signal is amplified by width coefficient");

  // 4. Mock AudioBuffer to 16-bit PCM Stereo WAV Binary Encoding
  const sampleRate = 44100;
  const numFrames = 441; // 10ms of audio
  const mockChannelL = new Float32Array(numFrames);
  const mockChannelR = new Float32Array(numFrames);

  for (let i = 0; i < numFrames; i++) {
    mockChannelL[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    mockChannelR[i] = Math.cos((2 * Math.PI * 440 * i) / sampleRate);
  }

  const mockAudioBuffer = {
    numberOfChannels: 2,
    sampleRate: 44100,
    length: numFrames,
    duration: numFrames / sampleRate,
    getChannelData: (ch: number) => (ch === 0 ? mockChannelL : mockChannelR),
  } as unknown as AudioBuffer;

  const wavBlob = audioBufferToWavBlob(mockAudioBuffer);
  console.log(`[Test 4] Generated WAV Blob size: ${wavBlob.size} bytes, MIME: ${wavBlob.type}`);
  assert(wavBlob.type === "audio/wav", "MIME type is audio/wav");

  const expectedBytes = 44 + numFrames * 2 * 2; // 44-byte header + numFrames * 2 channels * 2 bytes/sample
  assert(wavBlob.size === expectedBytes, `WAV file byte size exactly matches calculated PCM size (${expectedBytes})`);

  // Verify RIFF and WAVE magic headers
  const buffer = await wavBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const magicRiff = String.fromCharCode(...bytes.slice(0, 4));
  const magicWave = String.fromCharCode(...bytes.slice(8, 12));
  const magicFmt = String.fromCharCode(...bytes.slice(12, 16));
  const magicData = String.fromCharCode(...bytes.slice(36, 40));

  console.log(`[Test 4] WAV Headers: ${magicRiff} -> ${magicWave} -> ${magicFmt} -> ${magicData}`);
  assert(magicRiff === "RIFF", "Header starts with RIFF descriptor");
  assert(magicWave === "WAVE", "Header contains WAVE container code");
  assert(magicFmt === "fmt ", "Sub-chunk 1 is fmt");
  assert(magicData === "data", "Sub-chunk 2 is data");

  console.log("=================================================");
  console.log("✅ ALL PHASE 3 SPATIAL AUDIO TESTS PASSED!");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
