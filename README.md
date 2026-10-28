<p align="center">
  <img src="public/logo.jpg" alt="ZenoDeck Logo" width="120" height="120" style="border-radius: 28px; box-shadow: 0 12px 32px rgba(139, 92, 246, 0.35);" />
</p>

<h1 align="center">ZenoDeck</h1>

<p align="center">
  <strong>The Heavy-Duty, 100% Client-Side WebAssembly Media & Document Workstation</strong><br />
  <em>Featuring the Universal Media Downloader & ZenoTap 3D Tactile IME Keyboard</em>
</p>

<p align="center">
  <a href="https://github.com/lagtastic-legends/zenodeck/releases/tag/v1.0.11">
    <img src="https://img.shields.io/badge/Release-v1.0.11-8B5CF6?style=for-the-badge&logo=github&logoColor=white" alt="Release v1.0.11" />
  </a>
  <a href="https://omni-tool-two.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Web%20App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.11/app-universal-release.apk">
    <img src="https://img.shields.io/badge/Android%20Universal-APK-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Universal APK" />
  </a>
  <a href="https://omni-tool-two.vercel.app/api/ios-profile">
    <img src="https://img.shields.io/badge/iOS%20Profile-Web%20Clip-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iOS Profile" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/Privacy-100%25%20On--Device-10B981?style=for-the-badge" alt="100% On-Device Privacy" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tests-100%25%20Passing-success?style=flat-square&logo=vitest&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor 8" />
  <img src="https://img.shields.io/badge/WebAssembly-FFmpeg%20WASM-654FF0?style=flat-square&logo=webassembly&logoColor=white" alt="WebAssembly" />
</p>

---

## ⚡ What is ZenoDeck?

**ZenoDeck** is an all-in-one, privacy-first media powerhouse and document workbench built for modern browsers and native Android devices. 

Unlike conventional web tools that upload your sensitive media to remote cloud servers, ZenoDeck executes every operation **100% locally on your device** using client-side **WebAssembly (FFmpeg WASM)**, **WebCodecs**, **WebGL 2.0**, and native Android hardware **MediaCodec / MediaMuxer** pipelines. Your files never touch a cloud server.

---

## 💎 What's New in v1.0.11 (Pure yt-dlp Python Video Downloader Engine & Video-to-Audio CTA)

ZenoDeck v1.0.11 brings the embedded `yt-dlp` Python engine directly to Android via Chaquopy alongside an instant 1-tap Video-to-Audio workflow:

- 🐍 **Pure `yt-dlp` Python Engine (Chaquopy 15.0.1)**: Embedded Python 3.11 with `yt-dlp` running locally on-device. Eliminates extraction failures caused by YouTube JS challenge shifts and client signature updates.
- 🎬 **Video-Only Downloader UI**: Streamlined quality ladder showing 4K 60FPS (`2160p60`), 2K 60FPS (`1440p60`), 1080p60, 720p, 480p, and 360p with lossless codec-container pairing.
- 🎵 **1-Tap Post-Download "Convert Video to Audio" Workflow**: Immediate post-download CTA card and save-modal banner that hands off downloaded video files to Media Converter with studio 320kbps MP3 pre-selected.
- ⚡ **Android Hardware MediaMuxer Dual-Stream Lossless Merge**: `yt-dlp` downloads chunked video and audio tracks directly to disk, and Android's hardware `MediaMuxer` merges them in milliseconds with zero mobile FFmpeg binary overhead.
- 🧪 **100% Pass Rate Across All 217 E2E Tests**: Comprehensive 4-tier verification covering parallel chunking, hardware muxing, and cross-tool handoff contracts.

---

## 🚀 Download & Installation (v1.0.11)

All release binaries are signed with release keys, shrunk with ProGuard/R8, and ready for installation:

| Platform / Target | Download Link | Target Device | Binary Size |
| :--- | :--- | :--- | :--- |
| **📱 Universal Android APK** | [**app-universal-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.11/app-universal-release.apk) | All Android Phones & Tablets (ARM64, ARMv7, x86_64) | **~59.0 MB** |
| **⚡ ARM64-v8a APK** | [**app-arm64-v8a-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.11/app-arm64-v8a-release.apk) | Modern 64-bit Android Phones (Pixel, Samsung, OnePlus) | **~40.5 MB** |
| **📱 ARMv7a APK** | [**app-armeabi-v7a-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.11/app-armeabi-v7a-release.apk) | Legacy 32-bit Android Phones | **~37.5 MB** |
| **💻 x86_64 APK** | [**app-x86_64-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.11/app-x86_64-release.apk) | Android Tablets, Chromebooks & Emulators | **~41.8 MB** |
| **🍏 Apple iOS Web Clip** | [**zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | iPhone & iPad (Standalone Fullscreen PWA) | **~0.1 MB** |
| **🌐 Web Application** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant Browser Access (Desktop Chrome, Edge, Safari) | Cloud |

---

## 🌟 Flagship Highlights

### 🎬 Universal Media Acquisition Engine
- **Strict 4K 60FPS Resolution Lock**: Real 3840×2160 uncompressed video downloads with zero silent downgrades to 360p.
- **Direct-to-Disk 2MB Bounded Streaming**: On Android, streams are downloaded in 2MB slices with YouTube `&range=` parameter and `Range:` header, completely bypassing Chromium CORS, header stripping, and CDN socket timeouts.
- **Hardware Zero-RAM MediaMuxer**: Multiplexes separate 4K video and high-bitrate audio streams directly into flash storage (`Movies/ZenoDeck`) with instant Google Photos / MediaStore indexing.
- **Multi-Platform Support**: YouTube (4K60, DASH, Shorts), Reddit (audio-video DASH muxing), TikTok (watermark-free), Instagram (Reels & Carousels), X/Twitter, Vimeo, Pinterest, and HLS `.m3u8` streams.
- **Lossless Time-Range Clipper**: Stream-copy trimming (`-ss`/`-to`) for instantaneous video clipping with zero re-encoding artifacts.
- **Android System Share Intent**: Share video URLs directly from any Android app into ZenoDeck with 1 tap.

### ⌨️ ZenoTap Native Android IME Keyboard
- **Tactile 3D Keycaps**: Precision 1dp top specular highlight border, 8dp corner radius, recessed depth shadows, and responsive pressed glow.
- **50% Spacebar Trackpad**: Ergonomic wide spacebar with horizontal thumb scrubbing that scrubs the text cursor smoothly left/right with haptic tick feedback.
- **Headless Media Dispatcher**: Convert copied clipboard images into Telegram/WhatsApp WebP stickers or animated GIFs headlessly on `Dispatchers.IO` (<30MB RAM footprint).
- **Synced Themes**: Seamless cross-platform switching between Cyberpunk `"obsidian"` and Warm Linen `"terracotta"` themes.

### 🎧 Studio Audio DSP Suite
- **8D Binaural Spatial Audio**: Dynamic HRTF headphone surround sound with customizable orbit speed and reverb radius.
- **Mastering Suite**: 10-band parametric EQ, lookahead peak limiter, vocal isolation / karaoke remover, tempo & pitch shift, and bass boost.

### 📄 Private Document & Image Suite
- **100% Client-Side PDF Tools**: Merge, compress, extract pages, rotate, and sign PDFs directly in browser memory.
- **Image Workstation**: Format conversion (WebP, PNG, JPEG, AVIF), bulk resizing, EXIF metadata scrubber, and OCR text extraction.

---

## 🛠️ Tech Stack & Architecture

```
┌────────────────────────────────────────────────────────┐
│             ZenoDeck Universal Frontend                │
│       Next.js 16 (App Router) • React 19 • Tailwind v4  │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       [Web / Desktop]            [Android Native]
                │                        │
┌───────────────▼────────┐      ┌────────▼───────────────┐
│ Client-Side WebAssembly│      │ Native Android Engine  │
│  • FFmpeg WASM (v0.12) │      │  • Kotlin Coroutines   │
│  • WebCodecs & WebGL 2 │      │  • Hardware MediaCodec │
│  • Web Audio API & OPFS│      │  • MediaMuxer (<5MB)   │
└────────────────────────┘      │  • ZenoTap IME Service │
                                └────────────────────────┘
```

---

## 💻 Developer Quickstart

```bash
# 1. Clone repository
git clone https://github.com/lagtastic-legends/zenodeck.git
cd zenodeck

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

### Build for Android

```bash
# Export static production bundle & sync Capacitor
npm run build:mobile
npx cap sync android

# Compile signed release APKs
cd android
./gradlew assembleRelease
```

---

## 📜 License

ZenoDeck is open-source software licensed under the **[MIT License](LICENSE)**.
Built with ❤️ by **Lagtastic Legends**.
