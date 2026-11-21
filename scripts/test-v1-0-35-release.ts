setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 25000).unref();

import assert from "assert";
import fs from "fs";
import path from "path";

console.log("=== ZENODECK & ZENOTAP v1.0.35 RELEASE VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Sync
const versionTs = fs.readFileSync(path.join(root, "src", "config", "version.ts"), "utf-8");
assert(versionTs.includes('APP_VERSION = "1.0.35"'), 'src/config/version.ts has APP_VERSION = "1.0.35"');
console.log("✅ src/config/version.ts has APP_VERSION = 1.0.35");

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert(pkgJson.version === "1.0.35", 'package.json has version === "1.0.35"');
console.log("✅ package.json has version === 1.0.35");

const buildGradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle"), "utf-8");
assert(buildGradle.includes('versionName "1.0.35"'), 'android/app/build.gradle contains versionName "1.0.35"');
assert(buildGradle.includes("versionCode 10035"), "android/app/build.gradle contains versionCode 10035");
console.log("✅ android/app/build.gradle contains valid versionName (1.0.35) and versionCode (10035)");

// 2. Changelog & Release Notes
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.35]"), "CHANGELOG.md contains [1.0.35]");
assert(changelog.includes("5% Freeze Fix"), "CHANGELOG.md documents 5% Freeze Fix");
assert(changelog.includes("Turbo Multi-Worker UI Removal"), "CHANGELOG.md documents Turbo Multi-Worker UI Removal");
console.log("✅ CHANGELOG.md documents v1.0.35 releases and highlights");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.35.md"), "utf-8");
assert(releaseNotes.includes("v1.0.35"), "Release notes document v1.0.35");
assert(releaseNotes.includes("5% Freeze Fix"), "Release notes detail 5% Freeze Fix");
assert(releaseNotes.includes("Turbo Multi-Worker UI Removal"), "Release notes detail Turbo Multi-Worker UI Removal");
console.log("✅ RELEASE_NOTES_v1.0.35.md exists and is valid");

// 3. What's New Modal
const whatsNewModal = fs.readFileSync(path.join(root, "src", "components", "shell", "whats-new-modal.tsx"), "utf-8");
assert(whatsNewModal.includes("Direct Stream Engine"), "whats-new-modal.tsx highlights Direct Stream Engine");
assert(whatsNewModal.includes("Optimal 2-Worker Engine"), "whats-new-modal.tsx highlights Optimal 2-Worker Engine");
console.log("✅ whats-new-modal.tsx contains v1.0.35 feature cards");

// 4. Downloader Multi-Worker UI Removal
const ytDownloader = fs.readFileSync(path.join(root, "src/components/tools/youtube-downloader.tsx"), "utf-8");
assert(!ytDownloader.includes("Turbo Multi-Worker Acceleration"), "youtube-downloader.tsx removed Turbo Multi-Worker Acceleration card");
assert(!ytDownloader.includes("4X THREADS"), "youtube-downloader.tsx removed 4X THREADS button");
assert(!ytDownloader.includes("6X THREADS"), "youtube-downloader.tsx removed 6X THREADS button");
assert(!ytDownloader.includes("8X THREADS"), "youtube-downloader.tsx removed 8X THREADS button");
assert(ytDownloader.includes("workersCount = 2"), "youtube-downloader.tsx sets fixed optimal workersCount = 2");
assert(ytDownloader.includes("Direct Stream"), "youtube-downloader.tsx HUD displays Direct Stream");
console.log("✅ youtube-downloader.tsx has clean UI with multi-worker controls removed and optimal 2 workers set");

// 5. Headless Native Engine 5% Freeze Fix Fallback
const nativeEngine = fs.readFileSync(
  path.join(root, "android", "app", "src", "main", "java", "com", "omnitool", "app", "media", "ZenoHeadlessMediaEngine.kt"),
  "utf-8"
);
assert(nativeEngine.includes("openResilientStreamConnection"), "ZenoHeadlessMediaEngine.kt implements openResilientStreamConnection");
assert(nativeEngine.includes("Range"), "ZenoHeadlessMediaEngine.kt falls back to HTTP Range header");
console.log("✅ ZenoHeadlessMediaEngine.kt implements resilient stream connection fallback");

console.log("🎉 ALL v1.0.35 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
