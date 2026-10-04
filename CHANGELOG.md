# Changelog

All notable changes to ZenoDeck are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.6.9] — 2026-10-04

### Added & Refined
- **🎛️ Comprehensive Audio Preset Refinement Across All 13 DSP Modules**:
  - **Calibrated Studio Presets**: Systematically overhauled presets across all 13 Web Audio / WASM modules in `AUDIO_TOOLS_CATALOG` (`src/lib/audio-dsp.ts`), providing musically tuned parameter points and descriptive tooltips:
    - **3D / 8D Audio**: *Natural 360° Orbit (8s)*, *Hypnotic Dream (14s)*, *Fast Binaural Whirl (4s)*, *Subtle Ambient Drift (18s)*, *Max Immersion (6s)*.
    - **Auto Panner**: *Lofi Drift (0.15 Hz)*, *Gentle Drift (0.25 Hz)*, *Rhythmic Pulse (0.5 Hz)*, *Fast Tremolo (2.0 Hz)*, *Stereo Strobe (4.0 Hz)*, *Triangle Ping-Pong (1.0 Hz)*.
    - **Bass Booster**: Aligned with the 5 progressive tiers (*Audiophile Warmth +3.5dB*, *Punchy Kick +6dB*, *Deep Club +9dB*, *Heavy Sub 808 +12dB*, *Earthquake Max +15dB*).
    - **Multi-Band Equalizer**: Added *Acoustic Warmth*, *Podcast / Speech*, *Hip-Hop / 808*, and *Loudness Smile* to the existing factory curves.
    - **Noise Reducer**: Profiles for *Subtle Studio Clean (8dB)*, *Podcast Vocal Clean (14dB)*, *Heavy Hiss Kill (22dB)*, *AC & Fan Hum Removal (16dB)*, *Subsonic Guard (6dB)*, and *Cassette Tape Restore (18dB)*.
    - **Pitch Shifter**: Musical intervals expanded to 10 semitone presets (-12 to +12, fifths, minor/major 2nds & 3rds, Nightcore, Chipmunk).
    - **Reverb Studio**: 8 acoustic space models with physical reflection badges (*Tile Acoustic*, *Intimate*, *Studio Live*, *Concert Hall*, *Sanctuary*, *Cavernous*, *Late Night*, *360° Orbit*).
    - **Reverse Audio, Stereo Panner, Tempo Changer, Trimmer, Vocal Remover, Volume Changer**: Calibrated for decibel headroom, EBU R128 loudness normalization, and musical subdivisions.
- **📈 Expanded 6-Band Graphic Equalizer (`src/lib/audio/filters.ts`)**:
  - Expanded `EQ_PRESETS` from 6 to 10 calibrated curves including *Acoustic Warmth*, *Podcast / Speech*, *Hip-Hop / 808*, and *Loudness Smile*.
- **⚡ 1-Click Interactive Preset Rails Across All Audio UIs**:
  - **Unified Audio Studio** (`src/components/audio/UnifiedAudioStudio.tsx`): Added a horizontal quick-preset chip rail directly beneath the active tool header with tactile haptics.
  - **Slowed + Reverb** (`src/components/tools/slowed-reverb.tsx`): Added 5 signature chips (*Classic 85%*, *Lofi Chill*, *Late-Night Echo*, *Deep Sludge*, *Subtle Warmth*) with active highlight indicators.
  - **Stereo Panner** (`src/components/tools/stereo-panner.tsx`): Upgraded to 5 standard pan markers (*Hard Left*, *Soft Left -0.35*, *Center*, *Soft Right +0.35*, *Hard Right*).
  - **Ringtone Maker** (`src/components/tools/ringtone-maker.tsx`): Added quick length preset chips (*Alert 5s*, *Classic 20s*, *Standard 30s*, *iOS Max 39s*) with track duration auto-clamping.
- **🧪 100% Automated Test Integrity & Production Build**:
  - Full suite verified: **181/181 checks passing cleanly (100% pass rate)**.
  - Production build compiled successfully with Next.js 16.3.2.

---

## [3.6.8] — 2026-10-04

### Added & Refined
- **🌐 8D Audio Spherical Spatialization (Real-Time Web Audio DSP Graph)**:
  - **3D Spherical Orbit Modeling**: Upgraded orbital LFO from 1D flat panning to full 3D binaural spatialization using azimuth angle \(\theta\) (\(X = \sin\theta\)) and depth (\(Y = \cos\theta\)).
  - **Front/Back Distance Attenuation**: Implemented dynamic direct path attenuation via `spatialDirectGain` to apply \(-1.5\text{ dB}\) to \(-2.0\text{ dB}\) reduction when audio orbits behind the head, eliminating flat lateral sliding.
  - **Contralateral Early Room Reflections**: Wired a dedicated `haasPannerNode` on the 22ms damped (4.5 kHz lowpass) Haas reflection line, steering room reflections to the opposing stereo hemisphere (\(-\text{panX} \times 0.5\)).
  - **Dynamic Rear-Hemisphere Diffusion**: Modulated `haasWetGain` to increase diffuse room reflections by \(+30\%\) to \(+60\%\) when direct sound is behind the listener.
  - **Zero-Glitch De-Zippering & Transparent Reset**: Ramped all spatial parameters with `setTargetAtTime` (25ms–30ms time constants); disabling 8D audio cleanly resets all nodes to transparent unity.
  - **Real-Time Diagnostic Telemetry**: Added `getSpatialDiagnostics()` exposing real-time pan, direct gain, pinna cutoff, Haas reflection gain, and reflection pan.
- **🎚️ Calibrated 8D Profiles in Standalone 8D Tool**:
  - Added 1-click preset selector pills in `Spatial8D` (`src/components/tools/spatial-8d.tsx`):
    - **Natural 360°** (8s cycle · 90% intensity)
    - **Slow Orbit** (12s cycle · 85% intensity)
    - **Hypnotic Dream** (16s cycle · 95% intensity)
    - **Fast Whirl** (5s cycle · 80% intensity)
- **🧪 Expanded Test Suite & Verification**:
  - Expanded `scripts/test-dsp-m1.ts` to 120 tests with assertions verifying pinna frequency limits, distance attenuation ranges, Haas wet gain bounds, contralateral reflection panning, and clean reset states.
  - Total automated CI suite elevated to **167 tests passing (100% pass rate)**.

---

## [3.6.7] — 2026-10-02

### Added
- **🎧 Advanced Audio Processing Suite**:
  - **Phase 1: Slowed & Reverb Engine**:
    - Created `generateSlowedReverbCommand(inputFile, outputFile)` with exact industry-standard filter chain:
      `asetrate=44100*0.85,aresample=44100,aecho=0.8:0.9:1000:0.3`.
    - Lowers playback speed and pitch simultaneously to 85% with 1000ms delay room reverb simulating 100% room-scale late-night acoustics.
  - **Phase 2: 8D Audio Spatial Engine**:
    - Created `generate8DAudioCommand(inputFile, outputFile)` with exact industry-standard filter chain:
      `apulsator=mode=sine:hz=0.08:amount=0.85,aecho=0.8:0.9:1000:0.3`.
    - Implemented binaural orbital circular panning (0.08 Hz / 12.5s cycle at 85% depth) with deep room echo for spatial distance.
  - **Phase 3: Dark-Mode Audio Effects Panel**:
    - Built `AudioEffectsPanel.tsx` in `src/components/audio/AudioEffectsPanel.tsx` using Tailwind CSS and Framer Motion.
    - Prominent dual action buttons: "Apply Slowed & Reverb" and "Convert to 8D Audio".
    - Framer Motion animated progress bar with live percentage counter and WASM stage telemetry.
    - Built-in 3.5s synthetic A-minor harmonic chord generator for zero-input instant testing.
    - Interactive HTML5 audio player preview with volume control and one-click saving via `nativeSave`.
    - Registered under `audio-effects` in `TOOL_REGISTRY` and dynamically code-split in `AppShell`.
  - **🧪 37-Point Automated Verification Suite**:
    - Added `scripts/test-audio-effects-engine.ts` validating exact filter strings, argument arrays, CLI syntax, error handling, and UI exports.
    - Integrated into `npm run test:ci` and `npm run test:all`.

---

## [3.6.6] — 2026-10-02


### Added & Fixed
- **⚡ WebAssembly Engine In-Memory Transfer**:
  - Replaced legacy base64 data-URL string serialization over Worker messages with zero-copy `wasmBinary` transfer.
  - Eliminated cold-start OOM failures and dropped engine boot time to ~1.9s.
- **⏱️ 120-Second Compilation Watchdog & Offline Cache Protection**:
  - Extended watchdog timer from 45s to 120s with live countdown diagnostics to accommodate heavy JIT compilation on mobile hardware.
  - Protected IndexedDB WASM offline cache from premature eviction on timeout.
- **🛡️ Eradication of React Error #185 (Workstation Module Fault) in Vault**:
  - Memoized callback handlers in `VaultView` (`handleClosePreview`, `handleDelete`).
  - Implemented ref-backed `onClose` in `VaultPreviewModal` to prevent cascading effect loops on back button overlay registration.
  - Standardized `useSyncExternalStore` dummy subscription to a static singleton.
- **🏎️ Atomic Zustand Selectors & Shell Decoupling**:
  - Converted `AppShell`, `DesktopSidebar`, `StickyMobileCta`, and `WorkstationRibbon` to atomic selectors (`useNavStore((s) => s.view)`).
  - Back navigation queues (`overlays`, `dirtyGuards`, `stepHandlers`) are now completely decoupled from shell chrome rendering.
- **🌐 SSR Hydration Guarding**:
  - Protected dynamic auth state rendering in `TopBar` with client-mounted check, eliminating server/client HTML mismatches.

---

## [3.6.5] — 2026-10-01

### Added & Fixed
- **📱 Multi-Architecture APK Builds for All Android Phones**:
  - Added Gradle ABI splits for `arm64-v8a`, `armeabi-v7a`, and `x86_64`, alongside the universal APK.
  - Automatic publishing of all architecture assets to GitHub Releases.
- **🤖 AI Assistant (Ask Zeno) Route Hardening**:
  - Canonical trailing slash routing to `/api/ai/` to prevent Next.js 308 redirect loops.
  - Resilient multi-tier model failover (`gemini-3.8-flash` ➔ `gemini-3.6-flash` ➔ `gemini-flash-lite-latest` ➔ `gemini-flash-latest`).
- **🔘 Circular Remove Button in Update Modal**:
  - Dedicated circular icon button for dismissing update alerts and clearing update cache.

---

## [3.6.2] — 2026-09-30

### Added
- **Universal Android APK for All Phone Form Factors**:
  - Full compatibility across compact phones (<360px), tall aspect ratio slabs (19.5:9, 20:9, 21:9), foldables, and flip phones (Samsung Galaxy Z Flip Flex Mode 90°).
  - Android Display Cutout Mode (`shortEdges`) for notch and punch-hole cameras without letterboxing.
  - 120Hz Hardware Kinetic Momentum touch scrolling with zero gesture trapping in Chromium WebView.
  - Call of Duty-style auto-login sequence with 3s laser countdown, instant sign in, cancel latching, and master toggle.
  - Universal update removal action ("Remove" button) with cache cleansing and instant cross-component notification sync.
  - Persistent Auto-Update controls in Auth Gateway and TopBar status button.
  - Permanent Vercel & CI peer-dependency protection via `.npmrc` (`legacy-peer-deps=true`) and `vercel.json`.

---

## [3.6.1] — 2026-09-30

### Added
- **Call of Duty-Style Auto-Login Engine**:
  - High-tempo 3-second animated laser progress bar countdown upon app launch for saved accounts on device.
  - "Instant Sign In" override and session-persisted "Cancel" latch (`zenodeck_autologin_cancelled`).
  - `Auto-Login: ON / OFF` master toggle directly in the "Accounts on this device" header.
  - Visual gold `Auto-Login` badge on primary account.
- **Universal Update Removal & Dismissal**:
  - Red "Remove" button with `Trash2` icon in `UpdateModal` and `AuthGateway`.
  - Purges `zenodeck_update_cache` from `localStorage`, logs dismissal timestamp, and fires `zenodeck:update-dismissed` event.
- **Auto-Update Engine Controls**:
  - Dedicated "Automatic Updates" card in `AuthGateway` with ON/OFF switch, installed version tag, and on-demand check button.
  - Animated `UPDATES` button in `TopBar` replacing legacy AI button, featuring rotating sync icon and emerald status pulse.
- **Universal Multi-Candidate YouTube Stream Resolution**:
  - CapacitorHttp native chunk fetching on Android APK, eliminating HTTP 403 Forbidden errors and CORS restrictions by matching device IP to stream ticket.
  - Dynamic `mn` edge node parsing and automated candidate node failover.
  - iOS InnerTube User-Agent alignment (`com.google.ios.youtube/20.10.4`).
- **120Hz Hardware Kinetic Momentum & Touch Scrolling**:
  - Root viewport scrolling delegation via `html { overflow-x: clip; scroll-behavior: smooth; }` and `body { overflow-y: visible; touch-action: pan-y pinch-zoom; }`.
  - Eliminated Android Chromium WebView touch gesture trapping.
- **Universal Mobile Phone Responsive Layout**:
  - Android display cutout mode (`shortEdges`) for notch and punch-hole cameras.
  - Dynamic wrapping (`flex-wrap`) and adaptive sizing for compact phones (<360px).

---

## [3.6.0] — 2026-09-30

### Added
- **Audio DSP Studio & Equalizer Suite**:
  - 10-Band ISO Graphic Equalizer (32 Hz to 16 kHz) with ±12 dB precision gain.
  - Dynamic Bass Boost with soft-clipping limiter and headroom attenuation (60–120 Hz, 0–18 dB).
  - Real-Time 8D Spatial Audio with circular LFO orbital panning, Haas micro-delay (22ms), and pinna highpass filter.
  - Vocal Isolation (Acapella) center-channel bandpass extraction with sub-bass preservation.
  - Vocal Removal (Karaoke) OOPS phase cancellation.
  - 10 Curated DSP Presets with A/B zero-glitch bypass crossfade (20ms).
  - Live Web Audio AnalyserNode spectrum visualizer.
  - FFmpeg WASM mastering export to 320 kbps MP3 with ID3v2.3 tags or lossless WAV.
- **Universal Multi-Platform Media Downloader**:
  - Unified URL input supporting YouTube, TikTok (watermark-free), Instagram (Reels/Posts), Twitter/X, and Reddit (video + DASH audio muxing).
- **FFmpeg Multithreading & Performance Engine**:
  - Cross-Origin-Embedder-Policy `credentialless` & COOP `same-origin` unlocking `SharedArrayBuffer`.
  - Zero-encode M4A stream-copy extraction (`-vn -c:a copy`) ~100x faster than re-encoding.
  - Dynamic `-threads N` injection from `navigator.hardwareConcurrency`.
  - Hybrid execution bridge for native Capacitor plugins.

---

## [3.5.0] — 2026-09-27

### Added
- **Subtitles & Captions Extraction Engine**:
  - Multi-language subtitle tracks (.srt, .vtt, .txt) with in-app transcript viewer.
- **In-App Download History Vault**:
  - Local IndexedDB media ledger with category filtering, search, and 50-item storage cap.
- **Floating Background Audio Mini Player**:
  - Background playback with `navigator.mediaSession` lockscreen/notification controls and 0.75x–2.0x playback speeds.

---

## [3.4.9] — 2026-09-27

### Added
- **3-Tier WebAssembly Container Muxing**: Lossless stream-copy (`-c copy`), fast audio transcode (`-c:v copy -c:a aac`), and WebM rescue container.
- **Progressive 512 KB Slicing**: Android chunked write/append preventing IPC `TransactionTooLargeException`.

---

## [3.4.8] — 2026-09-26

### Added
- Universal mobile autofit and viewport keyboard displacement prevention.
- Safe Area insets (`env(safe-area-inset-top)`) and notch compliance.

---

## [3.4.7] — 2026-09-26

### Added
- Python backend downloader fallback for stubborn restricted YouTube streams.
- Audio DSP mastering engine test harness.

---

## [3.3.0] — 2026-09-25

### Added
- **Dedicated YouTube 4K 60fps Turbo Downloader section (`youtube-downloader`)**:
  - Full support for YouTube URLs (standard watch, youtu.be, shorts, embeds, and video IDs).
  - High-resolution adaptive stream extraction supporting **4K 60fps (2160p60)**, **2K 60fps (1440p60)**, **1080p60**, 720p, 480p, and Studio Audio MP3 (320kbps).
  - Multi-worker concurrent Range chunk acceleration (`Range: bytes=start-end`) across 4–8 parallel threads, bypassing single-connection CDN throttling for insane download speeds.
  - Zero-reencoding, lossless FFmpeg WASM stream-copy muxing (`-c copy`) that merges 4K video and high-bitrate audio streams in 1–2 seconds with zero audio/video desync.
  - Dark Cyber HUD interface featuring real-time download speed gauge (in MB/s), active worker thread counters, dynamic ETA timer, and stream size badges.
  - One-tap native saving via `nativeSave` directly to device storage on both Desktop and Android APK.
- Added `"red"` accent support to `ToolMeta` accents and workstation ribbon navigation.
- Bumped Android `versionCode` to `330` and `versionName` to `"3.3.0"`.

---

## [3.2.0] — 2026-09-22

### Added
- **UnifiedLoginCard component** — single shared authentication card used by both `AuthGuard` and `AuthGateway`, eliminating ~400 lines of duplicated login UI code
- **Full-page Google redirect sign-in** (`signInWithRedirect`) as a persistent fallback when popup windows are blocked by the browser or cross-origin cookie policies
- **"Having popup issues?" link** — always-visible redirect fallback below the primary Google sign-in button
- **Dismissible error banners** with an `X` close button so auth errors don't permanently block the login UI
- **Android Credential Manager** with automatic graceful fallback to legacy `signInWithGoogle` for pre-Android 14 devices

### Changed
- **Responsive phone ergonomics**: 44px+ minimum touch targets on all interactive elements (Apple HIG / Material 3 compliant)
- **iOS Safari zoom prevention**: mobile inputs now use `text-base` (16px) font-size, preventing unsolicited viewport zoom
- **Flip phone flex mode support**: login card uses `max-h-[calc(100dvh-4rem)]` with `overflow-y-auto overscroll-contain` for 90° tabletop mode
- **Mobile keyboard optimization**: email fields use `inputMode="email"` + `autoComplete="email"` to surface the correct keyboard
- **Auto-navigation on login**: `addAndSelectAccount`, `switchAccount`, and `continueAsGuest` now programmatically navigate from `auth-gateway` to `dashboard`
- Replaced legacy Tailwind tokens: `text-on-primary` → `text-primary-foreground`, `font-headline` → `font-display`
- Bumped Android `versionCode` to `320` and `versionName` to `"3.2.0"`

### Removed
- **Hardcoded mock accounts** (`DEFAULT_SUGGESTED_ACCOUNTS`) — the saved accounts list now starts empty and only contains genuine accounts the user has signed in with

### Fixed
- **Video to audio extraction quality**: integrated `aresample=async=1000` PTS timestamp synchronization and explicit stereo downmix (`-ac 2`), eliminating stutter, robotic glitches, and dropped dialogue packets in converted video files
- **Audio extraction studio bitrate & trimming**: added 320 kbps high-fidelity bitrate option, standardized 44.1kHz output, and enabled visual trimming directly within the audio extraction workflow
- **Bass Booster anti-tearing DSP engine**: re-engineered low-end filter with 28Hz subsonic rumble filter, Butterworth low-shelf response, dynamic pre-gain headroom attenuation, and Auto-Sub-Band Control (ASC) lookahead limiting to completely eliminate digital clipping and audio tearing
- **Refined Bass Booster tier list**: replaced plain buttons with 5 acoustically calibrated tiers (Warmth +3dB, Punchy +6dB, Deep Club +9dB, Heavy Sub +12dB, Earthquake +15dB) featuring real-time anti-clip status and frequency targets
- **Stuck login page after OAuth**: view remained on `auth-gateway` after successful popup/redirect sign-in because `navigate("dashboard")` was never called
- **Cross-tab OAuth failure**: mobile browsers opening popups as unlinked tabs (`window.opener === null`) no longer results in a dead login — redirect flow and direct Gmail entry provide 100% coverage
- **`signInWithGoogleRedirect`** now handles `auth/unauthorized-domain` with a user-friendly error message instead of a raw Firebase exception

---

## [3.1.1] — 2026-09-21

### Changed
- Published Play Store AAB and signed APK via GitHub Actions release workflow
- Version bump to align web and Android releases

---

## [3.1.0] — 2026-09-20

### Added
- **Video Editor Phase 1**: Web desktop NLE with 9 studio-grade transitions, JKL shuttle transport, keyboard shortcuts, seam badges, and live viewport simulation
- **Video Editor Phase 2**: Native mobile workstation with hardware posture detection (slab, flip 90°, foldable dual-pane, tablet), tactile jog wheel, razor blade slash animation, and ergonomic single-thumb deck
- **Background Processing**: Screen Wake Lock Controller prevents CPU throttling and display sleep during exports
- **Unified Notification Engine**: Native Android notifications + Web push alerts on job completion
- **Android 13+ Scoped Storage Fix**: Resolved permission dialog loops on API 33+
- Production-ready PWA, signed APK, and Play Store AAB

---

## [3.0.0] — 2026-09-18

### Added
- Complete Next.js 16 migration (App Router)
- Tailwind CSS v4 design system overhaul
- 13-engine audio DSP suite with dual Web Audio + FFmpeg WASM pipeline
- 20 GB zero-copy WORKERFS streaming engine
- WebCodecs + WebGL 2.0 hardware-accelerated video pipeline
- Capacitor 8 native Android shell with edge-to-edge insets
- Tactile UI audio synthesis engine (in-memory PCM, 0ms latency)

[3.2.0]: https://github.com/lagtastic-legends/zenodeck/compare/v3.1.1...v3.2.0
[3.1.1]: https://github.com/lagtastic-legends/zenodeck/compare/v3.1.0...v3.1.1
[3.1.0]: https://github.com/lagtastic-legends/zenodeck/compare/v3.0.0...v3.1.0
[3.0.0]: https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.0.0
