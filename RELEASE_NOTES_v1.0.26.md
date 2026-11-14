# ZenoDeck & ZenoTap v1.0.26 Release Notes

**Release Date:** November 14, 2026  
**Version:** `1.0.26` (`versionCode 10026`)  
**Package:** `zenodeck`  
**Git Tag:** `v1.0.26`  

---

## 🌟 Executive Summary

ZenoDeck v1.0.26 introduces comprehensive **Downloader Stream Integrity Verification** and an **Incomplete File Shield in the Video Converter**, resolving audio extraction failures and premature download stream truncations across both native Android APK and web platforms.

This release eliminates silent saving of broken/truncated media streams, replaces static stream timeouts with an activity-based watchdog timer for high-definition (1080p / 4K) downloads, hardens binary MP4 atom probing to recognize missing tracks, and shields the Video Converter with human-readable diagnostic messages and UI conversion blocks when incomplete files are imported.

---

## 🛠️ Highlights & Core Features

### 1. 🎨 Dual Cyber & Precision Design Engine & High-Contrast Text Shield (APK & Web)
* **Decoupled Platform Ergonomics from Theme Palettes (`globals.css`)**:
  * Removed `[data-platform="apk"]` from all color palette tokens (`--background`, `--card`, `--foreground`, `.panel-hud`, `.bg-hud-grid`), isolating `data-platform="apk"` strictly to mobile ergonomics (touch target sizing, overscroll prevention, and scrollbar management).
  * Both the iconic **Cyber Dark Design** (pitch-black obsidian with neon/plasma glows) and the new **Precision Engineering Design** (optical-grade light canvas with oceanic cyan accents) are fully supported, beautiful, and switchable on native Android APKs.
* **High-Contrast Typography & Accessibility Shield (`globals.css`)**:
  * Upgraded `--foreground` to `#10181c` (deep charcoal, 16:1 contrast ratio) and `--muted-foreground` to `#2d383d` (deep slate, 7:1 AAA contrast ratio).
  * Remapped hardcoded light text classes (`text-white`, `text-slate-300`, `text-zinc-400`, `text-white/80`) to high-contrast dark text inside `[data-theme="precision"]`, completely eliminating invisible/washed-out text on light backgrounds while preserving white text on primary gradient buttons.
  * Hardened inputs, textareas, and dropdown selects with `#ffffff` backgrounds, `#bfc8ce` borders, and high-contrast `#10181c` text.
* **Dynamic Theme Persistence & Zero-Flicker Hydration (`layout.tsx` & `theme-store.ts`)**:
  * Upgraded pre-hydration script in `layout.tsx` to respect user's saved `omni_theme_preference` across native Android APK sessions instead of forcing light mode.
  * Enabled seamless one-tap switching between Cyber and Precision themes via the TopBar `ThemeToggle`.

---

### 2. 🛡️ Downloader Incomplete Stream Integrity Shield
* **Stream Completeness Enforcement (`downloader.ts`)**:
  * Implemented byte-level stream verification: if `received < total` when a media stream closes, the download is detected as interrupted and throws an explicit error rather than silently saving a broken fragment.
  * Added early payload inspection rejecting HTML/JSON error or service-block pages so error responses are never packaged into media containers.
* **Active-Data Stream Watchdog (`youtube-downloader.tsx`)**:
  * Replaced the rigid 15-second hard timeout with an activity-based watchdog timer that only interrupts a download if 0 bytes are transferred for 30 consecutive seconds, allowing large multi-gigabyte 1080p and 4K media downloads to finish without premature termination.

---

### 3. 🎛️ Video Converter Incomplete File Guard & Probing Hardening
* **Incomplete File Shield (`media-converter.tsx`)**:
  * Detects incomplete or truncated video files ($<512\text{ KB}$ with 0:00 duration).
  * Displays a high-contrast warning banner: `⚠️ Incomplete Video File (X KB) · Please re-download the complete video`.
  * Disables the conversion button with the clear label `INCOMPLETE FILE (RE-DOWNLOAD)`.
* **Accurate Binary & Video Probing (`probe.ts`)**:
  * Small MP4 files ($\le 256\text{ KB}$) lacking a `moov` atom are now recognized as truncated and correctly report `hasAudio: false`.
  * Fallback HTML5 media element probe now resolves `durationSec: 0` and `hasAudio: false` on error or timeout instead of erroneously defaulting to `true`.
* **Human-Readable FFmpeg Diagnostics (`use-media-job.ts`)**:
  * Translated low-level FFmpeg exit codes into human-readable error descriptions for incomplete/truncated files and silent/video-only DASH tracks.

---

## 📱 Multi-Architecture APK Builds

All 4 CPU architecture APK variants were successfully compiled, optimized with R8 minification, signed with the release keystore, and verified:

| Architecture | APK Binary | Size | Target Devices |
| :--- | :--- | :--- | :--- |
| **arm64-v8a** | `app-arm64-v8a-release.apk` | **45.96 MB** | Modern 64-bit flagships & phones (Pixel, Galaxy, OnePlus, Xiaomi) |
| **armeabi-v7a** | `app-armeabi-v7a-release.apk` | **41.34 MB** | Legacy & budget 32-bit ARM smartphones |
| **universal** | `app-universal-release.apk` | **72.94 MB** | Universal cross-architecture APK for sideloading & any device |
| **x86_64** | `app-x86_64-release.apk` | **47.25 MB** | Android emulators, ChromeOS laptops, and Intel-based Android hardware |

---

## 🔬 Automated Verification Matrix

| Verification Suite | Command | Result |
| :--- | :--- | :--- |
| **APK Precision Design Test Suite** | `npx tsx scripts/test-apk-precision-design.ts` | ✅ **7/7 Passed** |
| **Recursive APK Asset Guard Test** | `npx tsx scripts/test-phase1-apk-guard.ts` | ✅ **Passed (0 nested APKs)** |
| **Full E2E Test Suite (4 Tiers)** | `npx tsx scripts/test-e2e-suite.ts` | ✅ **217/217 Passed** |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | ✅ **0 Errors** |
| **Static Mobile Export Build** | `npm run build:mobile` | ✅ **24/24 Pages Passed** |
| **Native Gradle Release Assembly** | `.\gradlew.bat assembleRelease` | ✅ **BUILD SUCCESSFUL (1m 44s)** |
