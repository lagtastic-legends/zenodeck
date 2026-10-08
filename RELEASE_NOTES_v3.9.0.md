# 🚀 ZenoDeck Release Notes — v3.9.0

> **Universal Media Downloader (yt-dlp) & Zero-Latency Sensory Feedback Engine**  
> *Release Date:* October 8, 2026  
> *Commit / Tag:* `v3.9.0`  
> *Architecture:* 100% Client-Side WebAssembly (WASM) + Web Audio API + Capacitor 8 Android Shell

---

## 🌟 Highlights of Release v3.9.0

### 1. 🎥 Universal Media Downloader Powered by `yt-dlp`
- **1,700+ Supported Platforms**: Integrated the `yt-dlp` Python module engine to power downloads for YouTube (4K 60FPS, 2K, 1080p, 720p, 360p, audio) as well as TikTok (watermark-free), Instagram Reels/Posts, X/Twitter, Reddit (with native audio-video muxing), Facebook, Vimeo, Twitch, Pinterest, Threads, and Bluesky.
- **Vertical Video Detection & Normalization**: Automatically detects portrait aspect ratios (1080x1920) on TikTok, Instagram Reels, and YouTube Shorts and badges them as 1080P Full HD rather than 2K.
- **6 Studio Audio Extraction Tiers**: Studio Master (320 kbps MP3), High Fidelity (256 kbps AAC), High Quality (192 kbps MP3), Standard (128 kbps MP3), Native AAC, and Lossless Studio Audio (WAV PCM).
- **Streaming & Server-Side APIs**: Created `/api/media/download` and `/api/youtube/download` streaming endpoints with automated temp file unlinking, verified social media CDN hosts, and multi-worker acceleration.
- **Process Bridge & Security**: Implemented `src/lib/media/python-engine.ts` utilizing `execFile` with input sanitization and Windows socket timeout defenses.

### 2. 🔊 Zero-Latency Sensory Feedback Engine (`useSensoryFeedback`)
- **AudioContext Provider (`SensoryProvider.tsx`)**: High-performance AudioContext lifecycle manager that unlocks on the first user interaction to bypass browser autoplay policies. Preloads and decodes `.wav` files into in-memory buffers with procedural PCM synthesis fallbacks.
- **Exact Millisecond Haptic Matrix (`haptic-patterns.ts`)**: Strict tactile vibration arrays: `lightTap: [10]`, `toggleOn: [15, 30, 15]`, `toggleOff: [10, 40, 10]`, `success: [30, 60, 50]`, and `error: [20, 20, 20, 20, 20, 20]`, with silent degradation on unsupported devices and native Capacitor Haptics support.
- **Unified Custom Hook (`useSensoryFeedback.ts`)**: Synchronized simultaneous audio-tactile dispatching: `triggerTap()`, `triggerToggle(state)`, `triggerProcessStart()`, `triggerSuccess()`, `triggerError()`.
- **Component Integration (`FfmpegConvertButton.tsx`)**: Interactive Framer Motion button demonstrating mechanical hover taps, processing charging hums, and completion fanfares.

---

## 🧪 Quality & Verification Matrix

| Test Suite / Gate | Coverage | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Validation** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~8s |
| **Universal Downloader Tests** | 15 Platforms & yt-dlp metadata | **15 / 15 (100%)** | ~9s |
| **Sensory Feedback Tests** | Vibration arrays & silent degradation | **PASS (100%)** | ~3s |
| **Comprehensive E2E Suite** | Feature, Boundary, Combinations, Scenarios | **138 / 138 (100%)** | ~50ms |
| **Studio-Grade DSP Suite** | All 13 Tools, 8 Reverb Spaces, Fast-Paths | **162 / 162 (100%)** | ~45ms |
| **Audio Effects Engine Tests** | Slowed & Reverb, 8D, UI components | **37 / 37 (100%)** | ~3ms |
| **App Updater & Semver Suite** | Semver comparisons & cache invalidation | **12 / 12 (100%)** | ~12ms |
| **AI Route & CORS Architecture** | Mobile/Web endpoint resolution, CORS | **PASS (100%)** | ~8ms |
| **Mobile Static Export Build** | Next.js 16.3.2 `MOBILE_EXPORT=1` (23/23 pages) | **PASS** | ~12s |

---

## 📱 Binary Downloads & Installation

| Platform / Binary | Download Link | Description |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.9.0/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android devices. |
| **⚡ Android ARM64-v8a APK** | [**Download zenodeck-v3.9.0-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.9.0/zenodeck-v3.9.0-arm64-v8a.apk) | Dedicated lightweight build for modern 64-bit ARM phones. |
| **📱 Android ARMv7a APK** | [**Download zenodeck-v3.9.0-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.9.0/zenodeck-v3.9.0-armeabi-v7a.apk) | Dedicated build for legacy 32-bit Android smartphones. |
| **💻 Android x86_64 APK** | [**Download zenodeck-v3.9.0-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.9.0/zenodeck-v3.9.0-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the live web host. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant launch in modern desktop and mobile browsers. Zero installation required. |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.9.0)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.9.0) | Full release notes, raw SHA256 checksums, and source tarballs. |
