/**
 * Unit Test Suite for Phase 1: OPFS Storage & Smart Engine Router
 */

import { analyzeMediaTask, MediaTaskRequest } from "../src/lib/media/engine-router";
import { isOPFSSupported, getStorageQuota } from "../src/lib/storage/opfs-manager";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
}

async function runTests() {
  console.log("=================================================");
  console.log("⚡ TESTING PHASE 1: OPFS STORAGE & ENGINE ROUTER");
  console.log("=================================================");

  // 1. OPFS Environment Probe
  const opfsSupported = await isOPFSSupported();
  console.log(`[Test 1] OPFS Support Detected (Node / Non-Browser context): ${opfsSupported}`);
  // In Node.js environment without browser globals, isOPFSSupported must safely return false without throwing
  assert(typeof opfsSupported === "boolean", "isOPFSSupported returns a boolean");

  // 2. Storage Quota Calculation
  const quota = await getStorageQuota();
  console.log(`[Test 2] Storage Quota Estimate:`, quota);
  assert(typeof quota.usageBytes === "number", "usageBytes is numeric");
  assert(typeof quota.quotaBytes === "number", "quotaBytes is numeric");
  assert(quota.percentUsed >= 0 && quota.percentUsed <= 100, "percentUsed is between 0 and 100");

  // 3. Smart Engine Router - Tier 1: Zero-Re-encode Fast Path (Lossless Remux)
  const remuxTask: MediaTaskRequest = {
    id: "task-remux-1",
    taskType: "remux",
    file: new Blob(["sample video data"], { type: "video/mp4" }),
    fileName: "input.mp4",
    targetFormat: "mkv",
  };
  const remuxPlan = await analyzeMediaTask(remuxTask);
  console.log(`[Test 3] Remux Plan Tier: ${remuxPlan.tier} (${remuxPlan.estimatedSpeedup})`);
  assert(remuxPlan.tier === "fast-copy", "mp4 -> mkv remux routes to Tier 1 fast-copy");
  assert(remuxPlan.canStreamCopy === true, "remuxPlan flags canStreamCopy = true");
  assert(Boolean(remuxPlan.suggestedArgs?.includes("-c") && remuxPlan.suggestedArgs?.includes("copy")), "remux contains -c copy");

  // 4. Smart Engine Router - Tier 1: Lossless Trim
  const trimTask: MediaTaskRequest = {
    id: "task-trim-1",
    taskType: "trim",
    file: new Blob(["sample video data"], { type: "video/mp4" }),
    fileName: "input.mp4",
    targetFormat: "mp4",
    startTimeSec: 10,
    endTimeSec: 25,
  };
  const trimPlan = await analyzeMediaTask(trimTask);
  console.log(`[Test 4] Lossless Trim Plan Tier: ${trimPlan.tier} (${trimPlan.estimatedSpeedup})`);
  assert(trimPlan.tier === "fast-copy", "mp4 trim routes to Tier 1 fast-copy");
  assert(Boolean(trimPlan.suggestedArgs?.includes("-ss")), "trim contains -ss flag");

  // 5. Smart Engine Router - Tier 1: Lossless Audio Extraction
  const audioExtractTask: MediaTaskRequest = {
    id: "task-extract-1",
    taskType: "extract-audio",
    file: new Blob(["sample video data"], { type: "video/mp4" }),
    fileName: "input.mp4",
    targetFormat: "m4a",
  };
  const audioExtractPlan = await analyzeMediaTask(audioExtractTask);
  console.log(`[Test 5] Audio Extract Plan Tier: ${audioExtractPlan.tier} (${audioExtractPlan.estimatedSpeedup})`);
  assert(audioExtractPlan.tier === "fast-copy", "mp4 -> m4a audio extraction routes to Tier 1 fast-copy");
  assert(Boolean(audioExtractPlan.suggestedArgs?.includes("-vn")), "audio extraction contains -vn flag");

  // 6. Smart Engine Router - Tier 4: Complex Filtergraph Fallback
  const complexTask: MediaTaskRequest = {
    id: "task-complex-1",
    taskType: "filtergraph",
    file: new Blob(["sample video data"], { type: "video/mp4" }),
    fileName: "input.mp4",
    targetFormat: "mp4",
    ffmpegArgs: ["-filter_complex", "curves=vintage,scale=1280:720"],
  };
  const complexPlan = await analyzeMediaTask(complexTask);
  console.log(`[Test 6] Complex Filtergraph Plan Tier: ${complexPlan.tier} (${complexPlan.estimatedSpeedup})`);
  assert(complexPlan.tier === "ffmpeg-wasm", "complex filtergraph routes to Tier 4 ffmpeg-wasm");
  assert(complexPlan.canStreamCopy === false, "complex filtergraph canStreamCopy is false");

  console.log("=================================================");
  console.log("✅ ALL PHASE 1 OPFS & ROUTER TESTS PASSED!");
  console.log("=================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
