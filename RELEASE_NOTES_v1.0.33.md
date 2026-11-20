# ZenoDeck & ZenoTap v1.0.33 Release Notes

**Release Date:** November 20, 2026  
**Version:** `1.0.33` (`versionCode 10033`)  
**Commit:** `HEAD`  
**Target Architecture:** Universal Android APK (`arm64-v8a`, `armeabi-v7a`, `x86_64`) + Web PWA / Desktop  

---

## 🌟 What's New in v1.0.33

### 1. 🚀 Universal Media Downloader & Background Queue Hardening
- **Queue Runner Stream URL Resolution**:
  - Resolved a critical defect where non-YouTube tasks (TikTok, Instagram, Reddit, X) enqueued to the Background Download Manager were assigned the raw social media webpage URL (`nextTask.url`), causing downloads to fetch HTML web content and abort.
  - The queue runner now extracts the verified media stream URL from `qualityOption.downloadUrl`, `videoFormat.url`, or `audioFormat.url`.
  - Added autonomous on-the-fly re-resolution for unparsed or expired social CDN tokens.
- **Preserved DASH Audio & Multi-Stream Muxing Flags**:
  - `audioUrl` and `requiresMuxing` flags are now preserved for enqueued tasks, allowing Reddit DASH and YouTube adaptive downloads to mux video and audio tracks in the background.

---

### 2. 📸 Full Multi-Slide Carousel & Slideshow Support
- **Multi-Slide Carousel Extraction**:
  - **TikTok Slideshows**: Photo album slides (`d.images`) are now pushed directly to `qualities` alongside background MP3 music, allowing users to download individual photo slides.
  - **Instagram Carousels**: Flattened all video and photo carousel items into selectable format options rather than truncating to Slide 1 only.
  - **Twitter / X Multi-Media Posts & Reddit Galleries**: Flattened all attached photos and gallery slides into selectable format options.
  - **Universal Resolver Carousel Ladder**: `ensureFullQualityLadder()` unpacks `info.items` into `info.qualities` with clear badges (`SLIDE 1`, `SLIDE 2`, etc.).

---

### 3. 🖼️ True Photo MIME Types & Native Android Gallery Indexing
- **Strict Image MIME Types**:
  - Replaced default `"video/mp4"` container fallback on photo downloads with strict MIME mapping (`image/jpeg`, `image/png`, `image/webp`, `image/gif`).
- **Native Android Pictures Directory Routing**:
  - Added `isImageTarget` detection in `ZenoHeadlessMediaEngine.kt`: photo files (`.jpg`, `.png`, `.webp`, `.gif`) are now routed to `Environment.DIRECTORY_PICTURES` (`Pictures/ZenoDeck`) instead of `Movies/ZenoDeck`.
  - Updated `ZenoMedia3Plugin.kt` `scanMediaFile()` to infer image MIME types so Google Photos and the Android Gallery immediately recognize and preview saved pictures natively.

---

### 4. 🛡️ Resilient Silent Video & Reddit DASH Fallbacks
- **Non-Fatal DASH Audio 404 Handling**:
  - In `ZenoHeadlessMediaEngine.kt` and `downloader.ts`: if audio returns 404 / empty (silent clips, animated GIFs) but the video stream succeeded (>5KB), automatically saves the video-only track with 100% completion rather than failing the entire download.
- **Pinterest Full-Resolution Photo Pin Support**:
  - Pinterest pins without video streams now automatically download original high-resolution JPG photos (`ext: "jpg"`, `badge: "IMAGE"`).
- **VidMate Dynamic Badge**:
  - Bound `badge={APP_VERSION}` dynamically from `@/config/version`, eliminating the hardcoded obsolete `v1.0.13` badge.

---

## 🛠️ Verification & Test Coverage

- **Universal Verification Suite:** 33 passing test assertions (`scripts/test-universal-downloader.ts`).
- **Master 8-Pillar Architectural Audit:** 340 passing test assertions (`scripts/test-zenodeck-full-system.ts`).
- **TypeScript:** 0 compile errors (`npx tsc --noEmit`).
- **Full Clean Git State:** Ready for release deployment.

---

## 📦 APK Artifacts (v1.0.33)

- **Universal Release APK:** `android/app/build/outputs/apk/release/app-universal-release.apk`
- **ARM64 (Modern Android):** `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`
- **ARMeabi-v7a (Legacy 32-bit):** `android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk`
- **x86_64 (Emulators / ChromeOS):** `android/app/build/outputs/apk/release/app-x86_64-release.apk`
