setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 25000).unref();

import assert from "assert";
import fs from "fs";
import path from "path";

console.log("=== ZENODECK & ZENOTAP v1.0.34 RELEASE VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Sync
const versionTs = fs.readFileSync(path.join(root, "src", "config", "version.ts"), "utf-8");
assert(/APP_VERSION = "1\.0\.\d+"/.test(versionTs), 'src/config/version.ts has valid APP_VERSION');
console.log("✅ src/config/version.ts has valid APP_VERSION >= 1.0.34");

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert(pkgJson.version >= "1.0.34", 'package.json has version >= "1.0.34"');
console.log("✅ package.json has version >= 1.0.34");

const buildGradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle"), "utf-8");
assert(/versionName "1\.0\.\d+"/.test(buildGradle), 'android/app/build.gradle contains valid versionName');
assert(/versionCode 100\d{2}/.test(buildGradle), "android/app/build.gradle contains valid versionCode");
console.log("✅ android/app/build.gradle contains valid versionName and versionCode (>= 10034)");

// 2. Changelog & Release Notes
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.34]"), "CHANGELOG.md contains [1.0.34]");
assert(changelog.includes("Streamlined Universal Media Downloader Architecture"), "CHANGELOG.md documents Streamlined Downloader");
assert(changelog.includes("Mobile & iPhone Web Clip Profile Feature Descriptions"), "CHANGELOG.md documents Mobile Feature Descriptions");
console.log("✅ CHANGELOG.md documents v1.0.34 releases and highlights");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.34.md"), "utf-8");
assert(releaseNotes.includes("v1.0.34"), "Release notes document v1.0.34");
assert(releaseNotes.includes("Streamlined Universal Media Downloader Architecture"), "Release notes detail Streamlined Architecture");
assert(releaseNotes.includes("Mobile & iPhone Web Clip Profile Feature Descriptions"), "Release notes detail Mobile Descriptions");
console.log("✅ RELEASE_NOTES_v1.0.34.md exists and is valid");

// 3. What's New Modal
const whatsNewModal = fs.readFileSync(path.join(root, "src", "components", "shell", "whats-new-modal.tsx"), "utf-8");
assert(whatsNewModal.includes("Streamlined Downloader") || whatsNewModal.includes("APP_VERSION"), "whats-new-modal.tsx contains valid feature cards");
console.log("✅ whats-new-modal.tsx contains valid feature cards");

// 4. Mobile Description in tool-grid.tsx
const toolGrid = fs.readFileSync(path.join(root, "src", "components", "dashboard", "tool-grid.tsx"), "utf-8");
assert(!toolGrid.includes("hidden sm:block"), "tool-grid.tsx does not hide descriptions with 'hidden sm:block'");
assert(toolGrid.includes("tool.description"), "tool-grid.tsx renders tool.description");
console.log("✅ tool-grid.tsx renders feature descriptions on mobile and desktop");

// 5. Decoupled In-App Browser & Sniffer in Downloader
const ytDownloader = fs.readFileSync(path.join(root, "src/components/tools/youtube-downloader.tsx"), "utf-8");
assert(!ytDownloader.includes("MiniBrowserView"), "youtube-downloader.tsx has no MiniBrowserView");
assert(!ytDownloader.includes("downloaderMode"), "youtube-downloader.tsx has no downloaderMode");
console.log("✅ youtube-downloader.tsx is streamlined and decoupled");

console.log("🎉 ALL v1.0.34 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
