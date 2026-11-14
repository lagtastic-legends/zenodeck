# ZenoDeck & ZenoTap v1.0.27 Release Notes

**Release Date:** November 14, 2026  
**Version:** `1.0.27` (`versionCode 10027`)  
**Package:** `zenodeck`  
**Git Tag:** `v1.0.27`  

---

## 🌟 Executive Summary

ZenoDeck v1.0.27 delivers a **dedicated mobile-first layout transformation for the Precision M3 Audio Cutter**, complete **100% workstation deck preservation for Cyber Mode**, **web app header audio toggle overflow fixes**, and **dual Cyber & Precision design switching in the Web App**.

---

## 🛠️ Highlights & Core Features

### 1. 📐 Dedicated Precision M3 Mobile Layout for Audio Cutter
* **M3 Segmented Capsule Action Selector**: Replaced the bulky 4-card mode grid with a compact, one-line horizontal segmented capsule (`Trim` / `Cut` / `Mute` / `Fade`) featuring an active sliding indicator and haptic feedback.
* **Hero Waveform Scrubber & Live Horizon**: 64px tactile waveform touch canvas with 28px hit-target thumb pills (`In-Point` in emerald, `Out-Point` in rose, `Playhead` in oceanic cyan) and high-contrast live horizon badges (`IN` ── `SPAN` ── `OUT`).
* **Unified Single-Card Boundary Range Controller**: Merged two separate 300px boxes into a single horizontal card:
  * **Left Wing:** `📍 In-Point` large digital counter, `[0:00]` and `[Playhead]` quick-snaps.
  * **Right Wing:** `🏁 Out-Point` large digital counter, `[Playhead]` and `[Full End]` quick-snaps.
  * **Center Micro-Steppers & Jog Nudge:** Tab-selectable steppers for digit-by-digit time adjustments (`HR : MIN : SEC . MS`), plus a unified micro-nudge bar (`-1s`, `-0.1s`, `+0.1s`, `+1s`).
* **Collapsible Fine-Tuning & Presets Drawer**: Smooth expandable drawer hiding secondary parameters (S-curve Fade In/Out sliders, Volume Boost dB, Zero-Snap, and Range Presets) to eliminate vertical scrolling clutter on mobile phones.
* **Docked Ergonomic Bottom Thumb Bar**: Sticky/docked action bar featuring `Reset Full`, `Loop`, and a prominent `Play Cut` audition CTA directly at one-handed thumb reach.
* **100% Cyber Workstation Preservation**: When `theme === 'cyber'`, the exact original pro-audio workstation layout is preserved pixel-for-pixel with side-by-side consoles and obsidian neon styling.

---

### 2. 🌐 Web App TopBar Audio Feedback Button & Web Design Switching Fixes
* **TopBar Audio Button Text Overflow Resolution (`top-bar.tsx` & `audio-toggle.tsx`)**:
  * Eliminated the rigid desktop width constraint (`w-[34px] sm:w-[38px] p-0`) on the audio toggle button that caused the text `"AUDIO"` to clip and overflow the circular border on desktop web browsers.
  * Sized responsively as a 34px icon circle on mobile (`w-[34px] h-[34px]`) and a full pill on desktop (`sm:w-auto sm:h-8 sm:px-2.5`), matching `ThemeToggle` with zero text clipping.
  * Added `whitespace-nowrap shrink-0` to the audio toggle label text span.
* **Precision Design Switching in Web App (`theme-store.ts`)**:
  * Enabled switching between Cyber Design and Precision Design directly in the web app via `ThemeToggle`, allowing users to test both designs in desktop and mobile web browsers.

---

## 📱 Multi-Architecture APK Builds

All 4 CPU architecture APK variants are compiled, optimized with R8 minification, signed with the release keystore, and available for download:

| Architecture | APK Binary | Direct Download Link | Description |
| :--- | :--- | :--- | :--- |
| **Universal** | `zenodeck-universal.apk` | [zenodeck-universal.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.27/zenodeck-universal.apk) | Universal cross-architecture APK for all Android devices |
| **arm64-v8a** | `zenodeck-v1.0.27-arm64-v8a.apk` | [zenodeck-v1.0.27-arm64-v8a.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.27/zenodeck-v1.0.27-arm64-v8a.apk) | Modern 64-bit flagships & phones (Pixel, Galaxy, OnePlus, Xiaomi) |
| **armeabi-v7a** | `zenodeck-v1.0.27-armeabi-v7a.apk` | [zenodeck-v1.0.27-armeabi-v7a.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.27/zenodeck-v1.0.27-armeabi-v7a.apk) | Legacy & budget 32-bit ARM smartphones |
| **x86_64** | `zenodeck-v1.0.27-x86_64.apk` | [zenodeck-v1.0.27-x86_64.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.27/zenodeck-v1.0.27-x86_64.apk) | Android emulators, ChromeOS laptops, and Intel-based hardware |

---

## 🔬 Automated Verification Matrix

| Verification Suite | Result | Details |
| :--- | :--- | :--- |
| **TypeScript Typecheck** (`npm run typecheck`) | ✅ **0 Errors** | Strict type contract compliance |
| **TopBar Responsive Suite** (`scripts/test-topbar-fetch-and-layouts.ts`) | ✅ **18/18 Passed** | Responsive touch targets and layouts |
| **APK Precision Design Suite** (`scripts/test-apk-precision-design.ts`) | ✅ **7/7 Passed** | Full-pill geometry & token isolation |
| **Audio Cutter Precision Suite** (`scripts/test-audio-cutter-precision.ts`) | ✅ **Passed** | Filter generation and time format verification |
| **Release Regression Suite** (`scripts/test-v1-0-23-release.ts`) | ✅ **Passed** | Anti-deadlock push mechanics and steppers |
| **Full CI 4-Tier Test Suite** (`npm run test:ci`) | ✅ **38/38 Suites (100%)** | All 217 tests across all 4 tiers passed |
