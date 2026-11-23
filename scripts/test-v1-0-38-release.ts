setTimeout(() => process.exit(1), 15000).unref();

import assert from "assert";
import fs from "fs";
import path from "path";
import {
  EIGHT_D_SLOWED_REVERB_STUDIO_PRESET,
  EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET,
  SLOWED_REVERB_PRESETS,
} from "../src/lib/audio/fx-rack-engine";
import { build8DSlowedReverbFilter } from "../src/lib/audio-dsp";

console.log("=== ZENODECK & ZENOTAP v1.0.38 RELEASE VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Sync
console.log("\n[1/5] Checking version synchronization across configs...");
const versionTs = fs.readFileSync(path.join(root, "src", "config", "version.ts"), "utf-8");
assert(versionTs.includes('APP_VERSION = "1.0.38"'), 'src/config/version.ts has APP_VERSION = "1.0.38"');
console.log("✅ src/config/version.ts has APP_VERSION = 1.0.38");

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert.equal(pkgJson.version, "1.0.38", 'package.json has version "1.0.38"');
console.log("✅ package.json has version = 1.0.38");

const buildGradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle"), "utf-8");
assert(buildGradle.includes('versionName "1.0.38"'), 'android/app/build.gradle contains versionName "1.0.38"');
assert(buildGradle.includes("versionCode 10038"), "android/app/build.gradle contains versionCode 10038");
console.log("✅ android/app/build.gradle contains versionName 1.0.38 and versionCode 10038");

// 2. Changelog & Release Notes
console.log("\n[2/5] Checking release documentation...");
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.38] — 2026-11-23"), "CHANGELOG.md contains [1.0.38]");
assert(changelog.includes("3-Stage 8D Spatial + Slowed & Reverb DSP Engine"), "CHANGELOG.md documents 3-Stage 8D Spatial");
assert(changelog.includes("Universal Media Downloader Stabilization"), "CHANGELOG.md documents Downloader Stabilization");
console.log("✅ CHANGELOG.md documents v1.0.38 releases and highlights");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.38.md"), "utf-8");
assert(releaseNotes.includes("v1.0.38"), "Release notes document v1.0.38");
assert(releaseNotes.includes("3-Stage 8D Spatial + Slowed & Reverb DSP Engine"), "Release notes detail 3-Stage 8D DSP");
assert(releaseNotes.includes("120Hz Mono Bass Anchor"), "Release notes detail 120Hz bass anchor");
assert(releaseNotes.includes("35ms Pre-Delay"), "Release notes detail 35ms pre-delay");
console.log("✅ RELEASE_NOTES_v1.0.38.md exists and is valid");

// 3. What's New Modal
console.log("\n[3/5] Checking What's New modal updates...");
const whatsNewModal = fs.readFileSync(path.join(root, "src", "components", "shell", "whats-new-modal.tsx"), "utf-8");
assert(whatsNewModal.includes("3-Stage 8D + Slowed &amp; Reverb"), "whats-new-modal.tsx highlights 3-Stage 8D");
assert(whatsNewModal.includes("Slowed &amp; Reverb Studio Upgrade"), "whats-new-modal.tsx highlights Slowed & Reverb upgrade");
assert(whatsNewModal.includes("Universal Downloader Stabilized"), "whats-new-modal.tsx highlights Downloader Stabilized");
console.log("✅ whats-new-modal.tsx contains v1.0.38 feature cards");

// 4. DSP & Filter Engine Invariants
console.log("\n[4/5] Checking DSP presets and filtergraph generators...");
assert(EIGHT_D_SLOWED_REVERB_STUDIO_PRESET, "EIGHT_D_SLOWED_REVERB_STUDIO_PRESET must be exported");
assert(EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET, "EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET must be exported");
assert(SLOWED_REVERB_PRESETS["8d-slowed-reverb-studio"], "8d-slowed-reverb-studio preset must be registered");

const filterArray = build8DSlowedReverbFilter();
const filterGraph = filterArray.join(";");
assert(filterGraph.includes("asetrate=44100*0.87"), "Filtergraph contains asetrate=44100*0.87");
assert(filterGraph.includes("lowpass=f=120"), "Filtergraph contains lowpass=f=120 mono sub-bass");
assert(filterGraph.includes("apulsator=mode=sine:hz=0.12:amount=0.88"), "Filtergraph contains 0.12Hz 88% orbit panner");
assert(filterGraph.includes("adelay=35|35"), "Filtergraph contains adelay=35|35");
assert(filterGraph.includes("highpass=f=140"), "Filtergraph contains highpass=f=140");
assert(filterGraph.includes("volume=-5.5dB"), "Filtergraph contains volume=-5.5dB");
assert(filterGraph.includes("alimiter=limit=0.944"), "Filtergraph contains alimiter=limit=0.944");
console.log("✅ DSP presets and FFmpeg filtergraph verified");

// 5. Package test:ci registration
console.log("\n[5/5] Checking package.json test:ci registration...");
assert(pkgJson.scripts["test:ci"].includes("test-v1-0-38-release.ts"), "package.json test:ci includes test-v1-0-38-release.ts");
console.log("✅ test:ci includes test-v1-0-38-release.ts");

console.log("\n============================================================");
console.log("ALL v1.0.38 RELEASE CHECKS PASSED CLEANLY (100% GREEN)!");
console.log("============================================================");

process.exit(0);
