setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 20000).unref();

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SLOWED_REVERB_STUDIO_PRESET,
  EIGHT_D_SLOWED_REVERB_STUDIO_PRESET,
  EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET,
} from "../src/lib/audio/fx-rack-engine";
import { build8DSlowedReverbFilter, getAudioFilterGraph } from "../src/lib/audio-dsp";

console.log("=== ZENODECK & ZENOTAP v1.0.39 RELEASE & UI OVERHAUL VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Synchronization
console.log("\n[1/5] Checking v1.0.39+ version synchronization...");
const versionTs = fs.readFileSync(path.join(root, "src/config/version.ts"), "utf-8");
assert(/APP_VERSION = "1\.0\.(39|[4-9]\d|\d{3,})"/.test(versionTs), 'src/config/version.ts APP_VERSION >= "1.0.39"');

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert(/^1\.0\.(39|[4-9]\d|\d{3,})$/.test(pkgJson.version), 'package.json version >= "1.0.39"');
assert(pkgJson.scripts["test:ci"].includes("test-v1-0-39-release.ts"), "package.json test:ci includes test-v1-0-39-release.ts");

const gradle = fs.readFileSync(path.join(root, "android/app/build.gradle"), "utf-8");
assert(/versionName "1\.0\.(39|[4-9]\d|\d{3,})"/.test(gradle), 'build.gradle versionName >= "1.0.39"');
assert(/versionCode (10039|100[4-9]\d|10\d{3,})/.test(gradle), "build.gradle versionCode >= 10039");

const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.39] — 2026-11-26"), "CHANGELOG.md documents [1.0.39]");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.39.md"), "utf-8");
assert(releaseNotes.includes("v1.0.39") && releaseNotes.includes("10039"), "RELEASE_NOTES_v1.0.39.md valid");

const readme = fs.readFileSync(path.join(root, "README.md"), "utf-8");
assert(readme.includes("v1.0.39"), "README.md highlights v1.0.39");

const whatsNew = fs.readFileSync(path.join(root, "src/components/shell/whats-new-modal.tsx"), "utf-8");
assert(whatsNew.includes("UI Contrast &amp; Toggle Pill Overhaul"), "whats-new-modal.tsx includes v1.0.39 card");
console.log("✅ Version parity, changelog, README & What's New verified.");

// 2. Phase 1 Global CSS & Shell Subtitle Shields
console.log("\n[2/5] Checking Phase 1 globals.css & subtitle shields...");
const globalsCss = fs.readFileSync(path.join(root, "src/app/globals.css"), "utf-8");
assert(
  globalsCss.includes(':not([role="switch"]):not([data-slot="switch"])'),
  "globals.css excludes switch toggles from APK 44px button min-height"
);
assert(
  globalsCss.includes('[class*="bg-black"]') && globalsCss.includes(".text-muted-foreground:not("),
  "globals.css protects muted text inside permanently dark containers under Precision theme"
);
console.log("✅ Global CSS toggle & dark-surface shields verified.");

// 3. Phase 2 Cross-Tool Contrast & Horizontal Switch Layouts
console.log("\n[3/5] Checking Phase 2 UI fixes across tools...");
const kbDeck = fs.readFileSync(path.join(root, "src/components/tools/keyboard-deck-manager.tsx"), "utf-8");
assert(!kbDeck.includes("Native IME v1.0.15"), "keyboard-deck-manager.tsx no longer hardcodes v1.0.15");
assert(!kbDeck.includes(">\n                    v1.0.37"), "keyboard-deck-manager.tsx no longer hardcodes v1.0.37 badge");
assert(kbDeck.includes('role="switch"') && kbDeck.includes("inline-flex h-6 w-11 shrink-0"), "keyboard-deck-manager.tsx toggles use h-6 w-11 shrink-0");
assert(kbDeck.includes("!bg-[#090D0C]/90 !text-[#F7E7CE]"), "keyboard-deck-manager.tsx sandbox/inputs enforce dark contrast");

const ytDownloader = fs.readFileSync(path.join(root, "src/components/tools/youtube-downloader.tsx"), "utf-8");
assert(!ytDownloader.includes("size-3.5 shrink-0 text-[#F7E7CE]"), "youtube-downloader.tsx icons inherit inactive/active button colors");

const studioRecorder = fs.readFileSync(path.join(root, "src/components/tools/studio-recorder.tsx"), "utf-8");
assert(studioRecorder.includes("native screen recording ready") && !studioRecorder.includes('text-muted-foreground">\r\n                        native screen recording ready'), "studio-recorder.tsx native ready text brightened");

const eqTool = fs.readFileSync(path.join(root, "src/components/tools/equalizer-tool.tsx"), "utf-8");
assert(eqTool.includes("overflow-x-auto no-scrollbar py-1 pr-3 scroll-smooth"), "equalizer-tool.tsx preset rail scrolls smoothly");
console.log("✅ Phase 2 cross-tool UI contrast & toggle checks passed.");

// 4. Phase 3 DSP Parity & HF Damping Safety Floor
console.log("\n[4/5] Checking Phase 3 8D + Slowed & Reverb DSP safety...");
assert.equal(SLOWED_REVERB_STUDIO_PRESET.modules[1].params.preDelayMs, 35);
assert.equal(EIGHT_D_SLOWED_REVERB_STUDIO_PRESET.modules[0].params.tempo, 0.87);
assert.equal(EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET.modules[0].params.tempo, 0.84);

const graph = build8DSlowedReverbFilter().join(";");
assert(graph.includes("asetrate=44100*0.87"), "8D+Slowed Stage 1 tempo filter exact");
assert(graph.includes("lowpass=f=120"), "8D+Slowed Stage 2 120Hz mono sub-bass anchor exact");
assert(graph.includes("apulsator=mode=sine:hz=0.12:amount=0.88"), "8D+Slowed Stage 2 orbit exact");
assert(graph.includes("adelay=35|35") && graph.includes("lowpass=f=4800") && graph.includes("volume=-5.5dB"), "8D+Slowed Stage 3 reverb exact");

// Edge case: 100% HF damping never emits negative lowpass cutoff
const maxDamp = build8DSlowedReverbFilter({ hfDamping: 100 }).join(";");
assert(!maxDamp.includes("lowpass=f=-"), "hfDamping=100% never produces negative lowpass cutoff");
const maxDampSingle = getAudioFilterGraph("slowed-reverb", { speed: 0.87, hfDamping: 100 }).join(";");
assert(!maxDampSingle.includes("lowpass=f=-"), "slowed-reverb hfDamping=100% never produces negative lowpass cutoff");
console.log("✅ Phase 3 DSP parity & HF damping floor verified.");

// 5. Android Build Hygiene (no APKs in public/, no unescaped ?/@ in XML)
console.log("\n[5/5] Checking Android build invariants...");
function hasApkInDir(dir: string): boolean {
  if (!fs.existsSync(dir)) return false;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && hasApkInDir(full)) return true;
    if (entry.isFile() && /\.(apk|aab)$/i.test(entry.name)) return true;
  }
  return false;
}
assert(!hasApkInDir(path.join(root, "public")), "public/ contains zero leaked .apk/.aab binaries");

const layoutDir = path.join(root, "android/app/src/main/res/layout");
if (fs.existsSync(layoutDir)) {
  for (const file of fs.readdirSync(layoutDir)) {
    if (!file.endsWith(".xml")) continue;
    const xml = fs.readFileSync(path.join(layoutDir, file), "utf-8");
    const badText = xml.match(/android:text="([?@][^"]*)"/g) || [];
    const realBad = badText.filter((m) => !m.startsWith('android:text="@string/') && !m.startsWith('android:text="@android:') && !m.startsWith('android:text="\\') && !m.startsWith('android:text="?attr/'));
    assert.equal(realBad.length, 0, `${file} has zero unescaped leading ?/@ literals in android:text`);
  }
}
console.log("✅ Android build hygiene verified.");

console.log("\n🎉 ALL v1.0.39 RELEASE & UI AUDIT CHECKS PASSED (100% GREEN)!");
process.exit(0);
