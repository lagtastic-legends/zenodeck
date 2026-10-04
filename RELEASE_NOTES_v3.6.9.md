# 🚀 ZenoDeck Release Notes — v3.6.9

**Release Tag:** `v3.6.9`  
**Release Date:** October 4, 2026  
**License:** MIT (100% Free & Open Source)  
**Privacy Guarantee:** 100% On-Device (Zero Cloud Uploads · Zero Server Telemetry)

---

## 🎛️ Headline Features in v3.6.9: Studio Audio Preset Overhaul & 1-Click Interactive Rails

ZenoDeck v3.6.9 delivers a comprehensive, studio-calibrated refinement of audio presets across all 13 modules in the **Unified Audio Studio** and standalone audio workstation tools, paired with new 1-click interactive preset chip rails and expanded 10-preset graphic equalizer curves.

### 1. 🎧 Calibrated Studio Presets Across All 13 DSP Modules
* **3D / 8D Audio (`spatial-8d`)**: Calibrated against true 3D spherical orbit math (\(\sin\theta\) azimuth, \(\cos\theta\) depth attenuation, Haas contralateral reflection):
  * *Natural 360° Orbit (8s)*, *Hypnotic Dream (14s)*, *Fast Binaural Whirl (4s)*, *Subtle Ambient Drift (18s)*, *Max Immersion (6s)*.
* **Auto Panner (`auto-panner`)**: Calibrated to musical subdivisions and rhythmic LFO sweeps:
  * *Lofi Drift (0.15 Hz)*, *Gentle Drift (0.25 Hz)*, *Rhythmic Pulse (0.5 Hz)*, *Fast Tremolo (2.0 Hz)*, *Stereo Strobe (4.0 Hz)*, *Triangle Ping-Pong (1.0 Hz)*.
* **Bass Booster (`bass-booster`)**: Perfectly matched to the 5 progressive tiers with 28Hz subsonic rumble guard and lookahead peak limiter:
  * *Tier 1: Audiophile Warmth (+3.5 dB)*, *Tier 2: Punchy Kick (+6.0 dB)*, *Tier 3: Deep Club (+9.0 dB)*, *Tier 4: Heavy Sub 808 (+12.0 dB)*, *Tier 5: Earthquake Max (+15.0 dB)*.
* **Multi-Band Equalizer (`equalizer`)**: 10 studio curves spanning mastering, broadcast, and production:
  * *Flat Reference*, *Bass Boost*, *Treble Boost*, *Vocal Clarity*, *Rock / Metal*, *Electronic / Club*, *Acoustic Warmth*, *Podcast / Speech*, *Hip-Hop / 808*, *Loudness Smile*.
* **Noise Reducer (`noise-reducer`)**: FFT spectral noise profiling with rumble and hiss conditioning:
  * *Subtle Studio Clean (8 dB)*, *Podcast Vocal Clean (14 dB)*, *Heavy Hiss Kill (22 dB)*, *AC & Fan Hum Removal (16 dB)*, *Subsonic Guard (6 dB)*, *Cassette Tape Restore (18 dB)*.
* **Pitch Shifter (`pitch-shifter`)**: Semitone transposition with exact ratio resample and cascading tempo scaling:
  * *Octave Down (-12)*, *Fifth Down (-7)*, *Deep Voice (-4)*, *Minor 3rd Down (-3)*, *Major 2nd Down (-2)*, *Major 2nd Up (+2)*, *Minor 3rd Up (+3)*, *Nightcore (+4)*, *Fifth Up (+7)*, *Chipmunk (+12)*.
* **Reverb Studio (`reverb`)**: 8 acoustic space models with physical reflection badges:
  * *Bathroom (Tile Acoustic)*, *Small Room (Intimate Studio)*, *Medium Room (Warm Tracking)*, *Large Room (Concert Chamber)*, *Church Hall (Resonant Sanctuary)*, *Cathedral (Cavernous Immersion)*, *Slowed & Reverb (Late Night)*, *8D Spatial Reverb (360° Diffusion)*.
* **Reverse Audio, Stereo Panner, Tempo Changer, Trimmer, Vocal Remover, Volume Changer**: Calibrated for decibel headroom, EBU R128 loudness normalization, and musical subdivisions.

### 2. ⚡ 1-Click Interactive Preset Rails
* **Unified Audio Studio** ([`src/components/audio/UnifiedAudioStudio.tsx`](src/components/audio/UnifiedAudioStudio.tsx)): Added a horizontal quick-preset chip rail directly beneath the active tool header with tactile haptics.
* **Slowed + Reverb** ([`src/components/tools/slowed-reverb.tsx`](src/components/tools/slowed-reverb.tsx)): Added 5 signature chips (*Classic 85%*, *Lofi Chill*, *Late-Night Echo*, *Deep Sludge*, *Subtle Warmth*) with active highlight indicators.
* **Stereo Panner** ([`src/components/tools/stereo-panner.tsx`](src/components/tools/stereo-panner.tsx)): Upgraded to 5 standard pan markers (*Hard Left*, *Soft Left -0.35*, *Center*, *Soft Right +0.35*, *Hard Right*).
* **Ringtone Maker** ([`src/components/tools/ringtone-maker.tsx`](src/components/tools/ringtone-maker.tsx)): Added quick length preset chips (*Alert 5s*, *Classic 20s*, *Standard 30s*, *iOS Max 39s*) with track duration auto-clamping.

---

## 📱 Official Production Binaries & Downloads

Every production binary is compiled directly from source and signed for target architectures:

| Target Platform / Binary | Direct Download Link | Architecture & Scope |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.9/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android phones, tablets, and emulators. |
| **⚡ Android ARM64-v8a APK** | [**Download zenodeck-v3.6.9-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.9/zenodeck-v3.6.9-arm64-v8a.apk) | Dedicated optimized build for modern 64-bit ARM phones (Pixel, Galaxy, OnePlus, Xiaomi). |
| **📱 Android ARMv7a APK** | [**Download zenodeck-v3.6.9-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.9/zenodeck-v3.6.9-armeabi-v7a.apk) | Dedicated build for legacy 32-bit Android phones and budget devices. |
| **💻 Android x86_64 APK** | [**Download zenodeck-v3.6.9-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.9/zenodeck-v3.6.9-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | High-speed direct mirror from the production web deployment. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant access on all modern browsers (Chrome, Safari, Firefox, Edge). |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.6.9)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.6.9) | Complete release packages, checksums, changelogs, and all architecture assets. |

---

## 🧪 Comprehensive Verification & Test Summary

* **Total CI Test Checks:** **181/181 passed cleanly (100% pass rate)**
* **Audio DSP E2E Suite:** 125/125 tests passed across all 4 tiers (`scripts/test-audio-dsp-e2e.ts`)
* **Audio Effects Engine Suite:** 37/37 tests passed (`scripts/test-audio-effects-engine.ts`)
* **M1 Web Audio API DSP Suite:** 120/120 tests passed (`scripts/test-dsp-m1.ts`)
* **App Updater & Semver Suite:** 12/12 tests passed (`scripts/test-updater.ts`)
* **AI Route & CORS Suite:** 7/7 tests passed (`scripts/test-ai-route.ts`)
* **Typecheck:** Clean 0-error run (`tsc --noEmit`)
* **Production Build:** Next.js 16.3.2 standalone webpack build passed in 10.5s
