import fs from "fs";
import path from "path";

// 15s safety timeout
const timer = setTimeout(() => {
  console.error("FAIL: Test timed out after 15 seconds");
  process.exit(1);
}, 15000);

async function runTests() {
  console.log("=== ZENODECK v1.0.14 IN-APP MINI BROWSER & FAB VERIFICATION ===");

  // 1. Verify MiniBrowserView component
  const browserPath = path.join(process.cwd(), "src/components/tools/mini-browser-view.tsx");
  if (!fs.existsSync(browserPath)) {
    throw new Error(`Missing ${browserPath}`);
  }
  const browserContent = fs.readFileSync(browserPath, "utf-8");

  // Check navigation controls and omnibox
  if (!browserContent.includes("handleGoBack") || !browserContent.includes("handleGoForward") || !browserContent.includes("handleReload") || !browserContent.includes("handleGoHome")) {
    throw new Error("Missing navigation controls in mini-browser-view.tsx");
  }
  if (!browserContent.includes("formatInputToUrl")) {
    throw new Error("Missing URL normalization / search query logic in mini-browser-view.tsx");
  }
  if (!browserContent.includes("QUICK_PORTALS")) {
    throw new Error("Missing Quick Site Portals deck in mini-browser-view.tsx");
  }

  // Check bookmarks
  const requiredPortals = ["YouTube", "TikTok", "Instagram", "Facebook", "X / Twitter", "Reddit", "Vimeo", "SoundCloud"];
  for (const portal of requiredPortals) {
    if (!browserContent.includes(portal)) {
      throw new Error(`Missing portal ${portal} in mini-browser-view.tsx`);
    }
  }

  // Check floating action button (FAB)
  if (!browserContent.includes("handleFloatingActionDownload")) {
    throw new Error("Missing handleFloatingActionDownload in mini-browser-view.tsx");
  }
  if (!browserContent.includes("detectedMediaUrl")) {
    throw new Error("Missing media detection state handling in mini-browser-view.tsx");
  }
  console.log("✔ mini-browser-view.tsx verified: Navigation controls, 8 portals deck, and VidMate FAB present.");

  // 2. Verify ZenoMedia3Plugin.kt native bridge
  const pluginPath = path.join(process.cwd(), "android/app/src/main/java/com/omnitool/app/media/ZenoMedia3Plugin.kt");
  if (!fs.existsSync(pluginPath)) {
    throw new Error(`Missing ${pluginPath}`);
  }
  const pluginContent = fs.readFileSync(pluginPath, "utf-8");

  if (!pluginContent.includes("fun openInAppBrowser(call: PluginCall)")) {
    throw new Error("Missing openInAppBrowser in ZenoMedia3Plugin.kt");
  }
  if (!pluginContent.includes("fun closeInAppBrowser(call: PluginCall)")) {
    throw new Error("Missing closeInAppBrowser in ZenoMedia3Plugin.kt");
  }
  if (!pluginContent.includes("notifyListeners(\"mediaDetected\"")) {
    throw new Error("Missing mediaDetected event emission in ZenoMedia3Plugin.kt");
  }
  console.log("✔ ZenoMedia3Plugin.kt verified: openInAppBrowser, closeInAppBrowser, and mediaDetected listener active.");

  // 3. Verify youtube-downloader.tsx integration
  const downloaderPath = path.join(process.cwd(), "src/components/tools/youtube-downloader.tsx");
  const downloaderContent = fs.readFileSync(downloaderPath, "utf-8");

  if (!downloaderContent.includes("MiniBrowserView")) {
    throw new Error("Missing MiniBrowserView integration in youtube-downloader.tsx");
  }
  if (!downloaderContent.includes("downloaderMode")) {
    throw new Error("Missing downloaderMode segmented control in youtube-downloader.tsx");
  }
  if (!downloaderContent.includes("In-App Browser")) {
    throw new Error("Missing In-App Browser toggle tab in youtube-downloader.tsx");
  }
  console.log("✔ youtube-downloader.tsx verified: Dual downloader mode toggle and MiniBrowserView mount verified.");

  // 4. Verify version bump to v1.0.14
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
  if (pkg.version !== "1.0.14") {
    throw new Error(`package.json version is ${pkg.version}, expected 1.0.14`);
  }
  const appGradle = fs.readFileSync(path.join(process.cwd(), "android/app/build.gradle"), "utf-8");
  if (!appGradle.includes('versionCode 10014') || !appGradle.includes('versionName "1.0.14"')) {
    throw new Error("android/app/build.gradle version not bumped to 10014 / 1.0.14");
  }
  console.log("✔ Version configs verified: v1.0.14 (versionCode 10014).");

  console.log("🎉 ALL v1.0.14 MINI BROWSER & FAB VERIFICATION CHECKS PASSED!");
  clearTimeout(timer);
  process.exit(0);
}

runTests().catch((err) => {
  console.error("FAIL:", err);
  clearTimeout(timer);
  process.exit(1);
});
