# ZenoDeck v3.4.9 — YouTube 4K Stream Resilience, Lossless Container Muxing, Dynamic API Routing, & Chunked Native Storage

> **Release Date:** September 27, 2026  
> **Tag:** `v3.4.9`  
> **Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
> **Direct APK Downloads:**  
> - [**`zenodeck.apk`**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.4.9/zenodeck.apk) (Universal Latest Release)  
> - [**`zenodeck-v3.4.9.apk`**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.4.9/zenodeck-v3.4.9.apk) (Versioned Release Archive)  
> - [**Direct Web Mirror**](https://omni-tool-two.vercel.app/zenodeck.apk)  

---

## 🚀 Overview

**ZenoDeck v3.4.9** is a major reliability release resolving all YouTube video and audio download edge cases across Web and Android APK platforms:
- **Zero Silent Video Downloads:** Multi-tier FFmpeg WebAssembly container muxing ensures adaptive video streams (1080p, 1440p, 4K, 60fps) always include full synced audio.
- **Opus in MP4 Transcoding:** Transcodes Opus audio to AAC (`-c:v copy -c:a aac -b:a 192k`) in ~1 second with zero video re-encoding, overcoming standard MP4 container codec limitations.
- **Dynamic API Routing Guarantee:** Enforces `export const dynamic = "force-dynamic"` on all server routes (`/api/youtube/info`, `/stream`, `/playlist`), eliminating static build prerendering of dummy JSON responses.
- **Port-Agnostic Web Routing:** Dynamic `window.location.origin` routing adapts seamlessly to any web port (3000, 3001, 8080, custom reverse proxies) while isolating remote proxy endpoints strictly to native Capacitor mobile environments.
- **512 KB Chunked Native Storage:** Eradicates Android Binder IPC `TransactionTooLargeException` and whole-file base64 memory leaks when saving multi-hundred-megabyte 4K media files.
- **Non-Destructive Mobile Export Pipeline:** Introduces an atomic wrapper (`scripts/build-mobile-export.ts`) ensuring static export compilation succeeds while leaving zero git diff in tracked source routes.

---

## 📦 What's New in v3.4.9

### 🎬 1. Multi-Tier FFmpeg WebAssembly Container Muxing (No Silent Videos)
- **Multi-Tier Pipeline**:
  - **Tier 1 (Lossless Stream-Copy)**: Executes `-c copy` when container specs match (e.g., MP4 container with H.264 video and AAC audio, or WebM container with VP9 video and Opus audio).
  - **Tier 2 (Fast Audio Transcode)**: When packaging Opus audio into an MP4 container, executes `-c:v copy -c:a aac -b:a 192k` — preserving the high-resolution video stream bit-for-bit while transcoding audio in ~1 second.
  - **Tier 3 (WebM Rescue Container)**: Fallback muxing ensuring zero dropped streams.
- **Eliminated Silent Fallback**: Removed the old un-muxed video-only fallback path so users are never delivered a video without audio.
- **Optimal Audio Pairing**: Intelligently pairs AAC audio (`itag 140`) for MP4 downloads and Opus audio (`itag 251`) for WebM downloads.
- **Expanded Quality Tiers**: Full support for 4K 60fps, 4K, 2K, 1080p60, 1080p, 720p, 480p, and 360p, alongside 6 studio audio presets (320k, 256k, 192k, 128k MP3, Native M4A, Lossless WAV).

### 🌐 2. Dynamic API Route Stability & Port-Agnostic Routing
- **`force-dynamic` Handlers**: All YouTube API route handlers now strictly declare `export const dynamic = "force-dynamic"`, ensuring client queries with `url`, `quality`, and `itag` parameters are always dynamically processed.
- **Universal Origin Resolution**: `getYouTubeApiUrl` evaluates `window.location.origin` dynamically, supporting any development, staging, or custom production web domain without hardcoded port assumptions.
- **Strict Native Isolation**: Remote fallback endpoints are isolated strictly to native mobile APK environments (`Capacitor.isNativePlatform()`).

### 📱 3. Android Native Chunked Save & OOM Elimination
- **Progressive 512 KB Slicing**: Blobs are read and transferred across the Capacitor bridge in 512 KB slices, starting with `Filesystem.writeFile` for chunk 0 and continuing with `Filesystem.appendFile`.
- **Under 1MB Binder Transaction Limit**: Base64 payloads per transaction are bounded to ~699 KB, completely preventing Android's fatal `TransactionTooLargeException`.
- **Zero-Leak Memory Profile**: Eliminates whole-blob `readAsDataURL` memory spikes, allowing low-RAM mobile devices to save large 4K files reliably.
- **Scoped Storage Fallback**: Automatic directory failover from `Directory.Documents` to app-internal `Directory.Data` if restricted by OEM storage permissions.

### 🛠️ 4. Non-Destructive Mobile Build Pipeline
- **Atomic Route Substitution**: `scripts/build-mobile-export.ts` stashes dynamic server route handlers in memory and disk, injects temporary static export stubs, executes `next build --webpack`, and unconditionally restores the original files on exit or signal interruption with zero git diff.
- **GitHub Actions Integration**: Updated `.github/workflows/release.yml` with `npm run build:mobile` for deterministic CI/CD release builds.

---

## 🔒 Verification & Package Checksums

| File | Size (Bytes) | SHA-256 Checksum |
| :--- | :--- | :--- |
| **`zenodeck.apk`** | 25,219,873 | `1BCBBCE47C0FA06C741567841645816083735DB57393B0C9CFACCD4DEFD3CAC9` |
| **`zenodeck-v3.4.9.apk`** | 25,219,873 | `1BCBBCE47C0FA06C741567841645816083735DB57393B0C9CFACCD4DEFD3CAC9` |

- **TypeScript Compilation**: Passed with 0 errors (`npx tsc --noEmit`).
- **Comprehensive E2E Test Suite**: 138 / 138 automated tests passing cleanly (`scripts/test-e2e-suite.ts`).
- **Live Adversarial Route Suite**: 101 / 101 tests passing (`scripts/test-challenger-m1.ts`).
- **YouTube Core Suite**: 65 / 65 automated tests passing cleanly (`scripts/test-youtube-suite.ts`).
- **Container Muxing Suite**: 8 / 8 automated tests passing cleanly (`scripts/test-m2-muxing.ts`).
- **Native Save Chunking Suite**: 18 / 18 automated tests passing cleanly (`scripts/test-m3-native-save.ts`).
- **ID3 Tagger Test Suite**: 5 / 5 automated tests passing cleanly (`scripts/test-id3-tagger.ts`).
- **Updater Test Suite**: 8 / 8 automated tests passing cleanly (`scripts/test-updater.ts`).
- **Playlist Test Suite**: 6 / 6 automated tests passing cleanly (`scripts/test-playlist-resolver.ts`).
- **Android Target**: Compiled with Android SDK 36 (target API 36, min API 28) signed with release keystore.
