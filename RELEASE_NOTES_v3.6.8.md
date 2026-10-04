# 🚀 ZenoDeck Release Notes — v3.6.8

**Release Tag:** `v3.6.8`  
**Release Date:** October 4, 2026  
**License:** MIT (100% Free & Open Source)  
**Privacy Guarantee:** 100% On-Device (Zero Cloud Uploads · Zero Server Telemetry)

---

## 🎧 Headline Features in v3.6.8: Spherical 8D Audio Spatialization & Contralateral Room Acoustics

ZenoDeck v3.6.8 brings an acoustic breakthrough to the **Audio DSP Studio** and **Audio Effects Suite**, upgrading the 8D audio engine from flat 1D lateral panning to full **3D Spherical Binaural Spatialization** with physical room acoustic modeling.

### 1. 🌐 True 3D Spherical Orbit & Front/Back Distance Attenuation
* **Azimuth Rotation (\(X\)):** Continuous sinusoidal panning \(\sin(\theta) \times \text{intensity}\) spanning \([-1.0, +1.0]\).
* **Depth Perception (\(Y\)):** Derived from \(\cos(\theta)\) to differentiate line-of-sight in front (\(+1.0\)) from orbital passage behind the listener's skull (\(-1.0\)).
* **Distance Attenuation:** Direct path gain dynamically attenuates by \(\approx -1.5\text{ dB}\) to \(-2.0\text{ dB}\) when sound orbits behind the head:
  $$\text{directGain} = 1.0 - 0.10 \times (1.0 - \cos\theta) \times \text{intensity}$$
  This solves intracranial lateralization, delivering authentic depth and distance perception on headphones.

### 2. 🏛️ Contralateral Haas Early Room Reflections
* **Physical Wall Bounce:** When direct audio pans to one side (e.g. Right), the earliest room reflection bounces off the opposing wall and reaches the contralateral ear (Left).
* **Contralateral Reflection Panner:** A dedicated secondary stereo panner directs the 22ms low-pass damped (4,500 Hz) Haas delay line to the opposite stereo hemisphere (\(\text{reflPanX} = -\text{panX} \times 0.5\)).
* **Dynamic Rear-Hemisphere Diffusion:** As the direct path dips behind the listener, Haas room reflection gain automatically elevates by \(+30\%\) to \(+60\%\), conveying authentic room acoustics.

### 3. 🎚️ Calibrated 8D Profiles in UI
The standalone **8D Spatial Audio Workbench** ([`src/components/tools/spatial-8d.tsx`](src/components/tools/spatial-8d.tsx)) now features 1-click calibrated acoustic rotation profiles:
* **Natural 360°:** 8s cycle · 90% intensity — balanced circular orbit around the skull.
* **Slow Orbit:** 12s cycle · 85% intensity — relaxed, wide ambient drift.
* **Hypnotic Dream:** 16s cycle · 95% intensity — deep, slow immersive meditation sweep.
* **Fast Whirl:** 5s cycle · 80% intensity — high-energy dynamic rotation for dance & EDM.

### 4. 📊 Real-Time Diagnostic Telemetry & Headroom Safety
* **Telemetry Inspection:** Added `getSpatialDiagnostics()` exposing real-time pan, direct gain, pinna cutoff frequency, Haas reflection gain, and reflection pan for testing and visualizers.
* **Summing Headroom Protection:** Balanced direct and reflection node cascades prevent constructive digital clipping past 0 dBFS.
* **De-Zippering Ramps:** All parameters utilize `setTargetAtTime` with 25ms–30ms exponential time constants for zipper-free modulation.
* **Transparent Neutral Reset:** Disabling 8D audio smoothly restores direct gain to unity (`1.0`), panners to center (`0.0`), pinna filter to `20,000 Hz`, and mutes reflection gain (`0.0`).

---

## 📱 Official Production Binaries & Downloads

Every production binary is compiled directly from source and signed for target architectures:

| Target Platform / Binary | Direct Download Link | Architecture & Scope |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.8/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android phones, tablets, and emulators. |
| **⚡ Android ARM64-v8a APK** | [**Download zenodeck-v3.6.8-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.8/zenodeck-v3.6.8-arm64-v8a.apk) | Dedicated optimized build for modern 64-bit ARM phones (Pixel, Galaxy, OnePlus, Xiaomi). |
| **📱 Android ARMv7a APK** | [**Download zenodeck-v3.6.8-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.8/zenodeck-v3.6.8-armeabi-v7a.apk) | Dedicated build for legacy 32-bit Android phones and budget devices. |
| **💻 Android x86_64 APK** | [**Download zenodeck-v3.6.8-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.8/zenodeck-v3.6.8-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | High-speed direct mirror from the production web deployment. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant access on all modern browsers (Chrome, Safari, Firefox, Edge). |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.6.8)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.6.8) | Complete release packages, checksums, changelogs, and all architecture assets. |

---

## 🧪 Comprehensive Verification & Test Summary

* **M1 Web Audio API DSP Suite:** 120/120 tests passed (`scripts/test-dsp-m1.ts`)
* **Audio DSP E2E Suite:** 125/125 tests passed across all 4 tiers (`scripts/test-audio-dsp-e2e.ts`)
* **Audio Effects Engine Suite:** 37/37 tests passed (`scripts/test-audio-effects-engine.ts`)
* **Full CI Suite:** 167/167 tests passed (`npm run test:ci`)
* **Typecheck:** Clean 0-error run (`tsc --noEmit`)
* **Production Build:** Next.js 16.3.2 standalone webpack build passed in 10.4s
