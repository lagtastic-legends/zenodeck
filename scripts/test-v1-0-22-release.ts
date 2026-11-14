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

console.log("=== ZENODECK & ZENOTAP v1.0.22 RELEASE VERIFICATION ===");

// 1. Version Parity across sources
assert(APP_VERSION >= "1.0.22", `src/config/version.ts has APP_VERSION >= "1.0.22" (got "${APP_VERSION}")`);

const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
assert(pkg.version >= "1.0.22", `package.json has version >= "1.0.22" (got "${pkg.version}")`);

const gradlePath = path.resolve(__dirname, "../android/app/build.gradle");
const gradle = fs.readFileSync(gradlePath, "utf-8");
assert(/versionName "1\.0\.\d+"/.test(gradle), 'android/app/build.gradle contains valid versionName');
assert(/versionCode 100\d{2}/.test(gradle), "android/app/build.gradle contains valid versionCode");

// 2. CHANGELOG Verification
const changelogPath = path.resolve(__dirname, "../CHANGELOG.md");
const changelog = fs.readFileSync(changelogPath, "utf-8");
assert(changelog.includes("## [1.0.22] — 2026-11-14"), "CHANGELOG.md contains [1.0.22]");
assert(changelog.includes("Universal Download Manager & Background Queuing Engine"), "CHANGELOG.md documents Download Manager & Queuing Engine");
assert(changelog.includes("Persistent Download Queue Store"), "CHANGELOG.md documents Persistent Queue Store");
assert(changelog.includes("Sequential FIFO Queue Runner"), "CHANGELOG.md documents Sequential FIFO Queue Runner");
assert(changelog.includes("Real-Time Telemetry HUD"), "CHANGELOG.md documents Telemetry HUD");
assert(changelog.includes("## [1.0.21] — 2026-11-14"), "CHANGELOG.md contains [1.0.21]");

// 3. Release Notes Verification
const releaseNotesPath = path.resolve(__dirname, "../RELEASE_NOTES_v1.0.22.md");
assert(fs.existsSync(releaseNotesPath), "RELEASE_NOTES_v1.0.22.md exists");
const releaseNotes = fs.readFileSync(releaseNotesPath, "utf-8");
assert(releaseNotes.includes("ZenoDeck & ZenoTap v1.0.22 Release Notes"), "Release notes document v1.0.22");
assert(releaseNotes.includes("Universal Download Manager & Background Queuing Engine"), "Release notes document Download Manager");
assert(releaseNotes.includes("Persistent Download Queue Store"), "Release notes document Persistent Queue Store");
assert(releaseNotes.includes("Background Queue Runner Engine"), "Release notes document Queue Runner Engine");

// 4. Source Files Verification
const storePath = path.resolve(__dirname, "../src/lib/media/download-queue-store.ts");
const runnerPath = path.resolve(__dirname, "../src/lib/media/download-queue-runner.ts");
const viewPath = path.resolve(__dirname, "../src/components/tools/download-manager-view.tsx");

assert(fs.existsSync(storePath), "download-queue-store.ts exists");
assert(fs.existsSync(runnerPath), "download-queue-runner.ts exists");
assert(fs.existsSync(viewPath), "download-manager-view.tsx exists");

console.log("🎉 ALL v1.0.22 RELEASE VERIFICATION CHECKS PASSED!");
process.exit(0);
