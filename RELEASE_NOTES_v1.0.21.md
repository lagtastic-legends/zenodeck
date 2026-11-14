# ZenoDeck & ZenoTap v1.0.21 Release Notes

**Release Date:** November 14, 2026  
**Version:** `1.0.21` (`versionCode 10021`)  
**Package:** `zenodeck`  
**Git Tag:** `v1.0.21`  

---

## 🌟 Executive Summary

ZenoDeck v1.0.21 introduces the **Precision Audio Cutter & Waveform Splicer Deck** with microsecond-accurate time steppers, adaptive `HH:MM:SS.ms` formatting, and complete removal of the 30-second duration cap. This release also resolves the web/mobile `net::ERR_BLOCKED_BY_RESPONSE` security boundary on video platforms and enhances the Universal Media Downloader with resilient cloud stream fallback.

---

## 🛠️ Highlights & Core Features

### 1. 🎵 Precision Audio Cutter & Waveform Splicer Deck
- **Adaptive Dynamic Timestamp Formatting (`audio-dsp.ts`)**:
  - Automatically formats timestamps as `MM:SS.ss` for audio $< 1\text{ hour}$ (e.g. `00:45.25`, `02:04.50`) and `HH:MM:SS.ss` for tracks $\ge 1\text{ hour}$ (e.g. `01:01:05.12`, `02:03:04.05`).
  - Roundtrip numeric split and parse fidelity across hours, minutes, seconds, and milliseconds.
- **Unrestricted Full-Track Audio Access**:
  - Eliminated the hardcoded 10-second and 30-second duration caps across all audio tools.
  - Supports full editing of tracks of any length (up to 3+ hours).
- **Segmented Precision Time Inputs (`PrecisionAudioCutterDeck.tsx`)**:
  - Dual numeric consoles for Start Offset and End Timestamp with individual steppers for `[ Hr ] : [ Min ] : [ Sec ] . [ ms ]`.
  - Quick-jump markers: `[⏮ 0:00]`, `[📍 At Playhead]`, `[⏭ Full End]`.
  - Multi-tier nudging buttons: `-1s`, `-100ms`, `+100ms`, `+1s`.
- **4 Cutout Action Modes**:
  - `✂️ Keep Selection (Trim)`: Retains the chosen region with click-free S-curve acoustic fades.
  - `🪚 Cut Out Middle (Splice)`: Removes the chosen region and splices head and tail seamlessly.
  - `🔇 Mute Selection (Silence)`: Replaces the selection with digital silence (`volume=0`) while preserving absolute duration and track timing.
  - `📐 Surgical Envelope (Fade Only)`: Preserves the entire audio track with S-curve fade-in up to In-Point and fade-out from Out-Point.
- **Interactive Dual-Range Waveform Scrubber**:
  - Visual dual-handle scrubber track featuring live In-Point and Out-Point drag handles, active colored selection band, real-time playhead needle, and live selection duration indicator.
- **Unified Across Workstations**:
  - Synchronized across both the flagship `UnifiedAudioStudio.tsx` and the standalone `audio-editor.tsx`.

---

### 2. 🌐 In-App Browser Framing Sandbox & ERR_BLOCKED_BY_RESPONSE Fix
- **Authorized Embed Player Transition (`mini-browser-view.tsx`)**:
  - Automatically converts YouTube video links into YouTube's authorized embedding domain (`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`), completely bypassing `X-Frame-Options: SAMEORIGIN` and `CSP: frame-ancestors 'self'` headers with 100% playback fidelity.
- **ZenoDeck Protected Web Portal Hub**:
  - For domain root browsing (`m.youtube.com`, `instagram.com`, `tiktok.com`), replaces broken Chromium error pages (`net::ERR_BLOCKED_BY_RESPONSE`) with an interactive, high-tech station offering 1-click **Open Site in New Tab**, **Sniff Page Media**, and direct video link pasting.
- **Native Android APK Coordination**:
  - Operates seamlessly with the native hardware-accelerated `Dialog` WebView (`ZenoMedia3.openInAppBrowser`) for top-level native browsing without framing restrictions.

---

### 3. ⚡ Universal Downloader Resilient Cloud Stream Fallback
- **Cloud Datacenter Bot Protection Handling (`innertube.ts`)**:
  - Resolved YouTube datacenter IP stream restrictions (`LOGIN_REQUIRED`) for cloud-hosted environments (e.g. `https://youtu.be/J0YZQNgkf9Y`).
- **Resilient Fallback Ladder**:
  - `resolveYouTubeWebFallback()` extracts video metadata and serves all 10 standard quality tiers (1080P, 720P, 480P, 360P, and 6 specialized audio tiers from 320k MP3 to WAV PCM) without throwing unhandled exceptions.

---

## 🧪 Verification Matrix

| Verification Suite | Check | Result |
| :--- | :--- | :--- |
| **test-audio-cutter-precision.ts** | Adaptive format, split/parse roundtrip, 4 cutout modes, 2hr track | **PASS (100%)** |
| **test-web-youtube-fallback.ts** | Resilient cloud fallback metadata and 10 quality tiers | **PASS (17/17)** |
| **test-v1-0-21-release.ts** | Version parity across 5 sources, Changelog, Release notes | **PASS (100%)** |
| **test-dsp-studio-grade.ts** | 13 audio DSP modules, 188 filter test cases | **PASS (188/188)** |
| **npm run typecheck** | Zero TypeScript errors (`tsc --noEmit`) | **PASS (0 errors)** |
| **Full E2E CI Suite (31 suites)** | 225+ tests across all 4 tiers | **PASS (100%)** |
| **Production Web Build** | Next.js production build (`next build --webpack`) | **PASS (17/17 routes)** |
| **Mobile Export & Android Build** | `build:mobile` + `assembleRelease` | **PASS (4 APKs compiled)** |

---

## 📱 Staged Android Release Binaries

All 4 signed, architecture-specific Android Release APKs are compiled and staged in `apks/`:

| Binary | Target Architecture |
| :--- | :--- |
| `apks/app-universal-release.apk` | Universal (ARM64, ARMv7, x86_64) |
| `apks/app-arm64-v8a-release.apk` | ARM64-v8a (Modern Android phones) |
| `apks/app-armeabi-v7a-release.apk` | ARMv7a (32-bit Android phones) |
| `apks/app-x86_64-release.apk` | x86_64 (Emulators & ChromeOS) |
