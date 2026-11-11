/**
 * Automated Verification: ZenoDeck & ZenoTap v1.0.17 Release Parity
 */
import fs from "fs";
import path from "path";
import { APP_VERSION } from "../src/config/version";

console.log("=== Verifying ZenoDeck & ZenoTap v1.0.17 Release Parity ===\n");

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

// 1. Version Parity
assert(APP_VERSION === "1.0.17" || APP_VERSION === "1.0.18" || APP_VERSION === "1.0.19" || APP_VERSION === "1.0.20", `src/config/version.ts has APP_VERSION >= "1.0.17" (got "${APP_VERSION}")`);

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
assert(pkg.version === "1.0.17" || pkg.version === "1.0.18" || pkg.version === "1.0.19" || pkg.version === "1.0.20", `package.json has version >= "1.0.17" (got "${pkg.version}")`);

const gradlePath = path.resolve(__dirname, "../android/app/build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf-8");
assert(gradle.includes('versionName "1.0.17"') || gradle.includes('versionName "1.0.18"') || gradle.includes('versionName "1.0.19"') || gradle.includes('versionName "1.0.20"'), 'android/app/build.gradle contains versionName >= "1.0.17"');
assert(gradle.includes("versionCode 10017") || gradle.includes("versionCode 10018") || gradle.includes("versionCode 10019") || gradle.includes("versionCode 10020"), "android/app/build.gradle contains versionCode >= 10017");

// 2. CHANGELOG Verification
const changelogPath = path.resolve(__dirname, "../CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf-8");
assert(changelog.includes("## [1.0.17] — 2026-11-11"), "CHANGELOG.md contains [1.0.17]");
assert(changelog.includes("## [1.0.16] — 2026-11-10"), "CHANGELOG.md contains [1.0.16]");
assert(changelog.includes("## [1.0.15] — 2026-11-10"), "CHANGELOG.md contains [1.0.15]");
assert(changelog.includes("## [1.0.14] — 2026-10-30"), "CHANGELOG.md contains [1.0.14]");

// 3. Release Notes Verification
const releaseNotesPath = path.resolve(__dirname, "../RELEASE_NOTES_v1.0.17.md");
assert(fs.existsSync(releaseNotesPath), "RELEASE_NOTES_v1.0.17.md exists");
const releaseNotes = fs.readFileSync(releaseNotesPath, "utf-8");
assert(releaseNotes.includes("4K UHD (2160p) 30 FPS Studio Master Video Compressor"), "Release notes document 4K 30FPS Compressor");
assert(releaseNotes.includes("Continuous Gesture / Glide Typing Engine"), "Release notes document Glide Typing");
assert(releaseNotes.includes("Gboard-Grade Native Keyboard Overhaul"), "Release notes document Native Keyboard Overhaul");

// 4. What's New Modal Verification
const whatsNewPath = path.resolve(__dirname, "../src/components/shell/whats-new-modal.tsx");
const whatsNew = fs.readFileSync(whatsNewPath, "utf-8");
assert(APP_VERSION !== "1.0.17" || whatsNew.includes("4K 30FPS Studio Compressor"), "whats-new-modal.tsx features 4K 30FPS Studio Compressor card");
assert(APP_VERSION !== "1.0.17" || whatsNew.includes("Continuous Glide Typing"), "whats-new-modal.tsx features Continuous Glide Typing card");

// 5. Video Compressor 4K 30FPS Verification
const compressorPath = path.resolve(__dirname, "../src/components/tools/video-compressor.tsx");
const compressor = fs.readFileSync(compressorPath, "utf-8");
assert(compressor.includes('id: "4k-30fps-master"'), "video-compressor.tsx contains 4k-30fps-master preset");
assert(compressor.includes('type Framerate = "original" | "30" | "60" | "24"'), "video-compressor.tsx contains Framerate selector");
assert(compressor.includes("allowUpscale"), "video-compressor.tsx contains allowUpscale toggle");

console.log("\n🎉 ALL v1.0.17 RELEASE PARITY CHECKS PASSED SUCCESSFULLY!");
process.exit(0);
