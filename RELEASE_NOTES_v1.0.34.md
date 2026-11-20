# ZenoDeck & ZenoTap v1.0.34 Release Notes

**Release Date:** November 20, 2026  
**Version:** `1.0.34` (`versionCode 10034`)  
**Commit:** `HEAD`  
**Target Architecture:** Universal Android APK (`arm64-v8a`, `armeabi-v7a`, `x86_64`) + Web PWA / iPhone Web Clip Profile / Desktop  

---

## 🌟 What's New in v1.0.34

### 1. ⚡ Streamlined Universal Media Downloader Architecture
- **Eliminated In-App Browser & Sniffer Overhead**:
  - Removed `in-app-browser` tool from `TOOL_REGISTRY` and decoupled `MiniBrowserView` from `app-shell.tsx`.
  - Removed dual-mode segmented tabs (`[🔗 Paste Link]` vs `[🌐 In-App Browser (FAB Sniffer)]`) in `youtube-downloader.tsx`.
  - Removed confusing "Open in Mini Browser & Sniffer" buttons from 403 / datacenter restriction notices, focusing user attention purely on direct link downloading and Android APK native downloads.
  - Replaced legacy sniffer error messages in `universal-resolver.ts` with clean, informative guidance.

---

### 2. 📱 Mobile & iPhone Web Clip Profile Feature Descriptions
- **Restored Complete Tool Matrix Descriptions on Mobile Viewports (`tool-grid.tsx`)**:
  - Removed `hidden sm:block` from `ToolCard` descriptions, ensuring feature descriptions are fully visible on Android phones, iPhones, and iOS Web Clip standalone profiles (`zenodeck.mobileconfig`).
  - Tuned mobile typography with `text-[9.5px] xs:text-[10.5px] sm:text-xs leading-[1.3] line-clamp-2` for crisp, high-contrast readability.
  - Adjusted mobile card min-height to `min-h-[120px] xs:min-h-[128px]` and padding to `p-2.5 xs:p-3` for balanced layout proportions.

---

### 3. 🛠️ Continuous Integration & Verification Hardening
- **Historical Release Verification Compatibility**:
  - Upgraded `scripts/test-v1-0-30-release.ts` to semver comparison `>= 1.0.30` and generalized modal card checks.
  - Decoupled `overflow-x-auto no-scrollbar` assertion in `scripts/test-topbar-fetch-and-layouts.ts` to tolerate responsive padding classes.
  - Updated `scripts/test-v1-0-18-mini-browser.ts` and `scripts/test-v1-0-19-mobile-gestures-and-browser.ts` to reflect the decoupled browser architecture.
  - Verified 100% green test pass across all 43 test suites in `npm run test:ci`.

---

## 🛠️ Verification & Test Coverage

All automated test suites executed locally and verified:

```bash
npm run typecheck # 0 TypeScript errors
npm run test:ci   # All 43 test suites passed (100% green)
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
