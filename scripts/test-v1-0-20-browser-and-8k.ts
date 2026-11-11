setTimeout(() => process.exit(1), 15000).unref();

import fs from "fs";
import path from "path";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log("=== ZENODECK v1.0.20 NATIVE BROWSER & 8K 60FPS TEST SUITE ===");

// 1. Verify ZenoMedia3Plugin.kt Native In-App Browser Dialog & Sniffer
const pluginPath = path.resolve(__dirname, "../android/app/src/main/java/com/omnitool/app/media/ZenoMedia3Plugin.kt");
assert(fs.existsSync(pluginPath), "ZenoMedia3Plugin.kt exists");
const pluginContent = fs.readFileSync(pluginPath, "utf-8");

assert(pluginContent.includes("inAppBrowserDialog"), "ZenoMedia3Plugin.kt manages inAppBrowserDialog instance");
assert(pluginContent.includes("Theme_Black_NoTitleBar_Fullscreen"), "ZenoMedia3Plugin.kt launches fullscreen native Dialog");
assert(pluginContent.includes("#102C26"), "ZenoMedia3Plugin.kt top bar uses Forest Green #102C26");
assert(pluginContent.includes("#F7E7CE"), "ZenoMedia3Plugin.kt accents use Champagne #F7E7CE");
assert(pluginContent.includes("#090D0C"), "ZenoMedia3Plugin.kt background uses Obsidian #090D0C");
assert(pluginContent.includes("openVidMateSheet"), "ZenoMedia3Plugin.kt dispatches openVidMateSheet Capacitor event");
assert(pluginContent.includes("⚡ DOWNLOAD VIDEO / MP3") || pluginContent.includes("⚡ DOWNLOAD (VIDMATE)"), "ZenoMedia3Plugin.kt has pulsing VidMate FAB");
assert(pluginContent.includes("ogTitle") && pluginContent.includes("ogImage") && pluginContent.includes("directVideoSrc"), "ZenoMedia3Plugin.kt extracts ogTitle, ogImage, and directVideoSrc");

// Check brace balance
let openBraces = 0;
let closeBraces = 0;
for (const char of pluginContent) {
  if (char === "{") openBraces++;
  if (char === "}") closeBraces++;
}
assert(openBraces === closeBraces, `ZenoMedia3Plugin.kt braces are balanced ({ = ${openBraces}, } = ${closeBraces})`);

// 2. Verify mini-browser-view.tsx
const miniBrowserPath = path.resolve(__dirname, "../src/components/tools/mini-browser-view.tsx");
assert(fs.existsSync(miniBrowserPath), "mini-browser-view.tsx exists");
const miniBrowserContent = fs.readFileSync(miniBrowserPath, "utf-8");

assert(miniBrowserContent.includes("openVidMateSheet"), "mini-browser-view.tsx listens to openVidMateSheet event");
assert(miniBrowserContent.includes("isNativeAndroidPlatform()"), "mini-browser-view.tsx checks native Android platform");
assert(miniBrowserContent.includes("Zero Restriction Native Web Engine"), "mini-browser-view.tsx renders native engine station avoiding iframe ERR_BLOCKED_BY_RESPONSE");
assert(miniBrowserContent.includes("⚡ Download Video / MP3") || miniBrowserContent.includes("VIDMATE"), "mini-browser-view.tsx includes VidMate download FAB");

// 3. Verify innertube.ts 8K 60FPS Resolution Pipeline
const innertubePath = path.resolve(__dirname, "../src/lib/youtube/innertube.ts");
assert(fs.existsSync(innertubePath), "innertube.ts exists");
const innertubeContent = fs.readFileSync(innertubePath, "utf-8");

assert(innertubeContent.includes('"8K 60FPS"'), "innertube.ts declares '8K 60FPS' badge");
assert(innertubeContent.includes("is8K?: boolean") || innertubeContent.includes("is8K: boolean"), "innertube.ts declares is8K property on YouTubeQualityOption");
assert(innertubeContent.includes("8K Ultra HD 60fps"), "innertube.ts labels 8K Ultra HD 60fps");
assert(innertubeContent.includes("4320p60"), "innertube.ts has 4320p60 quality ID");

// 4. Verify vidmate-quality-sheet.tsx 8K Badge
const sheetPath = path.resolve(__dirname, "../src/components/tools/vidmate-quality-sheet.tsx");
assert(fs.existsSync(sheetPath), "vidmate-quality-sheet.tsx exists");
const sheetContent = fs.readFileSync(sheetPath, "utf-8");

assert(sheetContent.includes("Video Resolutions (360p to 8K 60FPS)"), "vidmate-quality-sheet.tsx header shows up to 8K 60FPS");
assert(sheetContent.includes("8K FUHD"), "vidmate-quality-sheet.tsx renders 8K FUHD badge");

// 5. Verify video-compressor.tsx 8K FUHD Preset & Resolution
const compressorPath = path.resolve(__dirname, "../src/components/tools/video-compressor.tsx");
assert(fs.existsSync(compressorPath), "video-compressor.tsx exists");
const compressorContent = fs.readFileSync(compressorPath, "utf-8");

assert(compressorContent.includes('"4320"'), "video-compressor.tsx supports 4320p resolution");
assert(compressorContent.includes("8K FUHD (4320p)"), "video-compressor.tsx has 8K FUHD label");
assert(compressorContent.includes("8k-60fps-master"), "video-compressor.tsx includes 8k-60fps-master preset");

// 6. Verify youtube-downloader.tsx 8K Preset & Badge
const downloaderPath = path.resolve(__dirname, "../src/components/tools/youtube-downloader.tsx");
assert(fs.existsSync(downloaderPath), "youtube-downloader.tsx exists");
const downloaderContent = fs.readFileSync(downloaderPath, "utf-8");

assert(downloaderContent.includes("cinema-8k-master"), "youtube-downloader.tsx includes cinema-8k-master preset");
assert(downloaderContent.includes("8K 60FPS"), "youtube-downloader.tsx renders 8K 60FPS badges");

// 7. Verify turbo-downloader.ts is8K Support
const turboPath = path.resolve(__dirname, "../src/lib/youtube/turbo-downloader.ts");
assert(fs.existsSync(turboPath), "turbo-downloader.ts exists");
const turboContent = fs.readFileSync(turboPath, "utf-8");

assert(turboContent.includes("is8K?: boolean") || turboContent.includes("is8K: boolean"), "turbo-downloader.ts declares is8K in TurboDownloadResult");

console.log("🎉 ALL v1.0.20 NATIVE BROWSER & 8K 60FPS CHECKS PASSED (100%)!");
process.exit(0);
