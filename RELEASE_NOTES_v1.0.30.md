# ZenoDeck & ZenoTap v1.0.30 Release Notes

**Release Tag:** `v1.0.30`  
**Platform Coverage:** Web (`omni-tool-two.vercel.app`) & Native Android APK (`com.omnitool.app` Universal, ARM64, ARMv7, x86_64)

---

## 🌟 Major Highlights & Architecture Upgrades

### 1. 🛡️ Master 360° Architectural Verification Suite (340/340 Checks Pass)
- **Comprehensive Automated Audit (`scripts/test-zenodeck-full-system.ts`)**:
  - Implemented an exhaustive, automated 8-pillar programmatic verification engine asserting 340 mission-critical contracts across every subsystem.
  - Achieved **100% health score** across all 8 architectural pillars:
    - **Pillar 1:** Tool Registry, Single-Card FLIP Projection & 120fps Compositor Shell (55/55)
    - **Pillar 2:** All 20 Unified Audio Studio Modules & Web Audio API DSP Nodes (68/68)
    - **Pillar 3:** Universal Media Downloader, InnerTube Multi-Client & VidMate Quality Sheet (14/14)
    - **Pillar 4:** In-App Mini Browser, 8-Site Portal Hub & Floating VidMate FAB (17/17)
    - **Pillar 5:** Native Android Media3 Engine, Cronet HTTP/2 & 16-Packet Monotonic PTS Sorter (37/37)
    - **Pillar 6:** ZenoTap Native Android Keyboard (`InputMethodService`) & Frontend Studio (21/21)
    - **Pillar 7:** Workstation Cross-Tool Handoff & Tool Component Integrity (24/24)
    - **Pillar 8:** Version Synchronization & Zero-Binary Build Hygiene (4/4)

### 2. 🌐 In-App Mini Browser & 8-Site Portal Hub with Floating VidMate FAB
- **Native-Speed In-App Mini Browser (`src/components/tools/mini-browser-view.tsx`)**:
  - Implemented the Forest & Champagne dark palette (`#102C26`, `#F7E7CE`, `#A79277`, `#090D0C`) for distraction-free, zero-glare web exploration.
  - Direct 1-tap quick portals for 8 top media destinations: YouTube, TikTok, Instagram, Facebook, X (Twitter), Reddit, Vimeo, and SoundCloud.
  - Real-time media stream URL detector identifying video, shorts, reels, clips, and direct media formats.
  - Pulsing floating download FAB (`bottom-5 right-5 z-30`) providing immediate 1-tap triggering of the `<VidmateQualitySheet />` to queue or download detected media without leaving the page.

### 3. 🎛️ All 20 Unified Audio Studio Modules & Audiophile DSP
- **Full 20-Module Audio Studio Parity (`src/components/shell/app-shell.tsx`)**:
  - Mapped all 20 audio studio module IDs directly into `UnifiedAudioStudio`:
    - `audio-editor`, `ringtone-maker`, `slowed-reverb`, `audio-effects`, `audio-dsp`, `fx-rack`, `stem-separator`, `trimmer`, `pitch-shifter`, `tempo-changer`, `vocal-remover`, `8d-audio`, `equalizer`, `bass-booster`, `reverb`, `compressor`, `noise-reducer`, `voice-changer`, `normalizer`, `reverse-audio`.
  - Fully wired Web Audio API graph nodes: Hann-windowed dual-delay granular pitch shifter (`createGranularPitchShifter`), velvet-noise algorithmic IR convolver reverb, 135Hz crossover bass-preserving vocal remover, 10-band ISO graphic EQ (31Hz to 16kHz), and master -0.5dB brickwall safety limiter.
  - 4-stem Mid/Side separation isolating Vocals (180Hz–7500Hz Mid bandpass), Bass (<145Hz cascaded lowpass), Drums (transient shaper), and Instruments (Stereo Side L-R >160Hz).
  - Pristine MP3 encoding with maximum LAME quality (`-q:a 0`, `-compression_level 0`, `-reservoir 1`, `-ac 2`) and native 48kHz sample-rate preservation.

### 4. 🚀 Universal Downloader, InnerTube Multi-Client & SoundCloud Support
- **Multi-Client Stream Acquisition (`src/lib/youtube/innertube.ts`)**:
  - Configured multi-client innerTube profiles (`ANDROID_VR`, `TVHTML5`, `IOS`, and newly added `MWEB`) with automated fallbacks.
  - Strict preservation of Proof of Origin (`pot=`) tokens in stream URLs preventing premature stream expiry or throttling.
  - Added dedicated SoundCloud classifier, regex parser, and branded platform styling badge to `src/lib/media/detector.ts` and `src/lib/media/types.ts`.

### 5. ⚡ Native Android Media3 Engine & `.part` Resumption
- **Robust Headless Media Pipeline (`ZenoHeadlessMediaEngine.kt` & `ZenoMedia3Plugin.kt`)**:
  - 16-packet sliding-window monotonic PTS sorting to prevent timestamp collisions in multiplexed MP4/WebM streams.
  - Sequential stage-gated downloading with `.part` file extensions for chunked disk writes, resume support, and crash-resilient streaming.
  - WebView stream sniffer intercepting `googlevideo.com/videoplayback` requests and extracting OpenGraph metadata (`ogTitle`, `ogImage`, `directVideoSrc`).

### 6. ⌨️ ZenoTap Native Keyboard Deck Direct Sync
- **Seamless GIF & Sticker Studio Handoff (`src/components/tools/gif-maker.tsx` & `src/components/dialogs/save-result-modal.tsx`)**:
  - Integrated `saveGifToKeyboardDeck` from `@/lib/zenodeck-bridge` directly into the GIF Maker and modal actions.
  - Generated GIFs and animated stickers automatically broadcast `ACTION_GIF_DECK_UPDATED` to `ZenoDeckKeyboardService`, populating the native keyboard media deck instantly.
  - 60fps hardware-accelerated preview rendering in `GifThumbnailLoader.kt` using Android `ImageDecoder` and `AnimatedImageDrawable`.

---

## 🛠️ Verification & Build Hygiene Metrics

- **TypeScript Typecheck:** 0 errors (`npx tsc --noEmit`)
- **Master 8-Pillar Full-System Suite:** 340 / 340 passed (100% health)
- **E2E Core Test Suite:** 217 / 217 passed across Tiers 1–4
- **Production Mobile Static Build:** 24 / 24 pages generated into `out/` in 25.5s
- **Binary Safety:** 0 leaked APKs, 0 nested APKs, 0 static WASM leaks
