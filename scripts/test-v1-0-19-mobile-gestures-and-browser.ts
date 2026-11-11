setTimeout(() => process.exit(1), 15000).unref();

import fs from "fs";
import path from "path";
import { TOOL_REGISTRY } from "../src/lib/tools/registry";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log("=== ZENODECK MOBILE GESTURES, BROWSER & ALL-PHONE LAYOUT TEST SUITE ===");

// 1. Verify Tool Registry Presence & Status
const browserTool = TOOL_REGISTRY.find((t) => t.id === "in-app-browser");
assert(Boolean(browserTool), "in-app-browser tool is declared in TOOL_REGISTRY");
assert(browserTool?.status === "online", "in-app-browser tool status is 'online'");
assert(browserTool?.name.includes("Browser"), "in-app-browser tool name references Browser");

const downloaderTool = TOOL_REGISTRY.find((t) => t.id === "youtube-downloader");
assert(Boolean(downloaderTool), "youtube-downloader tool is declared in TOOL_REGISTRY");
assert(downloaderTool?.status === "online", "youtube-downloader tool status is 'online'");
assert(downloaderTool?.name.includes("Universal") || downloaderTool?.name.includes("Downloader"), "youtube-downloader tool name verified");

// 2. Verify app-shell.tsx Routing
const appShellPath = path.resolve(__dirname, "../src/components/shell/app-shell.tsx");
const appShellContent = fs.readFileSync(appShellPath, "utf-8");
assert(appShellContent.includes('"in-app-browser": MiniBrowserView'), "app-shell.tsx maps 'in-app-browser' to MiniBrowserView in TOOL_COMPONENTS");
assert(appShellContent.includes('"youtube-downloader": YouTubeDownloader'), "app-shell.tsx maps 'youtube-downloader' to YouTubeDownloader in TOOL_COMPONENTS");

// 3. Verify nav-store.ts Suppression Removed
const navStorePath = path.resolve(__dirname, "../src/lib/navigation/nav-store.ts");
const navStoreContent = fs.readFileSync(navStorePath, "utf-8");
assert(!navStoreContent.includes('raw === "youtube-downloader"'), "nav-store.ts does not suppress youtube-downloader");

// 4. Verify ToolLaunchShell Safe Areas & Gestures
const toolLaunchShellPath = path.resolve(__dirname, "../src/components/shell/tool-launch-shell.tsx");
const shellContent = fs.readFileSync(toolLaunchShellPath, "utf-8");
assert(shellContent.includes("env(safe-area-inset-top"), "tool-launch-shell.tsx includes safe-area-inset-top for status bar / notch");
assert(shellContent.includes("env(safe-area-inset-bottom"), "tool-launch-shell.tsx includes safe-area-inset-bottom for gesture bar");
assert(shellContent.includes("useEdgeSwipeBack"), "tool-launch-shell.tsx integrates useEdgeSwipeBack hook");
assert(shellContent.includes("touchHandlers"), "tool-launch-shell.tsx binds touchHandlers for edge swipe");

// 5. Verify Edge Swipe Hook
const edgeSwipeHookPath = path.resolve(__dirname, "../src/hooks/use-edge-swipe-back.ts");
assert(fs.existsSync(edgeSwipeHookPath), "src/hooks/use-edge-swipe-back.ts exists");
const hookContent = fs.readFileSync(edgeSwipeHookPath, "utf-8");
assert(hookContent.includes("handleTouchStart") && hookContent.includes("edgeThreshold"), "use-edge-swipe-back.ts implements edge touch boundary");
assert(hookContent.includes("commitThreshold") && hookContent.includes("handleBack"), "use-edge-swipe-back.ts commits back navigation");

// 6. Verify MiniBrowserView Step Handler & Safe Area
const miniBrowserPath = path.resolve(__dirname, "../src/components/tools/mini-browser-view.tsx");
const miniBrowserContent = fs.readFileSync(miniBrowserPath, "utf-8");
assert(miniBrowserContent.includes("registerStepHandler"), "mini-browser-view.tsx registers stepHandler for back navigation");
assert(miniBrowserContent.includes("historyIndex > 0"), "mini-browser-view.tsx traverses browser history on back gesture");
assert(miniBrowserContent.includes("env(safe-area-inset-bottom"), "mini-browser-view.tsx FAB includes safe-area-inset-bottom");

// 7. Verify YouTubeDownloader Multi-Section Step Handler
const downloaderPath = path.resolve(__dirname, "../src/components/tools/youtube-downloader.tsx");
const downloaderContent = fs.readFileSync(downloaderPath, "utf-8");
assert(downloaderContent.includes("registerStepHandler"), "youtube-downloader.tsx registers stepHandler for back navigation");
assert(downloaderContent.includes("isQualitySheetOpen"), "youtube-downloader.tsx closes quality sheet on back");
assert(downloaderContent.includes('setDownloaderMode("quick-link")'), "youtube-downloader.tsx switches from in-app browser mode on back");

console.log("🎉 ALL MOBILE GESTURES, BROWSER & ALL-PHONE LAYOUT CHECKS PASSED (100%)!");
process.exit(0);
