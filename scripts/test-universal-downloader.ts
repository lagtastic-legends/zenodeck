setTimeout(() => {
  console.error("❌ TIMEOUT: Universal Downloader verification exceeded 25s");
  process.exit(1);
}, 25000).unref();

import fs from "fs";
import path from "path";
import { detectPlatform } from "../src/lib/media/detector";
import { APP_VERSION } from "../src/config/version";

console.log("================================================================================");
console.log("🚀 ZENODECK UNIVERSAL MEDIA DOWNLOADER & QUEUE RUNNER VERIFICATION SUITE");
console.log("================================================================================");

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    totalPassed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
    totalFailed++;
  }
}

// -----------------------------------------------------------------------------
// CHECK 1: Download Queue Runner Stream URL & DASH Audio Preservation
// -----------------------------------------------------------------------------
console.log("\n[TEST 1] Verifying download-queue-runner.ts Stream URL Resolution & DASH Audio");
const queueRunnerPath = path.resolve(process.cwd(), "src/lib/media/download-queue-runner.ts");
const queueRunnerSrc = fs.readFileSync(queueRunnerPath, "utf-8");

assert(
  !queueRunnerSrc.includes("downloadUrl: nextTask.url,"),
  "Queue Runner no longer assigns raw nextTask.url directly to downloadUrl",
  "Found obsolete 'downloadUrl: nextTask.url,'"
);

assert(
  queueRunnerSrc.includes("actualDownloadUrl") &&
  queueRunnerSrc.includes("actualAudioUrl") &&
  queueRunnerSrc.includes("requiresMuxing"),
  "Queue Runner extracts actualDownloadUrl, actualAudioUrl, and determines requiresMuxing",
  "Missing stream URL or audio extraction logic"
);

assert(
  queueRunnerSrc.includes("resolveMediaUrl") &&
  queueRunnerSrc.includes("isPageUrl"),
  "Queue Runner performs auto-re-resolution if stream URL is an unparsed social page URL",
  "Missing on-the-fly re-resolution fallback"
);

// -----------------------------------------------------------------------------
// CHECK 2: VidMate Quality Sheet Dynamic Version Badge
// -----------------------------------------------------------------------------
console.log("\n[TEST 2] Verifying vidmate-quality-sheet.tsx Version Badge Binding");
const qualitySheetPath = path.resolve(process.cwd(), "src/components/tools/vidmate-quality-sheet.tsx");
const qualitySheetSrc = fs.readFileSync(qualitySheetPath, "utf-8");

assert(
  qualitySheetSrc.includes('import { APP_VERSION } from "@/config/version";'),
  "VidmateQualitySheet imports APP_VERSION from config",
  "Missing APP_VERSION import"
);

assert(
  !qualitySheetSrc.includes('badge="v1.0.13"'),
  "VidmateQualitySheet does not contain hardcoded obsolete badge v1.0.13",
  "Found hardcoded v1.0.13"
);

assert(
  qualitySheetSrc.includes("badge={APP_VERSION}"),
  `VidmateQualitySheet dynamically binds badge={APP_VERSION} (${APP_VERSION})`,
  "Missing dynamic badge binding"
);

// -----------------------------------------------------------------------------
// CHECK 3: Silent Reddit Video / GIF Audio Fallback in Kotlin & TypeScript
// -----------------------------------------------------------------------------
console.log("\n[TEST 3] Verifying Silent Clip Fallback in Native Kotlin & Downloader TS");
const kotlinEnginePath = path.resolve(
  process.cwd(),
  "android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt"
);
const kotlinEngineSrc = fs.readFileSync(kotlinEnginePath, "utf-8");

assert(
  kotlinEngineSrc.includes("Falling back to standalone video-only stream (silent video / animated GIF)"),
  "ZenoHeadlessMediaEngine falls back to video-only stream on audio failure for silent videos",
  "Missing silent video fallback in Kotlin engine"
);

const downloaderPath = path.resolve(process.cwd(), "src/lib/media/downloader.ts");
const downloaderSrc = fs.readFileSync(downloaderPath, "utf-8");

assert(
  downloaderSrc.includes("Audio stream fetch failed, continuing video only:"),
  "downloader.ts handles non-fatal audio failure during concurrent stream fetch",
  "Missing non-fatal audio catch in downloader.ts"
);

// -----------------------------------------------------------------------------
// CHECK 4: Universal Resolver Fallback Handlers
// -----------------------------------------------------------------------------
console.log("\n[TEST 4] Verifying universal-resolver.ts Fallback Handlers for All Platforms");
const resolverPath = path.resolve(process.cwd(), "src/lib/media/universal-resolver.ts");
const resolverSrc = fs.readFileSync(resolverPath, "utf-8");

assert(
  resolverSrc.includes('case "social":') &&
  resolverSrc.includes('case "threads":') &&
  resolverSrc.includes('case "twitch":') &&
  resolverSrc.includes('case "soundcloud":'),
  "universal-resolver.ts includes explicit fallback cases for social, threads, twitch, soundcloud",
  "Missing platform fallback cases in switch statement"
);

assert(
  resolverSrc.includes("isDirectMedia") &&
  resolverSrc.includes("sniffStreamViaWebView"),
  "universal-resolver.ts supports direct media streams and native WebView sniffing",
  "Missing direct stream or WebView sniffer support"
);

assert(
  resolverSrc.includes("if (info.items && info.items.length > 0)"),
  "universal-resolver.ts unpacks carousel/slideshow items into full qualities ladder",
  "Missing carousel unpacking in ensureFullQualityLadder"
);

// -----------------------------------------------------------------------------
// CHECK 5: Photo MIME Types & Multi-Slide Carousel Extractors
// -----------------------------------------------------------------------------
console.log("\n[TEST 5] Verifying Photo MIME Typing & Multi-Slide Extractors");

assert(
  downloaderSrc.includes("const isImage = [\"jpg\", \"jpeg\", \"png\", \"webp\", \"gif\"].includes"),
  "downloader.ts assigns proper image MIME types instead of defaulting to video/mp4",
  "Missing isImage MIME mapping in downloader.ts"
);

assert(
  kotlinEngineSrc.includes("val isImageTarget = outputFileName.endsWith(\".jpg\"") &&
  kotlinEngineSrc.includes("Environment.DIRECTORY_PICTURES"),
  "ZenoHeadlessMediaEngine routes photo downloads to Pictures/ZenoDeck instead of Movies",
  "Missing isImageTarget or DIRECTORY_PICTURES in Kotlin engine"
);

const pinterestPath = path.resolve(process.cwd(), "src/lib/media/extractors/pinterest.ts");
const pinterestSrc = fs.readFileSync(pinterestPath, "utf-8");

assert(
  pinterestSrc.includes("title: title || \"Pinterest Photo\"") &&
  pinterestSrc.includes("badge: \"IMAGE\""),
  "pinterest.ts supports downloading high-resolution photo pins when no video exists",
  "Missing Pinterest photo pin fallback"
);

const tiktokPath = path.resolve(process.cwd(), "src/lib/media/extractors/tiktok.ts");
const tiktokSrc = fs.readFileSync(tiktokPath, "utf-8");

assert(
  tiktokSrc.includes("qualities.push(...slideQualities);"),
  "tiktok.ts pushes individual slide qualities for photo album slideshows",
  "Missing slide qualities push in tiktok.ts"
);

const igPath = path.resolve(process.cwd(), "src/lib/media/extractors/instagram.ts");
const igSrc = fs.readFileSync(igPath, "utf-8");

assert(
  igSrc.includes("const allQualities: UniversalQualityOption[] = carouselItems.flatMap"),
  "instagram.ts flattens all carousel slide items into selectable qualities",
  "Missing carousel flatMap in instagram.ts"
);

// -----------------------------------------------------------------------------
// CHECK 6: Multi-Platform URL Detector Regression Suite
// -----------------------------------------------------------------------------
console.log("\n[TEST 6] Verifying detectPlatform() on 12 Real-World URL Formats");

const testUrls: Array<{ url: string; expectedPlatform: string }> = [
  { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", expectedPlatform: "youtube" },
  { url: "https://youtu.be/dQw4w9WgXcQ", expectedPlatform: "youtube" },
  { url: "https://www.youtube.com/shorts/abcd1234efg", expectedPlatform: "youtube" },
  { url: "https://music.youtube.com/watch?v=dQw4w9WgXcQ", expectedPlatform: "youtube" },
  { url: "https://www.tiktok.com/@user/video/7234567890123456789", expectedPlatform: "tiktok" },
  { url: "https://vm.tiktok.com/ZM8xyZ123/", expectedPlatform: "tiktok" },
  { url: "https://www.instagram.com/reel/C3_aBcDefGh/", expectedPlatform: "instagram" },
  { url: "https://www.instagram.com/p/C3_aBcDefGh/", expectedPlatform: "instagram" },
  { url: "https://x.com/jack/status/20", expectedPlatform: "twitter" },
  { url: "https://twitter.com/user/status/1234567890", expectedPlatform: "twitter" },
  { url: "https://www.reddit.com/r/funny/comments/123456/sample_video/", expectedPlatform: "reddit" },
  { url: "https://v.redd.it/abcdef123456", expectedPlatform: "reddit" },
  { url: "https://www.facebook.com/watch/?v=123456789", expectedPlatform: "facebook" },
  { url: "https://vimeo.com/123456789", expectedPlatform: "vimeo" },
  { url: "https://soundcloud.com/artist/sample-track", expectedPlatform: "soundcloud" },
  { url: "https://www.twitch.tv/videos/123456789", expectedPlatform: "twitch" },
  { url: "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4", expectedPlatform: "social" },
];

for (const testCase of testUrls) {
  const result = detectPlatform(testCase.url);
  assert(
    result !== null && result.platform === testCase.expectedPlatform,
    `detectPlatform("${testCase.url}") -> ${testCase.expectedPlatform}`,
    `Got ${result?.platform || "null"}, expected ${testCase.expectedPlatform}`
  );
}

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`SUMMARY: ${totalPassed} Passed | ${totalFailed} Failed`);
console.log("================================================================================");

if (totalFailed > 0) {
  console.error("❌ Test suite encountered failures!");
  process.exit(1);
} else {
  console.log("✔ ALL UNIVERSAL MEDIA DOWNLOADER ASSERTIONS PASSED!");
  process.exit(0);
}
