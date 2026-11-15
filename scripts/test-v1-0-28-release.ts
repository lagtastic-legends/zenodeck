import assert from "assert";
import fs from "fs";
import path from "path";

console.log("=== ZENODECK & ZENOTAP v1.0.28 RELEASE VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Sync
const versionTs = fs.readFileSync(path.join(root, "src", "config", "version.ts"), "utf-8");
assert(versionTs.includes('APP_VERSION = "1.0.28"'), 'src/config/version.ts has APP_VERSION === "1.0.28"');
console.log("✅ src/config/version.ts has APP_VERSION 1.0.28");

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert.strictEqual(pkgJson.version, "1.0.28", "package.json has version 1.0.28");
console.log("✅ package.json has version 1.0.28");

const buildGradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle"), "utf-8");
assert(buildGradle.includes('versionName "1.0.28"'), "android/app/build.gradle contains versionName 1.0.28");
assert(buildGradle.includes("versionCode 10028"), "android/app/build.gradle contains versionCode 10028");
console.log("✅ android/app/build.gradle contains valid versionName and versionCode");

// 2. Changelog & Release Notes
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.28]"), "CHANGELOG.md contains [1.0.28]");
assert(changelog.includes("Audio Editor & Cutter In-Point / Out-Point Value Reset-to-Zero Resolution"), "CHANGELOG.md documents Audio Editor Reset Fix");
console.log("✅ CHANGELOG.md documents v1.0.28 fixes");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.28.md"), "utf-8");
assert(releaseNotes.includes("v1.0.28"), "Release notes document v1.0.28");
console.log("✅ RELEASE_NOTES_v1.0.28.md exists and is valid");

console.log("🎉 ALL v1.0.28 RELEASE VERIFICATION CHECKS PASSED!");
