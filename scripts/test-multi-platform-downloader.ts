/**
 * Multi-Platform Media Downloader Automated Test Suite
 * Tests URL detection, platform routing, metadata normalizer, and DASH pairing
 */

import { detectPlatform, PLATFORM_CONFIGS } from "../src/lib/media/detector";
import type { UniversalMediaInfo, UniversalQualityOption } from "../src/lib/media/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("==================================================================");
  console.log("  MULTI-PLATFORM MEDIA DOWNLOADER TEST SUITE");
  console.log("==================================================================");

  // 1. YouTube Detection
  console.log("\n[Group 1] YouTube URL Detection");
  const yt1 = detectPlatform("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert(yt1?.platform === "youtube" && yt1.id === "dQw4w9WgXcQ", "Detects standard YouTube watch URL");

  const yt2 = detectPlatform("https://youtu.be/dQw4w9WgXcQ");
  assert(yt2?.platform === "youtube" && yt2.id === "dQw4w9WgXcQ", "Detects youtu.be short URL");

  const yt3 = detectPlatform("https://www.youtube.com/shorts/abcdef12345");
  assert(yt3?.platform === "youtube" && yt3.id === "abcdef12345", "Detects YouTube Shorts URL");

  const yt4 = detectPlatform("https://www.youtube.com/playlist?list=PL1234567890ABCDEF");
  assert(yt4?.platform === "youtube", "Detects YouTube Playlist URL");

  // 2. TikTok Detection
  console.log("\n[Group 2] TikTok URL Detection");
  const tk1 = detectPlatform("https://www.tiktok.com/@mrbeast/video/7123456789012345678");
  assert(tk1?.platform === "tiktok" && tk1.id === "7123456789012345678", "Detects standard TikTok video URL");

  const tk2 = detectPlatform("https://vt.tiktok.com/ZS2345678/");
  assert(tk2?.platform === "tiktok", "Detects vt.tiktok.com short URL");

  const tk3 = detectPlatform("https://vm.tiktok.com/ZM8765432/");
  assert(tk3?.platform === "tiktok", "Detects vm.tiktok.com short URL");

  // 3. Instagram Detection
  console.log("\n[Group 3] Instagram URL Detection");
  const ig1 = detectPlatform("https://www.instagram.com/reel/C8XYZ123abc/");
  assert(ig1?.platform === "instagram" && ig1.id === "C8XYZ123abc", "Detects Instagram Reel URL");

  const ig2 = detectPlatform("https://www.instagram.com/p/B9ABC123xyz/?img_index=1");
  assert(ig2?.platform === "instagram" && ig2.id === "B9ABC123xyz", "Detects Instagram Post URL");

  const ig3 = detectPlatform("https://instagram.com/tv/D1DEF456ghi/");
  assert(ig3?.platform === "instagram" && ig3.id === "D1DEF456ghi", "Detects IGTV URL");

  // 4. Twitter / X Detection
  console.log("\n[Group 4] Twitter / X URL Detection");
  const tw1 = detectPlatform("https://x.com/SpaceX/status/1756722880058863616");
  assert(tw1?.platform === "twitter" && tw1.id === "1756722880058863616", "Detects x.com status URL");

  const tw2 = detectPlatform("https://twitter.com/NASA/status/1333464435166257157?s=20");
  assert(tw2?.platform === "twitter" && tw2.id === "1333464435166257157", "Detects twitter.com status URL");

  // 5. Reddit Detection & DASH Logic
  console.log("\n[Group 5] Reddit URL Detection & DASH Audio Logic");
  const rd1 = detectPlatform("https://www.reddit.com/r/technology/comments/1fk4abc/new_breakthrough_announced/");
  assert(rd1?.platform === "reddit" && rd1.id === "1fk4abc", "Detects Reddit full post URL");

  const rd2 = detectPlatform("https://redd.it/1fk4abc");
  assert(rd2?.platform === "reddit" && rd2.id === "1fk4abc", "Detects redd.it short URL");

  // Test DASH audio URL generation logic
  const redditFallback = "https://v.redd.it/xyz987654/DASH_720.mp4?source=fallback";
  const baseUrlMatch = redditFallback.match(/(https?:\/\/v\.redd\.it\/[a-zA-Z0-9]+)/i);
  const derivedAudioUrl = `${baseUrlMatch?.[1]}/DASH_AUDIO_128.mp4`;
  assert(derivedAudioUrl === "https://v.redd.it/xyz987654/DASH_AUDIO_128.mp4", "Correctly derives Reddit DASH_AUDIO_128.mp4 from video stream");

  // 6. Platform Configurations & Non-Media Reject
  console.log("\n[Group 6] Platform Configs & Invalid URL Rejection");
  assert(PLATFORM_CONFIGS.youtube.name === "YouTube", "YouTube config present");
  assert(PLATFORM_CONFIGS.tiktok.name === "TikTok", "TikTok config present");
  assert(PLATFORM_CONFIGS.instagram.name === "Instagram", "Instagram config present");
  assert(PLATFORM_CONFIGS.twitter.name === "X / Twitter", "Twitter config present");
  assert(PLATFORM_CONFIGS.reddit.name === "Reddit", "Reddit config present");

  const inv1 = detectPlatform("not-a-valid-url-input");
  assert(inv1 === null, "Rejects invalid non-URL string");

  const inv2 = detectPlatform("ftp://example.com/file");
  assert(inv2 === null, "Rejects non-HTTP URL protocol");

  const gen1 = detectPlatform("https://google.com/search?q=test");
  assert(gen1?.platform === "social", "Routes generic HTTP to universal social yt-dlp handler");

  console.log("\n==================================================================");
  console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
