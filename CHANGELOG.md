# Changelog

All notable changes to ZenoDeck are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
