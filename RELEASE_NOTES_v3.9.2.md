# 🚀 ZenoDeck Release Notes — v3.9.2

> **Breakthrough YouTube Stream Resolution & Unthrottled Speed Engine**  
> *Release Date:* October 8, 2026  
> *Commit / Tag:* `v3.9.2`  
> *Architecture:* 100% Client-Side WebAssembly (WASM) + Capacitor 8 Android Shell + Node Serverless

---

## 🌟 Highlights of Release v3.9.2

### 1. ⚡ Hybrid Dual-Client YouTube InnerTube Resolver
- **Modern Official Android Client Integration (`clientVersion: 21.26.364`)**: The resolver now executes parallel requests across both Android and iOS InnerTube endpoints. Android queries successfully return official pre-muxed **`itag 18` (360p MP4)** streams containing `ratebypass=yes` baked directly into signed URLs.
- **Permanent Elimination of 0% Freezes & 403 Forbidden**: Diagnosed that YouTube CDN candidate edge nodes enforce an initial buffer limit (~1.9 MB) on secondary endpoints for iOS adaptive streams without ratebypass, responding with HTTP 403 Forbidden on subsequent byte ranges. With Android's `ratebypass=yes` `itag 18` and unthrottled candidate routing, videos download continuously at 7–10 MB/s without stalls or 403 errors.

### 2. 🏁 Concurrent CDN Edge Node Racing (`Promise.any`)
- **Sub-50ms Candidate Selection**: In `turbo-downloader.ts`, `probeStreamSizeSafe` now races up to 3 candidate CDN edge nodes simultaneously with a 2-second timeout per probe. The fastest responding node is promoted to index 0, automatically bypassing packet-dropping or TLS-stalling nodes in milliseconds.
- **Dynamic 2MB Chunk Partitioning**: Upgraded range chunk sizing to 2MB for unthrottled `ratebypass=yes` streams, cutting HTTP request round-trips in half and drastically reducing Android WebView IPC bridge overhead.

### 3. 🛡️ Resilient Failover & Cloud Diagnostics
- **Serverless Multi-Candidate Failover**: Upgraded `/api/media/download` and `/api/youtube/download` with candidate edge cycling (`buildCandidateUrls`) and friendly HTTP 502 diagnostics instead of raw `spawn python3 ENOENT` 500 errors in serverless environments.
- **Resilient Audio Extraction Fallback**: All 6 audio extraction tiers (320k, 256k, 192k, 128k, M4A, WAV) now seamlessly fall back to the unthrottled stream (`fmt18`) with FFmpeg stream copying/transcoding if adaptive audio streams encounter CDN rate-limiting.
- **Client Watchdog Extension**: Extended direct streaming watchdog to 8 seconds with automatic secondary on-device fallback before tripping server errors.

---

## 🧪 Quality & Verification Matrix

| Test Suite / Gate | Coverage | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Validation** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~6s |
| **End-to-End YouTube Download Test** | 89.5 MB Video Full Download | **PASS (89.5 MB in 12s @ 7.5 MB/s)** | ~12s |
| **End-to-End Audio Download Test** | Resilient Audio Extraction & Fallback | **PASS (100% Complete)** | ~14s |
| **Comprehensive E2E Suite** | Feature, Boundary, Combinations, Scenarios | **138 / 138 (100%)** | ~50ms |
| **Studio-Grade DSP Suite** | All 13 Tools, 8 Reverb Spaces, Fast-Paths | **162 / 162 (100%)** | ~45ms |
| **Audio Effects Engine Tests** | Slowed & Reverb, 8D, UI components | **37 / 37 (100%)** | ~3ms |
| **App Updater & Semver Suite** | Semver comparisons & cache invalidation | **12 / 12 (100%)** | ~12ms |
| **AI Route & CORS Architecture** | Mobile/Web endpoint resolution, CORS | **PASS (100%)** | ~8ms |

---

## 📱 Binary Downloads & Installation

| Platform / Binary | Download Link | Description |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.9.2/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android devices. |
| **⚡ Android ARM64-v8a APK** | [**Download zenodeck-v3.9.2-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.9.2/zenodeck-v3.9.2-arm64-v8a.apk) | Dedicated lightweight build for modern 64-bit ARM phones. |
| **📱 Android ARMv7a APK** | [**Download zenodeck-v3.9.2-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.9.2/zenodeck-v3.9.2-armeabi-v7a.apk) | Dedicated build for legacy 32-bit Android smartphones. |
| **💻 Android x86_64 APK** | [**Download zenodeck-v3.9.2-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.9.2/zenodeck-v3.9.2-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the live web host. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant launch in modern desktop and mobile browsers. Zero installation required. |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.9.2)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.9.2) | Full release notes, raw SHA256 checksums, and source tarballs. |
