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

  // 1. TopBar 360px budget check
  console.log("[Requirement 1: TopBar Mobile 360px Budget]");
  const topBarPath = path.join(__dirname, "../src/components/shell/top-bar.tsx");
  const topBarCode = fs.readFileSync(topBarPath, "utf-8");

  assert(
    topBarCode.includes("hidden md:inline-flex") && topBarCode.includes("v{APP_VERSION}"),
    "Version badge is hidden on mobile screens (< 768px)"
  );
  assert(
    topBarCode.includes("hidden md:flex") && topBarCode.includes("meta.label"),
    "Standalone engine status pill is hidden on mobile screens (< 768px)"
  );
  assert(
    topBarCode.includes("absolute bottom-0.5 right-0.5 size-2 rounded-full") && topBarCode.includes("md:hidden"),
    "Compact mobile engine status indicator dot is embedded onto logo"
  );
  assert(
    topBarCode.includes("hidden lg:grid") && topBarCode.includes("ShieldCheck"),
    "Permissions shield button is hidden on mobile and tablet (< 1024px)"
  );
  assert(
    topBarCode.includes("hidden sm:block") && topBarCode.includes("<AudioToggle"),
    "Audio toggle is hidden on compact screens (< 640px)"
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

  // 4. Kotlin engine Range resume, timeouts & target directories
  console.log("\n[Requirement 4: Kotlin Engine Range Resume & Target Directories]");
  const kotlinEnginePath = path.join(
    __dirname,
    "../android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt"
  );
  const kotlinCode = fs.readFileSync(kotlinEnginePath, "utf-8");

  assert(
    kotlinCode.includes('setRequestProperty("Range", "bytes=$bytesDownloaded-")'),
    "ZenoHeadlessMediaEngine.kt supports Range resume for large video downloads"
  );
  assert(
    kotlinCode.includes("connectTimeout = 20000") && kotlinCode.includes("readTimeout = 30000"),
    "ZenoHeadlessMediaEngine.kt sets robust 20s/30s network timeouts"
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

  // 6. Section layout & single-line badges
  console.log("\n[Requirement 6: Section Layouts & Single-Line Badges]");
  assert(
    ytDownloaderCode.includes("overflow-x-auto no-scrollbar max-w-full pb-1"),
    "youtube-downloader.tsx platform badges use single-line horizontal scroll strip"
  );
  assert(
    ytDownloaderCode.includes("grid grid-cols-3 gap-1.5 p-1 rounded-xl"),
    "youtube-downloader.tsx view switcher uses full-width 3-column equal grid on mobile"
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
