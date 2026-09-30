# 🚀 ZenoDeck v3.6.0 — Audio DSP Studio, Multi-Platform Downloader & Performance Engine

**Release Date:** September 28, 2026  
**Codename:** *Sonic Forge*

---

## 📦 Download

| Platform | Link | SHA-256 Checksum |
|:---|:---|:---|
| **🌐 Web App** | [omni-tool-two.vercel.app](https://omni-tool-two.vercel.app) | `Live PWA · Zero Install` |
| **📱 Android APK** | [zenodeck.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.0/zenodeck.apk) (24.07 MB) | `DF86519C272B98BBF0EE2F2599952AC7B876ECD0F9BC5DA3890E2C6F591F9D5F` |
| **🏷️ Versioned APK** | [zenodeck-v3.6.0.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.0/zenodeck-v3.6.0.apk) | `DF86519C272B98BBF0EE2F2599952AC7B876ECD0F9BC5DA3890E2C6F591F9D5F` |
| **🍏 iOS Profile** | [zenodeck.mobileconfig](https://omni-tool-two.vercel.app/api/ios-profile) | `Apple Web Clip Configuration` |

---

## 🎛️ Audio DSP Studio & Equalizer Suite

A production-grade real-time audio processing studio integrated directly into the Mini Player.

### 10-Band Graphic Equalizer
- **ISO Standard Frequencies**: 32 Hz, 64 Hz, 125 Hz, 250 Hz, 500 Hz, 1 kHz, 2 kHz, 4 kHz, 8 kHz, 16 kHz
- **±12 dB Precision Gain** per band with de-zippered coefficient smoothing
- **Interactive Vertical Sliders** with real-time gain readouts and touch-optimized targets

### Dynamic Bass Boost
- Low-shelf filter with soft-clipping compression and automatic headroom compensation
- Configurable cutoff (60–120 Hz) and gain (0–18 dB) without distortion or digital clipping

### Real-Time 8D Spatial Audio
- Circular LFO orbital panning with configurable speed (0.1–1.0 Hz)
- Haas-effect micro-delay (22ms) with pinna highpass filter for immersive surround simulation

### Vocal Isolation & Removal
- **Acapella Mode**: Center-channel extraction using bandpass + mid-sum matrix with sub-bass preservation
- **Karaoke Mode**: OOPS phase cancellation removing center-panned vocals while retaining stereo mix

### Studio Interface
- **10 Curated DSP Presets**: Flat, Bass Boost, Vocal Boost, Club/EDM, Rock, Pop, Classical, 8D Spatial, Acapella, Karaoke
- **A/B Bypass Switch**: Zero-glitch 20ms exponential crossfade for instant comparison
- **Live Spectrum Visualizer**: Canvas-based real-time frequency analyzer powered by AnalyserNode
- **Zustand Persistent State**: DSP settings survive app restarts via localStorage

### FFmpeg WASM Mastering Engine
- Offline high-fidelity audio export with active EQ, bass boost, spatial, and vocal settings baked in
- Export to **320 kbps MP3** or **uncompressed 16-bit WAV**
- Mastered files appear in the Download History Vault with an **"EQ MASTER"** badge

---

## 🌍 Universal Multi-Platform Media Downloader

Download media from **5 platforms** through a single unified URL input:

| Platform | Capabilities |
|:---|:---|
| **YouTube** | Video (up to 4K 60FPS), Audio (MP3/M4A/WAV), Subtitles, Playlists |
| **TikTok** | Watermark-free video extraction with `vt.tiktok.com` / `vm.tiktok.com` short URL support |
| **Instagram** | Reels, Posts, and IGTV video downloads |
| **Twitter / X** | Status video extraction from both `x.com` and `twitter.com` |
| **Reddit** | Video + DASH audio merging with `redd.it` short URL resolution |

- **Automatic Platform Detection**: Paste any URL — ZenoDeck identifies the platform and routes to the correct extractor
- **Platform-Specific Badges**: Each download tagged with source platform in the History Vault

---

## ⚡ Performance Engine Upgrade

### WASM Multithreading (SharedArrayBuffer)
- **Global Cross-Origin Isolation**: `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` now served on all routes
- Unlocks `SharedArrayBuffer` for FFmpeg WASM to utilize **all available device CPU cores**

### Zero-Encode Audio Extraction
- **Stream Copy (`-c:a copy`)** for M4A extraction — rips the raw AAC bitstream without re-encoding
- **~100x faster** than transcoding for compatible source containers
- **Dynamic Thread Injection**: Reads `navigator.hardwareConcurrency` and injects `-threads N` into all FFmpeg commands

### Hybrid Execution Bridge (Capacitor)
- New `mediaEngine.ts` with unified `mediaEngineExec()` API
- **Web**: Routes to `@ffmpeg/ffmpeg` WASM with automatic thread injection
- **Native (Android/iOS)**: Routes to native FFmpeg plugin, bypassing the browser sandbox entirely
- **Automatic Fallback**: If native plugin unavailable, gracefully falls back to WASM
- **Telemetry**: `getEngineInfo()` reports platform, thread count, cross-origin isolation status

---

## 📱 Native Android 120Hz Smooth Touch Scrolling Engine

Completely overhauled the APK touch gesture and viewport architecture to eliminate Android WebView scroll freezing:
- **1:1 Responsive Viewport**: Replaced desktop overview mode with native 1:1 hardware pixel scaling (`setUseWideViewPort(false)` & `setLoadWithOverviewMode(false)`).
- **Nested Scrolling Architecture**: Scoped workstation overflow clipping to desktop (`lg:`), unlocking the document window scroll container for mobile phones.
- **Hardware Kinetic Momentum**: Enabled `OVER_SCROLL_IF_CONTENT_SCROLLS`, `nestedScrollingEnabled(true)`, and `-webkit-overflow-scrolling: touch` for buttery 120Hz flings and swipe gestures across all Android devices.
- **Modern CSS Scroll Containment**: Migrated from `overflow-x: hidden` to modern `overflow-x: clip` with `touch-action: manipulation`, ensuring gestures that begin on buttons, cards, or waveforms scroll smoothly without delay.

---

## 🧪 Test Coverage

| Suite | Tests | Status |
|:---|:---|:---|
| Core E2E | 100 | ✅ Pass |
| YouTube Engine | 44 | ✅ Pass |
| M2 Muxing | 36 | ✅ Pass |
| M3 Native Save | 33 | ✅ Pass |
| Subtitles & Vault | 23 | ✅ Pass |
| Multi-Platform Downloader | 22 | ✅ Pass |
| DSP M1 Unit Tests | 111 | ✅ Pass |
| DSP E2E (4-Tier) | 125 | ✅ Pass |
| **Total** | **494** | **✅ 100%** |

- `npx tsc --noEmit` → **0 errors**
- `npm run build:mobile` → **Clean static export**
- `gradlew assembleRelease` → **BUILD SUCCESSFUL**

---

## 📁 New Files in This Release

| File | Purpose |
|:---|:---|
| `src/lib/audio/dsp-types.ts` | ISO 10-band frequencies, types, presets, and utility functions |
| `src/lib/audio/dsp-engine.ts` | Web Audio API DSP engine singleton with full signal chain |
| `src/lib/audio/dsp-store.ts` | Zustand persistent store for DSP state |
| `src/lib/audio/mastering-engine.ts` | FFmpeg WASM mastering with filter chain mapping |
| `src/components/tools/dsp-studio-panel.tsx` | Interactive equalizer deck UI with spectrum visualizer |
| `src/lib/media/perf-utils.ts` | Thread injection, stream copy detection, audio extraction args |
| `src/lib/media/mediaEngine.ts` | Hybrid WASM/native execution bridge |
| `scripts/test-dsp-m1.ts` | DSP Milestone 1 unit test suite (111 tests) |
| `scripts/test-audio-dsp-e2e.ts` | DSP E2E 4-tier test suite (125 tests) |

---

## 🔄 Upgrade Path

This is a **non-breaking** upgrade from v3.5.0. All existing features, downloads, and vault history are preserved. The DSP Studio panel is accessible via the new equalizer toggle button in the Mini Player transport controls.

---

**Full Changelog**: [`v3.5.0...v3.6.0`](https://github.com/lagtastic-legends/zenodeck/compare/v3.5.0...v3.6.0)
