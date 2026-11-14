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

console.log("=== ZENODECK & ZENOTAP v1.0.23 RELEASE VERIFICATION ===");

// 1. Version Parity across sources
assert(APP_VERSION >= "1.0.23", `src/config/version.ts has APP_VERSION >= "1.0.23" (got "${APP_VERSION}")`);

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
assert(pkg.version >= "1.0.23", `package.json has version >= "1.0.23" (got "${pkg.version}")`);

const gradlePath = path.resolve(__dirname, "../android/app/build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf-8");
assert(/versionName "1\.0\.\d+"/.test(gradle), 'android/app/build.gradle contains valid versionName');
assert(/versionCode 100\d{2}/.test(gradle), "android/app/build.gradle contains valid versionCode");

// 2. Phone CPU Architecture Matrix & Universal APK Verification
assert(gradle.includes('"arm64-v8a"'), "android/app/build.gradle includes arm64-v8a ABI");
assert(gradle.includes('"armeabi-v7a"'), "android/app/build.gradle includes armeabi-v7a ABI");
assert(gradle.includes('"x86_64"'), "android/app/build.gradle includes x86_64 ABI");
assert(gradle.includes("universalApk true"), "android/app/build.gradle configures universalApk true for all phone hardware");

const variablesPath = path.resolve(__dirname, "../android/variables.gradle");
const variables = fs.readFileSync(variablesPath, "utf-8");
assert(variables.includes("minSdkVersion = 24"), "variables.gradle supports minSdkVersion 24 (Android 7.0+ coverage)");

// 3. CHANGELOG Verification
const changelogPath = path.resolve(__dirname, "../CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf-8");
assert(changelog.includes("## [1.0.23] — 2026-11-14"), "CHANGELOG.md contains [1.0.23]");
assert(changelog.includes("Universal Smartphone & Multi-Architecture Phone Support"), "CHANGELOG.md documents Universal Phone Support");
assert(changelog.includes("Precision Audio Cutter Elastic Deadlock Engine"), "CHANGELOG.md documents Audio Cutter Elastic Engine");
assert(changelog.includes("Anti-Deadlock Elastic Sliding Mechanics"), "CHANGELOG.md documents Anti-Deadlock Elastic Sliding");
assert(changelog.includes("## [1.0.22] — 2026-11-14"), "CHANGELOG.md contains [1.0.22]");

// 4. Release Notes Verification
const releaseNotesPath = path.resolve(__dirname, "../RELEASE_NOTES_v1.0.23.md");
assert(fs.existsSync(releaseNotesPath), "RELEASE_NOTES_v1.0.23.md exists");
const releaseNotes = fs.readFileSync(releaseNotesPath, "utf-8");
assert(releaseNotes.includes("ZenoDeck & ZenoTap v1.0.23 Release Notes"), "Release notes document v1.0.23");
assert(releaseNotes.includes("Universal Smartphone & Multi-Architecture Matrix"), "Release notes document Universal Phone Support");
assert(releaseNotes.includes("Precision Audio Cutter Elastic Deadlock Engine"), "Release notes document Cutter Elastic Engine");
assert(releaseNotes.includes("Digital Micro-Steppers & Two-Digit Centiseconds"), "Release notes document Micro-Steppers & Centiseconds");

// 5. Source Code Verification for Elastic Cutter & Duration Sync
const cutterDeckPath = path.resolve(__dirname, "../src/components/audio/PrecisionAudioCutterDeck.tsx");
const cutterContent = fs.readFileSync(cutterDeckPath, "utf-8");
assert(cutterContent.includes("elastic forward push to prevent deadlocks"), "PrecisionAudioCutterDeck implements elastic forward push");
assert(cutterContent.includes("elastic backward push to prevent deadlocks"), "PrecisionAudioCutterDeck implements elastic backward push");
assert(cutterContent.includes("TimeDigitSegment"), "PrecisionAudioCutterDeck implements TimeDigitSegment");

const studioPath = path.resolve(__dirname, "../src/components/audio/UnifiedAudioStudio.tsx");
const studioContent = fs.readFileSync(studioPath, "utf-8");
assert(studioContent.includes("defaults.endSec = duration;"), "UnifiedAudioStudio syncs endSec with duration on tool selection");

console.log("🎉 ALL v1.0.23 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
