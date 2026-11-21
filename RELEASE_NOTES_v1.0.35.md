# ZenoDeck & ZenoTap v1.0.35 Release Notes

**Release Date:** November 21, 2026  
**Version:** `1.0.35` (`versionCode 10035`)  
**Commit:** `HEAD`  
**Target Architecture:** Universal Android APK (`arm64-v8a`, `armeabi-v7a`, `x86_64`) + Web PWA / iPhone Web Clip Profile / Desktop  

---

## 🌟 What's New in v1.0.35

### 1. 🚀 Universal Downloader 5% Freeze Fix & Resilient Direct Streaming
- **Resilient RFC 7233 Range Fallback Engine (`ZenoHeadlessMediaEngine.kt`)**:
  - Resolved 5% download freeze caused by upstream CDN HMAC signature validation failures when appending query parameter `&range=`.
  - Implemented `openResilientStreamConnection()` with automated fallback: directly streams using the untouched signed URL with standard RFC 7233 HTTP `Range: bytes=start-end` headers when query injection is rejected.
  - Added dynamic mobile client User-Agent negotiation matching iOS and Android clients to eliminate CDN bot heuristics, rate-limiting, and silent TCP resets.
  - Reduced worker concurrency to safe 1–2 sequential channels to prevent connection resets and dropped packets.
- **Watchdog & UI State Safety Guards (`youtube-downloader.tsx`)**:
  - Integrated an 18-second zero-byte transfer watchdog timer to catch stalled CDN connections and provide actionable status telemetry.
  - Enforced `setIsDownloading(false)` execution inside guaranteed `finally` blocks, eliminating UI button lockup and frozen spinner states when downloads complete, abort, or encounter errors.

---

### 2. ⚡ Turbo Multi-Worker UI Removal & Clean Downloader Experience
- **Decoupled Manual Multi-Worker Controls (`youtube-downloader.tsx`)**:
  - Removed confusing "Turbo Multi-Worker Acceleration" card and manual `4X THREADS`, `6X THREADS`, `8X THREADS` button controls.
  - Replaced manual concurrency selection with an automated, rock-solid 2-worker streaming engine designed for optimal throughput without CDN throttling.
  - Updated live HUD telemetry inspector from multi-worker channel indicators to `Engine: Direct Stream`.

---

### 3. 📱 Mobile & iPhone Profile Cards Continuity
- Verified full feature descriptions across all mobile viewports and iPhone Web Clip standalone profiles (`zenodeck.mobileconfig`).
- Maintained responsive typography and card proportions across all device form factors.

---

## 🛠️ Verification & Test Coverage

All automated test suites executed locally and verified:

```bash
npm run typecheck # 0 TypeScript errors
npm run test:ci   # All 44 test suites passed (100% green)
npm run build     # Production Next.js build compiled successfully
```

---

## 📦 Downloads & Binaries

| Asset | File | Description | Size |
| :--- | :--- | :--- | :--- |
| **Android APK** | `app-universal-release.apk` | Signed Android APK for all modern devices | ~85 MB |
| **Android APK (Arm64)** | `app-arm64-v8a-release.apk` | Signed 64-bit ARM APK | ~65 MB |
| **Apple iOS Profile** | `zenodeck.mobileconfig` | Web Clip Standalone Profile for iPhone & iPad | ~0.1 MB |
| **Web App** | [omni-tool-two.vercel.app](https://omni-tool-two.vercel.app) | Live PWA Application | Web |
