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

console.log("=== ZENODECK & ZENOTAP v1.0.20 RELEASE VERIFICATION ===");

// 1. Version Parity
assert(APP_VERSION === "1.0.20" || APP_VERSION === "1.0.21" || APP_VERSION === "1.0.22", `src/config/version.ts has APP_VERSION >= "1.0.20" (got "${APP_VERSION}")`);

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
assert(pkg.version === "1.0.20" || pkg.version === "1.0.21" || pkg.version === "1.0.22", `package.json has version >= "1.0.20" (got "${pkg.version}")`);

const gradlePath = path.resolve(__dirname, "../android/app/build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf-8");
assert(gradle.includes('versionName "1.0.20"') || gradle.includes('versionName "1.0.21"') || gradle.includes('versionName "1.0.22"'), 'android/app/build.gradle contains versionName >= "1.0.20"');
assert(gradle.includes("versionCode 10020") || gradle.includes("versionCode 10021") || gradle.includes("versionCode 10022"), "android/app/build.gradle contains versionCode >= 10020");

// 2. CHANGELOG Verification
const changelogPath = path.resolve(__dirname, "../CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf-8");
assert(changelog.includes("## [1.0.20] — 2026-11-12"), "CHANGELOG.md contains [1.0.20]");
assert(changelog.includes("Native In-App Browser Fullscreen Dialog"), "CHANGELOG.md documents Native In-App Browser");
assert(changelog.includes("8K 60FPS"), "CHANGELOG.md documents 8K 60FPS Support");
assert(changelog.includes("## [1.0.19] — 2026-11-11"), "CHANGELOG.md contains [1.0.19]");

// 3. Release Notes Verification
const releaseNotesPath = path.resolve(__dirname, "../RELEASE_NOTES_v1.0.20.md");
assert(fs.existsSync(releaseNotesPath), "RELEASE_NOTES_v1.0.20.md exists");
const releaseNotes = fs.readFileSync(releaseNotesPath, "utf-8");
assert(releaseNotes.includes("ZenoDeck & ZenoTap v1.0.20 Release Notes"), "Release notes document v1.0.20");
assert(releaseNotes.includes("ERR_BLOCKED_BY_RESPONSE") || releaseNotes.includes("In-App Browser"), "Release notes reference In-App Browser fix");
assert(releaseNotes.includes("8K 60FPS"), "Release notes reference 8K 60FPS");

console.log("🎉 ALL v1.0.20 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
