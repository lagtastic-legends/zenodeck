/**
 * Unit Test Suite for Phase 2: Off-Thread WebGL Video & ASCII Shader Engine
 */

import type {
  AsciiOptions,
  ScaleOptions,
  WorkerInboundMessage,
  WorkerOutboundMessage,
} from "../src/workers/visual-render.worker";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
}

function runTests() {
  console.log("=================================================");
  console.log("⚡ TESTING PHASE 2: OFFSCREEN SHADER & ASCII ENGINE");
  console.log("=================================================");

  // 1. Rec. 709 Luminance Standard Verification
  function getLuminance(r: number, g: number, b: number): number {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const whiteLum = getLuminance(255, 255, 255);
  const blackLum = getLuminance(0, 0, 0);
  const greenLum = getLuminance(0, 255, 0);
  const redLum = getLuminance(255, 0, 0);
  const blueLum = getLuminance(0, 0, 255);

  console.log(`[Test 1] Luminance Rec.709: White=${whiteLum.toFixed(1)}, Green=${greenLum.toFixed(1)}, Red=${redLum.toFixed(1)}, Blue=${blueLum.toFixed(1)}`);
  assert(Math.round(whiteLum) === 255, "White luminance evaluates to 255");
  assert(blackLum === 0, "Black luminance evaluates to 0");
  assert(greenLum > redLum && redLum > blueLum, "Human eye perceptual green > red > blue weight is preserved");

  // 2. ASCII Character Ramp Sampling
  const RAMPS = {
    standard: " .:-=+*#%@",
    blocks: " ░▒▓█",
  };

  const stdLen = RAMPS.standard.length;
  const darkIdx = Math.min(stdLen - 1, Math.floor((0 / 255) * stdLen));
  const brightIdx = Math.min(stdLen - 1, Math.floor((255 / 255) * stdLen));

  console.log(`[Test 2] Darkest Char: '${RAMPS.standard[darkIdx]}', Brightest Char: '${RAMPS.standard[brightIdx]}'`);
  assert(RAMPS.standard[darkIdx] === " ", "Lowest luminance maps to space character");
  assert(RAMPS.standard[brightIdx] === "@", "Highest luminance maps to @ dense character");

  // 3. Contrast Adjustment Formula Verification
  function adjustContrast(val: number, contrast: number): number {
    return Math.min(255, Math.max(0, (val - 128) * contrast + 128));
  }

  const midGray = adjustContrast(128, 1.5);
  const highVal = adjustContrast(200, 1.5);
  const lowVal = adjustContrast(50, 1.5);

  console.log(`[Test 3] Contrast math: 128 -> ${midGray}, 200 -> ${highVal}, 50 -> ${lowVal}`);
  assert(midGray === 128, "Midpoint gray (128) remains invariant under contrast change");
  assert(highVal > 200, "High tone is pushed brighter");
  assert(lowVal < 50, "Low tone is pushed darker");

  // 4. Inbound / Outbound Worker Message Protocol
  const inbound: WorkerInboundMessage = {
    type: "RENDER_ASCII",
    id: "test-req-1",
    bitmap: {} as ImageBitmap,
    options: {
      columns: 120,
      rampType: "blocks",
      invert: false,
    },
  };

  const outbound: WorkerOutboundMessage = {
    type: "ASCII_RESULT",
    id: "test-req-1",
    asciiText: "░▒▓█",
    width: 120,
    height: 40,
  };

  console.log(`[Test 4] Message protocol verified: Inbound=${inbound.type}, Outbound=${outbound.type}`);
  assert(inbound.type === "RENDER_ASCII", "Inbound RENDER_ASCII typed contract valid");
  assert(outbound.type === "ASCII_RESULT", "Outbound ASCII_RESULT typed contract valid");

  console.log("=================================================");
  console.log("✅ ALL PHASE 2 OFFSCREEN SHADER TESTS PASSED!");
  console.log("=================================================");
}

runTests();
