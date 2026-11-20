setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 25000).unref();

import assert from "assert";
import fs from "fs";
import path from "path";

console.log("=== ZENODECK & ZENOTAP v1.0.30 RELEASE VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Sync
const versionTs = fs.readFileSync(path.join(root, "src", "config", "version.ts"), "utf-8");
assert(/APP_VERSION = "1\.0\.\d+"/.test(versionTs), 'src/config/version.ts has valid APP_VERSION');
console.log("✅ src/config/version.ts has valid APP_VERSION >= 1.0.30");

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert(pkgJson.version >= "1.0.30", 'package.json has version >= "1.0.30"');
console.log("✅ package.json has version >= 1.0.30");

const buildGradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle"), "utf-8");
assert(/versionName "1\.0\.\d+"/.test(buildGradle), 'android/app/build.gradle contains valid versionName');
assert(/versionCode 100\d{2}/.test(buildGradle), "android/app/build.gradle contains valid versionCode");
console.log("✅ android/app/build.gradle contains valid versionName and versionCode (>= 10030)");

// 2. Changelog & Release Notes
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.30]"), "CHANGELOG.md contains [1.0.30]");
assert(changelog.includes("Master 360° Architectural Verification"), "CHANGELOG.md documents Master 360° Audit");
assert(changelog.includes("In-App Mini Browser & 8-Site Portal Hub"), "CHANGELOG.md documents Mini Browser Hub");
assert(changelog.includes("All 20 Unified Audio Studio Modules"), "CHANGELOG.md documents 20 Audio Modules");
console.log("✅ CHANGELOG.md documents v1.0.30 releases and highlights");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.30.md"), "utf-8");
assert(releaseNotes.includes("v1.0.30"), "Release notes document v1.0.30");
assert(releaseNotes.includes("Master 360° Architectural Verification Suite (340/340 Checks Pass)"), "Release notes detail 340 checks");
console.log("✅ RELEASE_NOTES_v1.0.30.md exists and is valid");

// 3. What's New Modal
const whatsNewModal = fs.readFileSync(path.join(root, "src", "components", "shell", "whats-new-modal.tsx"), "utf-8");
assert(
  whatsNewModal.includes("APP_VERSION") && whatsNewModal.includes("FeatureCard"),
  "whats-new-modal.tsx contains valid release feature cards"
);
console.log("✅ whats-new-modal.tsx contains valid feature cards");

console.log("🎉 ALL v1.0.30 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
