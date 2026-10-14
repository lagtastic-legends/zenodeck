<p align="center">
  <img src="public/logo.jpg" alt="ZenoDeck Logo" width="128" height="128" style="border-radius: 28px; box-shadow: 0 12px 32px rgba(139, 92, 246, 0.35);" />
</p>

<h1 align="center">ZenoDeck</h1>

<p align="center">
  <strong>The Heavy-Duty, 100% Client-Side WebAssembly Media & Document Workstation</strong>
</p>

<p align="center">
  <a href="https://github.com/lagtastic-legends/zenodeck/releases">
    <img src="https://img.shields.io/badge/Release-v3.14.0-8B5CF6?style=for-the-badge&logo=github&logoColor=white" alt="Release v3.14.0" />
  </a>
  <a href="https://omni-tool-two.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Web%20App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://github.com/lagtastic-legends/zenodeck/releases/download/v3.14.0/zenodeck.apk">
    <img src="https://img.shields.io/badge/Android%20Universal-zenodeck.apk-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Universal APK Download" />
  </a>
  <a href="https://github.com/lagtastic-legends/zenodeck/releases/download/v3.14.0/zenodeck-v3.14.0-arm64-v8a.apk">
    <img src="https://img.shields.io/badge/ARM64%20APK-v3.14.0-00BCD4?style=for-the-badge&logo=android&logoColor=white" alt="ARM64 APK Download" />
  </a>
  <a href="https://omni-tool-two.vercel.app/api/ios-profile">
    <img src="https://img.shields.io/badge/iOS%20Profile-Install%20on%20iPhone-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iOS Profile Download" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/Privacy-100%25%20On--Device-10B981?style=for-the-badge" alt="Privacy" />
</p>

<p align="center">
  <a href="https://github.com/lagtastic-legends/zenodeck/actions/workflows/ci.yml">
    <img src="https://github.com/lagtastic-legends/zenodeck/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  </a>
  <a href="https://github.com/lagtastic-legends/zenodeck/actions/workflows/release.yml">
    <img src="https://github.com/lagtastic-legends/zenodeck/actions/workflows/release.yml/badge.svg" alt="Release Build Status" />
  </a>
  <img src="https://img.shields.io/badge/Tests-100%25%20Passing-success?style=flat-square&logo=vitest&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?style=flat-square&logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/WebAssembly-FFmpeg%20WASM-654FF0?style=flat-square&logo=webassembly&logoColor=white" alt="WebAssembly" />
  <img src="https://img.shields.io/badge/Code%20Style-CodeRabbit%20%26%20ESLint-4B32C3?style=flat-square" alt="Code Style" />
</p>

---

## ⚡ Overview

**ZenoDeck** is an open-source, high-performance media workstation and document utility suite built for modern web browsers and Android devices.

Unlike traditional cloud converters and SaaS editing tools that upload private documents, photos, audio, and videos to external servers, ZenoDeck executes every transformation **100% on-device** using client-side **WebAssembly (FFmpeg WASM)**, the hardware-accelerated **WebCodecs API**, **WebGL 2.0 Shaders**, and the native **Web Audio API**. Not a single byte ever leaves your hardware.

---

## 🚀 Download & Installation Matrix

Every release is automatically compiled, signed, and published for all target architectures:

| Platform / Binary | Download Link | Architecture & Description |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.14.0/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android phones, tablets, and emulators. |
| **⚡ Android ARM64-v8a APK** | [**Download zenodeck-v3.14.0-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.14.0/zenodeck-v3.14.0-arm64-v8a.apk) | Dedicated lightweight build for modern 64-bit ARM phones (Pixel, Galaxy, OnePlus, Xiaomi). |
| **📱 Android ARMv7a APK** | [**Download zenodeck-v3.14.0-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.14.0/zenodeck-v3.14.0-armeabi-v7a.apk) | Dedicated lightweight build for legacy 32-bit Android smartphones. |
| **💻 Android x86_64 APK** | [**Download zenodeck-v3.14.0-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.14.0/zenodeck-v3.14.0-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the live web host. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant launch in modern desktop and mobile browsers. Zero installation required. |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.14.0)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.14.0) | Full release notes, raw SHA256 checksums, and source tarballs. |

---

## 🌟 What's New in v3.14.0

- **⚡ Android SharedArrayBuffer & Multi-Threaded WASM Acceleration**:
  - Overrode `BridgeWebViewClient` in `MainActivity.java` with COOP (`same-origin`), COEP (`credentialless`), and CORP (`cross-origin`) injection for local APK assets (`https://localhost`), unlocking full SIMD multi-threading for `FFmpeg.wasm` and `onnxruntime-web`.
  - Upgraded `public/sw.js` with declarative COOP/COEP isolation for static PWA web deployments.
  - Deployed real-time hardware telemetry badge in `SystemStatusHud.tsx` exposing cross-origin isolation and multi-threading states.
- **📱 Headless Native Media Engine for ZenoTap IME (`ZenoHeadlessMediaEngine.kt`)**:
  - Standalone Kotlin coroutine singleton operating headlessly on `Dispatchers.IO` without waking `MainActivity` or WebView JavaScript.
  - Hardware MediaCodec & Jetpack Media3 video transcoding and compression pipelines.
  - 1-tap 512x512 WebP lossy sticker normalizer (<500 KB) for instant WhatsApp & Telegram messaging insertion.
  - Strict IME memory protection (<30 MB RAM) via companion thumbnail generator (<15 KB `.thumb.webp`) eliminating LMK evictions.
  - In-keyboard clipboard pill actions: `"Compress"`, `"To GIF"`, and `"Sticker"`.
- **🔀 4-Tier Unified Media Engine Router (`engine-router.ts`)**:
  - Hierarchical routing across Tier 1 (Native Web Audio/Canvas), Tier 2 (Web Workers & OPFS Storage), Tier 3 (Multi-Threaded WASM), and Tier 4 (Native Android Hardware).
- **🌐 Multi-Provider AI Gateway (`api-gateway.ts`)**:
  - Automated client/server fallback across Google Gemini, Cloudflare Workers AI, Groq, OpenRouter, and Ollama.
- **🎧 Container-Safe Metadata Tagging & Studio 8D Audio Export (`spatial-engine.ts`)**:
  - Container Header Guard protecting `.m4a`/`.aac` (`ftyp` at byte 4) and `.opus` (`OggS` at byte 0) from ID3 prepending, utilizing native FFmpeg `-metadata` muxing.
  - Studio-grade compressed 8D spatial audio export (MP3, M4A, Opus, WAV) with calibrated orbit speed and swing intensity.
  - Origin Private File System (OPFS) persistent model weight caching (`model-cache.ts`).
- **⚡ ZenoMacros Batch Automation Engine (`zeno-macros.ts` & UI)**:
  - Declarative multi-action workflows for automated batch media processing.
- **🎨 OffscreenCanvas WebGL2 GLSL Shaders (`useOffscreenShader.ts`)**:
  - High-performance GPU shader rendering off the main UI thread.
- **📜 Permanent Architectural Constitution (`.antigravityrules`)**:
  - Codified repository-wide standards for media routing, OPFS caching, 60-30-10 palette ratio, and IME RAM limits.

---

## 🌟 What's New in v3.13.0

- **📱 Universal Phone Form-Factor Layout Architecture**:
  - **Screen Size & Density Scaling (`AndroidManifest.xml`)**: Configured `<supports-screens>` for `smallScreens`, `normalScreens`, `largeScreens`, and `xlargeScreens` with any-density and resizable scaling across all mobile devices.
  - **Sub-380px Compact Breakpoint (`xs: 380px`)**: Fine-grained responsive breakpoint in `tailwind.config.ts` guaranteeing clean scaling on budget phones and compact displays.
  - **Adaptive Quick Action Matrix (`ToolGrid.tsx`)**: Re-engineered to `grid-cols-2 xs:grid-cols-4 sm:grid-cols-4`. Compact displays (<380px) render a 2-column thumb-friendly layout; standard and flagship displays (≥380px) render a dense 4-column matrix with zero card blowout (`min-w-0`, `break-words`).
  - **Zero-Overflow TopBar (`top-bar.tsx`)**: Rigid `shrink-0` bounds and responsive visibility for action pills (`hidden xs:flex`), eliminating horizontal scrolling and badge crowding on 320px viewports while preserving update alert visibility.
  - **Touch-Optimized Hero Callouts (`dashboard-view.tsx`)**: Added `w-full min-[420px]:w-auto` to primary CTAs for single-thumb taps on narrow viewports.
  - **Horizontal Overscroll Containment (`globals.css`)**: Enforced `overscroll-behavior-x: none` across root HTML and body, eliminating edge bounce displacement during touch swipes.
- **🎨 Terracotta 60:30:10 Design System & Color Harmony Architecture**:
  - **60% Raw Linen Canvas**: High-end parchment background (`#FAF5EE`) offering soothing eye comfort and organic warmth.
  - **30% Timber & Sandstone Contours**: Deep espresso timber typography (`#342A24`), warm sandstone card surfaces (`#F3ECE0`, `#EDE3D4`), and crisp linen borders (`#DFD3C2`).
  - **10% Fired Clay Hero Accent**: Radiant burnt sienna and clay hero buttons (`#C2652A`, `#964228`) with specular top rim highlight, tactile depression, and amber glow shadows.
  - **Dynamic Harmony Swatch in Theme Toggle (`theme-toggle.tsx`)**: 3-swatch inline indicator visually communicating the 60:30:10 ratio with immediate theme switching.
- **📦 Universal Signed Multi-Architecture Android APK**:
  - Signed release binary bundling native Capacitor plugins and WebAssembly engines for `arm64-v8a`, `armeabi-v7a`, and `x86_64`.
  - Android 7.0 (API 24) to Android 15 (API 36) compatibility.
- **🧪 100% Automated Test Suite Verified**:
  - Universal E2E Test Suite: **138/138 passing (100%)** across all 4 tiers.
  - App Updater & Semver Test Suite: **12/12 passing (100%)**.
  - ZenoTap Pairing Ease Suite: **5/5 passing (100%)**.
  - TypeScript strict compilation: **0 Errors**.

*(For detailed historical release logs, see [CHANGELOG.md](CHANGELOG.md), [RELEASE_NOTES_v3.14.0.md](RELEASE_NOTES_v3.14.0.md), and [RELEASE_NOTES_v3.13.0.md](RELEASE_NOTES_v3.13.0.md)).*

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph UI_Layer["Client Presentation & Interaction Layer"]
        App["Next.js 16 App Router · Tailwind CSS · Framer Motion"]
        Nav["Zustand Atomic NavStore · Hierarchical Back Guards"]
        Theme["Glassmorphic Dark Mode · Tactile PCM Web Audio"]
    end

    subgraph Audio_DSP["Dual-Engine Audio Architecture"]
        WA["Web Audio API (Real-Time DSP Node Chain)"]
        WA --> EQ["10-Band ISO Equalizer (31Hz – 16kHz)"]
        WA --> Bass["Dynamic Bass Boost + 8kHz Clarity Shelf"]
        WA --> Spatial["Spherical 8D Orbit + Contralateral Reflections"]
        WA --> Vocal["Center Vocal Isolation & OOPS Cancellation"]
    end

    subgraph WASM_Engine["WebAssembly Execution Sandbox (FFmpeg WASM)"]
        Worker["Dedicated Web Worker Thread"]
        VFS["Zero-Copy Virtual WORKERFS (Up to 20 GB)"]
        Watchdog["120s Compilation Watchdog & IDB Cache Guard"]
        Filter1["Slowed & Reverb (-af asetrate=44100*0.85,aresample=44100,aecho=...)"]
        Filter2["8D Audio (-af apulsator=hz=0.08:amount=0.85,aecho=...)"]
        Worker --> VFS
        Worker --> Watchdog
        VFS --> Filter1 & Filter2
    end

    subgraph Native_Bridge["Capacitor 8 Android Runtime"]
        Cap["Capacitor Android Shell"]
        Save["Chunked nativeSave (512 KB Slices · Android IPC Safe)"]
        Cutout["Display Cutout (shortEdges Edge-to-Edge)"]
        Scroll["120Hz Kinetic Touch Scrolling Momentum"]
        Cap --> Save & Cutout & Scroll
    end

    App --> Audio_DSP
    App --> WASM_Engine
    App --> Native_Bridge
```

---

## 🧰 Comprehensive Tool Matrix

ZenoDeck provides 18+ client-side tools categorized into 6 specialized workstations:

| Workstation | Tool Name | Engine / Technology | Supported Formats | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Audio** | **Audio Effects Suite** | FFmpeg WASM / Libavfilter | MP3, WAV, M4A, FLAC, OGG | Industry-standard Slowed & Reverb + 8D Spatial Audio. |
| **Audio** | **Audio DSP Studio** | Web Audio API + FFmpeg | MP3, WAV, FLAC, M4A | 10-Band EQ, Bass Boost, 8D Orbit, Vocal Removal, 10 Presets. |
| **Audio** | **Bass Booster** | Web Audio + FFmpeg | MP3, WAV, AAC, OGG | 5 progressive tiers (+3dB to +18dB) with anti-mud clarity shelves. |
| **Audio** | **Slowed + Reverb** | FFmpeg WASM (`asetrate`) | MP3, WAV, M4A, FLAC | Vintage vinyl pitch-shift slow with tiered room echo tails. |
| **Audio** | **3D / 8D Audio** | FFmpeg WASM (`apulsator`) | MP3, WAV, AAC, FLAC | 360° circular binaural panning with spatial dimension widening. |
| **Audio** | **Equalizer Studio** | Web Audio BiquadFilter | MP3, WAV, OGG, AAC | Parametric graphic EQ with 6 studio curves and peak limiter. |
| **Audio** | **Vocal Remover** | FFmpeg WASM (OOPS) | MP3, WAV, FLAC | Center-channel vocal removal with sub-bass preservation. |
| **Audio** | **Trimmer & Slicer** | FFmpeg WASM (`atrim`) | MP3, WAV, M4A, AAC | Millisecond-precise cutting with linear fade-in and fade-out. |
| **Video** | **Universal Downloader** | Multi-Platform Resolver | YouTube, TikTok, IG, X, Reddit | Watermark-free MP4, high-bitrate MP3, subtitles (.srt/.vtt). |
| **Video** | **Media Converter** | FFmpeg WASM | MP4, MKV, WebM, AVI, MOV | Lossless stream copy (`-c copy`), transcode, audio extraction. |
| **Video** | **Video Compressor** | FFmpeg WASM (CRF) | MP4, WebM, MOV, MKV | Multi-tier CRF size reduction with live bitrate estimation. |
| **Video** | **Video Mute** | FFmpeg WASM (`-an`) | MP4, MOV, WebM, MKV | Instant audio stripping with `-movflags +faststart`. |
| **Video** | **GIF Maker** | FFmpeg WASM (`palettegen`) | MP4, WebM, MOV ➔ GIF | Optimized 2-pass palette generation for crisp looping GIFs. |
| **Documents** | **Image to PDF** | pdf-lib | PNG, JPG, WebP ➔ PDF | Multi-page document compilation with pagination layout. |
| **Documents** | **Scan to PDF** | Camera + Canvas API | Camera / Gallery ➔ PDF | High-contrast receipt and whiteboard document scanning. |
| **Documents** | **Lock PDF** | pdf-lib + WebCrypto | PDF ➔ Protected PDF | AES document encryption and password protection. |
| **Documents** | **Text to PDF** | pdf-lib | Markdown / TXT ➔ PDF | Formatted typography, custom margins, and page splitting. |
| **Imaging** | **Palette Extractor** | Canvas 2D + ColorThief | PNG, JPG, WebP | Dominant color swatches, hex codes, and CSS variables. |
| **Imaging** | **ASCII Art Studio** | Canvas 2D Web Worker | PNG, JPG, WebP ➔ ASCII | Monospaced terminal typography generator with copy/export. |
| **Imaging** | **QR Studio** | qrcode + Canvas | Text, URL, WiFi, vCard | SVG & PNG QR generation with error correction levels. |
| **System** | **Local Vault** | IndexedDB (`idb-keyval`) | Any processed media | Persistent client-side storage ledger with zero quota leaks. |
| **System** | **Studio Recorder** | MediaRecorder API | Screen, Cam, Mic ➔ WebM/MP4 | Hardware-accelerated recording with zero-latency preview. |

---

## 🎛️ Exact Audio Filter Specifications

### 1. Slowed & Reverb
```text
-af "asetrate=44100*0.85,aresample=44100,aecho=0.8:0.9:1000:0.3"
```
- **Speed & Pitch Scaling**: `asetrate=44100*0.85` drops the audio sample clock to 37.485 kHz, simultaneously lowering playback speed and musical pitch to **85%**.
- **DAC Normalization**: `aresample=44100` resamples back to standard 44.1 kHz output clock.
- **Room Reverb Simulation**: `aecho=0.8:0.9:1000:0.3` creates 1000ms delay with 0.8 in-gain, 0.9 out-gain, and 0.3 decay factor for deep spatial resonance.

### 2. 8D Audio Spatial Engine
```text
-af "apulsator=mode=sine:hz=0.08:amount=0.85,aecho=0.8:0.9:1000:0.3"
```
- **Sinusoidal Orbital Panning**: `apulsator=mode=sine:hz=0.08:amount=0.85` oscillates stereo channels on a **12.5-second rotation cycle** (`1 / 0.08 Hz = 12.5s`) with **85% stereo depth**.
- **Cavernous Distance Echo**: `aecho=0.8:0.9:1000:0.3` adds acoustic reflections simulating room distance around the listener.

---

## 🛠️ Development & Build Quickstart

### Prerequisites
- **Node.js**: `v22.x` (LTS recommended)
- **npm**: `v10.x+`
- **Java JDK**: `21` (for Android APK compilation)
- **Android SDK**: API 34+

### 1. Installation
```bash
git clone https://github.com/lagtastic-legends/zenodeck.git
cd zenodeck
npm install --legacy-peer-deps
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Verification Suite (167 Tests)
```bash
# TypeScript strict type checking
npm run typecheck

# Full CI offline test suite (E2E, Audio Effects, Muxing, Updater, AI routes)
npm run test:ci
```

### 4. Build Production Web Application
```bash
npm run build
```

### 5. Build Android Release APKs
```bash
# Export static mobile bundle
npm run build:mobile

# Sync Capacitor assets
npx cap sync android

# Compile signed production APKs (ABI split)
cd android
./gradlew assembleRelease --no-daemon
```
Binaries will be generated in `android/app/build/outputs/apk/release/`:
- `app-universal-release.apk` (Universal)
- `app-arm64-v8a-release.apk` (ARM64)
- `app-armeabi-v7a-release.apk` (ARMv7)
- `app-x86_64-release.apk` (x86_64)

---

## 🛡️ Security, Privacy & Compliance

ZenoDeck enforces a strict **Zero-Upload Privacy Guarantee**:
1. **Zero Server Ingestion**: We do not maintain or deploy media processing servers. All transformations execute in browser WebAssembly memory or Android native sandboxes.
2. **Local Cryptography**: File encryption, hashing, and password management use the native WebCrypto API.
3. **Zero Secret Leakage**: No telemetry, tracking beacons, or behavioral logging payloads are transmitted.

For coordinated disclosures, see [SECURITY.md](.github/SECURITY.md).

---

## 🤝 Community & Contributing

Contributions are welcomed! Before opening pull requests, please review:
- [CONTRIBUTING.md](.github/CONTRIBUTING.md) — Workflow guidelines and code standards.
- [CODE_OF_CONDUCT.md](.github/CODE_OF_CONDUCT.md) — Community expectations.
- [CHANGELOG.md](CHANGELOG.md) — Version history and release notes.

---

## 📄 License & Contact

- **License**: Open-source software licensed under the [MIT License](LICENSE).
- **GitHub Repository**: [https://github.com/lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)
- **Official Support**: [support.zenodeck@gmail.com](mailto:support.zenodeck@gmail.com)
