# 🚀 ZenoDeck Release Notes — v3.8.0

> **Studio-Grade Audio DSP Suite & High-Speed Processing Engine**  
> *Release Date:* October 4, 2026  
> *Commit / Tag:* `v3.8.0`  
> *Architecture:* 100% Client-Side WebAssembly (WASM) + Web Audio API + Capacitor 8 Android Shell

---

## 🌟 Highlights of Release v3.8.0

### 1. 🎚️ Studio-Grade Sound Quality Across All 13 Audio Tools
- **Reverb Studio (8 Acoustic Spaces)**: Overhauled all 8 acoustic space models (`bathroom`, `small-room`, `medium-room`, `large-room`, `church-hall`, `cathedral`, `slowed-reverb`, `spatial-8d-reverb`) from harsh comb-filtering taps to multi-stage diffused reflection networks with HF air absorption damping (`treble=g=-2:f=6000`), low-end rumble protection, and a `-0.18 dBFS` true-peak limiter (`alimiter=limit=0.98`).
- **Vocal Remover Phase & Volume Fix**: Fixed the `amix` volume drop by adding `:normalize=0` to eliminate the $-6\text{ dB}$ volume halving bug in bass-preserved mode. Applied steep 2-pole Butterworth crossover filters (`highpass=f=${cutoff}:p=2` / `lowpass=f=${cutoff}:p=2`) to eliminate phase ripple around the crossover.
- **Volume Changer Anti-Clipping Protection**: Added a broadcast lookahead true-peak limiter (`alimiter=limit=0.98`) on positive dB gain boosts to eliminate digital clipping distortion. Enhanced normalization with `dynaudnorm=m=10.0`.
- **Bass Booster Studio Dynamics**: Tuned limiter attack and release to 5ms/80ms with 28Hz 2-pole subsonic rumble protection. In the Web Audio engine, tuned dynamics to a 3ms transient catch, 60ms transparent release, and 10dB soft-knee saturation curve to prevent wideband pumping.
- **8D Spatial Audio 60/120Hz Smooth Orbit**: Replaced the 40Hz `setInterval` timer in Web Audio with `requestAnimationFrame`, providing microsecond-accurate 60/120Hz smooth orbital motion without main-thread jitter or background tab clamping.
- **Audio Trimmer S-Curve Transitions**: Upgraded fade-in and fade-out curves to studio S-curves (`curve=esin`) for click-free acoustic transitions.

### 2. ⚡ High-Speed Processing & Zero-Copy Fast-Paths
- **Volume Changer Fast-Path**: Returns `[]` when `gainDb === 0` and unnormalized, skipping filter processing completely.
- **Stereo Panner Fast-Path**: Returns `[]` when centered (`balance === 0.0`), skipping `stereotools` processing.
- **Tempo Changer Fast-Path**: Returns `[]` when speed is 1.0x, bypassing `atempo` processing.
- **Equalizer Optimization**: Skips 0dB bands, reducing internal FFmpeg filter context switches.

---

## 🧪 Quality & Verification Matrix

| Test Suite / Gate | Coverage | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Validation** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~8s |
| **Studio-Grade DSP Suite** | All 13 Tools, 8 Reverb Spaces, Fast-Paths | **162 / 162 (100%)** | ~45ms |
| **M1 DSP Audio Engine Suite** | EQ, Bass, 8D, Limiter, Bypass, Presets | **120 / 120 (100%)** | ~28ms |
| **M3 Native IPC & Save Chunker** | Android Binder safety (<= 700KB) | **18 / 18 (100%)** | ~14ms |
| **Audio Effects Engine Tests** | Slowed & Reverb, 8D, UI components | **37 / 37 (100%)** | ~3ms |
| **Comprehensive 4-Tier E2E** | Feature, Boundary, Combinations, Scenarios | **125 / 125 (100%)** | ~48ms |
| **App Updater & Semver Suite** | Semver comparisons & cache invalidation | **12 / 12 (100%)** | ~12ms |
| **AI Route & CORS Architecture** | Mobile/Web endpoint resolution, CORS | **PASS (100%)** | ~8ms |
| **Next.js Production Build** | Webpack 5, Static Generation (12/12) | **PASS** | 9.9s |

---

## 📱 Binary Downloads & Installation

| Platform / Binary | Download Link | Description |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.8.0/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android devices. |
| **⚡ Android ARM64-v8a APK** | [**Download zenodeck-v3.8.0-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.8.0/zenodeck-v3.8.0-arm64-v8a.apk) | Dedicated lightweight build for modern 64-bit ARM phones. |
| **📱 Android ARMv7a APK** | [**Download zenodeck-v3.8.0-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.8.0/zenodeck-v3.8.0-armeabi-v7a.apk) | Dedicated build for legacy 32-bit Android smartphones. |
| **💻 Android x86_64 APK** | [**Download zenodeck-v3.8.0-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.8.0/zenodeck-v3.8.0-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the live web host. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant launch in modern desktop and mobile browsers. Zero installation required. |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.8.0)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.8.0) | Full release notes, raw SHA256 checksums, and source tarballs. |
