# ZenoDeck v1.0.38 Release Notes

**Release Date:** November 23, 2026  
**Build:** Universal Release APK (`versionName 1.0.38`, `versionCode 10038`)  
**Engine:** Studio Audio DSP Engine, WebAudio & FFmpeg WASM Core, Zero-Latency Android IME, Capacitor 6.0, Next.js / React 19

---

## 🌟 Executive Overview
ZenoDeck v1.0.38 brings the studio-calibrated **3-Stage 8D Spatial + Slowed & Reverb DSP Engine** (`1. Tempo Changer -> 2. 8D Spatial Panner -> 3. Stereo Reverb`) to both the real-time WebAudio auditioning engine and offline FFmpeg export pipeline. Additionally, this release stabilizes the **Universal Media Downloader** by eliminating the 5% download freeze caused by multi-worker chunk contention on mobile devices and standardizing direct-to-disk OPFS streaming.

---

## 🚀 Key Features & Architectural Upgrades

### 1. 🎧 3-Stage 8D Spatial + Slowed & Reverb DSP Engine
- **Bit-Accurate WebAudio & FFmpeg Parity**: Seamless audio processing whether auditioning live at 120fps or rendering offline via FFmpeg WebAssembly.
- **Stage 1 — Tempo Changer**:
  - True analog tape speed/pitch downshift to `0.87x` (Studio Balanced) or `0.84x` (Deep Hypnotic) with `preservePitch: false`.
- **Stage 2 — 8D Spatial Panner with 120Hz Mono Bass Anchor**:
  - **120Hz Frequency Crossover Splitter**: Splits audio into sub-bass (<120Hz) and spatial mid/high (≥120Hz) paths.
  - Sub-bass is summed strictly to mono center (`lowpass=f=120,pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1`), preserving punchy kick drum and 808 transient dynamics.
  - Spatial band rotates in 360° binaural space via `0.12Hz` sine LFO modulation (`8.33s` full orbit), `88%` pan depth, `0.35ms` Haas micro-delay, and `7200Hz` rear-shadow low-pass filter.
  - Recombined via `amix=inputs=2:weights=1 1:normalize=0`.
- **Stage 3 — Stereo Reverb**:
  - **35ms Pre-Delay**: Delays wet reflections by 35ms, keeping lead vocals and transients crisp and distinct without wash or smear.
  - **140Hz Wet High-Pass Filter**: Cuts low-end mud from reverb tails, keeping sub-bass clean.
  - **65% High-Frequency Damping**: Emulates analog magnetic tape roll-off at `~4.8kHz`.
  - **-5.5dB Wet Gain & Peak Limiter**: Headroom-preserving wet mix finalized through a `-0.5dB` true-peak safety limiter (`alimiter=limit=0.944`).

### 2. 🎛️ Studio Presets & Quick-Chain Action
- **Preset A (`8D Spatial + Slowed & Reverb (Studio Balanced)`)**:
  - `tempo: 0.87`, `orbitRateHz: 0.12` (8.33s), `panDepth: 0.88`, `haasDelayMs: 0.35`, `rearHeadLowpassHz: 7200`, `bassMonoCrossoverHz: 120`.
  - `preDelayMs: 35`, `reverberance: 46`, `roomScale: 92`, `hfDamping: 65%`, `wetGainDb: -5.5dB`, `wetHighPassHz: 140Hz`.
- **Preset B (`8D Spatial + Slowed & Reverb (Deep Hypnotic)`)**:
  - `tempo: 0.84`, `orbitRateHz: 0.09` (11.1s), `panDepth: 0.94`, `haasDelayMs: 0.45`, `rearHeadLowpassHz: 5800`, `bassMonoCrossoverHz: 120`.
  - `preDelayMs: 28`, `reverberance: 56`, `roomScale: 100`, `hfDamping: 70%`, `wetGainDb: -4.0dB`, `wetHighPassHz: 150Hz`.
- **1-Tap Quick-Chain Pill**:
  - Added `[ 🎧 + 🌙 Combine 8D Spatial + Slowed Reverb ]` in both 8D Audio and Slowed & Reverb decks in `UnifiedAudioStudio.tsx`.

### 3. 🚀 Universal Media Downloader Hardening
- **5% Freeze Resolution**: Eliminated mobile thread exhaustion and TCP socket aborts by deprecating multi-worker chunk slicing on mobile.
- **Direct-to-Disk OPFS Streaming**: Clean, uninterrupted single-pass streaming directly to the Origin Private File System with RAM-safe chunking and instant container muxing.
- **Streamlined UI**: Removed obsolete worker thread selectors in favor of an optimized, high-throughput pipeline.

---

## 🧪 Verification & Quality Assurance
- **Full CI Test Suite**: All 50+ automated test suites pass 100% green (`npm run test:ci`).
- **TypeScript Typecheck**: Zero errors (`tsc --noEmit`).
- **Native Android Build**: Zero Kotlin compiler errors (`./gradlew compileDebugSources`).
- **Native APK Compilation**: Universal and per-ABI release APKs assembled with ProGuard/R8 optimization (`./gradlew assembleRelease`).
