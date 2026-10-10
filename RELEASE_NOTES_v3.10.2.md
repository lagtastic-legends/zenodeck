# 🚀 ZenoDeck Release Notes — v3.10.2

> **Universal Modal Dialog Refinement, Comprehensive Accessibility (a11y) & UI/UX Hardening**  
> *Release Date:* October 10, 2026  
> *Commit / Tag:* `v3.10.2`  
> *Architecture:* 100% Client-Side WebAssembly (WASM) + Capacitor 8 Android Shell + Node Serverless

---

## 🌟 Highlights of Release v3.10.2

### 1. 🎨 Comprehensive Modal Dialog & Overlay Design System Polish
- **Glassmorphic Overlays & Ambient Edge Glows**:
  - Re-architected all foundational overlay primitives (`Dialog`, `AlertDialog`, `Sheet`, `Popover`) with unified `bg-black/80 backdrop-blur-md` scrims, high-contrast dark card containers (`rounded-2xl border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl`), and top ambient laser glow lines.
  - Added tactile interactive feedback: rounded-xl button shapes, smooth spring open/close transitions (`stiffness: 400, damping: 28`), responsive `max-h-[calc(100dvh-2.5rem)]` scrolling containers, and `overscroll-contain` to prevent background bleed on mobile viewports.
- **Complete Eradication of Raw Browser Alerts**:
  - Replaced all legacy `window.confirm` calls in the YouTube Vault with a styled, dark-mode `<AlertDialog>` featuring descriptive contextual confirmation (*"Clear Download History Vault?"* / *"Keep History"* / *"Clear History"*).
- **Accidental Deletion & Unlink Safeguards**:
  - Upgraded [`VaultPreviewModal`](file:///c:/Users/devra/Downloads/omni-tool/src/components/vault/vault-preview-modal.tsx) with an inline confirmation state (`isConfirmingDelete`) to prevent inadvertent permanent loss of user media assets.
  - Wrapped cloud/local GIF deletions and mobile companion unlinking in [`ZenoTapDeckManager`](file:///c:/Users/devra/Downloads/omni-tool/src/components/zenotap/zenotap-deck-manager.tsx) and [`KeyboardDeckManager`](file:///c:/Users/devra/Downloads/omni-tool/src/components/tools/keyboard-deck-manager.tsx) with protective `<AlertDialog>` confirmation modals.

### 2. ♿ Comprehensive Accessibility (a11y) & Focus Conformance
- **Full WAI-ARIA Semantics**:
  - Attached explicit `role="dialog"` or `role="alertdialog"`, `aria-modal="true"`, and `aria-labelledby` IDs to every modal and bottom sheet container across the app.
- **Keyboard & Touch Dismissal Conformance**:
  - Implemented standard `Escape` key event listeners across all dialogs and drawers (`AppDownloadModal`, `UpdateModal`, `VaultPreviewModal`, `MobileTransitionsDrawer`, `YouTubeDownloader` Subtitle Modal, `PermissionGate`).
  - Added dynamic document body scroll locking (`overflow: hidden`) during open states, preventing underlying page scrolling and jitter.

### 3. 📝 UI Copywriting & Usability Streamlining
- **Updater UI Streamlining**:
  - Eliminated confusing red "Remove" buttons on the software update available and up-to-date screens in [`UpdateModal`](file:///c:/Users/devra/Downloads/omni-tool/src/components/dialogs/update-modal.tsx). Replaced with clear `<Clock /> Remind Later` and `<Check /> Done` / `<RefreshCw /> Check Again` actions.
- **Accurate Storage Path Descriptions**:
  - Fixed hardcoded `/Documents/` directory paths in [`SaveResultModal`](file:///c:/Users/devra/Downloads/omni-tool/src/components/dialogs/save-result-modal.tsx) to dynamic filesystem paths (`📁 /${directory || "Documents"}/${filename}`) and upgraded action buttons to *"DONE"*, *"ACKNOWLEDGE"*, and *"SHARE FILE"*.
- **Harmonized Action Buttons**:
  - Polished copywriting and labels across permission gates, downloads, and navigation guards.

---

## 🧪 Quality & Verification Matrix

| Test Suite / Gate | Coverage | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Validation** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~5s |
| **App Updater & Semver Suite** | Version Comparison & Update Cache Invalidation | **12 / 12 (100%)** | ~12ms |
| **ZenoTap Security Test Suite** | HMAC, Nonce Anti-Replay, Magic-Byte, DB Isolation, Anti-Hijack | **8 / 8 (100%)** | ~2s |
| **ZenoTap Sync & Pairing Suite** | URL Normalization, CORS, Bearer Sync, Device Isolation | **4 / 4 (100%)** | ~2s |
| **Comprehensive E2E Suite** | Feature, Boundary, Combinations, Scenarios | **138 / 138 (100%)** | ~6s |
| **Multi-Platform Downloader Suite** | YouTube, TikTok, IG, X, Reddit, FB, Vimeo, Pinterest | **36 / 36 (100%)** | ~2s |

---

## 📦 Verified Release Artifacts

| Platform / Binary | Direct Download Link | Target Arch / Environment |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.2/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android phones, tablets, and emulators. |
| **⚡ Android ARM64-v8a APK** | [**zenodeck-v3.10.2-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.2/zenodeck-v3.10.2-arm64-v8a.apk) | Dedicated lightweight build for modern 64-bit ARM phones (Pixel, Galaxy, OnePlus, Xiaomi). |
| **📱 Android ARMv7a APK** | [**zenodeck-v3.10.2-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.2/zenodeck-v3.10.2-armeabi-v7a.apk) | Dedicated lightweight build for legacy 32-bit Android smartphones. |
| **💻 Android x86_64 APK** | [**zenodeck-v3.10.2-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.2/zenodeck-v3.10.2-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the live web host. |
| **🍏 Apple iOS Web Clip** | [**zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant launch in modern desktop and mobile browsers. Zero installation required. |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.10.2)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.10.2) | Full release notes, raw SHA256 checksums, and source tarballs. |

---

## 🔒 Security & Privacy Commitments
- **100% Client-Side WebAssembly Execution**: All file conversions, media demuxing, and DSP operations execute locally inside browser memory.
- **Zero Cloud Tracking & Zero Telemetry**: ZenoDeck contains zero third-party analytics trackers, cookies, or telemetry beacons.
- **HMAC Signatures & Single-Use Sync Tokens**: Companion device synchronization uses cryptographic HMAC signatures and single-use pairing codes.
