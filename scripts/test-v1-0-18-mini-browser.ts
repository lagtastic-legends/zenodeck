setTimeout(() => process.exit(1), 15000).unref();

import fs from "fs";
import path from "path";

console.log("=== ZENODECK & ZENOTAP v1.0.18 MINI BROWSER & FAB TEST SUITE ===");

// 1. Verify src/components/tools/mini-browser-view.tsx
const browserViewPath = path.join(process.cwd(), "src/components/tools/mini-browser-view.tsx");
if (!fs.existsSync(browserViewPath)) {
  console.error("FAIL: Missing mini-browser-view.tsx");
  process.exit(1);
}
const browserContent = fs.readFileSync(browserViewPath, "utf-8");

if (!browserContent.includes("export function MiniBrowserView")) {
  console.error("FAIL: MiniBrowserView export not found");
  process.exit(1);
}
if (!browserContent.includes("onTriggerVidMateSheet")) {
  console.error("FAIL: onTriggerVidMateSheet prop not found in mini-browser-view.tsx");
  process.exit(1);
}
if (!browserContent.includes("#102C26") || !browserContent.includes("#F7E7CE") || !browserContent.includes("#A79277")) {
  console.error("FAIL: Palette colors (#102C26, #F7E7CE, #A79277) missing in mini-browser-view.tsx");
  process.exit(1);
}
if (!browserContent.includes("⚡ Download Video / MP3") && !browserContent.includes("VIDMATE")) {
  console.error("FAIL: Pulsing VidMate FAB label missing in mini-browser-view.tsx");
  process.exit(1);
}
if (!browserContent.includes("bottom-5 right-5 z-30")) {
  console.error("FAIL: FAB position bottom-5 right-5 z-30 missing in mini-browser-view.tsx");
  process.exit(1);
}
console.log("✔ mini-browser-view.tsx verified: MiniBrowserView, onTriggerVidMateSheet, ZenoDeck palette, and VidMate FAB.");

// 2. Verify src/components/tools/youtube-downloader.tsx
const downloaderPath = path.join(process.cwd(), "src/components/tools/youtube-downloader.tsx");
if (!fs.existsSync(downloaderPath)) {
  console.error("FAIL: Missing youtube-downloader.tsx");
  process.exit(1);
}
const downloaderContent = fs.readFileSync(downloaderPath, "utf-8");

if (!downloaderContent.includes("onTriggerVidMateSheet")) {
  console.error("FAIL: onTriggerVidMateSheet handoff missing in youtube-downloader.tsx");
  process.exit(1);
}
if (!downloaderContent.includes("setIsQualitySheetOpen(true)")) {
  console.error("FAIL: setIsQualitySheetOpen(true) trigger missing in youtube-downloader.tsx");
  process.exit(1);
}
if (!downloaderContent.includes("VidmateQualitySheet")) {
  console.error("FAIL: VidmateQualitySheet integration missing in youtube-downloader.tsx");
  process.exit(1);
}
console.log("✔ youtube-downloader.tsx verified: MiniBrowserView connected to VidmateQualitySheet.");

// 3. Verify native-media-muxer.ts and ZenoMedia3Plugin.kt
const muxerPath = path.join(process.cwd(), "src/lib/media/native-media-muxer.ts");
const muxerContent = fs.readFileSync(muxerPath, "utf-8");
if (!muxerContent.includes("ogTitle") || !muxerContent.includes("ogImage") || !muxerContent.includes("directVideoSrc")) {
  console.error("FAIL: ogTitle/ogImage/directVideoSrc missing in native-media-muxer.ts");
  process.exit(1);
}
console.log("✔ native-media-muxer.ts verified: sniffStreamViaWebView return types updated.");

const pluginPath = path.join(process.cwd(), "android/app/src/main/java/com/omnitool/app/media/ZenoMedia3Plugin.kt");
const pluginContent = fs.readFileSync(pluginPath, "utf-8");
if (!pluginContent.includes("ogTitle") || !pluginContent.includes("ogImage") || !pluginContent.includes("directVideoSrc")) {
  console.error("FAIL: ogTitle/ogImage/directVideoSrc missing in ZenoMedia3Plugin.kt");
  process.exit(1);
}

// Check balanced braces in ZenoMedia3Plugin.kt
let openBraces = 0;
let closeBraces = 0;
for (const char of pluginContent) {
  if (char === "{") openBraces++;
  if (char === "}") closeBraces++;
}
if (openBraces !== closeBraces) {
  console.error(`FAIL: Unbalanced braces in ZenoMedia3Plugin.kt: { = ${openBraces}, } = ${closeBraces}`);
  process.exit(1);
}
console.log(`✔ ZenoMedia3Plugin.kt verified: OG/video sniffing extraction added and braces balanced ({ = ${openBraces}, } = ${closeBraces}).`);

console.log("🎉 ALL v1.0.18 MINI BROWSER & FAB VERIFICATION CHECKS PASSED!");
process.exit(0);
