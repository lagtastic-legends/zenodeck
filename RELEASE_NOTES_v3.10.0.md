# 🚀 ZenoDeck Release Notes — v3.10.0

> **Universal Social Media Video & Audio Downloader & Architecture Hardening**  
> *Release Date:* October 10, 2026  
> *Commit / Tag:* `v3.10.0`  
> *Architecture:* 100% Client-Side WebAssembly (WASM) + Capacitor 8 Android Shell + Node Serverless

---

## 🌟 Highlights of Release v3.10.0

### 1. 🌐 Universal Multi-Platform Social Media Video & Audio Engine
- **Dedicated Platform Extractors**:
  - **TikTok**: Extract watermark-free HD progressive MP4 streams (1080p, 720p) and original audio tracks with secondary scraper failover.
  - **Instagram**: Full shortcode extraction across Reels (`/reel/`), Posts (`/p/`), and IGTV (`/tv/`) with tracking query parameter cleaning and multi-provider failover.
  - **Twitter / X**: Enhanced with Twitter Syndication API fallback (`cdn.syndication.twimg.com/tweet-result`) alongside VxTwitter and FxTwitter providers.
  - **Reddit**: Native `v.redd.it` resolution pairing video fallback streams with DASH audio (`DASH_AUDIO_128.mp4`) for automated synchronized client-side FFmpeg WASM muxing.
  - **Facebook**: New dedicated parser supporting Facebook Reels (`/reel/`), Watch (`/watch/?v=`), and standard posts (`/videos/`) with public embed scraping.
  - **Vimeo**: Direct progressive MP4 streams (1080p, 720p, 540p, 360p) via Player Config API, completely bypassing login gates.
  - **Pinterest**: PinResource API and OpenGraph parser for `pinterest.com/pin/` and `pin.it/` links.

### 2. 🎵 Universal Studio Audio Ladder & Client-Side FFmpeg Demuxing
- **Full Studio Audio Ladder**: Every social media video automatically populates 5 direct studio audio tiers in the Direct Audio tab:
  - `Studio Master`: 320 kbps MP3
  - `High Fidelity`: 256 kbps AAC / M4A
  - `High Quality`: 192 kbps MP3
  - `Standard Audio`: 128 kbps MP3
  - `Lossless Studio Audio`: WAV PCM (1411 kbps)
- **True Client-Side FFmpeg WASM Demuxing**: Selecting an audio option now executes true client-side FFmpeg audio demuxing (`-vn -b:a 320k`, `-vn -c:a pcm_s16le`, etc.), ensuring audio downloads are legitimate, clean MP3/AAC/WAV files rather than raw video bytes saved with an audio extension.

### 3. 🛡️ Upstream CDN Stream Proxy & Referer Injection
- **Eliminated 403 Forbidden Errors**: In `/api/youtube/stream` and `/api/media/download`, origin-specific `Referer` headers are injected dynamically based on target stream URLs (TikTok, Instagram, Twitter, Reddit, Facebook, Vimeo, Pinterest), bypassing upstream CDN anti-hotlinking blocks.
- **Expanded CDN Host Authorization**: Whitelisted upstream media CDN hostnames for Facebook (`fbcdn.net`), Vimeo (`vimeocdn.com`), Pinterest (`pinimg.com`), and Twitter.

### 4. 🔕 Clean User Experience & Notification De-cluttering
- **Removed Notification Spam**: Silenced repetitive, intrusive toasts and banners throughout the universal media downloader and audio DSP workflows.
- **Intelligent Downloader Selection**: The quality selector automatically defaults to `firstAudio` when the user is on the Direct Audio tab and `firstVideo` when on the Video tab.

### 5. 🛠️ Codebase Hardening & Bug Fixes
- **Temporal Dead Zone (TDZ) Fix**: Refactored `loadDeck` in `zenotap-deck-manager.tsx` into `useCallback` defined prior to mount effects, eliminating potential initialization crashes.
- **React 19 Render-Phase Ref Safety**: Removed ref reading in effect dependencies in `dsp-studio-panel.tsx` and moved ref mutation in `vault-preview-modal.tsx` into `useEffect`.
- **Async State Dispatches**: Deferred synchronous state updates in `ascii-generator.tsx` using `queueMicrotask` to avoid cascading render warnings.
- **Format Matching in Stream Routes**: Enhanced `/api/media/download` to honor format requests and accurately route between audio and video containers.

---

## 🧪 Quality & Verification Matrix

| Test Suite / Gate | Coverage | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Validation** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~6s |
| **Next.js Production Build** | Static & Dynamic Route Compilation (`next build`) | **17 / 17 Pages Built** | ~26s |
| **Multi-Platform Downloader Suite** | YouTube, TikTok, IG, X, Reddit, FB, Vimeo, Pinterest | **36 / 36 (100%)** | ~2s |
| **Universal Media Downloader Suite** | 15 Platforms & yt-dlp Metadata Validation | **15 / 15 (100%)** | ~6s |
| **Comprehensive E2E Suite** | Feature, Boundary, Combinations, Scenarios | **138 / 138 (100%)** | ~50ms |
| **Studio-Grade DSP Suite** | All 13 Tools, 8 Reverb Spaces, Fast-Paths | **162 / 162 (100%)** | ~45ms |
| **Audio Effects Engine Tests** | Slowed & Reverb, 8D Audio, UI Components | **37 / 37 (100%)** | ~3ms |
| **App Updater & Semver Suite** | Semver Comparisons & Cache Invalidation | **12 / 12 (100%)** | ~12ms |
| **AI Route & CORS Architecture** | Mobile/Web Endpoint Resolution, CORS | **PASS (100%)** | ~8ms |

---

## 📱 Binary Downloads & Installation

| Platform / Binary | Download Link | Description |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.0/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android devices. |
| **⚡ Android ARM64-v8a APK** | [**Download zenodeck-v3.10.0-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.0/zenodeck-v3.10.0-arm64-v8a.apk) | Dedicated lightweight build for modern 64-bit ARM phones. |
| **📱 Android ARMv7a APK** | [**Download zenodeck-v3.10.0-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.0/zenodeck-v3.10.0-armeabi-v7a.apk) | Dedicated build for legacy 32-bit Android smartphones. |
| **💻 Android x86_64 APK** | [**Download zenodeck-v3.10.0-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.0/zenodeck-v3.10.0-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the live web host. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant launch in modern desktop and mobile browsers. Zero installation required. |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.10.0)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.10.0) | Full release notes, raw SHA256 checksums, and source tarballs. |
