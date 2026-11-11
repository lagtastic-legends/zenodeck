setTimeout(() => process.exit(1), 15000).unref();

import fs from "fs";
import path from "path";
import { APP_VERSION } from "../src/config/version";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion failed: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log("=== ZENODECK & ZENOTAP v1.0.19 RELEASE VERIFICATION ===");

// 1. Version Parity
assert(APP_VERSION === "1.0.19", `src/config/version.ts has APP_VERSION === "1.0.19" (got "${APP_VERSION}")`);

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
assert(pkg.version === "1.0.19", `package.json has version === "1.0.19" (got "${pkg.version}")`);

const gradlePath = path.resolve(__dirname, "../android/app/build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf-8");
assert(gradle.includes('versionName "1.0.19"'), 'android/app/build.gradle contains versionName "1.0.19"');
assert(gradle.includes("versionCode 10019"), "android/app/build.gradle contains versionCode 10019");

// 2. CHANGELOG Verification
const changelogPath = path.resolve(__dirname, "../CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf-8");
assert(changelog.includes("## [1.0.19] — 2026-11-11"), "CHANGELOG.md contains [1.0.19]");
assert(changelog.includes("In-App Browser & Universal Downloader Bento Grid Exposure"), "CHANGELOG.md documents Bento Grid Exposure");
assert(changelog.includes("Universal Mobile Phone Layout Fit"), "CHANGELOG.md documents Mobile Layout Fit");
assert(changelog.includes("Multi-Section Mobile Edge Back Gestures"), "CHANGELOG.md documents Mobile Back Gestures");
assert(changelog.includes("## [1.0.18] — 2026-11-11"), "CHANGELOG.md contains [1.0.18]");

// 3. Release Notes Verification
const releaseNotesPath = path.resolve(__dirname, "../RELEASE_NOTES_v1.0.19.md");
assert(fs.existsSync(releaseNotesPath), "RELEASE_NOTES_v1.0.19.md exists");
const releaseNotes = fs.readFileSync(releaseNotesPath, "utf-8");
assert(releaseNotes.includes("ZenoDeck & ZenoTap v1.0.19 Release Notes"), "Release notes document v1.0.19");
assert(releaseNotes.includes("in-app-browser"), "Release notes reference in-app-browser");
assert(releaseNotes.includes("use-edge-swipe-back") || releaseNotes.includes("useEdgeSwipeBack"), "Release notes reference use-edge-swipe-back");

console.log("🎉 ALL v1.0.19 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
