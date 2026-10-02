# 🚀 ZenoDeck Release Notes — v3.6.7

**Release Tag:** `v3.6.7`  
**Date:** October 2, 2026  
**License:** MIT · 100% Client-Side Privacy  

---

## 🎧 Headline Features in v3.6.7: Advanced Audio Processing Suite

ZenoDeck v3.6.7 introduces the **Advanced Audio Processing Suite**, bringing industry-standard audio transformations powered by `@ffmpeg/ffmpeg` (WASM) directly into your browser and Android devices with zero cloud uploads.

---

### 1. 🌌 The "Slowed & Reverb" Engine
- **Exact Industry-Standard Filter Chain**:
  ```text
  asetrate=44100*0.85,aresample=44100,aecho=0.8:0.9:1000:0.3
  ```
- **Acoustic Transposition**:
  - `asetrate=44100*0.85`: Simultaneously shifts playback tempo and pitch down to 85% (37.485 kHz), delivering the signature late-night vinyl aesthetic.
  - `aresample=44100`: Resamples the audio stream back to the standard 44.1 kHz hardware DAC rate.
  - `aecho=0.8:0.9:1000:0.3`: Applies a 1000ms delay with 0.8 in-gain, 0.9 out-gain, and 0.3 decay for a 100% cavernous room reverb.
- **Utility Export**: [`generateSlowedReverbCommand(inputFile, outputFile)`](src/lib/audio/effects-engine.ts) returns an array of arguments directly executable by `@ffmpeg/ffmpeg`.

---

### 2. 🌀 The "8D Audio" Spatial Engine
- **Exact Industry-Standard Filter Chain**:
  ```text
  apulsator=mode=sine:hz=0.08:amount=0.85,aecho=0.8:0.9:1000:0.3
  ```
- **Binaural Orbital Panning**:
  - `apulsator=mode=sine:hz=0.08:amount=0.85`: Generates a sinusoidal low-frequency oscillator panning audio smoothly between left and right channels on a 12.5-second rotation cycle (0.08 Hz) at 85% depth.
  - `aecho=0.8:0.9:1000:0.3`: Adds room reflection delay creating realistic spatial distance and 360-degree acoustic immersion.
- **Utility Export**: [`generate8DAudioCommand(inputFile, outputFile)`](src/lib/audio/effects-engine.ts) returns the executable FFmpeg argument array.

---

### 3. 🎛️ Dark-Mode Audio Effects Panel (`AudioEffectsPanel.tsx`)
- **Modern Glassmorphic UI**: Styled with Tailwind CSS (`bg-neutral-950/80`, `border-neutral-800/80`, backdrop blur, violet & cyan glowing accents).
- **Primary Buttons**:
  - **Apply Slowed & Reverb**: Features waveform icon, 85% speed badge, and real-time execution feedback.
  - **Convert to 8D Audio**: Features orbital icon, 0.08 Hz sine LFO badge, and real-time execution feedback.
- **Framer Motion Progress**: Smooth dynamic progress bar (`motion.div`) with stage telemetry and percentage counter.
- **Instant Synth Sample Mode**: Built-in 3.5s harmonic A-minor synth audio generator for instant testing without uploading a local file.
- **Audio Preview & Native Saving**: Integrated HTML5 audio playback element and one-click saving via `nativeSave(result.blob, result.name)`.
- **Workstation Integration**: Registered under the `audio-effects` route in `TOOL_REGISTRY` and dynamically code-split in `AppShell`.

---

### 4. 🧪 37-Point Automated Verification Suite
- Comprehensive automated test suite in [`scripts/test-audio-effects-engine.ts`](scripts/test-audio-effects-engine.ts) integrated directly into `npm run test:ci`.
- Validates exact filter chain strings, argument array lengths, CLI string formatting, input validation error handling, and component registration.

---

## 📱 Multi-Architecture Android APKs & Downloads

| Package / Artifact | Direct Download Link | Target Architecture & Description |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.7/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android phones, tablets, and emulators. |
| **⚡ Android ARM64-v8a APK** | [**Download zenodeck-v3.6.7-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.7/zenodeck-v3.6.7-arm64-v8a.apk) | Dedicated optimized build for modern 64-bit ARM phones (Pixel, Galaxy, OnePlus, Xiaomi). |
| **📱 Android ARMv7a APK** | [**Download zenodeck-v3.6.7-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.7/zenodeck-v3.6.7-armeabi-v7a.apk) | Dedicated build for legacy 32-bit Android phones and budget devices. |
| **💻 Android x86_64 APK** | [**Download zenodeck-v3.6.7-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.7/zenodeck-v3.6.7-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web APK** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the web host. |
| **🍏 Apple iOS Profile (iPhone & iPad)** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck to Home Screen in full-screen standalone mode. |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.6.7)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.6.7) | Complete release packages, checksums, changelogs, and all architecture assets. |

---

## 🔒 100% Client-Side Privacy Guarantee

All audio filters and spatialization transformations execute entirely on-device via WebAssembly inside your browser or native Android sandbox:
- **Zero Cloud Uploads**: Your private voice notes, songs, and audio tracks never touch an external server.
- **Zero Telemetry Tracking**: No analytics tracking or behavioral profiling.
- **Zero Internet Requirement**: Functions 100% offline once the WebAssembly engine is cached.
