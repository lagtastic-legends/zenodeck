# ZenoDeck v3.5.0 — Subtitles/Captions (.srt/.vtt), In-App Download History Vault, & Background Audio Mini Player

> **Release Date:** September 27, 2026  
> **Tag:** `v3.5.0`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Direct APK Downloads:**  
> - [**`zenodeck.apk`**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.5.0/zenodeck.apk) (Universal Latest Release)  
> - [**`zenodeck-v3.5.0.apk`**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.5.0/zenodeck-v3.5.0.apk) (Versioned Release Archive)  
> - [**Direct Web Mirror**](https://omni-tool-two.vercel.app/zenodeck.apk)  

---

## 🚀 Overview

**ZenoDeck v3.5.0** introduces a major upgrade to the YouTube Media Suite, elevating the user experience from a one-off downloader to a full-featured media management and playback workstation:

1. **Subtitles & Closed Captions Engine**:
   - Multi-language subtitle track auto-detection from YouTube InnerTube.
   - TimedText parser supporting both structured `json3` and XML cues.
   - Clean entity unescaping with pre-sanitization HTML tag stripping to preserve angle-bracket content.
   - 1-click export to SubRip (`.srt`), WebVTT (`.vtt`), and Plain Text (`.txt`).
   - Integrated full transcript search and in-app modal previewer.

2. **In-App Download History Vault**:
   - Persistent client-side vault tracking all downloaded videos, audios, and subtitle files.
   - 50-item storage cap and deduplication preventing local quota bloat.
   - Category filtering (`All`, `Video`, `Audio`, `Subtitles`) and instant keyword search.
   - Direct audio auditioning and 1-click entry deletion.

3. **Background Audio Mini Player Deck**:
   - Floating glassmorphism player dock accessible from both Downloader and Vault views.
   - Full `navigator.mediaSession` integration enabling Android status bar and lock-screen playback controls (Play, Pause, Seek, Skip).
   - Speed rate multiplier controls (`0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
   - Interactive track scrubber with elapsed and total duration indicators.

---

## 📦 What's New in v3.5.0

### 💬 1. Subtitles & Captions Extraction (`src/lib/youtube/subtitles.ts`)
- Automatically unrolls `captionTracks` from InnerTube player responses for both human-crafted and auto-generated (ASR) streams.
- Accurate millisecond-to-timestamp formatters:
  - SubRip format: `00:01:23,456`
  - WebVTT format: `00:01:23.456`
- Interactive Transcript Modal lets users read and copy transcripts without needing to download files first.

### 🗄️ 2. Download History Vault (`src/lib/youtube/history-store.ts`)
- Zustand store with local persistence and SSR-safe fallback storage.
- Records title, thumbnail, format badge, file size, download timestamp, and audio preview URLs.
- Seamlessly records items upon download completion and subtitle export.

### 🎧 3. Floating Background Mini Player (`src/components/tools/youtube-mini-player.tsx`)
- Floating pill dock with expandable playback tray.
- Leverages the Web Audio / Media Session standard for background notification playback and lock-screen metadata.
- Allows continuous listening while navigating between tools or outside the browser tab on Android.

---

## 🔒 Verification & Package Checksums

| File | Size (Bytes) | SHA-256 Checksum |
| :--- | :--- | :--- |
| **`zenodeck.apk`** | 25,227,719 | `220CBBA7B8CE3D1A3276826369219C0F2CE63FA5C9F1692B0E398EA539D1AB1C` |
| **`zenodeck-v3.5.0.apk`** | 25,227,719 | `220CBBA7B8CE3D1A3276826369219C0F2CE63FA5C9F1692B0E398EA539D1AB1C` |

- **Comprehensive Test Suite**: 236/236 Passed (100%) (`npm run test:all`)
- **TypeScript Compilation**: Passed with 0 errors (`npx tsc --noEmit`)
- **Android Target**: Android 14 (API 34) / Min SDK Android 8.0 (API 26)
- **Signing**: Release v1 + v2 signed with production keystore.
