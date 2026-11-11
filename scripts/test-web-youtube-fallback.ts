setTimeout(() => process.exit(1), 15000).unref();

import {
  resolveYouTubeWebFallback,
  extractYouTubeId,
  type YouTubeVideoInfo,
} from "../src/lib/youtube/innertube";
import { GET as handleInfoGet } from "../src/app/api/youtube/info/route";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ""}`);
  }
}

async function runSuite() {
  console.log("==========================================================");
  console.log("   ZENODECK WEB YOUTUBE STREAM & CLOUD FALLBACK SUITE   ");
  console.log("==========================================================\n");

  const reportedVideoId = "J0YZQNgkf9Y";

  // 1. Direct Web Fallback Resolution
  console.log("--- 1. Testing resolveYouTubeWebFallback for Reported Video ---");
  try {
    const info = await resolveYouTubeWebFallback(reportedVideoId, "Cloud Restriction Test");
    assert(Boolean(info), "resolveYouTubeWebFallback returns valid object");
    assert(info.videoId === reportedVideoId, "Correct videoId in response");
    assert(
      info.title.toLowerCase().includes("psychedelic") || info.title.length > 5,
      `Real title extracted via oEmbed: "${info.title}"`
    );
    assert(
      info.author.toLowerCase().includes("speedsound") || info.author.length > 0,
      `Real channel/author extracted: "${info.author}"`
    );
    assert(Boolean(info.thumbnailUrl), `Thumbnail valid: ${info.thumbnailUrl}`);
    assert(info.isCloudRestricted === true, "isCloudRestricted flag set to true");
    assert(Boolean(info.embedUrl?.includes(reportedVideoId)), "embedUrl includes videoId");
    assert(Array.isArray(info.qualities) && info.qualities.length >= 8, `Qualities count >= 8 (got ${info.qualities.length})`);

    const videoQualities = info.qualities.filter((q) => !q.isAudioOnly);
    const audioQualities = info.qualities.filter((q) => q.isAudioOnly);
    assert(videoQualities.length >= 4, `Video qualities present: ${videoQualities.map((q) => q.badge).join(", ")}`);
    assert(audioQualities.length >= 6, `All 6 specialized audio tiers present: ${audioQualities.map((q) => q.badge).join(", ")}`);

    const has1080p = videoQualities.some((q) => q.badge === "1080P");
    assert(has1080p, "1080P video stream present in fallback");
    const has320k = audioQualities.some((q) => q.badge === "320 KBPS");
    assert(has320k, "320 KBPS Studio Master audio present in fallback");
  } catch (err: any) {
    assert(false, "resolveYouTubeWebFallback execution", err.message);
  }

  // 2. Next.js API Route Integration
  console.log("\n--- 2. Testing /api/youtube/info Route for Reported Video ---");
  try {
    const req = new Request(`http://localhost:3000/api/youtube/info?v=${reportedVideoId}`);
    const res = await handleInfoGet(req);
    assert(res.status === 200, "Route returns HTTP 200 for reported video");
    const json: YouTubeVideoInfo = await res.json();
    assert(json.videoId === reportedVideoId, "Route returns matching videoId");
    assert(Boolean(json.title), `Route returns video title: "${json.title}"`);
    assert(Array.isArray(json.qualities) && json.qualities.length > 0, "Route returns valid qualities list");
  } catch (err: any) {
    assert(false, "/api/youtube/info execution", err.message);
  }

  // 3. Negative Case: Non-existent Video
  console.log("\n--- 3. Testing Error on Deleted / Non-Existent Video ---");
  try {
    await resolveYouTubeWebFallback("non_existent_999xyz");
    assert(false, "Should have thrown for invalid / non-existent video");
  } catch (err: any) {
    assert(
      err.message.includes("Could not retrieve") || err.message.includes("Invalid"),
      "Properly throws on invalid / non-existent video",
      err.message
    );
  }

  console.log("\n==========================================================");
  console.log(`TOTAL TESTS:  ${totalTests}`);
  console.log(`PASSED:       ${passedTests}`);
  console.log(`FAILED:       ${failedTests}`);
  console.log("==========================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

void runSuite();
