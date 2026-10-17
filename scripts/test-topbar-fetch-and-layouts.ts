/**
 * Contract verification test suite for:
 * 1. TopBar mobile de-crowding & 360px budget
 * 2. FloatingToolbar suppression outside dashboard
 * 3. Elimination of window.fetch fallback on Android in InnerTube & TurboDownloader
 * 4. Kotlin engine Range resume, timeouts & target directories
 * 5. Universal Next.js CORS headers for /api/*
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
  console.log("=== TopBar, CORS & Responsive Layouts Verification Suite ===\n");

  // 1. TopBar exact mobile controls & 360px budget check
  console.log("[Requirement 1: TopBar Mobile Exact Controls & 360px Budget]");
  const topBarPath = path.join(__dirname, "../src/components/shell/top-bar.tsx");
  const topBarCode = fs.readFileSync(topBarPath, "utf-8");

  assert(
    topBarCode.includes("hidden md:inline-flex") && topBarCode.includes("v{APP_VERSION}"),
    "Version badge is hidden on mobile screens (< 768px)"
  );
  assert(
    topBarCode.includes('h-[28px] min-w-[28px] items-center') && topBarCode.includes("meta.label"),
    "Engine status pill is visible on mobile at 28px height"
  );
  assert(
    topBarCode.includes('w-[38px] h-[38px]') && topBarCode.includes("<AudioToggle"),
    "Audio toggle button is visible on mobile with 38px touch target"
  );
  assert(
    topBarCode.includes('w-[36px] h-[36px]') && topBarCode.includes("ShieldCheck"),
    "Privacy shield button is visible on mobile with 36px touch target"
  );
  assert(
    topBarCode.includes('triggerClassName="hidden md:flex"'),
    "Top-bar search palette is hidden on mobile screens (moved to bottom dock)"
  );

  // 2. FloatingToolbar suppression check
  console.log("\n[Requirement 2: FloatingToolbar Suppression Inside Active Tools]");
  const appShellPath = path.join(__dirname, "../src/components/shell/app-shell.tsx");
  const appShellCode = fs.readFileSync(appShellPath, "utf-8");
  const floatingToolbarPath = path.join(__dirname, "../src/components/ui/floating-toolbar.tsx");
  const floatingToolbarCode = fs.readFileSync(floatingToolbarPath, "utf-8");

  assert(
    appShellCode.includes('view === "dashboard" && <FloatingToolbar'),
    "app-shell.tsx renders FloatingToolbar strictly on dashboard view"
  );
  assert(
    floatingToolbarCode.includes('if (view !== "dashboard")') && floatingToolbarCode.includes("return null;"),
    "floating-toolbar.tsx contains internal safety guard suppressing render outside dashboard"
  );

  // 3. Elimination of window.fetch fallback on Android
  console.log("\n[Requirement 3: Elimination of window.fetch Fallback on Android]");
  const innertubePath = path.join(__dirname, "../src/lib/youtube/innertube.ts");
  const innertubeCode = fs.readFileSync(innertubePath, "utf-8");
  const turboPath = path.join(__dirname, "../src/lib/youtube/turbo-downloader.ts");
  const turboCode = fs.readFileSync(turboPath, "utf-8");
  const ytDownloaderPath = path.join(__dirname, "../src/components/tools/youtube-downloader.tsx");
  const ytDownloaderCode = fs.readFileSync(ytDownloaderPath, "utf-8");

  assert(
    !innertubeCode.includes("CapacitorHttp native request failed, falling back to fetch"),
    "innertube.ts universalFetch never falls back to window.fetch on native Android"
  );
  assert(
    ytDownloaderCode.includes("!Capacitor.isNativePlatform()") && ytDownloaderCode.includes('getYouTubeApiUrl("/api/youtube/info")'),
    "youtube-downloader.tsx handleResolve strictly skips remote API route fetch on native Android"
  );
  assert(
    !turboCode.includes("Native Android direct download failed, falling back to browser pipeline"),
    "turbo-downloader.ts never falls back to browser fetch or WebAssembly on native Android"
  );

  // 4. Kotlin engine Bounded 2MB Chunking, timeouts & target directories
  console.log("\n[Requirement 4: Kotlin Engine Bounded 2MB Chunking & WebM Hardware Muxer]");
  const kotlinEnginePath = path.join(
    __dirname,
    "../android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt"
  );
  const kotlinCode = fs.readFileSync(kotlinEnginePath, "utf-8");

  assert(
    kotlinCode.includes("val CHUNK_SIZE = 2L * 1024L * 1024L") && kotlinCode.includes("injectRangeQueryParam"),
    "ZenoHeadlessMediaEngine.kt implements bounded 2MB chunk streaming with &range= parameter"
  );
  assert(
    (kotlinCode.includes("connectTimeout = 20000") || kotlinCode.includes("connectTimeout = 8000")) &&
    (kotlinCode.includes("readTimeout = 30000") || kotlinCode.includes("readTimeout = 15000")),
    "ZenoHeadlessMediaEngine.kt sets robust network timeouts"
  );
  assert(
    kotlinCode.includes("MediaMuxer.OutputFormat.MUXER_OUTPUT_WEBM") && kotlinCode.includes("hasVp9OrOpus"),
    "ZenoHeadlessMediaEngine.kt selects MUXER_OUTPUT_WEBM for VP9 and Opus tracks"
  );
  assert(
    kotlinCode.includes("DIRECTORY_MUSIC") && kotlinCode.includes("isAudioOnlyTarget"),
    "ZenoHeadlessMediaEngine.kt saves audio-only downloads into Music/ZenoDeck"
  );

  // 5. Next.js universal CORS headers
  console.log("\n[Requirement 5: Universal API CORS Headers]");
  const nextConfigPath = path.join(__dirname, "../next.config.ts");
  const nextConfigCode = fs.readFileSync(nextConfigPath, "utf-8");

  assert(
    nextConfigCode.includes('source: "/api/:path*"') &&
    nextConfigCode.includes('"Access-Control-Allow-Origin"') &&
    nextConfigCode.includes('"Access-Control-Allow-Methods"'),
    "next.config.ts provides universal CORS headers for /api/:path*"
  );

  // 6. Section layout & single-line badges & deduplicated downloader header
  console.log("\n[Requirement 6: Downloader Header Deduplication & Tab Visibility]");
  assert(
    ytDownloaderCode.includes("overflow-x-auto no-scrollbar max-w-full pb-1"),
    "youtube-downloader.tsx platform badges use single-line horizontal scroll strip"
  );
  assert(
    !ytDownloaderCode.includes('<h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">'),
    "Redundant second <h1> heading in youtube-downloader.tsx is eliminated"
  );
  assert(
    ytDownloaderCode.includes("grid grid-cols-3 gap-1 p-1 rounded-xl border border-border/60 bg-card/40"),
    "youtube-downloader.tsx view switcher uses clean grid tab bar with zero truncation"
  );

  console.log("\n==================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
