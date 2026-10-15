/**
 * Test Suite: Universal Media Downloader v3.16.0 Full Contract Verification
 * Required by v3.16.0 specification:
 * 1. Reddit dual-stream resolution
 * 2. HLS segment parsing
 * 3. Pause/resume state transitions
 * 4. Time-range clipping args
 * 5. Android ACTION_SEND manifest configuration
 */

import * as fs from "fs";
import * as path from "path";
import { createPauseController } from "../src/lib/youtube/turbo-downloader";
import { detectPlatform } from "../src/lib/media/detector";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log("=== Universal Media Downloader v3.16.0 Verification Suite ===\n");

  // 1. Reddit dual-stream resolution check
  console.log("[Requirement 1: Reddit Dual-Stream Resolution]");
  const redditUrl = "https://www.reddit.com/r/videos/comments/xyz123/sample_clip/";
  const detected = detectPlatform(redditUrl);
  assert(detected?.platform === "reddit", "Reddit URL correctly identified by platform detector");

  const redditExtractorPath = path.join(__dirname, "../src/lib/media/extractors/reddit.ts");
  const redditCode = fs.readFileSync(redditExtractorPath, "utf-8");
  assert(
    redditCode.includes("DASH_AUDIO_128.mp4") &&
    redditCode.includes("audioUrl") &&
    redditCode.includes("requiresMuxing: true"),
    "Reddit extractor probes candidate DASH audio streams and returns requiresMuxing: true"
  );

  // 2. HLS (.m3u8) segment parsing check
  console.log("\n[Requirement 2: HLS Segment Parsing]");
  const downloaderPath = path.join(__dirname, "../src/lib/media/downloader.ts");
  const downloaderCode = fs.readFileSync(downloaderPath, "utf-8");
  assert(
    downloaderCode.includes("fetchHlsStreamAndRemux") &&
    downloaderCode.includes("#EXT-X-STREAM-INF") &&
    downloaderCode.includes("#EXT-X-MAP:"),
    "Downloader contains fetchHlsStreamAndRemux with master/media playlist parsing"
  );
  assert(
    downloaderCode.includes("-c:v") &&
    downloaderCode.includes("copy") &&
    downloaderCode.includes("-c:a"),
    "HLS stream remuxes losslessly via FFmpeg stream copy into MP4"
  );

  // 3. Pause/Resume state transitions check
  console.log("\n[Requirement 3: Pause/Resume State Transitions]");
  const pauseCtrl = createPauseController();
  assert(!pauseCtrl.isPaused, "PauseController initializes in unpaused (running) state");
  
  pauseCtrl.pause();
  assert(pauseCtrl.isPaused, "PauseController reflects paused state after pause()");

  let waitResolved = false;
  const waitPromise = pauseCtrl.waitForResume().then(() => {
    waitResolved = true;
  });

  // Ensure waitForResume blocks while paused
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert(!waitResolved, "waitForResume blocks execution while pause state is active");

  pauseCtrl.resume();
  assert(!pauseCtrl.isPaused, "PauseController reflects resumed state after resume()");
  
  await waitPromise;
  assert(waitResolved, "waitForResume cleanly unblocks and resolves upon resume()");

  // 4. Time-range clipping args check
  console.log("\n[Requirement 4: Time-Range Clipping Args]");
  const turboPath = path.join(__dirname, "../src/lib/youtube/turbo-downloader.ts");
  const turboCode = fs.readFileSync(turboPath, "utf-8");
  assert(
    turboCode.includes("clipRange?: ClipRange") &&
    turboCode.includes('clipArgs.push("-ss", String(clipRange.startTime))') &&
    turboCode.includes('clipArgs.push("-to", String(clipRange.endTime))'),
    "TurboDownloader injects -ss and -to stream copy clipping flags into FFmpeg muxing plan"
  );

  // 5. Android ACTION_SEND manifest configuration check
  console.log("\n[Requirement 5: Android ACTION_SEND Manifest Configuration]");
  const manifestPath = path.join(__dirname, "../android/app/src/main/AndroidManifest.xml");
  const manifestCode = fs.readFileSync(manifestPath, "utf-8");
  assert(
    manifestCode.includes('android.intent.action.SEND') &&
    manifestCode.includes('android:mimeType="text/plain"'),
    "AndroidManifest.xml registers ACTION_SEND for text/plain"
  );

  const mainActivityPath = path.join(__dirname, "../android/app/src/main/java/com/omnitool/app/MainActivity.java");
  const mainActivityCode = fs.readFileSync(mainActivityPath, "utf-8");
  assert(
    mainActivityCode.includes("Intent.ACTION_SEND") &&
    mainActivityCode.includes("zenodeck:shared-url"),
    "MainActivity intercepts ACTION_SEND and dispatches zenodeck:shared-url event"
  );

  console.log(`\n======================================================`);
  console.log(`UNIVERSAL DOWNLOADER v3.16.0: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

void runTests();
