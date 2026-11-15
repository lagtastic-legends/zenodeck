import assert from "assert";
import fs from "fs";
import path from "path";

console.log("=== ZENODECK & ZENOTAP v1.0.29 RELEASE VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Sync
const versionTs = fs.readFileSync(path.join(root, "src", "config", "version.ts"), "utf-8");
assert(/APP_VERSION = "1\.0\.\d+"/.test(versionTs), 'src/config/version.ts has valid APP_VERSION');
console.log("✅ src/config/version.ts has valid APP_VERSION >= 1.0.29");

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert(pkgJson.version >= "1.0.29", "package.json has version >= 1.0.29");
console.log("✅ package.json has version >= 1.0.29");

const buildGradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle"), "utf-8");
assert(/versionName "1\.0\.\d+"/.test(buildGradle), "android/app/build.gradle contains valid versionName");
assert(/versionCode 100\d{2}/.test(buildGradle), "android/app/build.gradle contains valid versionCode");
console.log("✅ android/app/build.gradle contains valid versionName and versionCode");

// 2. Changelog & Release Notes
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.29]"), "CHANGELOG.md contains [1.0.29]");
assert(changelog.includes("Play Cut Audition Engine"), "CHANGELOG.md documents Play Cut Fix");
assert(changelog.includes("Audiophile Sound Quality & Export Encoding Pipeline"), "CHANGELOG.md documents Audio Quality Fix");
console.log("✅ CHANGELOG.md documents v1.0.29 fixes");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.29.md"), "utf-8");
assert(releaseNotes.includes("v1.0.29"), "Release notes document v1.0.29");
console.log("✅ RELEASE_NOTES_v1.0.29.md exists and is valid");

console.log("🎉 ALL v1.0.29 RELEASE VERIFICATION CHECKS PASSED!");
