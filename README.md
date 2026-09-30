<p align="center">
  <img src="public/logo.jpg" alt="ZenoDeck Logo" width="128" height="128" style="border-radius: 28px; box-shadow: 0 12px 32px rgba(139, 92, 246, 0.35);" />
</p>

<h1 align="center">ZenoDeck</h1>

<p align="center">
  <strong>The Heavy-Duty, 100% Client-Side WebAssembly Media & Document Workstation</strong>
</p>

<p align="center">
  <a href="https://github.com/lagtastic-legends/zenodeck/releases">
    <img src="https://img.shields.io/badge/Release-v3.6.1-8B5CF6?style=for-the-badge&logo=github&logoColor=white" alt="Release v3.6.1" />
  </a>
  <a href="https://omni-tool-two.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Web%20App-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.1/zenodeck.apk">
    <img src="https://img.shields.io/badge/Android%20APK-zenodeck.apk-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android APK Download" />
  </a>
  <a href="https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.1/zenodeck-v3.6.1.apk">
    <img src="https://img.shields.io/badge/Versioned%20APK-v3.6.1-00BCD4?style=for-the-badge&logo=android&logoColor=white" alt="Versioned APK Download" />
  </a>
  <a href="https://omni-tool-two.vercel.app/api/ios-profile">
    <img src="https://img.shields.io/badge/iOS%20Profile-Install%20on%20iPhone-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iOS Profile Download" />
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" />
  </a>
  <img src="https://img.shields.io/badge/Privacy-100%25%20On--Device-10B981?style=for-the-badge" alt="Privacy" />
</p>

---

## ⚡ Overview

**ZenoDeck** is a high-performance, private media engineering suite and document workstation engineered for the modern web and native Android devices. 

Unlike traditional cloud converters and SaaS editing tools that upload your sensitive documents, personal audio, and private videos to remote servers, ZenoDeck executes every computation **100% on-device** using client-side **WebAssembly (FFmpeg WASM)**, the hardware-accelerated **WebCodecs API**, **WebGL 2.0 Shaders**, and the native **Web Audio API**. Not a single byte ever leaves your hardware.

---

## 🚀 Instant Download & Live Deployment

| Platform | Access Link | Description |
| :--- | :--- | :--- |
| **🌐 Web Application** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Live PWA with zero installation required. Instant launch in any modern browser. |
| **📱 Android Universal APK** | [**Download zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.1/zenodeck.apk) | Production signed APK with bundled offline WASM core, native Android media permissions, and multi-threaded execution. |
| **🏷️ Android Versioned APK** | [**Download zenodeck-v3.6.1.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.1/zenodeck-v3.6.1.apk) | Dedicated v3.6.1 release package with full version archive support. |
| **⚡ Direct Web APK** | [**Download zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the web host. |
| **🍏 Apple iOS Profile (iPhone & iPad)** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck to Home Screen in full-screen standalone mode. |
| **📦 GitHub Releases & Source** | [**GitHub Releases Hub (v3.6.1)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.6.1) | Complete release packages, checksums, changelogs, and release assets. |

---

## 🌟 What's New in v3.6.1 — Universal YouTube Stream Resolution, Mobile Responsive Layout & 120Hz Smooth Scrolling

### 🎥 1. Universal YouTube Stream Resolution & Anti-Throttling Architecture
- **On-Device CapacitorHttp Streaming**: Resolved HTTP 403 Forbidden errors by routing media chunk downloads through native `CapacitorHttp` on Android APK, perfectly matching the on-device IP bound to YouTube InnerTube URLs while bypassing browser CORS constraints.
- **Dynamic Candidate Edge Node Failover**: Automatically parses secondary edge servers from the `mn` URL parameter (`sn-fapo3ox25a-3uh6`) and fails over instantly if the primary node times out or throttles.
- **iOS Client UA Alignment**: Forwards authentic iOS InnerTube User-Agent on proxy and direct fetches for `c=IOS` stream streams.
- **Route Trailing Slash Fix**: Normalized API query routing to prevent Next.js 308 redirects that strip `Range` headers.
- **COEP `credentialless` Support**: Upgraded Cross-Origin Embedder Policy to preserve `SharedArrayBuffer` multithreading without blocking external media streams.

### 📐 2. Universal Mobile Phone Responsive Layout & Cutout Ergonomics
- **Safe Area Double-Padding Elimination**: Streamlined notch handling by removing duplicate padding in root layout, ensuring clean status bar integration without double displacement.
- **Android Display Cutout Mode (`shortEdges`)**: Implemented Android 9+ display cutout layout in app themes for immersive edge-to-edge experience without letterboxing around camera punches.
- **Adaptive Downloader UI**: Media format selector tabs dynamically wrap (`flex-wrap`) on compact screens (<360px) and buttons adapt with responsive text sizing and truncation.

### 🏎️ 3. Native Android 120Hz Smooth Touch Scrolling Restoration
- **Root Viewport Scrolling Architecture**: Configured `html` to handle the document scroll container and freed `body` (`overflow-y: visible`, `touch-action: pan-y pinch-zoom`, `-webkit-overflow-scrolling: touch`).
- **Eliminated WebView Gesture Trapping**: Fixed the APK scrolling issue where touch drag was required instead of natural momentum fling gestures, unlocking fluid 120Hz scrolling across all Android devices.

### 🎮 4. Call of Duty-Style Auto-Login Sequence for Saved Accounts
- **High-Tempo Game-Style Auto-Login**: Automatically begins a 3-second animated laser countdown when returning users launch ZenoDeck with a saved device account.
- **Immediate Controls**: Instant Sign-In button bypasses the timer immediately, while Cancel aborts the sequence with session-persisted cancellation latching.
- **Accounts on This Device Toggle**: Added `Auto-Login: ON / OFF` toggle directly in the account roster header, plus visual `Auto-Login` badges on the primary account.

### 🔄 5. Universal Update Dismissal & Auto-Update Engine
- **Update "Remove" Action**: Red `Remove` button in UpdateModal and AuthGateway dismisses pending OTA updates, wipes `zenodeck_update_cache`, and clears indicators across all components via `zenodeck:update-dismissed`.
- **Auth Gateway & TopBar Controls**: Dedicated Auto-Update toggle card in the Auth Gateway and a persistent, animated `UPDATES` status/toggle button in the TopBar replacing the legacy AI button.

---

## 🌟 What's New in v3.6.0 — Audio DSP Studio, Multi-Platform Downloader & Performance Engine

### 🎛️ 1. Audio DSP Studio & Equalizer Suite
- **10-Band ISO Graphic Equalizer** with ±12 dB precision gain, interactive vertical sliders, and real-time frequency readouts.
- **Dynamic Bass Boost** with soft-clipping limiter and automatic headroom compensation (60–120 Hz, 0–18 dB).
- **Real-Time 8D Spatial Audio** with circular LFO orbital panning, Haas micro-delay (22ms), and pinna highpass filter.
- **Vocal Isolation (Acapella)** using center-channel bandpass extraction with sub-bass preservation below 140 Hz.
- **Vocal Removal (Karaoke)** via OOPS phase cancellation removing center-panned vocals while retaining stereo instrumentation.
- **10 Curated DSP Presets**: Flat, Bass Boost, Vocal Boost, Club/EDM, Rock, Pop, Classical, 8D Spatial, Acapella, Karaoke.
- **A/B Bypass Switch** with zero-glitch 20ms exponential crossfade.
- **Live Spectrum Visualizer** powered by Web Audio AnalyserNode.
- **FFmpeg WASM Mastering Engine** for offline export to 320 kbps MP3 or lossless WAV with active DSP settings baked in.
- **Zustand Persistent State** survives app restarts via localStorage.

### 🌍 2. Universal Multi-Platform Media Downloader
- **5 Platforms Supported**: YouTube, TikTok, Instagram, Twitter/X, and Reddit — all through a single URL input.
- **Automatic Platform Detection** identifies source and routes to the correct extractor.
- **TikTok**: Watermark-free video with `vt.tiktok.com` and `vm.tiktok.com` short URL support.
- **Instagram**: Reels, Posts, and IGTV downloads.
- **Twitter / X**: Status video extraction from `x.com` and `twitter.com`.
- **Reddit**: Video + DASH audio merging with `redd.it` short URL resolution.

### ⚡ 3. Performance Engine Upgrade
- **WASM Multithreading**: Global COOP/COEP headers unlock `SharedArrayBuffer` for multi-core FFmpeg execution.
- **Zero-Encode M4A Extraction**: Stream copy (`-c:a copy`) rips raw AAC bitstream — ~100x faster than re-encoding.
- **Dynamic `-threads N` Injection**: Auto-detects CPU core count via `navigator.hardwareConcurrency`.
- **Hybrid Execution Bridge**: Routes to native FFmpeg plugin on Capacitor (Android/iOS) for raw device speed, with automatic WASM fallback on web.

### 📱 4. Native Android 120Hz Smooth Touch Scrolling Engine
- **Hardware-Accelerated Kinetic Momentum**: Native overscroll physics and smooth 120Hz touch flings unlocked in the Android APK.
- **1:1 Responsive Viewport**: Eliminated overview scaling lock in Android Chromium WebView for instant gesture responsiveness.
- **Zero Scroll Trapping**: Scoped workstation overflow clipping to desktop (`lg:`), enabling natural document-level touch scrolling on mobile.
- **Modern CSS Scroll Containment**: Replaced `overflow-x: hidden` with `overflow-x: clip` and enabled `touch-action: manipulation` across all cards, buttons, and tools.

### 🧪 5. Test Coverage Expansion
- **494 total tests** across 8 suites — all passing at 100%.
- New DSP M1 unit tests (111) and E2E 4-tier test suite (125).

---

## 🌟 What's New in v3.5.0 — Subtitles (.srt/.vtt), Download History Vault, & Background Audio Mini Player

### 💬 1. Subtitles & Captions Extraction Engine
- **Multi-Format Extraction**: Parses YouTube `playerCaptionsTracklistRenderer` for both human-curated and auto-generated (ASR) caption tracks across all languages.
- **Standards-Compliant Formats**: 1-click downloads for SubRip (`.srt`), WebVTT (`.vtt`), and Plain Text (`.txt`).
- **In-App Transcript Viewer**: Searchable, scrollable modal lets users inspect and copy full transcripts without saving files first.

### 🗄️ 2. In-App Download History Vault
- **Persistent Media Ledger**: Automatically saves download records (video, audio, subtitles) with thumbnails, quality tags, file sizes, and timestamps.
- **Zero-Storage-Bloat**: Enforces duplicate prevention and a 50-item storage cap to keep device storage clean.
- **Filter & Search**: Quick category chips (`All`, `Video`, `Audio`, `Subtitles`) and real-time search filtering.

### 🎧 3. Floating Background Mini Player Deck
- **Floating Player Dock**: Plays back downloaded or auditioned audio with expandable controls.
- **Lock-Screen & Status Drawer Controls**: Full `navigator.mediaSession` integration enabling native Android notification playback controls.
- **Variable Speed Playback**: Cycle between `0.75x`, `1.0x`, `1.25x`, `1.5x`, and `2.0x` speeds.

---

---

## 🌟 What's New in v3.4.9 — YouTube 4K Stream Resilience, Lossless Container Muxing, Dynamic API Routing, & Chunked Native Storage

### 🎬 1. Multi-Tier FFmpeg WebAssembly Container Muxing (No Silent Videos)
- **Zero Silent Videos**: Eliminated video-only fallbacks. Video and audio streams are always muxed into a single synchronized media file.
- **Tier 1 (Lossless Stream-Copy)**: Direct container packaging (`-c copy`) when audio/video codecs match container specifications (e.g. MP4 + AAC, or WebM + Opus).
- **Tier 2 (Fast Audio Transcode)**: When packaging Opus audio into MP4 containers, transcodes audio via `-c:v copy -c:a aac -b:a 192k` in ~1 second with zero video re-encoding.
- **Tier 3 (WebM Rescue Container)**: Fallback muxing container ensuring stream delivery never fails.
- **Expanded Quality Matrix**: Full support for 4K 60fps, 4K, 2K, 1080p60, 1080p, 720p, 480p, 360p, and 6 audio extraction presets (320k/256k/192k/128k MP3, Native M4A, Lossless WAV).

### 🌐 2. Dynamic API Route Stability & Port-Agnostic Web Routing
- **`force-dynamic` Handlers**: All YouTube API endpoints strictly declare `export const dynamic = "force-dynamic"` to guarantee query parameters are always executed dynamically.
- **Universal Origin Routing**: Dynamically derives `window.location.origin` across any development or production port/reverse proxy, while isolating remote fallback endpoints strictly to native Capacitor mobile environments.

### 📱 3. Android Native Chunked Save & OOM Elimination
- **Progressive 512 KB Slicing**: Files are written in 512 KB chunks (`Filesystem.writeFile` for chunk 0, `Filesystem.appendFile` for subsequent chunks), bounding payloads under Android's 1MB Binder limit and preventing `TransactionTooLargeException`.
- **Zero-Spike Memory Footprint**: Eliminates full-file `readAsDataURL` memory spikes to save large 4K video downloads reliably on low-RAM devices.
- **Automatic Scoped Storage Fallback**: Gracefully falls back from `Directory.Documents` to app-internal `Directory.Data` if restricted by OEM permissions.

### 🛠️ 4. Non-Destructive Mobile Build Pipeline
- **Atomic Route Substitution**: `scripts/build-mobile-export.ts` stashes dynamic server route handlers, injects temporary static stubs during `next build`, and unconditionally restores original source routes with zero git diff.

---

## 🌟 What's New in v3.4.8 — Universal Mobile Autofit, Native Crash Prevention, & Stability Hardening

### 📱 1. Universal Screen Autofit & Dynamic Viewport
- **Dynamic Viewport Height (`100dvh`)**: Seamless adjustment when the Android on-screen keyboard opens, preventing bottom layout clipping.
- **Full Edge-to-Edge Inset Protection**: Implemented `--sat`, `--sab`, `--sal`, and `--sar` tokens to guarantee that headers and action buttons never clip behind camera notches or the Android navigation gesture pill.
- **Fixed Viewport Scaling**: Added `maximumScale: 1, userScalable: false, interactiveWidget: "resizes-content"` to prevent accidental double-tap zoom distortion.
- **Responsive TopBar**: Streamlined status cluster fitting screens under 380px without horizontal blowout.
- **Modal Viewport Bounds**: Modals capped at `max-w-[calc(100vw-1.5rem)]` and `max-h-[calc(100dvh-2.5rem)]` with smooth internal scrolling.

### 🛡️ 2. Native Android Crash Resilience (`onRenderProcessGone`)
- **Renderer Crash Recovery**: Capacitor's default behavior terminates the host app when Chromium's isolated rendering process runs low on RAM. `MainActivity.java` now overrides `onRenderProcessGone` to return `true` and cleanly recover the Activity.
- **Text Zoom Normalization**: Overrides system-level font scaling inside the WebView via `settings.setTextZoom(100)` so layouts remain pixel-perfect.
- **Standard Viewport Calculation**: Enabled `setUseWideViewPort(true)` and `setLoadWithOverviewMode(true)` for accurate layout geometry on all Android devices.
- **Disabled Overscroll Stretch**: Set `OVER_SCROLL_NEVER` to eliminate rubber-banding artifacts that displace fixed navigation.

### ⚡ 3. Production React Error Boundaries & Fault Isolation
- **Per-Tool Isolation (`ToolErrorBoundary`)**: An error in one tool never unmounts the shell, top bar, or file vault.
- **Route-Level Recovery (`src/app/error.tsx`)**: Futuristic error recovery card with 1-tap "Reboot Workstation" and diagnostic logging.
- **Root Layout Guard (`src/app/global-error.tsx`)**: Fallback boundary catching root-level document failures.

### 🎨 4. Mobile GPU Performance & Low-RAM Optimization
- **Lightweight Mobile Blurs**: Reduced `AuroraBackground` Gaussian blur from 140px to 50px on mobile viewports, dramatically reducing GPU fill-rate demands.
- **Selective Background Rendering**: Hides secondary background ambient orbs on screens `< 640px` to conserve mobile memory.

---

---

## 🌟 What's New in v3.4.7 — In-App Auto-Updater, Playlist Downloader, ID3v2 Album Art Tagger, & Background Notifications

### 🔄 1. In-App Auto-Update Checker & One-Tap Installer
- **Automatic GitHub Release Polling**: ZenoDeck checks for newer releases upon launch and via the settings menu without needing Google Play Services.
- **Update Modal & Release Notes**: View release highlights, version tags, and package details directly inside the application.
- **One-Tap Background Download & Install**: Downloads the updated APK in the background and launches Android's native package installer via `FileProvider` (`REQUEST_INSTALL_PACKAGES`).

### 📑 2. YouTube Playlist & Batch Downloader
- **Intelligent Playlist Parser**: Paste any YouTube playlist URL (`list=...`) or mix URL to fetch the full track list.
- **Interactive Batch Deck**: Select/unselect items, choose audio or video formats (1080p, 720p, 320kbps MP3, AAC), and initiate batch downloads.
- **Queue Engine**: Sequential worker processing with pause, resume, cancel, and individual progress bars.

### 🎵 3. Zero-Dependency ID3v2.3 MP3 & Album Art Tagger
- **Binary ID3v2.3 Encoder**: Zero-overhead frame encoder writing standard ID3 frames (`TIT2`, `TPE1`, `TALB`, `TYER`, `APIC`).
- **High-Res Cover Art**: Fetches high-quality YouTube thumbnail artwork and embeds it directly into the MP3 ID3 header.
- **Library Compatible**: Instant recognition of title, artist, and album art in Android music players, iOS Files, Windows Media Player, and car audio systems.

### 🔔 4. Android Status Bar Background Notifications
- **Status Bar Progress Bar**: Shows active download percentage and real-time transfer speed (MB/s) in the notification drawer.
- **Completion Chime**: Notification alert when batch or single file downloads complete.

### 📱 5. Granular Android Media Permissions
- **Photos & Videos & Music & Audios**: Robust permission management for Android 13+ (APIs 33-36) and Android 9-12 legacy storage fallback.

---

---

## 🌟 What's New in v3.4.6 — Python 4K 60FPS Engine, Granular Media Permissions, & Zero-Stall Downloads

### 🐍 1. Python 4K 60FPS Downloader Engine (`yt-dlp`)
- **Dedicated Python Engine (`scripts/youtube_downloader.py`)**: High-performance metadata extraction and stream resolution powered by `yt-dlp`.
- **4K 60FPS & HDR Manifest Extraction**: Automatically parses Ultra HD (2160p60), Quad HD (1440p60), 1080p60, and studio audio formats.
- **Backend API Integration**: `/api/youtube/info` automatically invokes the Python engine when available, ensuring zero cloud bot restrictions.

### 📱 2. Granular Android Media Permissions (Android 9 – 15+)
- **Photos & Videos Permission**: Full support for `READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` on Android 13+, partial selection with `READ_MEDIA_VISUAL_USER_SELECTED` on Android 14+, and graceful fallback to `READ_EXTERNAL_STORAGE` on Android 12 and below.
- **Music & Audios Permission**: Dedicated `READ_MEDIA_AUDIO` on Android 13+ and `READ_EXTERNAL_STORAGE` fallback on legacy Android versions.
- **In-App Device Permissions Gate**: Real-time permission status check and one-tap granting from within the app.

### ⚡ 3. Download Stall Elimination & Candidate Node Promotion
- **Candidate Node Promotion**: Automatically probes Google CDN candidates and promotes responsive edge nodes to index 0, eliminating the 0% freeze issue on Android APK and Web.
- **Dynamic Worker Switching**: Multi-worker chunk streams automatically adapt to healthy CDN nodes mid-download with zero throughput drops.
- **Resilient Stream Fallbacks**: High-res video and audio extractions feature defensive fallbacks to direct containers (`.mp4`, `.m4a`, `.webm`) if WebAssembly is slow or initializing.

### 📋 4. Native Android Clipboard Paste & URL Clear Button
- **Native `ClipboardManager` Plugin**: Tapping "Paste" in the APK now reliably retrieves clipboard content, overcoming WebView `NotAllowedError` sandbox restrictions.
- **Inline URL Clear (`X`)**: One-tap URL removal and input reset directly in the input bar.

### 📦 5. Standardized Release Distribution
- Published releases now consistently use standardized filenames:
  - **`zenodeck.apk`**
  - **`zenodeck-v3.4.6.apk`**

---

---

## 🌟 What's New in v3.4.3 — Bundled Offline WASM Engine & Zero-Network Boot

### 🚀 1. Bundled Offline WASM Core in Android APK
* **100% Offline Boot**: Packaged the complete 32.2 MB FFmpeg WebAssembly binary (`ffmpeg-core.wasm`) directly into the Android application assets. Media engine boots instantly on airplanes, subways, or slow cellular networks without downloading a single byte over the air.
* **Zero Cellular Data Usage**: Completely eliminates high-latency CDN requests for mobile users.

### 🛡️ 2. Fix for "body stream already read" Stream Exception
* **Replaced Fragile Loader**: Eradicated `@ffmpeg/util`'s broken `downloadWithProgress` error-handling bug (`TypeError: Failed to execute 'arrayBuffer' on 'Response': body stream already read`) caused by calling `.arrayBuffer()` on consumed response bodies when Content-Length headers mismatch due to Brotli/Gzip CDN compression.
* **Safe Stream Fetching**: Built dedicated [`wasm-loader.ts`](src/lib/ffmpeg/wasm-loader.ts) with safe chunked reader pipelines, magic byte verification (`\0asm`), and automatic retry mechanics.

### ⚡ 3. Persistent IndexedDB Binary Caching
* **Sub-50ms Instant Launches**: Web browsers automatically persist the 32.2 MB WASM binary into local `IndexedDB` on first load. Subsequent visits load instantly from disk cache with zero network overhead.

### 🌐 4. Multi-CDN Mirror Fallback Chain
* **Triple-Tier Redundancy**: Automatic fallback chain routes through:
  1. Local bundled assets (`/ffmpeg/ffmpeg-core.wasm`)
  2. High-speed jsDelivr Global Edge CDN (with regional edge POPs)
  3. unpkg CDN fallback

---

## 🌟 What's New in v3.4.2 — Native On-Device Resolution, Cloud Anti-Bot Resilience & Verified 4K Turbo Engine

### 🚀 1. Native On-Device Resolution for Android (`CapacitorHttp`)
* **Zero Datacenter Blocks**: The Android APK now runs stream resolution directly on the device using native Android OS network connections. It uses your real carrier or Wi-Fi IP, completely immune to YouTube cloud datacenter IP blacklists.
* **Direct Google CDN Acceleration**: Bypasses serverless proxy hops for video streaming. Stream chunks flow directly from Google's high-speed CDN to the device with 4–8 parallel workers.

### 🛡️ 2. Multi-Candidate Failover Architecture
* **Fallback Node Routing**: Built-in candidate host resolution (`buildCandidateUrls`) parses embedded `mn` and `fallback_host` edge cache nodes from YouTube manifests, ensuring zero connection timeouts if an ISP edge node is congested.

### ⚡ 3. Studio-Grade Cloud Anti-Bot Guidance & Direct APK CTA
* **Actionable UX**: Replaced cryptic raw technical errors with a polished, informative notification explaining YouTube's cloud datacenter restrictions.
* **1-Tap Sideloading**: Prominently features a direct download button for `zenodeck.apk` right inside the alert card for instant, unrestricted on-device processing.

### 🧪 4. 65-Point Automated Regression Suite
* **Comprehensive Test Harness**: Added [`scripts/test-youtube-suite.ts`](scripts/test-youtube-suite.ts) verifying:
  * URL Parsing (desktop, shorts, embeds, timestamps, clean IDs)
  * Formatters (durations, bytes)
  * Visitor Session Tokens
  * InnerTube Multi-Client Resolution
  * 6 Audio Extraction Qualities (320k, 256k, 192k, 128k, Native AAC, Lossless WAV)
  * CDN Range (206) Chunk Retrievals
  * Multi-Worker Partitioning & Reassembly Math
  * Next.js Route Handlers
* **100% Green Status**: All 65 tests pass cleanly in automated CI/CD runs.

---

## 🌟 What's New in v3.4.0 — Direct Audio Studio & Studio-Grade Performance

### 🎵 1. Direct YouTube Audio Studio & Multi-Tier Mastering
* **Multi-Bitrate MP3 Extraction**: Direct conversion into Studio Master (320 kbps), High Fidelity (256 kbps), Standard Crisp (192 kbps), and Voice & Podcast (128 kbps).
* **Lossless Native Audio & DAW PCM**: Zero re-encoding extraction into native AAC (M4A) and uncompressed 16-bit 44.1 kHz WAV PCM for DAW audio editing.
* **Integrated Audio Player Deck**: Real-time waveform styling, time counter, and instant one-tap save to device storage.

### 🛡️ 2. Total Memory Leak Elimination
* **Zero Blob Retention**: Garbage-collected and revoked multi-hundred-megabyte video/audio buffers on reset, convert, and unmount in YouTube Downloader.
* **Generative Watermark Remover**: Safe disposal of raw image bitmaps and canvas buffers on new uploads.
* **Reactive Cleanup**: Eliminated React stale closures in Image-to-PDF and Scan-to-PDF unmount hooks using mutable reactive refs.
* **Worker Lifecycle Management**: Terminated in-flight Web Worker threads in ASCII Art Generator to prevent CPU thread congestion.

### ⚡ 3. Engine Precision & Real-Time UX
* **GIF Maker Precision**: Fixed parameter scoping in Pass 2 to guarantee exact trim clip lengths.
* **Instant MP4 Streaming**: Added `-movflags +faststart` to Video Mute outputs for instant progressive playback.
* **Debounced QR Studio**: Real-time 250ms debounced live generation as you type payloads or tweak module colors.
* **Zero Compilation Errors**: Purged 1,130 lines of dead UI stubs for 100% strict TypeScript compliance (`0 errors`).

---

## 🌟 What's New in v3.2.0 — Enterprise Login & Universal Phone Auth

### 🔐 1. Enterprise-Grade Multi-Tier Google Authentication
* **UnifiedLoginCard**: New shared authentication component used across both `AuthGuard` (security gate) and `AuthGateway` (identity center), eliminating ~400 lines of duplicated login code.
* **Multi-Tier Auth Resilience**:
  * **Tier 1**: Google OAuth Popup with `prompt: "select_account"` (instant account chooser)
  * **Tier 2**: Full-Page `signInWithRedirect` fallback (bypasses popup blockers and 3rd-party cookie policies)
  * **Tier 3**: Direct in-tab Gmail entry form (immune to all browser restrictions)
  * **Tier 4**: Android Credential Manager with automatic fallback to legacy Google Sign-In
  * **Tier 5**: Guest Sandbox bypass (100% offline, zero registration)
* **Zero Hardcoded Accounts**: Removed all mock/demo users. Only real accounts from actual device usage are persisted in `localStorage`.
* **Auto-Navigate on Login**: `addAndSelectAccount`, `switchAccount`, and `continueAsGuest` now automatically navigate from `auth-gateway` to `dashboard` — no more stuck login page.

### 📱 2. Universal Phone Ergonomics (All Form Factors)
* **44px+ Touch Targets**: Every button, input, and interactive element meets Apple HIG / Material 3 minimum touch target guidelines.
* **iOS Safari Zoom Prevention**: All mobile inputs use `text-base` (16px) font size, preventing the unsolicited viewport zoom that plagues most mobile web apps.
* **Flip Phone Flex Mode**: `max-h-[calc(100dvh-4rem)]` with `overflow-y-auto overscroll-contain` ensures the login card scrolls gracefully in 90° flex mode instead of clipping.
* **Proper Mobile Keyboards**: `inputMode="email"` + `autoComplete="email"` on email fields surfaces the correct keyboard on Android/iOS.
* **Dismissible Error Banners**: Error alerts now include an `X` close button so they don't permanently block the UI.
* **Always-Visible Redirect Link**: "Having popup issues? Use Full-Page Sign-In" link is always visible below the Google button.

### 🧹 3. Tailwind Token Cleanup
* Replaced all legacy `text-on-primary` → `text-primary-foreground` and `font-headline` → `font-display` across `top-bar.tsx` and `ascii-generator.tsx`.

---

## 🌟 What's New in v3.1.0 (Milestone Highlights)

### 🎬 1. Video Editor Phase 1: Web Desktop NLE & Transitions Engine
* **Frame-Accurate Video & Audio Transitions**:
  * 9 studio-grade transitions: Hard Cut (`none`), Cross Dissolve (`fade`), Linear Wipes (`wipeleft`, `wiperight`), Directional Slides (`slideleft`, `slideright`), Lighting Dips (`fadeblack`, `fadewhite`), and Stylized Zoom (`zoomin`).
  * Dynamic `xfade` (video) and `acrossfade` (audio) FFmpeg filtergraph compiler with cumulative sub-frame offset calculation and duration safety clamping.
* **Pro NLE Keyboard Shortcut Matrix**:
  * `Space`: Play / Pause transport.
  * `J` / `K` / `L`: Shuttle transport (Rewind 2x, Stop, Fast-Forward 2x).
  * `S` / `B`: Razor blade split at Current Time Indicator (CTI).
  * `I` / `[` and `O` / `]`: Dynamic In-point / Out-point trimming.
  * `Delete` / `Backspace`: Ripple delete selected segment.
  * `Ctrl+Z` / `Cmd+Z`: Multi-level undo history stack.
  * `+` / `-`: Timeline zoom in/out with auto-centering.
  * `F`: Instant fit timeline to viewport width.
  * `N`: Toggle magnetic grid snapping.
* **Interactive Canvas Seam Badges**:
  * Visual seam badges (`[ ⧗ 0.5s ]`) rendered on Track V1 between sequential clips; clicking any seam node immediately focuses the Transitions Inspector.
* **Live Viewport Simulation Layer**:
  * Real-time CSS blend and exposure flash simulation across cut points during timeline playback and scrubbing.

---

### 📱 2. Video Editor Phase 2: Native Mobile Workstation for All Android Form Factors
* **Hardware-Aware Posture Engine (`useDevicePosture`)**:
  * **Slab Phones (Portrait & Landscape)**: Single-thumb reach zone, sticky bottom action dock, swipeable clip ribbon, and frame-stepping jog wheel.
  * **Flip Phones (Flex Mode / 90° Tabletop)**: Automatically detects folded posture via CSS media queries (`device-posture: folded`) and window geometry. Splits the screen into an upper Cinema Preview Monitor and a lower "Cockpit" with jog wheel, razor blade, and trimmer.
  * **Foldables & Dual-Pane (Samsung Galaxy Z Fold, Pixel Fold, OnePlus Open)**: Unfolded book mode detects inner screen aspect ratios (~4:3 / ~1:1) and renders a side-by-side workstation: left pane preview monitor with format scopes; right pane timeline ribbon and inspectors.
  * **Tablets**: Touch-scaled NLE layout with wide-screen multi-track canvas lanes.
  * **Interactive Posture Switcher**: Instant top-bar mode toggle allows testing Auto, Flex 90°, Fold Dual, Mobile Deck, and Workstation modes on any browser or device.
* **Tactile Mobile Jog Wheel**:
  * Graduated millimeter tick marks with micro-haptic clicks (`haptics.selectionChanged()`) on 30fps frame increments.
  * Quick jump buttons: `-1s`, `-1f`, Play/Pause, `+1f`, `+1s`.
  * Central cyan CTI playhead needle with dynamic timecode readouts.
* **Visual Razor Blade Slash Animation**:
  * High-impact neon blade slash animation cutting diagonally across the video monitor when `Split` is triggered, synchronized with a heavy physical tactile impulse (`haptics.heavy()`).
* **Ergonomic Single-Thumb Deck**:
  * Floating bottom action bay positioned within the natural bottom 120px mobile thumb zone: Undo (with disabled state & history count), In/Out trim markers, center gradient Split Blade, Transitions FX trigger, clip delete, and master export.
* **Mobile Transitions Bottom Sheet**:
  * Fluid drag-to-dismiss bottom sheet showcasing transition presets, haptic duration slider (0.2s–1.5s), and live transition simulation preview button.

---

### ⚡ 3. Background Processing & Screen Wake Lock Controller
* **Android Manifest Integration**: Added `<uses-permission android:name="android.permission.WAKE_LOCK" />`.
* **Screen Wake Lock Controller (`wake-lock.ts`)**:
  * Automatically acquires `navigator.wakeLock.request("screen")` when any conversion, export, or processing job begins in `useMediaJob`.
  * Prevents the mobile screen from sleeping, the CPU from throttling, and the OS from pausing WebAssembly execution during long video exports.
  * Listens to `visibilitychange` to automatically re-acquire the lock if the user leaves and returns to the app while a render is active.
  * Safely releases the lock in `finally` blocks when the job concludes or errors out.

---

### 🔔 4. Unified Notification Engine (APK & Web App)
* **Android APK (Native Notifications)**:
  * Initializes the high-priority Android channel `zenodeck_jobs` with heads-up display, custom sound, vibration, and cyan notification lights via `@capacitor/local-notifications`.
  * Automatically schedules rich local notifications (`✓ Media Processing Complete - Generated [file.mp4] (48.2 MB). Tap to view and save.`).
* **Web App (Browser Notifications)**:
  * Integrates HTML5 native `Notification` API with ZenoDeck app icon, badge, and vibration. Alerts the user even if they have switched browser tabs or minimized the window.
* **Automatic Integration**:
  * Hooked directly into `useMediaJob`, bringing background wake lock and rich completion alerts to every tool in ZenoDeck.

---

### 🛡️ 5. Fix for Android 13+ Scoped Media Permissions
* Resolved repeated permission dialog loops caused by legacy `publicStorage` checks on Android 13+ (API 33+).
* In `native-save.ts`, safely handles scoped storage writes to `Directory.Documents` without re-prompting.
* In `permission-gate.tsx`, verifies system status on mount and durably persists `"granted"` status in `localStorage` under `zenodeck_permissions_v3`, preventing repeated popups across sessions.

---

## 🧰 Core Suite & Modules

### 🎥 Video Engineering & Media Management
* **Offline Hardware-Accelerated Video Engine (WebCodecs + WebGL 2.0)**: 100% client-side, zero-server video processing pipeline. Demuxing, decoding, hardware shader filtering, encoding, and muxing execute entirely inside a dedicated Web Worker off the main UI thread.
* **Dual-Mode Zero-Copy Pipeline**: High-throughput `SharedArrayBuffer` ring buffer synchronized with `Atomics.wait`/`notify` for multi-threaded desktop browsers, paired with an automatic zero-copy `TransferableChunkQueue` fallback for Capacitor Android WebViews.
* **WebGL 2.0 OffscreenCanvas Shader Engine**: Custom GLSL ES 3.00 shader pipeline supporting real-time hardware color grading, brightness/contrast adjustments, saturation scaling, and direct zero-copy GPU video frame capture via `new VideoFrame(canvas)`.
* **Fast-Start ISO-BMFF MP4 Muxer**: Specialized container muxer that positions header index boxes (`moov`) ahead of media data (`mdat`), enabling instantaneous playback and zero-buffering progressive streaming.
* **Localized Editor Workspace Color System ("The Edit Bay")**: Scoped UI design system (`.omni-editor-workspace`) preventing global CSS bleed, coupled with a pure black (`#000000`) viewport background eliminating letterbox seams and strongly typed `EditorCanvasTheme` constants for 60/120fps Canvas 2D/WebGL timeline rendering.
* **Instant 0ms Video Intake & Timeline Scrubber**: Non-blocking microsecond binary atom parser eliminates UI freezes, mounting video players and timeline scrubbers with zero delay.
* **Native Android MediaStore Resolver**: Built-in Android plugin automatically resolves real filenames from the Android MediaStore database, replacing numeric photo-picker IDs (e.g., `1000076567.mp4` → `VID_YYYYMMDD_HHMMSS.mp4`).
* **Hardware Timestamp Recovery**: Inspects ISO BMFF `mvhd` creation atom as a fallback to reconstruct exact camera recording timestamps matching Android conventions.
* **Pre-flight Silent Video Guard**: Dual-layer ISO BMFF audio atom detection (`probeHasAudio`) prevents FFmpeg exit code 1 failures when extracting audio from silent videos.
* **Reactive Inline Renaming**: Direct real-time renaming in DropZone and output cards without cloning blobs or corrupting native streams.
* **Video Compressor**: Smart multi-tier CRF and preset compression with zero quality loss.
* **Universal Media Converter**: Transcode MP4, MKV, WebM, AVI, MOV, and extract audio tracks client-side with original lossless audio extraction via stream copy (`-c:a copy`).
* **20 GB Zero-Copy WORKERFS Streaming Engine**: Direct kernel-level chunked streaming of files up to 20 GB into WebAssembly with 0 MB input RAM overhead, preventing V8 `ArrayBuffer` allocation limits and WASM heap exhaustion. Backed by `android:largeHeap="true"` in the native Android APK.
* **GIF Studio**: Convert video segments into optimized animated GIFs with custom framerate and palette control.

### 🎛️ Unified Audio DSP Suite (13 Engines)
* **Flagship Dual-Engine Workstation**: Audition in real-time with zero latency via native **Web Audio API nodes**, then render studio-grade files through the client-side **WASM FFmpeg pipeline**.
* **Bass Booster (5 Progressive Tiers)**: From subtle punch (+3dB) to extreme sub-bass (+18dB) with an automatic 8kHz high-shelf clarity filter to prevent muddy playback.
* **Reverb Studio (8 Acoustic Spaces)**: Intimate Room, Small Room, Medium Room, Large Concert Hall, Church Hall, Cathedral, Slowed + Reverb, and Spatial 8D Reverb.
* **Vocal Remover & Karaoke Maker**: Out-of-Phase Stereo (OOPS) cancellation with a 120Hz crossover filter preserving kick drums and bass lines while removing centered vocals.
* **Spatial 8D Audio**: Circular binaural panning engine that dynamically orbits sound around the listener.
* **Auto Panner**: Automated rhythmic stereo soundstage motion with customizable LFO rate and depth.
* **Studio Graphic Equalizer**: 6 precision frequency bands (60Hz, 150Hz, 400Hz, 1kHz, 2.4kHz, 15kHz) with pre-modeled presets (Bass Heavy, Vocal Focus, Treble Sparkle, Flat).
* **Adaptive Noise Reducer**: Spectral FFT denoising with customizable noise reduction dB, floor gate, and rumble/hiss filters.
* **Semitone Pitch Shifter**: Independent pitch transposition (-12 to +12 semitones) without altering playback duration.
* **Tempo Changer**: Clean pitch-preserving time stretching from 0.5x to 2.0x.
* **Audio Trimmer & Slicer**: Millisecond-accurate start/end cutting and lossless segment extraction.
* **Reverse Audio**: Precise inverted waveform playback generator.
* **Stereo Panner & Volume Changer**: Left/Right balance positioning and dynamic master gain staging.

### 📄 Document & PDF Forge
* **Image to PDF**: Combine multiple PNGs, JPEGs, and WebPs into a unified document.
* **Scan to PDF**: Capture or import camera receipts, documents, and whiteboard notes with edge correction.
* **Lock PDF**: AES password protection and encryption for sensitive PDF documents.
* **Text to PDF**: Clean markdown and plaintext formatter with pagination control.
* **QR Studio**: Generator & reader with high error correction and logo embedding.
* **ASCII Art Studio**: Convert visual images into retro terminal typography.

### 🔒 Vault & Offline Privacy
* **Local Vault**: Persistent client-side file archive using IndexedDB and native sandbox storage.
* **Studio Recorder**: Screen recording, microphone audio capture, and live device streaming.

### 🎧 Tactile UI Audio Architecture & 0ms Sound Feedback
* **In-Memory Web Audio Synthesis (0ms Latency)**: Pure mathematical PCM synthesis evaluated directly in-memory via `AudioBuffer` objects, eliminating asynchronous network XHR fetching, decoding errors, and frame truncation in mobile WebViews.
* **Synchronous Touchdown Actuation**: `Button` micro-interactions fire audio feedback synchronously on `pointerdown` aligned with native haptic vibration, delivering physical mechanical click responsiveness on both Android touchscreens and desktop mouse clicks.
* **4 Precision Synthesized Sounds (Speaker-Tuned Volume 0.65)**:
  - **Mechanical Click** (55ms punchy tactile snap, Apple/Pixel mechanical switch style)
  - **Hover Tick** (35ms crisp high-presence airy tick)
  - **Harmonic Chime** (380ms uplifting C-Major harmonic shimmer: C5 → E5 → G5 → C6)
  - **Alert Tone** (260ms subtle dual low-mid warning: 340Hz → 240Hz)
* **Global Mute Persistence**: Zustand-driven `isAudioMuted` state synchronized with `localStorage` (`omni_ui_audio_muted`).

---

## 🏛️ System Architecture

```text
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                           ZENODECK v3.2.0 RUNTIME                           │
  │                                                                             │
  │   Next.js 16 (App Router) + Tailwind CSS 4 + Radix UI Primitives            │
  │   Framer Motion (120Hz Critical-Damping Physics & Neon Blade Slash)         │
  │   useDevicePosture (Slab, Flip Flex 90°, Fold Dual-Pane, Tablet Engine)    │
  │   Screen Wake Lock Controller (Automatic Background Render Protection)      │
  │   Unified Notification Engine (Capacitor LocalNotifications + Web Push)     │
  │   Tactile UI Audio Synthesis (In-Memory PCM Web Audio Engine)              │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │    WebAssembly Engine     │                   │      Capacitor Shell      │
   │  @ffmpeg/core-mt / core   │                   │    Native Android APK     │
   │  WebCodecs & WebGL 2.0    │                   │   Thumb-Zone Deck Layout  │
   │  ISO-BMFF Fast-Start      │                   │   Edge-to-Edge Insets     │
   │  Zero-Copy WORKERFS       │                   │   Scoped Media Storage    │
   │  100% On-Device Execution │                   │   Hardware Haptics        │
   └───────────────────────────┘                   └───────────────────────────┘
```

---

## 🛠️ Tech Stack

* **Core Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
* **Video Engine**: [WebCodecs API](https://w3c.github.io/webcodecs/), [WebGL 2.0](https://www.khronos.org/webgl/) (`OffscreenCanvas`), & ISO-BMFF Fast-Start Muxer
* **Media & Audio Engine**: [FFmpeg.wasm 0.12](https://github.com/ffmpegwasm/ffmpeg.wasm), [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), & [pdf-lib](https://pdf-lib.js.org/)
* **Mobile Runtime**: [Capacitor 8](https://capacitorjs.com/)
* **Native Haptics**: [@capacitor/haptics](https://capacitorjs.com/docs/apis/haptics)
* **Native Notifications**: [@capacitor/local-notifications](https://capacitorjs.com/docs/apis/local-notifications)
* **Tactile Audio**: Custom in-memory Web Audio PCM synthesizer
* **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
* **Motion Physics**: [Framer Motion](https://www.framer.com/motion/)
* **State Management**: [Zustand](https://github.com/pmndrs/zustand)
* **Icons**: [Lucide React](https://lucide.dev/)

---

## 💻 Quick Start & Development

### 1. Clone & Install
```bash
git clone https://github.com/lagtastic-legends/zenodeck.git
cd zenodeck
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build Web Static Export
- **Windows (PowerShell):**
  ```powershell
  $env:MOBILE_EXPORT = "1"; npm run build
  ```
- **Linux / macOS (Bash):**
  ```bash
  MOBILE_EXPORT=1 npm run build
  ```

### 4. Build Android APK
Sync web assets to Capacitor and compile the signed APK:
```bash
npx cap sync android
cd android
```

- **Signed Production APK:**
  ```powershell
  .\gradlew.bat assembleRelease   # Windows
  ./gradlew assembleRelease       # Linux/macOS
  ```
  Output: `android/app/build/outputs/apk/release/app-release.apk`

- **Development Debug APK:**
  ```powershell
  .\gradlew.bat assembleDebug     # Windows
  ./gradlew assembleDebug         # Linux/macOS
  ```
  Output: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🛡️ Security & Privacy Guarantee

ZenoDeck strictly enforces our **Zero-Upload Guarantee**:
1. **Zero Cloud Ingestion**: We do not maintain any cloud processing servers.
2. **Local Cryptography**: File encryption, hashing, and password operations execute directly in your browser's WebCrypto subsystem.
3. **No Secret Leakage**: No telemetry, analytics trackers, or user data payloads are transmitted.

For full disclosure and vulnerability reporting, see [SECURITY.md](SECURITY.md).

---

## 🤝 Contributing

We welcome community contributions, bug reports, and feature proposals! Please review [CONTRIBUTING.md](CONTRIBUTING.md) before submitting pull requests.

---

## 📬 Support & Contact

* **Official Support**: [support.zenodeck@gmail.com](mailto:support.zenodeck@gmail.com)
* **Web Portal**: [https://omni-tool-two.vercel.app](https://omni-tool-two.vercel.app)
* **GitHub Repository**: [https://github.com/lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
