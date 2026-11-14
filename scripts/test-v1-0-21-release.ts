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

console.log("=== ZENODECK & ZENOTAP v1.0.21 RELEASE VERIFICATION ===");

// 1. Version Parity across sources
assert(APP_VERSION === "1.0.21" || APP_VERSION === "1.0.22", `src/config/version.ts has APP_VERSION >= "1.0.21" (got "${APP_VERSION}")`);

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
assert(pkg.version === "1.0.21" || pkg.version === "1.0.22", `package.json has version >= "1.0.21" (got "${pkg.version}")`);

const gradlePath = path.resolve(__dirname, "../android/app/build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf-8");
assert(gradle.includes('versionName "1.0.21"') || gradle.includes('versionName "1.0.22"'), 'android/app/build.gradle contains versionName >= "1.0.21"');
assert(gradle.includes("versionCode 10021") || gradle.includes("versionCode 10022"), "android/app/build.gradle contains versionCode >= 10021");

// 2. CHANGELOG Verification
const changelogPath = path.resolve(__dirname, "../CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf-8");
assert(changelog.includes("## [1.0.21] — 2026-11-14"), "CHANGELOG.md contains [1.0.21]");
assert(changelog.includes("Precision Audio Cutter & Waveform Splicer Deck"), "CHANGELOG.md documents Precision Audio Cutter");
assert(changelog.includes("Adaptive Dynamic Timestamp Formatting"), "CHANGELOG.md documents Adaptive Dynamic Timestamp Formatting");
assert(changelog.includes("ERR_BLOCKED_BY_RESPONSE"), "CHANGELOG.md documents In-App Browser ERR_BLOCKED_BY_RESPONSE Fix");
assert(changelog.includes("Universal Downloader Resilient Cloud Stream Fallback"), "CHANGELOG.md documents Cloud Stream Fallback");
assert(changelog.includes("## [1.0.20] — 2026-11-12"), "CHANGELOG.md contains [1.0.20]");

// 3. Release Notes Verification
const releaseNotesPath = path.resolve(__dirname, "../RELEASE_NOTES_v1.0.21.md");
assert(fs.existsSync(releaseNotesPath), "RELEASE_NOTES_v1.0.21.md exists");
const releaseNotes = fs.readFileSync(releaseNotesPath, "utf-8");
assert(releaseNotes.includes("ZenoDeck & ZenoTap v1.0.21 Release Notes"), "Release notes document v1.0.21");
assert(releaseNotes.includes("Precision Audio Cutter & Waveform Splicer Deck"), "Release notes document Precision Audio Cutter");
assert(releaseNotes.includes("ERR_BLOCKED_BY_RESPONSE") || releaseNotes.includes("In-App Browser"), "Release notes reference In-App Browser fix");
assert(releaseNotes.includes("Cloud Stream Fallback") || releaseNotes.includes("Bot Protection"), "Release notes reference Cloud Stream Fallback");

console.log("🎉 ALL v1.0.21 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
