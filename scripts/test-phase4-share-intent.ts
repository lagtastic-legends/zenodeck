/**
 * Test Suite: Universal Media Downloader v3.16.0 Phase 4 Verification
 * Verifies Android Intent registration, URL extraction logic, event dispatch contracts,
 * and end-to-end multi-platform downloader integration.
 */

import * as fs from "fs";
import * as path from "path";
import { detectPlatform } from "../src/lib/media/detector";
import { formatDuration } from "../src/lib/youtube/innertube";

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
  console.log("=== Phase 4: Share Intent & Universal Downloader Verification ===\n");

  // 1. Verify AndroidManifest.xml has android.intent.action.SEND intent filter
  const manifestPath = path.join(__dirname, "../android/app/src/main/AndroidManifest.xml");
  const manifestContent = fs.readFileSync(manifestPath, "utf-8");
  assert(
    manifestContent.includes('<action android:name="android.intent.action.SEND" />') &&
    manifestContent.includes('<data android:mimeType="text/plain" />'),
    "AndroidManifest.xml declares ACTION_SEND intent-filter for text/plain"
  );

  // 2. Verify MainActivity.java handles onNewIntent and handles Intent.ACTION_SEND
  const mainActivityPath = path.join(__dirname, "../android/app/src/main/java/com/omnitool/app/MainActivity.java");
  const mainActivityContent = fs.readFileSync(mainActivityPath, "utf-8");
  assert(
    mainActivityContent.includes("onNewIntent(Intent intent)") &&
    mainActivityContent.includes("Intent.ACTION_SEND") &&
    mainActivityContent.includes("zenodeck:shared-url"),
    "MainActivity.java intercepts ACTION_SEND and dispatches 'zenodeck:shared-url'"
  );

  // 3. Verify URL regex extractor behavior from shared text (mimicking MainActivity's Pattern.compile)
  const sharedTexts = [
    "Check out this reel: https://www.instagram.com/reel/C3_test123/?igsh=abc",
    "https://vm.tiktok.com/ZMhd8q123/",
    "Amazing video https://youtu.be/dQw4w9WgXcQ?si=xyz watch it now!",
    "https://v.redd.it/example12345"
  ];
  const urlRegex = /https?:\/\/\S+/;
  const extractedUrls = sharedTexts.map(t => {
    const m = t.match(urlRegex);
    return m ? m[0] : null;
  });

  assert(
    extractedUrls[0] === "https://www.instagram.com/reel/C3_test123/?igsh=abc" &&
    extractedUrls[1] === "https://vm.tiktok.com/ZMhd8q123/" &&
    extractedUrls[2] === "https://youtu.be/dQw4w9WgXcQ?si=xyz" &&
    extractedUrls[3] === "https://v.redd.it/example12345",
    "URL extractor correctly isolates clean media URLs from surrounding share text"
  );

  // 4. Verify Platform detection on extracted URLs
  assert(detectPlatform(extractedUrls[0]!)?.platform === "instagram", "Instagram URL correctly identified");
  assert(detectPlatform(extractedUrls[1]!)?.platform === "tiktok", "TikTok URL correctly identified");
  assert(detectPlatform(extractedUrls[2]!)?.platform === "youtube", "YouTube URL correctly identified");
  assert(detectPlatform(extractedUrls[3]!)?.platform === "reddit", "Reddit URL correctly identified");

  // 5. Verify AppShell wires listener and pending flag
  const appShellPath = path.join(__dirname, "../src/components/shell/app-shell.tsx");
  const appShellContent = fs.readFileSync(appShellPath, "utf-8");
  assert(
    appShellContent.includes('window.addEventListener("zenodeck:shared-url"') &&
    appShellContent.includes('navigate("youtube-downloader")') &&
    appShellContent.includes("__zenodeck_pending_shared_url"),
    "AppShell automatically routes to youtube-downloader on shared URL intent"
  );

  // 6. Verify YouTubeDownloader wires auto-resolve on shared URL
  const ytDownloaderPath = path.join(__dirname, "../src/components/tools/youtube-downloader.tsx");
  const ytDownloaderContent = fs.readFileSync(ytDownloaderPath, "utf-8");
  assert(
    ytDownloaderContent.includes('window.addEventListener("zenodeck:shared-url"') &&
    ytDownloaderContent.includes("handleResolve(cleanUrl)") &&
    ytDownloaderContent.includes("__zenodeck_pending_shared_url"),
    "YouTubeDownloader receives shared-url event and auto-triggers handleResolve"
  );

  // 7. Verify Time-Range Clipper & Pause/Resume hooks wired in UI
  assert(
    ytDownloaderContent.includes("isClipEnabled") &&
    ytDownloaderContent.includes("clipStartTime") &&
    ytDownloaderContent.includes("clipEndTime") &&
    ytDownloaderContent.includes("handleTogglePause"),
    "YouTubeDownloader includes Time-Range Clipper and Pause/Resume controls"
  );

  // 8. Verify Deck Actions wired in UI
  assert(
    ytDownloaderContent.includes("handleSendToZenoTap") &&
    ytDownloaderContent.includes("handleOpenIn8DStudio"),
    "YouTubeDownloader includes 1-tap Send to ZenoTap & Open in 8D Studio Deck Actions"
  );

  // 9. Verify Duration Formatter
  assert(formatDuration(0) === "0:00", "formatDuration handles 0s (0:00)");
  assert(formatDuration(125) === "2:05", "formatDuration handles 125s (2:05)");
  assert(formatDuration(3665) === "1:01:05", "formatDuration handles >1h (1:01:05)");

  console.log(`\n========================================`);
  console.log(`Phase 4 Tests: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

void runTests();
