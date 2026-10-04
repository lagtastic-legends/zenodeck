# 🚀 ZenoDeck Release Notes — v3.7.0

> **Unified Audio Studio Presets Overhaul, Mobile Dark-Mode Fix & Full-Suite Active State Indicators**  
> *Release Date:* October 4, 2026  
> *Commit / Tag:* `v3.7.0`  
> *Architecture:* 100% Client-Side WebAssembly (WASM) + Web Audio API + Capacitor 8 Android Shell

---

## 🌟 Highlights of Release v3.7.0

### 1. 📱 Elimination of Android WebView Dark-Mode Preset Bug
- **The Issue**: On Android WebViews and mobile dark theme, the native HTML `<select>` element rendered system option dialogs with black text on black background (`#000000` text on `#121212` background), making presets unreadable.
- **The Solution**: Replaced native `<select>` in `UnifiedAudioStudio.tsx` with a custom high-contrast, dark-glassmorphic Popover Menu (`bg-zinc-950/98`, `border-white/15`, `backdrop-blur-2xl`) featuring crisp, high-contrast typography (`text-zinc-200`, `text-white`).

### 2. 🎛️ Dynamic Active Preset Tracking & 1-Click Reset
- **Intelligent Parameter Matching**: Deep inspection across all 13 DSP modules in `AUDIO_TOOLS_CATALOG` (`equalizer`, `bass-booster`, `spatial-8d`, `slowed-reverb`, `pitch-shifter`, `reverb`, `auto-panner`, `volume-changer`, etc.) using floating-point tolerance (`Math.abs(v - currentVal) < 0.01`).
- **Dynamic Header Label**: The preset button updates in real time from `"Load Preset..."` to the active preset name (e.g. `"Sub Kick (45 Hz)"`, `"Concert Hall"`).
- **Tactile Factory Reset**: Added a dedicated 1-click "Reset to Factory Defaults" action with `RotateCcw` icon.

### 3. ✨ Visual Checkmarks & Glowing Rings Across All Tools
- **Unified Audio Studio Quick Rail**: Glowing neon/primary ring with a leading `Check` icon (`size-2.5 stroke-[2.5]`) on the currently active preset.
- **Sub-Module Model Selectors**:
  - **Bass Booster Tiers**: Active tier card with fuchsia glowing ring and `Check` badge.
  - **Reverb Acoustic Spaces**: Active space model card with cyan glowing ring and `Check` badge.
  - **Vocal Remover Modes**: Active phase cancellation mode card with `Check` badge.
- **Standalone Audio Tools Enhanced**:
  - `equalizer-tool.tsx`: 6-band multi-frequency active state matching with checkmark and glowing ring.
  - `spatial-8d.tsx`: Active cyan glowing ring with checkmark.
  - `slowed-reverb.tsx`: Active acoustic preset chips with checkmark and glowing ring.
  - `stereo-panner.tsx`: 5 soundstage balance markers with active checkmark and glow.
  - `ringtone-maker.tsx`: Length presets (`Alert`, `Classic`, `Standard`, `iOS Max`) with active checkmark and glow.
  - `volume-changer.tsx`: Gain staging chips with active checkmark and glow.
  - `dsp-studio-panel.tsx`: 10-band DSP master preset chips rail with active checkmark.
  - `gif-maker.tsx`: Time range presets (`Full`, `First 5s`, `Last 5s`) with active checkmark.
  - `studio-recorder.tsx`: Screen quality and FPS dropdown options styled explicitly with `bg-zinc-900 text-zinc-100` for mobile WebViews.

---

## 🧪 Quality & Verification Matrix

| Test Suite / Gate | Coverage | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Validation** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~8s |
| **M1 DSP Audio Engine Suite** | EQ, Bass, 8D, Limiter, Bypass, Presets | **120 / 120 (100%)** | ~28ms |
| **M3 Native IPC & Save Chunker** | Android Binder safety (<= 700KB) | **18 / 18 (100%)** | ~14ms |
| **Audio Effects Engine Tests** | Slowed & Reverb, 8D, UI components | **37 / 37 (100%)** | ~3ms |
| **Comprehensive 4-Tier E2E** | Feature, Boundary, Combinations, Scenarios | **125 / 125 (100%)** | ~48ms |
| **App Updater & Semver Suite** | Semver comparisons & cache invalidation | **12 / 12 (100%)** | ~12ms |
| **AI Route & CORS Architecture** | Mobile/Web endpoint resolution, CORS | **PASS (100%)** | ~8ms |
| **Next.js Production Build** | Webpack 5, Static Generation (12/12) | **PASS** | 15.3s |

---

## 📱 Binary Downloads & Installation

| Platform / Binary | Download Link | Description |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.7.0/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android devices. |
| **⚡ Android ARM64-v8a APK** | [**Download zenodeck-v3.7.0-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.7.0/zenodeck-v3.7.0-arm64-v8a.apk) | Dedicated lightweight build for modern 64-bit ARM phones. |
| **📱 Android ARMv7a APK** | [**Download zenodeck-v3.7.0-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.7.0/zenodeck-v3.7.0-armeabi-v7a.apk) | Dedicated lightweight build for legacy 32-bit Android phones. |
| **💻 Android x86_64 APK** | [**Download zenodeck-v3.7.0-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.7.0/zenodeck-v3.7.0-x86_64.apk) | Dedicated build for tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Fast direct download mirrored from the live web host. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile for full-screen iOS usage. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant in-browser launch with zero install. |
