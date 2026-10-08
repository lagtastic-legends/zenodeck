/**
 * Verification test suite for Universal Media Downloader powered by yt-dlp
 */

import { detectPlatform, PLATFORM_CONFIGS } from "../src/lib/media/detector";
import { resolveMediaWithPython, isValidMediaInput } from "../src/lib/media/python-engine";
import type { PlatformType } from "../src/lib/media/types";

async function runTests() {
  console.log("=== Testing Universal Media Downloader (yt-dlp) ===");

  // 1. Test Platform Detection
  const testUrls: Array<{ url: string; expectedPlatform: PlatformType }> = [
    { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expectedPlatform: "youtube" },
    { url: "https://youtu.be/dQw4w9WgXcQ", expectedPlatform: "youtube" },
    { url: "dQw4w9WgXcQ", expectedPlatform: "youtube" },
    { url: "https://www.tiktok.com/@user/video/7123456789012345678", expectedPlatform: "tiktok" },
    { url: "https://www.instagram.com/reel/C1234567890/", expectedPlatform: "instagram" },
    { url: "https://twitter.com/user/status/1234567890123456789", expectedPlatform: "twitter" },
    { url: "https://x.com/user/status/1234567890123456789", expectedPlatform: "twitter" },
    { url: "https://www.reddit.com/r/videos/comments/abc123/cool_video/", expectedPlatform: "reddit" },
    { url: "https://www.facebook.com/watch/?v=123456789", expectedPlatform: "facebook" },
    { url: "https://vimeo.com/123456789", expectedPlatform: "vimeo" },
    { url: "https://www.twitch.tv/videos/123456789", expectedPlatform: "twitch" },
    { url: "https://www.pinterest.com/pin/123456789012345678/", expectedPlatform: "pinterest" },
    { url: "https://www.threads.net/@user/post/C1234567890", expectedPlatform: "threads" },
    { url: "https://bsky.app/profile/user.bsky.social/post/3k123456789", expectedPlatform: "bluesky" },
    { url: "https://example.com/video.mp4", expectedPlatform: "social" },
  ];

  let detectedCount = 0;
  for (const item of testUrls) {
    const res = detectPlatform(item.url);
    if (!res || res.platform !== item.expectedPlatform) {
      console.error(`[FAIL] Expected ${item.expectedPlatform} for ${item.url}, got:`, res);
      process.exit(1);
    }
    const badge = PLATFORM_CONFIGS[res.platform];
    if (!badge || !badge.name) {
      console.error(`[FAIL] Missing badge config for platform ${res.platform}`);
      process.exit(1);
    }
    detectedCount++;
  }
  console.log(`[PASS] Platform Detection: ${detectedCount}/${testUrls.length} platforms correctly identified.`);

  // 2. Test Input Validation
  console.log("Testing Input Validation...");
  if (!isValidMediaInput("dQw4w9WgXcQ") || !isValidMediaInput("https://www.youtube.com/watch?v=dQw4w9WgXcQ")) {
    console.error("[FAIL] Valid inputs rejected by isValidMediaInput");
    process.exit(1);
  }
  if (isValidMediaInput("not a url or id; rm -rf /")) {
    console.error("[FAIL] Malicious input accepted by isValidMediaInput");
    process.exit(1);
  }
  console.log("[PASS] Input validation & security sanitization working as expected.");

  // 3. Test Python Engine yt-dlp Resolution
  console.log("Testing yt-dlp metadata resolution via Python engine...");
  const pyResult = await resolveMediaWithPython("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  if (!pyResult) {
    console.error("[FAIL] Failed to resolve media with Python engine");
    process.exit(1);
  }

  console.log("yt-dlp Video Title:", pyResult.title);
  console.log("Platform:", pyResult.platform);
  console.log("Duration:", pyResult.durationFormatted);
  console.log("Qualities Count:", pyResult.qualities.length);

  const videoQualities = pyResult.qualities.filter((q) => !q.isAudioOnly);
  const audioQualities = pyResult.qualities.filter((q) => q.isAudioOnly);

  if (videoQualities.length === 0 || audioQualities.length === 0) {
    console.error("[FAIL] Missing video or audio qualities in yt-dlp output");
    process.exit(1);
  }

  console.log(`[PASS] Video qualities: ${videoQualities.length}, Audio qualities: ${audioQualities.length}`);
  console.log("Sample Audio Tiers:", audioQualities.map((a) => a.badge).join(", "));
  console.log("Sample Video Tiers:", videoQualities.map((v) => v.badge).join(", "));

  console.log("\n*** ALL TESTS PASSED SUCCESSFULLY! ***\n");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
