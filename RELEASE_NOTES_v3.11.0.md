# 🚀 ZenoDeck Release Notes — v3.11.0

> **Studio-Grade Audio DSP Suite: Modular Multi-FX Rack, Multi-Band Mastering & 4-Track Stem Separation**  
> *Release Date:* October 10, 2026  
> *Commit / Tag:* `v3.11.0`  
> *Architecture:* 100% Client-Side Web Audio API + WebAssembly (WASM) + Capacitor 8 Android Shell + Next.js 16

---

## 🌟 Highlights of Release v3.11.0

### 1. ⚡ Modular Real-Time Audio Multi-FX Rack
- **7 Discrete Studio-Grade DSP Slots**:
  - **Dynamic Bass Booster**: 5 tiers with harmonic clarity shelving and automatic headroom compensation (-55% of boost) to eliminate cone flapping and clipping.
  - **10-Band ISO Graphic Equalizer**: Octave center frequencies (32 Hz to 16 kHz) with selective band bypass optimization.
  - **Analog Tape Saturation**: Warmth and harmonic drive modeling via soft-knee saturation (`asoftclip`).
  - **Stereo Spatial Widener**: Soundstage enhancement with mid-side processing and ambient width.
  - **Acoustic Reverb**: 8 real-world room models from intimate chambers to cathedrals.
  - **Auto-Panner**: Automated rhythmic panning with sine and triangle LFO wave modulation.
  - **True-Peak Master Limiter**: Lookahead brickwall peak limiting with customizable ceiling (-2.0 to -0.1 dBFS).
- **Zero-Latency Monitoring**: Real-time Web Audio API node cascade with 20ms de-zippering on slider moves to prevent clicks, pops, and zipper noise.
- **A/B Global Bypass**: Single-tap bypass allows instant wet/dry sound comparison.
- **1-Pass Offline Master Render**: Chained FFmpeg WASM compilation produces pristine master audio in MP3, WAV, FLAC, OGG, or M4A formats.

### 2. 🎚️ Multi-Band Mastering Engine
- **3-Band Linkwitz-Riley Crossover**:
  - Sub-Bass split at 160 Hz, Mid Presence up to 3.5 kHz, and High Treble Air.
- **Industry Loudness Compliance (EBU R128)**:
  - **Streaming (-14 LUFS, -1.0 dBFS ceiling)**: Calibrated for Spotify, Apple Music, and YouTube Music.
  - **Club / EDM (-9 LUFS, -0.2 dBFS ceiling)**: High-impact loudness with controlled sub-bass excursion.
  - **Audiophile (-18 LUFS, -1.5 dBFS ceiling)**: Uncompressed dynamic range for classical and jazz acoustic fidelity.
  - **Broadcast / Voice (-16 LUFS, -1.0 dBFS ceiling)**: Dialogue presence tuned for podcasts, radio, and streaming commentary.
- **Subsonic DC Guard & Analog Warmth**: 22 Hz 2-pole subsonic filter prevents DAC overload, paired with optional tape soft-clip saturation.

### 3. 🎙️ 4-Track Stem Separation & Multi-Track Mixing Desk
- **Discrete 4-Stem Decomposition**:
  1. 🎙️ **Vocals**: Out-of-phase stereo cancellation with formant-focused bandpass (300 Hz–4 kHz) and air presence.
  2. ⚡ **Bass**: 4th-order 24dB/oct Linkwitz-Riley low-pass (<180 Hz) with mono folding for sub-bass phase coherence.
  3. 🥁 **Drums & Percussion**: High-transient attack extraction focusing on 2.5 kHz–8 kHz snare slap and 60 Hz–120 Hz kick punch.
  4. 🎸 **Instruments / Backing**: Center vocal attenuation with ambient stereo widening.
- **Single-Pass WASM Compilation**:
  - Utilizes `asplit=4` in FFmpeg `-filter_complex` to decompose all four stems in a single file pass, cutting execution time by ~65%.
- **Interactive Mixing Console**:
  - Independent Solo, Mute, Volume Fader (-36 dB to +6 dB), and Stereo Pan (-1.0 to +1.0) controls per channel.
  - **Quick Macros**: Instant Acapella Solo and Karaoke Instrumental presets.
  - **Direct Stem Export**: Download isolated individual stems or rendered stem mixes with a single tap.

### 4. 🎛️ Unified Workstation Architecture & Navigation
- **3-Mode Header Switcher**: Seamlessly toggles between **13 Standalone Modules**, **⚡ Modular FX Rack**, and **🎙️ 4-Track Stems** within `UnifiedAudioStudio.tsx`.
- **Shared Audio Pipeline**: File upload and playback audition state are shared across all 3 workstation modes without reloading the audio track.
- **Dedicated Route Aliases**: Direct access via `/fx-rack` and `/stem-separator` across web navigation, app shell, and workstation ribbon.

---

## 🧪 Quality & Verification Matrix

| Test Suite / Gate | Coverage | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Validation** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~5s |
| **FX Rack & Mastering Engine Tests** | LUFS targets, crossovers, rack chains, stem splits | **59 / 59 (100%)** | ~3s |
| **Studio-Grade DSP Regression Suite** | 13 engines, 8 reverb models, bass tiers, fast-paths | **162 / 162 (100%)** | ~2s |
| **App Updater & Semver Suite** | Version Comparison & Update Cache Invalidation | **12 / 12 (100%)** | ~11ms |
| **Tier 1: Feature Coverage** | Media Processing, Storage, Navigation, Audio | **62 / 62 (100%)** | ~11ms |
| **Tier 2: Boundary & Corner Cases** | 0-byte, 2GB+, Malformed URLs, ID3v2.3 Sync | **36 / 36 (100%)** | ~6ms |
| **Tier 3: Cross-Feature Combinations**| Stream Proxy Routing, Worker Allocation, Slice Reassembly | **17 / 17 (100%)** | ~4ms |
| **Tier 4: Real-World Scenarios** | InnerTube Resolution, CDN Range Streaming, MP3 ID3 Tagging | **23 / 23 (100%)** | ~5.8s |
| **Total Test Suite Execution** | Universal End-to-End Test Suite | **138 / 138 (100%)** | ~5.8s |

---

## 📦 Verified Release Artifacts

| Platform / Binary | Direct Download Link | Target Arch / Environment |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.11.0/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android phones, tablets, and emulators. |
| **⚡ Android ARM64-v8a APK** | [**zenodeck-v3.11.0-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.11.0/zenodeck-v3.11.0-arm64-v8a.apk) | Dedicated lightweight build for modern 64-bit ARM phones (Pixel, Galaxy, OnePlus, Xiaomi). |
| **📱 Android ARMv7a APK** | [**zenodeck-v3.11.0-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.11.0/zenodeck-v3.11.0-armeabi-v7a.apk) | Dedicated lightweight build for legacy 32-bit Android smartphones. |
| **💻 Android x86_64 APK** | [**zenodeck-v3.11.0-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.11.0/zenodeck-v3.11.0-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the live web host. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant launch in modern desktop and mobile browsers. Zero installation required. |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.11.0)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.11.0) | Full release notes, raw SHA256 checksums, and source tarballs. |
