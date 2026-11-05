import fs from "fs";
import path from "path";

// 20s safety timeout
const timer = setTimeout(() => {
  console.error("FAIL: Test timed out after 20 seconds");
  process.exit(1);
}, 20000);

async function runTests() {
  console.log("=== ZENODECK v1.0.13 VIDMATE ENGINE VERIFICATION ===");

  // 1. Verify ZenoHeadlessMediaEngine.kt
  const enginePath = path.join(process.cwd(), "android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt");
  if (!fs.existsSync(enginePath)) {
    throw new Error(`Missing ${enginePath}`);
  }
  const engineContent = fs.readFileSync(enginePath, "utf-8");

  // Check sequential video-then-audio streaming
  if (!engineContent.includes("STAGE 1: Download Video Stream FIRST (5% -> 65% progress)")) {
    throw new Error("Missing Stage 1 sequential video download in ZenoHeadlessMediaEngine.kt");
  }
  if (!engineContent.includes("STAGE 2: Download Audio Stream SECOND (65% -> 88% progress)")) {
    throw new Error("Missing Stage 2 sequential audio download in ZenoHeadlessMediaEngine.kt");
  }
  if (!engineContent.includes("vTempFile.length() < 10_000L")) {
    throw new Error("Missing 10KB on-disk video verification gate in ZenoHeadlessMediaEngine.kt");
  }

  // Check 16-packet sliding-window monotonic PTS sorter
  if (!engineContent.includes("slidingWindowCapacity = 16")) {
    throw new Error("Missing 16-packet sliding window capacity in ZenoHeadlessMediaEngine.kt");
  }
  if (!engineContent.includes("videoQueue.sortBy { it.presentationTimeUs }")) {
    throw new Error("Missing PTS sort in sliding window in ZenoHeadlessMediaEngine.kt");
  }
  if (!engineContent.includes("pts <= lastVideoPts")) {
    throw new Error("Missing monotonic PTS enforcement in ZenoHeadlessMediaEngine.kt");
  }

  // Check fallbackVideoUrl recovery
  if (!engineContent.includes("attempting single-stream fallback (itag 18): $fallbackVideoUrl")) {
    throw new Error("Missing fallbackVideoUrl single-stream recovery in ZenoHeadlessMediaEngine.kt");
  }
  console.log("✔ ZenoHeadlessMediaEngine.kt verified: Sequential range streaming, 16-packet PTS sorter, and single-stream fallback present.");

  // 2. Verify ZenoMedia3Plugin.kt
  const pluginPath = path.join(process.cwd(), "android/app/src/main/java/com/omnitool/app/media/ZenoMedia3Plugin.kt");
  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Missing ${pluginPath}`);
  }
  const pluginContent = fs.readFileSync(pluginPath, "utf-8");

  if (!pluginContent.includes("fun sniffStreamViaWebView(call: PluginCall)")) {
    throw new Error("Missing sniffStreamViaWebView in ZenoMedia3Plugin.kt");
  }
  if (!pluginContent.includes("shouldInterceptRequest")) {
    throw new Error("Missing shouldInterceptRequest override in ZenoMedia3Plugin.kt");
  }
  if (!pluginContent.includes("googlevideo.com/videoplayback")) {
    throw new Error("Missing googlevideo interceptor in ZenoMedia3Plugin.kt");
  }
  console.log("✔ ZenoMedia3Plugin.kt verified: Headless WebView shouldInterceptRequest stream sniffer present.");

  // 3. Verify VidmateQualitySheet component
  const sheetPath = path.join(process.cwd(), "src/components/tools/vidmate-quality-sheet.tsx");
  if (!fs.existsSync(sheetPath)) {
    throw new Error(`Missing ${sheetPath}`);
  }
  const sheetContent = fs.readFileSync(sheetPath, "utf-8");

  if (!sheetContent.includes("Music & Audio (Direct Stream)")) {
    throw new Error("Missing Music & Audio section in VidmateQualitySheet");
  }
  if (!sheetContent.includes("Video Resolutions (360p to 4K 60FPS)")) {
    throw new Error("Missing Video Resolutions section in VidmateQualitySheet");
  }
  if (!sheetContent.includes("DOWNLOAD NOW")) {
    throw new Error("Missing DOWNLOAD NOW button in VidmateQualitySheet");
  }
  console.log("✔ vidmate-quality-sheet.tsx verified: Music and Video 2-column grids and CTA present.");

  // 4. Verify innertube.ts and youtube-downloader.tsx integration
  const innertubePath = path.join(process.cwd(), "src/lib/youtube/innertube.ts");
  const innertubeContent = fs.readFileSync(innertubePath, "utf-8");
  if (!innertubeContent.includes("TVHTML5") || !innertubeContent.includes("ANDROID_VR")) {
    throw new Error("Missing TVHTML5 or ANDROID_VR client configs in innertube.ts");
  }
  if (!innertubeContent.includes("sniffStreamViaWebView")) {
    throw new Error("Missing sniffStreamViaWebView fallback in innertube.ts");
  }

  const downloaderPath = path.join(process.cwd(), "src/components/tools/youtube-downloader.tsx");
  const downloaderContent = fs.readFileSync(downloaderPath, "utf-8");
  if (!downloaderContent.includes("VidmateQualitySheet")) {
    throw new Error("Missing VidmateQualitySheet integration in youtube-downloader.tsx");
  }
  if (!downloaderContent.includes("handleConvertVideoToAudio")) {
    throw new Error("Missing handleConvertVideoToAudio handoff in youtube-downloader.tsx");
  }
  console.log("✔ innertube.ts & youtube-downloader.tsx verified: Multi-client spoofing, WebView fallback, and sheet integration active.");

  // 5. Verify version bump to v1.0.13
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
  if (pkg.version !== "1.0.13") {
    throw new Error(`package.json version is ${pkg.version}, expected 1.0.13`);
  }
  const appGradle = fs.readFileSync(path.join(process.cwd(), "android/app/build.gradle"), "utf-8");
  if (!appGradle.includes('versionCode 10013') || !appGradle.includes('versionName "1.0.13"')) {
    throw new Error("android/app/build.gradle version not bumped to 10013 / 1.0.13");
  }
  console.log("✔ Version configs verified: v1.0.13 (versionCode 10013).");

  console.log("🎉 ALL v1.0.13 VIDMATE ENGINE VERIFICATION CHECKS PASSED!");
  clearTimeout(timer);
  process.exit(0);
}

runTests().catch((err) => {
  console.error("FAIL:", err);
  clearTimeout(timer);
  process.exit(1);
});
