# ZenoDeck & ZenoTap v1.0.20 Release Notes

**Release Date:** November 12, 2026  
**Version:** `1.0.20` (`versionCode 10020`)  
**Package:** `zenodeck`  
**Git Tag:** `v1.0.20`  

---

## 🌟 Executive Summary

ZenoDeck v1.0.20 completely resolves the mobile `net::ERR_BLOCKED_BY_RESPONSE` security boundary on Android video platforms and elevates the entire client-side media acquisition and compression pipeline to **8K 60FPS Full Ultra HD (7680 × 4320 @ 60 FPS)**.

---

## 🛠️ Highlights & Core Features

### 1. 🌐 Native In-App Browser Fullscreen Dialog & Zero Restriction Web Engine
- **Elimination of `net::ERR_BLOCKED_BY_RESPONSE`**: Modern video and social platforms (`m.youtube.com`, `tiktok.com`, `instagram.com`, `facebook.com`, `x.com`) enforce `X-Frame-Options: SAMEORIGIN` and `Content-Security-Policy: frame-ancestors 'self'`, strictly blocking web `<iframe />` embeddings on mobile.
- **Top-Level Hardware-Accelerated Native Dialog (`ZenoMedia3Plugin.kt`)**: Replaced sandboxed iframes with a native Android `Dialog` (`Theme_Black_NoTitleBar_Fullscreen`) running a top-level `WebView`. As a main window frame, it completely bypasses frame restrictions with 100% video playback and touch fidelity.
- **Deep Forest & Champagne Chrome**: Styled in ZenoDeck's signature Deep Forest Green (`#102C26`) and Champagne (`#F7E7CE`) palette:
  - Top Navigation Bar: Back (◀), Forward (▶), Reload (↻), live SSL URL pill, and Close (✕).
  - Hardware back button integration: Traverses web browsing history before closing.
- **Pulsing Native VidMate FAB & Stream Sniffer**: Anchored at bottom-right (`bottom: 24dp, right: 24dp`). Sniffs `googlevideo.com`, `.m3u8`, `.mpd`, and `.mp4` chunks in real-time, extracts `ogTitle`, `ogImage`, and direct `<video>` DOM elements, and pulses `⚡ DOWNLOAD VIDEO / MP3`. Tapping the FAB dismisses the dialog and notifies Capacitor (`openVidMateSheet`), opening `<VidMateQualitySheet />` directly in React.
- **Interactive Native Station View (`mini-browser-view.tsx`)**: Replaces the broken iframe on mobile with an elegant station featuring 1-click re-open, stream analysis, and seamless portal navigation.

---

### 2. 🚀 8K 60FPS Full Ultra HD Media Acquisition & Compression Pipeline
- **InnerTube 8K Resolution Tier (`innertube.ts`)**:
  - Added `is8K` and `"8K 60FPS" | "8K"` badges to `YouTubeQualityOption`.
  - Added priority tier searching formats with height up to 4320p (`findFormat(3000, 4320, true, false, true)`), targeting Itag 571 (AV1), 272 (VP9), and 337 (4320p60).
- **VidMate Quality Sheet 8K Badging (`vidmate-quality-sheet.tsx`)**:
  - Updated section title to `Video Resolutions (360p to 8K 60FPS)`.
  - Added prominent fuchsia `8K FUHD` badges.
- **Cinema 8K 60FPS Ultra Master Preset (`youtube-downloader.tsx`)**:
  - Lossless 4320p60 muxed with pristine multi-channel stereo audio.
  - Live 8K badge and download ready indicators.
- **Video Compressor 8K FUHD (4320p) Master (`video-compressor.tsx`)**:
  - Added `4320` resolution tier (`8K FUHD (4320p)`).
  - Added `8K FUHD 60 FPS Master` preset (CRF 18 mastering grade, 60 FPS, 4320p).
  - Output naming: `-compressed-8k-60fps.mp4`.
- **Turbo Downloader 8K Integration (`turbo-downloader.ts`)**:
  - `TurboDownloadResult` now tracks `is8K` throughout WebAssembly, OPFS, and native Android MediaMuxer pipelines.

---

## 🧪 Verification Matrix

| Verification Suite | Check | Result |
| :--- | :--- | :--- |
| **test-v1-0-20-browser-and-8k.ts** | Native Dialog, FAB sniffer, braces, 8K 60FPS types | **PASS (100%)** |
| **test-v1-0-20-release.ts** | Version parity across 5 sources, Changelog, Release notes | **PASS (100%)** |
| **test-v1-0-19-mobile-gestures-and-browser.ts** | Registry, Gestures, Safe Area, Back Steps | **PASS (100%)** |
| **test-v1-0-18-mini-browser.ts** | Palette, FAB, OG sniffing | **PASS (100%)** |
| **test-video-compressor-4k-30fps.ts** | Presets, 4K and 8K Resolution options | **PASS (100%)** |
| **npm run typecheck** | Zero TypeScript errors (`tsc --noEmit`) | **PASS (0 errors)** |
| **Full E2E Suite (29 suites)** | 217+ tests across all 4 tiers | **PASS (100%)** |

---

## 📦 APK Artifacts

- Universal Release APK: `apks/app-universal-release.apk`
- ARM64-v8a Release APK: `apks/app-arm64-v8a-release.apk`
- ARMeabi-v7a Release APK: `apks/app-armeabi-v7a-release.apk`
- X86_64 Release APK: `apks/app-x86_64-release.apk`
