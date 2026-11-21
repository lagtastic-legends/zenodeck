<p align="center">
  <img src="public/logo.jpg" alt="ZenoDeck Logo" width="120" height="120" style="border-radius: 28px; box-shadow: 0 12px 32px rgba(139, 92, 246, 0.35);" />
</p>

<h1 align="center">ZenoDeck</h1>

<p align="center">
  <strong>The Heavy-Duty, 100% Client-Side WebAssembly Media & Document Workstation</strong><br />
  <em>Featuring On-Device WebAssembly Media Engines & ZenoTap 3D Tactile IME Keyboard</em>
</p>

<p align="center">
  <a href="https://github.com/lagtastic-legends/zenodeck/releases/tag/v1.0.35">
    <img src="https://img.shields.io/badge/Release-v1.0.35-8B5CF6?style=for-the-badge&logo=github&logoColor=white" alt="Release v1.0.35" />
  </a>
  <a href="https://omni-tool-two.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Web%20App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.35/app-universal-release.apk">
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

## 💎 What's New in v1.0.35 (Multi-Worker Turbo Removal & 5% Download Freeze Resolution)

- **Universal Downloader 5% Freeze Fix & Resilient Direct Streaming:**
  - Fixed critical 5% download freeze caused by upstream CDN HMAC signature validation failures when appending `&range=`.
  - Added `openResilientStreamConnection()` in `ZenoHeadlessMediaEngine.kt`: automatically falls back to untouched signed URLs with standard RFC 7233 HTTP `Range: bytes=start-end` headers.
  - Implemented dynamic mobile client User-Agent negotiation matching iOS and Android devices to prevent CDN bot throttling and silent TCP drops.
  - Added an 18-second zero-byte transfer watchdog timer and guaranteed `setIsDownloading(false)` execution inside `finally` blocks.
- **Clean Downloader Experience & Turbo Multi-Worker UI Removal:**
  - Removed confusing "Turbo Multi-Worker Acceleration" card and manual `4X / 6X / 8X` thread controls in `youtube-downloader.tsx`.
  - Replaced with an automated, rock-solid 2-worker streaming engine designed for optimal throughput without CDN throttling.
  - Updated live HUD telemetry inspector from multi-worker channel indicators to `Engine: Direct Stream`.
- **Mobile & iPhone Web Clip Profile Descriptions:**
  - Retained full feature descriptions on all mobile viewports and iPhone Web Clip standalone profiles (`zenodeck.mobileconfig`).

---

## 💎 What's New in v1.0.32 (Dual Gemini 3.8 & 3.5 Flash-Lite Neural Engine, Speed Switcher & Zero-Downtime Cascade)

- **Interactive Speed Switcher in Ask Zeno (`AskOmni.tsx`):**
  - Added an ergonomic speed selector pill in the co-pilot header: `[ ⚡ Lite | 🧠 3.8 ]`.
  - Enables instant toggling between ultra-fast **Gemini 3.5 Flash-Lite** (~100–200ms response latency) and flagship **Gemini 3.8 Flash** (deep multimodal reasoning).
  - Dynamic neural status wave and bottom hint adapt in real-time to the active model tier.
- **Smart Zero-Downtime Model Hierarchy (`/api/ai/route.ts`):**
  - Integrated `gemini-3.5-flash-lite` and `gemini-3.8-flash` into a resilient auto-failover pipeline.
  - Automatically recovers from transient 503 (high demand) or 429 (rate limiting) spikes on Google's API by seamlessly routing to the next optimal candidate model with zero chat interruptions.

---

## 💎 What's New in v1.0.31 (Full UI Contrast, Global CSS Override, Toggle Switch & Mobile Layout Overhaul)

- **Eliminated Global White `<input>` & Black Text Overrides (`globals.css`):** Re-architected `[data-theme="precision"]` typography and input shield rules with `:not([class*="bg-"]):not([class*="!bg-"])` and `:not([class*="text-"]):not([class*="!text-"])` guards, ensuring explicit dark container classes (`bg-[#090D0C]`, `bg-[#102C26]`, `bg-card`) never suffer from white backgrounds or illegible dark text.
- **Header Subtitle 2-Line Wrapping (`tool-launch-shell.tsx` & `tool-shell.tsx`):** Upgraded tool subtitles from single-line clipping `truncate` to `line-clamp-2 leading-snug text-xs`, allowing complete tool descriptions to wrap gracefully on mobile viewports.
- **In-App Browser & 8-Site Portal Card Contrast (`mini-browser-view.tsx`):**
  - Omnibox input enforced to deep obsidian `!bg-[#090D0C] !text-[#F7E7CE] placeholder:!text-[#A79277]/75 border border-[#A79277]/40`.
  - 8 quick portal cards (YouTube, TikTok, Instagram, Facebook, X, Reddit, Vimeo, SoundCloud) restyled with high-contrast `!text-[#F7E7CE] font-bold` titles and `!text-[#A79277] font-medium` subtitles on `#102C26` surfaces.
  - Floating VidMate FAB fixed at `bottom-4 right-4 z-30` and rendered unconditionally for 100% discoverability.
- **Universal Media Downloader Polish (`youtube-downloader.tsx`):**
  - Removed duplicate switcher icons: single `🔗 Paste Link` and `🌐 In-App Browser` buttons.
  - Fixed Queue tab badge and `0 Active` queue card contrast with high-contrast Champagne text (`#F7E7CE`).
  - Added smooth horizontal scrolling with `overflow-x-auto no-scrollbar pr-4` on platform chips.
- **Standardized Ergonomic Toggle Switches (`param-controls.tsx` & `switch.tsx`):**
  - Fixed vertically squished switch pills into standard `h-6 w-11 shrink-0` horizontal pills with a smooth `h-5 w-5` white thumb.
  - Enhanced `Lock PDF` with clear dropzone copy (`Tap to select PDF document to encrypt`) and high-contrast `#102C26` button.
  - Restyled camera/recorder viewports (`scan-to-pdf.tsx`, `studio-recorder.tsx`) with legible `text-[#F7E7CE]/85 font-medium` guidance.
- **Audio Studio Equalizer & Swatch Distribution (`UnifiedAudioStudio.tsx`, `palette-extractor.tsx`):**
  - Added clear `+XdB / -XdB` badges and smooth touch sliders to the 10-band EQ.
  - Normalized swatch proportions in Palette Extractor to guarantee the color distribution bar fills 100% width.
  - Increased ASCII Art Gallery card contrast to crisp `text-[#102C26] dark:text-[#F7E7CE]`.

---

## 💎 What's New in v1.0.20 (Native In-App Browser Fullscreen Dialog, Zero ERR_BLOCKED_BY_RESPONSE & 8K 60FPS Pipeline)

- **Native In-App Browser Fullscreen Dialog (`ZenoMedia3Plugin.kt`):** Replaced sandboxed web `<iframe />` on Android with a hardware-accelerated full-screen native `Dialog` overlay (`Theme_Black_NoTitleBar_Fullscreen`). Because top-level native WebViews operate outside iframe boundaries, `X-Frame-Options: SAMEORIGIN` and `CSP: frame-ancestors 'self'` restrictions no longer block YouTube, TikTok, Instagram, Twitter/X, and Facebook (`net::ERR_BLOCKED_BY_RESPONSE` completely eliminated).
- **ZenoDeck Chrome & VidMate Stream Sniffer:** Deep Forest Green (`#102C26`) and Champagne (`#F7E7CE`) navigation bar with Back (◀), Forward (▶), Reload (↻), live SSL URL pill, and Close (✕), plus hardware back button history traversal.
- **Pulsing Native VidMate FAB (`⚡ DOWNLOAD VIDEO / MP3`):** Floating action button anchored at bottom-right of the native dialog. Uses real-time network interception (`shouldInterceptRequest`) and DOM evaluation (`ogTitle`, `ogImage`, `directVideoSrc`) to detect streams, pulsing when media is detected. Tapping the FAB dismisses the dialog and notifies the React app (`openVidMateSheet`), opening `<VidMateQualitySheet />` directly.
- **8K 60FPS Full Ultra HD Media Pipeline (`innertube.ts`, `vidmate-quality-sheet.tsx`, `video-compressor.tsx`):**
  - Expanded `YouTubeQualityOption` with `is8K` and `"8K 60FPS" | "8K"` badges, targeting Itags 571 (AV1), 272 (VP9), and 337 (60fps) up to 7680 × 4320 @ 60 FPS.
  - Added fuchsia `8K FUHD` badges to VidMate Quality Sheet.
  - Added `Cinema 8K 60FPS Ultra Master` preset to Universal Downloader.
  - Added `8K FUHD (4320p)` resolution and `8K FUHD 60 FPS Master` preset (CRF 18) to the Video Compressor.
  - Integrated `is8K?: boolean` into `TurboDownloadResult` across all chunking and native muxing paths.

---

## 💎 What's New in v1.0.19 (Bento Grid Browser & Downloader, Universal Mobile Layout Fit & Edge Back Gestures)

- **Bento Grid In-App Browser & Downloader Exposure:** Both the In-App Mini Browser (`in-app-browser`) and Universal Media Downloader (`youtube-downloader`) are now directly registered and visible in the Bento Dashboard with 8-tile Quick Portals, auto stream sniffer, and glowing VidMate FAB.
- **Universal Mobile Phone Layout Fit (All Form Factors):** Responsive 2-column compact grid fitting 320px–360px ultra-compact phones without horizontal overflow, dynamic `100dvh` viewport height, and safe-area insets (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`) protecting camera notches, Dynamic Island, and gesture bars.
- **Multi-Section Mobile Edge Back Gestures:** Interactive left-to-right swipe-from-edge gesture (`use-edge-swipe-back.ts`) with visual edge indicator and haptic tick. Back navigation hierarchically navigates web history and tool sections before collapsing to the dashboard.
- **Unified Hardware Back Navigation:** Unified `@capacitor/app` back listener through `useNavStore.handleBack()` 5-tier guard stack.

---

## 💎 What's New in v1.0.18 (In-App Mini Browser, VidMate FAB & 120fps Compositor Engine)

- **In-App Mini Browser & Omnibox Strip:** Embedded web browsing suite with URL normalization, DuckDuckGo search fallback, navigation controls, and 8-tile Quick Site Portal Grid (YouTube, TikTok, Instagram, Facebook, X/Twitter, Reddit, Vimeo, SoundCloud).
- **Deep Forest & Champagne Palette Styling:** Fully refactored interface styled with ZenoDeck's signature Deep Forest Green (`#102C26`), Champagne (`#F7E7CE`), Donkey Brown (`#A79277`), and Obsidian (`#090D0C`) palette.
- **Pulsing VidMate-Style Download Action Button (FAB):** Persistent action button in the bottom-right corner (`bottom-5 right-5 z-30`) that glows and bounces (`bg-[#102C26] text-[#F7E7CE] border-2 border-[#F7E7CE] ring-4 ring-emerald-500/35 animate-bounce`) reading `⚡ Download Video / MP3` when streaming media is detected.
- **Direct VidMate Quality Sheet Handoff:** Tapping the FAB automatically resolves page metadata and triggers `<VidMateQualitySheet />` for instant multi-format audio and video downloads.
- **Native Android WebView OG & Video Sniffer:** Enhanced native bridge in `ZenoMedia3Plugin.kt` extracting `ogTitle`, `ogImage`, and `directVideoSrc` directly on `onPageFinished`.
- **Ultra-Smooth 120fps Compositor-Only Engine:** Eliminated GPU blur thrashing (`scale: 0.94`, `opacity: 0.32`), $O(1)$ single-card layout morphing, and double-RAF deferred hydration.

---

## 💎 What's New in v1.0.17 (120fps FLIP App-Launch Transitions & 4K 30FPS Studio Master Compressor)

- **120fps Native FLIP App-Launch Transition System:** Instantaneous shared layout morphing between Bento grid cards and fullscreen tool workspaces using tuned 120Hz spring physics (`APP_LAUNCH_SPRING`: `{ stiffness: 420, damping: 34, mass: 0.8 }`), GPU compositing promotion (`willChange`, `backfaceVisibility: hidden`, `translateZ(0)`), and uninterrupted gesture interruptibility.
- **Recessed Background Hub Depth Parallax:** Opening any tool smoothly recesses the background dashboard to `scale: 0.92`, `opacity: 0.35`, and `blur(14px)` under `HUB_PARALLAX_SPRING` without layout freezes or animation deadlocks.
- **Two-Phase Deferred Hydration (Zero Frame-0 Jank):** Renders a lightweight ZenoDeck glassmorphic dark-mode skeleton on Frame 0, deferring heavy WebAssembly, WebCodecs, or WebAudio trees until the expansion spring settles (backed by a 180ms safety fallback).
- **Velocity Pull-to-Dismiss & Android Back Navigation:** Pulling down on the workspace header smoothly scales (`1.0` -> `0.90`) and dismisses on flick velocity (`>550px/s`) or drag offset (`>90px`). Full integration with Android hardware back-button listener.
- **4K UHD (2160p) 30 FPS Studio Master Compressor:** New `4k-30fps-master` preset, dedicated framerate selector (30 / 60 / 24 / source FPS), target resolution ladder up to 4K UHD (2160p), and "Force Target / Upscale" toggle with memory-safe WebAssembly FFmpeg execution.
- **ZenoTap Glide Typing System:** Continuous gesture trajectory buffer with dynamic 22dp drag threshold, multi-candidate spatial scoring, and real-time canvas ribbon preview.
- **Production Build & CI Hardening:** Replaced deprecated `lucide-react` imports with zero-dependency standalone SVG icons, ensuring 100% clean builds across Vercel and GitHub Actions.

---

## 💎 What's New in v1.0.15 (Streamlined Media Engine & Dynamic Version Synchronization)

- **Decommissioning of Defunct Downloader:** Removed external scrapers to eliminate YouTube token/cipher breakage and network timeouts, keeping the workstation 100% self-contained and on-device.
- **Dynamic Version Synchronization:** Resolved legacy version string discrepancies across `footer.tsx` and `keyboard-deck-manager.tsx`, dynamically synchronizing all layers to official release `v1.0.15`.
- **Focused WebAssembly Media Workstation:** Enhanced zero-cloud transcoding in Media Converter, high-efficiency compression, and instant GIF creation.
- **20-Module Audio DSP Studio:** Full access to sample-accurate waveform trimming, interactive audio splicing, 5-tier bass boost, modular FX rack, ringtone creator, and spatial 8D audio engine.

---

## 💎 What's New in v1.0.14 (In-App Mini Browser & Floating VidMate Action Button)

- **In-App Mini Browser & Omnibox:** Complete web browsing experience embedded inside the Downloader with back, forward, reload, and home controls, omnibox input with auto-prefixing, DuckDuckGo search fallback, and progress tracking.
- **Floating VidMate-Style Download Action Button (FAB):** Persistent circular action button that pulses with cyber-glow animation when media is detected on the current webpage.
- **1-Tap Quality Sheet Trigger:** Tapping the FAB automatically captures the active page URL and opens `<VidmateQualitySheet />` with direct audio and video options.
- **Quick Site Portal Deck:** 8 one-tap bookmarks for YouTube, TikTok, Instagram, Facebook, X/Twitter, Reddit, Vimeo, and SoundCloud.

---

## 💎 What's New in v1.0.13 (VidMate-Grade Downloader & Remuxer Architecture)

- **16-Packet Sliding Window Monotonic PTS Sorter:** Solves B-frame negative PTS / out-of-order CTS offsets in `MediaMuxer.writeSampleData()` on H.264/AVC and VP9 streams.
- **Sequential HTTP/2 Range Streaming:** Video-first (5% -> 65%), on-disk integrity verification (>10KB), and audio-second (65% -> 88%) chunking eliminates CDN edge socket resets.
- **Headless WebView `shouldInterceptRequest` Sniffer:** Intercepts live `googlevideo.com` streams with native Proof of Origin (`pot=`) tokens and `ytInitialPlayerResponse`.
- **VidMate Quality Sheet & Instant Audio Handoff:** 2-column radio grid for Music (MP3 320k/160k, M4A) and Video (360p to 4K 60FPS) with 1-tap handoff to Media Converter.

---

## 💎 What's New in v1.0.12 (Complete 20-Module Audio Engine & DSP Overhaul)

ZenoDeck v1.0.12 delivers a ground-up architectural overhaul of the entire 20-module audio suite, unifying all modules under `UnifiedAudioStudio` with live Web Audio auditioning and precision offline WASM rendering:

- 🎛️ **Full 20-Module Routing Unification**: Audio Cutter, MP3 Editor, Ringtone Maker, Slowed + Reverb, and Audio Effects now route directly into `UnifiedAudioStudio`, sharing real-time waveform scrubbing, Web Audio DSP auditioning, preset selector modals, and instant Save Result dialogs.
- ✂️ **Pro Precision Cutter & Splicer Deck**: Dual-mode cutter supporting **Keep Selection (Trim)** and **Cut Out Middle (Splice Removal)**, ±0.1s micro-step nudges, zero-crossing boundary snapping, region looping, and sample-accurate 60fps live audible fades.
- 📱 **Ringtone Quick-Duration Bar**: 1-tap presets for 30s Call Ringtones, 25s iPhone Tones, 5s Notifications, and 15s Alarm Loops with automatic fade shaping and optimal format encoding (MP3 320kbps / M4A).
- ⚡ **Real-Time Granular Pitch Shifter**: Stereo Hann-windowed dual-delay pitch transposer (-12 to +12 semitones) changing musical pitch in real time during audition without altering playback tempo or speed.
- 🏛️ **True IR Convolver Reverb & 135Hz Crossover Vocal Remover**: Deterministic algorithmic impulse response convolution, phase-aligned 2-band crossover vocal removal that preserves punchy kick drums and sub-bass (<135Hz), 10-band ISO standard equalizer, and master brickwall safety peak limiting.
- 🧪 **100% Pass Rate Across All 217 E2E Tests + 20-Module Verification**: Complete test suite and verification scripts exit 0 cleanly with zero errors.

---

## 🚀 Download & Installation (v1.0.20)

All release binaries are signed with release keys, shrunk with ProGuard/R8, and ready for installation:

| Platform / Target | Download Link | Target Device | Binary Size |
| :--- | :--- | :--- | :--- |
| **📱 Universal Android APK** | [**app-universal-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.20/app-universal-release.apk) | All Android Phones & Tablets (ARM64, ARMv7, x86_64) | **~72.9 MB** |
| **⚡ ARM64-v8a APK** | [**app-arm64-v8a-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.20/app-arm64-v8a-release.apk) | Modern 64-bit Android Phones (Pixel, Samsung, OnePlus) | **~45.9 MB** |
| **📱 ARMv7a APK** | [**app-armeabi-v7a-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.20/app-armeabi-v7a-release.apk) | Legacy 32-bit Android Phones | **~41.3 MB** |
| **💻 x86_64 APK** | [**app-x86_64-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.20/app-x86_64-release.apk) | Android Tablets, Chromebooks & Emulators | **~47.2 MB** |
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
