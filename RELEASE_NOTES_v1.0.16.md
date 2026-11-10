# ZenoDeck & ZenoTap v1.0.16 Release Notes

**Release Date:** November 10, 2026  
**Tag:** `v1.0.16`  
**Target Environments:** Android (APK: Universal, ARM64-v8a, ARMv7a, x86_64), Modern Web Browsers, PWA, iOS (Web Clip)  
**Security & Type Safety:** 100% Strict TypeScript Passing (`tsc --noEmit`), 0 Compiler Errors, Kotlin 2.1.0 (JDK 21)  
**Universal APK Size:** **~72.8 MB** (Includes Chaquopy Python Runtime & WebAssembly Runtimes)

---

## 🚀 Executive Summary

**ZenoDeck & ZenoTap v1.0.16** brings **Continuous Gesture / Glide Typing** and **Multi-Lingual Vocabulary Expansion** to the native Android keyboard (`com.omnitool.app.keyboard.ZenoDeckKeyboardService`), elevating ZenoTap to a top-tier daily driver on Android.

---

## 🌟 Key Upgrades & Highlights

### 1. ✍️ Continuous Gesture / Glide Typing Engine
- **Swipe-to-Type Trajectory Buffer:** Captures continuous swipe gestures across keycaps with an intelligent `22dp` drag threshold that differentiates quick taps from continuous glides.
- **Real-Time Key Centroid Tracing & Haptics:** Calculates bounding box coordinates dynamically for all 26 keycaps during `ACTION_MOVE`, fires micro-haptic ticks on key traversal, and renders a floating `showKeyEcho("~ candidate", 600)` preview over the touch point.
- **Subsequence Scoring & Auto-Commit:** Matches touch trajectories against dictionary entries with anchored start and end characters, length-delta penalties, and user-frequency bonuses. Automatically commits the resolved word followed by a space on `ACTION_UP`.
- **Toggle Control:** Can be enabled or disabled on the fly via `SharedPreferences("zenodeck_keyboard_prefs")` and the web configurator.

### 2. 🌍 Multi-Lingual Vocabulary Dictionaries
- **French (`AZERTY`):** Built-in curated French vocabulary (`bonjour`, `merci`, `salut`, `avec`, `pour`, `dans`, `faire`, `comme`, `mais`, `nous`, `vous`, `monde`, etc.) mapping directly to the AZERTY layout.
- **German (`QWERTZ`):** Built-in curated German vocabulary (`hallo`, `danke`, `bitte`, `nicht`, `haben`, `werden`, `sein`, `kann`, `nach`, `immer`, etc.) mapping directly to the QWERTZ layout.
- **Spanish & English (`QWERTY`):** Combined Spanish (`hola`, `gracias`, `bueno`, `amigo`, `tiempo`, etc.) and core English dictionaries for QWERTY and Dvorak layouts.

### 3. 🌉 Native Capacitor Bridge & Studio Configurator
- **Bridge Extensions:** Implemented `setGestureTyping` and `getGestureTyping` in `ZenoDeckKeyboardBridgePlugin.kt` and exported type-safe TypeScript methods via `src/lib/zenodeck-bridge.ts`.
- **Studio Dashboard Card:** Added a dedicated 4th settings card in `keyboard-deck-manager.tsx` with one-tap toggle controls and real-time ON/OFF state indicators.
- **Interactive Test Sandbox:** Live test input field allowing real-time testing of glide typing, contraction auto-corrections, and spacebar gestures.

### 4. 🧹 Storage Optimization & Footprint Reduction
- Safely purged 48 legacy build `.apk` artifacts (~1.6 GB) and stale build caches, reclaiming **~5.2 GB** of local disk space.
- Optimized workspace footprint to ~2.1 GB while preserving all required test and multimedia assets.

---

## 🧪 Verification & Test Results

- **Glide Typing Test Suite (`scripts/test-v1-0-16-glide-typing.ts`):** 36/36 Passed (100%)
- **CI Test Suite (`npm run test:ci`):** 22/22 Suites Passed (100%)
- **TypeScript Typecheck (`npm run typecheck`):** 0 Errors
- **Mobile Export & Android Build:** Static HTML export and release APK builds succeeded cleanly.

---

## 📦 Distribution Artifacts

- **Universal Release APK:** `android/app/build/outputs/apk/release/app-universal-release.apk` (72.85 MB)
- **ARM64-v8a Release APK:** `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk` (45.87 MB)
- **ARMeabi-v7a Release APK:** `android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk` (41.25 MB)
- **x86_64 Release APK:** `android/app/build/outputs/apk/release/app-x86_64-release.apk` (47.16 MB)
