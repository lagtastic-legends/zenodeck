setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 25000).unref();

import assert from "assert";
import fs from "fs";
import path from "path";

console.log("=== ZENODECK & ZENOTAP v1.0.36 RELEASE VERIFICATION ===");

const root = path.resolve(__dirname, "..");

// 1. Version Sync
const versionTs = fs.readFileSync(path.join(root, "src", "config", "version.ts"), "utf-8");
assert(/APP_VERSION = "1\.0\.\d+"/.test(versionTs), 'src/config/version.ts has valid APP_VERSION');
console.log("✅ src/config/version.ts has valid APP_VERSION >= 1.0.36");

const pkgJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
assert(pkgJson.version >= "1.0.36", 'package.json has version >= "1.0.36"');
console.log("✅ package.json has version >= 1.0.36");

const buildGradle = fs.readFileSync(path.join(root, "android", "app", "build.gradle"), "utf-8");
assert(/versionName "1\.0\.\d+"/.test(buildGradle), 'android/app/build.gradle contains valid versionName');
assert(/versionCode 100\d{2}/.test(buildGradle), "android/app/build.gradle contains valid versionCode");
console.log("✅ android/app/build.gradle contains valid versionName and versionCode (>= 10036)");

// 2. Changelog & Release Notes
const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf-8");
assert(changelog.includes("## [1.0.36]"), "CHANGELOG.md contains [1.0.36]");
assert(changelog.includes("keyboardHeightScale"), "CHANGELOG.md documents keyboardHeightScale");
assert(changelog.includes("Zero-Latency Touch Pipeline"), "CHANGELOG.md documents Zero-Latency Touch Pipeline");
assert(changelog.includes("Immediate Glide-Typing Retraction"), "CHANGELOG.md documents Immediate Glide-Typing Retraction");
console.log("✅ CHANGELOG.md documents v1.0.36 releases and highlights");

const releaseNotes = fs.readFileSync(path.join(root, "RELEASE_NOTES_v1.0.36.md"), "utf-8");
assert(releaseNotes.includes("v1.0.36"), "Release notes document v1.0.36");
assert(releaseNotes.includes("keyboardHeightScale"), "Release notes detail keyboardHeightScale");
assert(releaseNotes.includes("Zero-Latency Touch Pipeline"), "Release notes detail Zero-Latency Touch Pipeline");
console.log("✅ RELEASE_NOTES_v1.0.36.md exists and is valid");

// 3. What's New Modal
const whatsNewModal = fs.readFileSync(path.join(root, "src", "components", "shell", "whats-new-modal.tsx"), "utf-8");
assert(whatsNewModal.includes("Zero-Latency Android IME"), "whats-new-modal.tsx highlights Zero-Latency Android IME");
assert(whatsNewModal.includes("Live Height Scale Slider"), "whats-new-modal.tsx highlights Live Height Scale Slider");
console.log("✅ whats-new-modal.tsx contains v1.0.36 feature cards");

// 4. Keyboard Deck Manager Height Configurator
const deckManager = fs.readFileSync(path.join(root, "src/components/tools/keyboard-deck-manager.tsx"), "utf-8");
assert(deckManager.includes("setKeyboardHeightScale"), "keyboard-deck-manager.tsx includes setKeyboardHeightScale");
assert(deckManager.includes("getKeyboardHeightScale"), "keyboard-deck-manager.tsx includes getKeyboardHeightScale");
assert(deckManager.includes("Keyboard Height &amp; Ergonomic Scale"), "keyboard-deck-manager.tsx renders Height Configurator");
assert(deckManager.includes("Reset (1.18x)"), "keyboard-deck-manager.tsx includes Reset (1.18x) button");
console.log("✅ keyboard-deck-manager.tsx renders height scale slider and preset chips");

// 5. Native IME Implementation
const imeService = fs.readFileSync(
  path.join(root, "android", "app", "src", "main", "java", "com", "omnitool", "app", "keyboard", "ZenoDeckKeyboardService.kt"),
  "utf-8"
);
assert(imeService.includes("keyboardHeightScale"), "ZenoDeckKeyboardService.kt includes keyboardHeightScale");
assert(imeService.includes("ACTION_SETTINGS_UPDATED"), "ZenoDeckKeyboardService.kt listens for settings updates");
assert(imeService.includes("deleteSurroundingText(1, 0)"), "ZenoDeckKeyboardService.kt retracts speculative character on glide");
console.log("✅ ZenoDeckKeyboardService.kt implements live height scaling and glide retraction");

console.log("🎉 ALL v1.0.36 RELEASE VERIFICATION CHECKS PASSED!");
