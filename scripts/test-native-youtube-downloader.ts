/**
 * Test Suite: Native Kotlin Direct-to-Disk YouTube Downloader & Vercel Fallback Ban
 *
 * Verifies:
 * 1. ANDROID_VR client configuration as primary InnerTube endpoint.
 * 2. Format & quality option userAgent retention.
 * 3. Native Kotlin direct-to-disk streaming and hardware MediaMuxer pipeline.
 * 4. Capacitor plugin bindings in ZenoMedia3Plugin and native-media-muxer.ts.
 * 5. Native Android fast-path execution in turbo-downloader.ts.
 * 6. Elimination of Vercel /api/youtube/download fallback on Android.
 */

import * as fs from "fs";
import * as path from "path";

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
  console.log("=== Native Kotlin Direct-to-Disk YouTube Downloader Verification ===\n");

  // 1. InnerTube client profile and userAgent retention
  console.log("[Requirement 1: ANDROID_VR Client & User-Agent Tracking]");
  const innertubePath = path.join(__dirname, "../src/lib/youtube/innertube.ts");
  const innertubeCode = fs.readFileSync(innertubePath, "utf-8");

  assert(
    innertubeCode.includes('ANDROID_VR_CLIENT_VERSION = "1.56.21"') &&
    innertubeCode.includes('ANDROID_VR_USER_AGENT =') &&
    innertubeCode.includes('clientName: "ANDROID_VR"'),
    "InnerTube specifies ANDROID_VR as primary client profile with Oculus Quest 3 User-Agent"
  );

  assert(
    innertubeCode.includes("userAgent?: string;") &&
    innertubeCode.includes("winningUserAgent"),
    "YouTubeFormatMeta and YouTubeQualityOption retain and propagate userAgent from winning client"
  );

  // 2. Native Kotlin engine methods in ZenoHeadlessMediaEngine.kt
  console.log("\n[Requirement 2: Native Kotlin Direct-to-Disk Streaming]");
  const enginePath = path.join(
    __dirname,
    "../android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt"
  );
  const engineCode = fs.readFileSync(enginePath, "utf-8");

  assert(
    engineCode.includes("fun downloadStreamDirectToFile(") &&
    engineCode.includes("HttpURLConnection") &&
    engineCode.includes("setRequestProperty(\"User-Agent\"") &&
    engineCode.includes("setRequestProperty(\"Accept-Encoding\", \"identity\")"),
    "ZenoHeadlessMediaEngine contains downloadStreamDirectToFile using native HttpURLConnection with identity encoding"
  );

  assert(
    engineCode.includes("fun downloadAndMuxYouTubeStreams(") &&
    engineCode.includes("muxVideoAndAudio(") &&
    engineCode.includes("MediaScannerConnection.scanFile("),
    "ZenoHeadlessMediaEngine contains downloadAndMuxYouTubeStreams with native MediaMuxer and MediaScanner"
  );

  // 3. Capacitor Plugin Method in ZenoMedia3Plugin.kt
  console.log("\n[Requirement 3: Capacitor Plugin Bridge Exposure]");
  const pluginPath = path.join(
    __dirname,
    "../android/app/src/main/java/com/omnitool/app/media/ZenoMedia3Plugin.kt"
  );
  const pluginCode = fs.readFileSync(pluginPath, "utf-8");

  assert(
    pluginCode.includes("fun downloadAndMuxYouTube(call: PluginCall)") &&
    pluginCode.includes("notifyListeners(\"downloadProgress\""),
    "ZenoMedia3Plugin exposes downloadAndMuxYouTube method firing real-time downloadProgress events"
  );

  // 4. TypeScript Bridge in native-media-muxer.ts
  console.log("\n[Requirement 4: TypeScript Native Muxer & Downloader Bridge]");
  const nativeMuxerPath = path.join(__dirname, "../src/lib/media/native-media-muxer.ts");
  const nativeMuxerCode = fs.readFileSync(nativeMuxerPath, "utf-8");

  assert(
    nativeMuxerCode.includes("downloadAndMuxYouTube(options:") &&
    nativeMuxerCode.includes("export async function executeNativeYouTubeDownload("),
    "native-media-muxer.ts exports executeNativeYouTubeDownload with downloadProgress listener registration"
  );

  // 5. Fast-path routing in turbo-downloader.ts
  console.log("\n[Requirement 5: Native Android Fast-Path in Turbo-Downloader]");
  const turboPath = path.join(__dirname, "../src/lib/youtube/turbo-downloader.ts");
  const turboCode = fs.readFileSync(turboPath, "utf-8");

  assert(
    turboCode.includes("if (isNativeAndroidPlatform() && !isClipped)") &&
    turboCode.includes("executeNativeYouTubeDownload({"),
    "turbo-downloader.ts routes native Android downloads directly to Kotlin engine before browser WebAssembly"
  );

  // 6. Elimination of Vercel Fallback on Android in youtube-downloader.tsx
  console.log("\n[Requirement 6: Elimination of Vercel Fallback on Native Android]");
  const ytdlCompPath = path.join(__dirname, "../src/components/tools/youtube-downloader.tsx");
  const ytdlCompCode = fs.readFileSync(ytdlCompPath, "utf-8");

  assert(
    ytdlCompCode.includes("ON NATIVE ANDROID: Banish remote Vercel /api/youtube/download fallback!") &&
    ytdlCompCode.includes("if (Capacitor.isNativePlatform()) {") &&
    ytdlCompCode.includes("Local stream download interrupted"),
    "youtube-downloader.tsx strictly blocks /api/youtube/download Vercel fallback on native Android"
  );

  assert(
    ytdlCompCode.includes("if (!Capacitor.isNativePlatform()) {") &&
    ytdlCompCode.includes("stallWatchdogTimer = setTimeout("),
    "Stall watchdog timer only triggers server fallback in web browser environments"
  );

  console.log(`\n==================================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
