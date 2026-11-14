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

console.log("=== ZENODECK & ZENOTAP v1.0.18 RELEASE VERIFICATION ===");

// 1. Version Parity
assert(APP_VERSION === "1.0.18" || APP_VERSION === "1.0.19" || APP_VERSION === "1.0.20" || APP_VERSION === "1.0.21", `src/config/version.ts has APP_VERSION >= "1.0.18" (got "${APP_VERSION}")`);

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
assert(pkg.version === "1.0.18" || pkg.version === "1.0.19" || pkg.version === "1.0.20" || pkg.version === "1.0.21", `package.json has version >= "1.0.18" (got "${pkg.version}")`);

const gradlePath = path.resolve(__dirname, "../android/app/build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf-8");
assert(gradle.includes('versionName "1.0.18"') || gradle.includes('versionName "1.0.19"') || gradle.includes('versionName "1.0.20"') || gradle.includes('versionName "1.0.21"'), 'android/app/build.gradle contains versionName >= "1.0.18"');
assert(gradle.includes("versionCode 10018") || gradle.includes("versionCode 10019") || gradle.includes("versionCode 10020") || gradle.includes("versionCode 10021"), "android/app/build.gradle contains versionCode >= 10018");

// 2. CHANGELOG Verification
const changelogPath = path.resolve(__dirname, "../CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf-8");
assert(changelog.includes("## [1.0.18] — 2026-11-11"), "CHANGELOG.md contains [1.0.18]");
assert(changelog.includes("In-App Mini Browser & Floating VidMate Download FAB"), "CHANGELOG.md documents Mini Browser & VidMate FAB");
assert(changelog.includes("## [1.0.17] — 2026-11-11"), "CHANGELOG.md contains [1.0.17]");

// 3. Release Notes Verification
const releaseNotesPath = path.resolve(__dirname, "../RELEASE_NOTES_v1.0.18.md");
assert(fs.existsSync(releaseNotesPath), "RELEASE_NOTES_v1.0.18.md exists");
const releaseNotes = fs.readFileSync(releaseNotesPath, "utf-8");
assert(releaseNotes.includes("ZenoDeck & ZenoTap v1.0.18 Release Notes"), "Release notes document v1.0.18");
assert(releaseNotes.includes("mini-browser-view.tsx"), "Release notes reference mini-browser-view.tsx");
assert(releaseNotes.includes("VidMate"), "Release notes reference VidMate");

console.log("🎉 ALL v1.0.18 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
