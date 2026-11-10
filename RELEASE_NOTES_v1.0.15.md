# ZenoDeck & ZenoTap v1.0.15 Release Notes

**Release Date:** November 10, 2026  
**Tag:** `v1.0.15`  
**Target Environments:** Modern Web Browsers, PWA, Android (APK: Universal, ARM64-v8a, ARMv7a, x86_64), iOS (Web Clip)  
**Security & Type Safety:** 100% Strict TypeScript Passing (`tsc --noEmit`), 0 Compiler Errors, Kotlin 2.1.0 (JDK 21)  
**Universal APK Size:** **~72 MB** (Includes Chaquopy Python Runtime & WebAssembly Runtimes)

---

## 📌 Important Versioning Continuity Notice
> [!NOTE]
> **Resolution of Version Labeling Discrepancy:**  
> Previous legacy development documentation and footer strings intermittently referenced a legacy numbering scheme (`v3.15.0` / `v3.16.0`). As of this release, the entire ecosystem is unified under the official production semantic versioning standard: **`v1.0.15`** (Android `versionCode 10015`). All client-facing footers, keyboard studio badges, and application metadata now synchronize dynamically to `APP_VERSION`.

---

## 🚀 Executive Summary

**ZenoDeck & ZenoTap v1.0.15** streamlines the application into a rock-solid, ultra-reliable **100% on-device WebAssembly Media & Document Workstation**:

1. **Decommissioning of Unreliable Downloader Module:**  
   The external media scraper (`youtube-downloader`) has been completely removed from the dashboard, tool registry, and application shell. Users are no longer exposed to intermittent YouTube cipher changes, bot blocks, or remote network socket timeouts.

2. **Refined On-Device WebAssembly Media Engine:**  
   The core media workflow is now focused exclusively on high-performance local processing:
   - **Video Converter (`video-converter`):** Transcode MP4, MOV, AVI, MKV, and extract 320kbps MP3 / WAV / M4A audio.
   - **Video Compressor (`video-compressor`):** Live bitrate, resolution, and CRF controls with immediate before/after preview.
   - **GIF Maker (`gif-maker`):** High-speed frame extraction and looping animated GIF creation.
   - **Video Mute (`video-mute`):** Instant single-pass audio track removal.

3. **20-Module Unified Audio DSP Suite:**  
   Full access to sample-accurate waveform trimming, interactive audio splicing, 5-tier bass boosting, acoustic convolution reverb, modular FX rack, ringtone maker, and binaural 8D spatial sound.

4. **ZenoTap Glacier Native IME Keyboard:**  
   Native Android IME with tactile 3D keycaps, 50% width ergonomic spacebar with horizontal cursor scrubbing, and instant direct-to-chat GIF and sticker vault injection.

5. **Universal Footer & Studio Version Synchronization:**  
   Fixed hardcoded legacy strings in `footer.tsx` and `keyboard-deck-manager.tsx`. Versioning is now 100% centralized via `@/config/version`.

---

## 🌟 Key Upgrades & Highlights

### 1. 🛡️ Streamlined, 100% Local Tool Registry
- Cleaned up the `TOOL_REGISTRY` in `src/lib/tools/registry.ts`, removing defunct external scrapers.
- Updated the App Shell routing: Android `ACTION_SEND` shared intent now seamlessly routes to the on-device **Media Converter** for immediate local transcoding.
- Eliminated all dead-weight fallbacks and obsolete UI banners.

### 2. 🎛️ Studio-Grade Audio & Waveform Processing
- **Audio Trimmer & Cutter:** Sample-accurate waveform preview with interactive start/end range markers.
- **Binaural 8D Audio Engine:** Real-time azimuth panning and Doppler depth simulation.
- **FX Rack Studio:** Dynamic modular chain combining distortion, lowpass filters, chorus, and spatial stereo imaging.
- **Ringtone Maker:** Instant fade-in/fade-out export with direct-to-ringtone publication.

### 3. ⌨️ ZenoTap Glacier IME Deck
- Low-latency native Android Input Method Editor.
- Glassmorphic Frozen Light and Obsidian cyber themes.
- Ergonomic 50% width spacebar with horizontal thumb cursor scrubbing.
- Smart clipboard ribbon with 1-tap vault injection for GIFs and custom stickers.

---

## 📦 Verified Release Artifacts & Checksums

| Package / Binary | Architecture | Format | Status |
| :--- | :--- | :--- | :--- |
| **`app-universal-release.apk`** | All Android Devices (API 24+) | Signed APK (v1 + v2) | **Verified (72.88 MB)** |
| **`app-arm64-v8a-release.apk`** | Modern 64-bit ARM Devices | Signed APK (v1 + v2) | **Verified (45.89 MB)** |
| **`app-armeabi-v7a-release.apk`** | Legacy 32-bit ARM Devices | Signed APK (v1 + v2) | **Verified (41.27 MB)** |
| **`app-x86_64-release.apk`** | Tablets, ChromeOS & Emulators | Signed APK (v1 + v2) | **Verified (47.18 MB)** |

---

## 🧪 Verification Matrix

- **TypeScript Typecheck:** Passed with 0 errors (`tsc --noEmit`).
- **Test Suite:** 217 / 217 tests passed cleanly across all 4 tiers (`npm test`).
- **Static Mobile Export:** 0 nested APK leaks, 0 FFmpeg WASM bundle leaks (`npm run build:mobile`).
- **Android Gradle Assembly:** Release APK compiled and verified (`assembleRelease`).
