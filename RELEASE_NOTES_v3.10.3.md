# 🚀 ZenoDeck Release Notes — v3.10.3

> **Universal Popup & Select Menu Polish, Mobile Text Contrast Eradication & Design System Elevation**  
> *Release Date:* October 10, 2026  
> *Commit / Tag:* `v3.10.3`  
> *Architecture:* 100% Client-Side WebAssembly (WASM) + Capacitor 8 Android Shell + Node Serverless

---

## 🌟 Highlights of Release v3.10.3

### 1. ✨ Eradication of Mobile Dark-on-Dark Text Contrast Defect
- **Root Cause Eliminated**:
  - Previously, native HTML `<select>` and `<option>` elements in `StudioRecorder` spawned the Android OS `SingleChoiceItems` radio list dialog.
  - Because `:root` lacked an explicit `color-scheme: dark;` directive, mobile WebViews and Android dialogs rendered dark text ink (`#0f0f19`) on a dark theme background (`#110f1b`), making options like "30 FPS" and "60 FPS" unreadable.
- **System-Level Fix**:
  - Implemented `color-scheme: dark;` on `:root` and all input/select form controls in `src/app/globals.css`.
  - Added strict dark background and high-contrast light foreground styling (`#f4f4f6`) to `select`, `option`, and `optgroup` as a defensive platform fallback.

### 2. 🎛️ Unified In-DOM Glassmorphic Select Menus
- **Radix UI Integration in Studio Recorder**:
  - Replaced all raw HTML `<select>` and `<option>` elements in `src/components/tools/studio-recorder.tsx` with Radix UI's `<Select>` component suite (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`).
  - Screen resolution (`720p`, `1080p`, `4k`) and framerate (`30 FPS`, `60 FPS`) now open as sleek, high-contrast in-DOM glassmorphic portals, eliminating clunky native OS system popups entirely.

### 3. 💎 Complete Popup & Menu Design System Harmony
- **Standardized Surface Aesthetics**:
  - Harmonized `Select` (`select.tsx`), `DropdownMenu` (`dropdown-menu.tsx`), `ContextMenu` (`context-menu.tsx`), and `Menubar` (`menubar.tsx`) across the design system.
  - Upgraded menu containers to `bg-card/95 text-card-foreground border-border/80 backdrop-blur-2xl rounded-2xl shadow-2xl p-1.5`.
  - Implemented subtle ambient laser edge glow lines (`bg-gradient-to-r from-transparent via-primary/50 to-transparent`) at the top of all popup containers.
  - Enhanced item rows with tactile `rounded-xl py-2 sm:py-1.5 font-mono text-xs sm:text-sm text-foreground hover:bg-secondary/90 focus:bg-accent/80 active:scale-[0.99]` and cyber-violet check indicators.

---

## 🧪 Quality & Verification Matrix

| Test Suite / Gate | Coverage | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Validation** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~5s |
| **App Updater & Semver Suite** | Version Comparison & Update Cache Invalidation | **12 / 12 (100%)** | ~12ms |
| **Tier 1: Feature Coverage** | Media Processing, Storage, Navigation, Audio | **62 / 62 (100%)** | ~13ms |
| **Tier 2: Boundary & Corner Cases** | 0-byte, 2GB+, Malformed URLs, ID3v2.3 Sync | **36 / 36 (100%)** | ~5ms |
| **Tier 3: Cross-Feature Combinations**| Stream Proxy Routing, Worker Allocation, Slice Reassembly | **17 / 17 (100%)** | ~3ms |
| **Tier 4: Real-World Scenarios** | InnerTube Resolution, CDN Range Streaming, MP3 ID3 Tagging | **23 / 23 (100%)** | ~6.8s |
| **Total Test Suite Execution** | Universal End-to-End Test Suite | **138 / 138 (100%)** | ~6.8s |

---

## 📦 Verified Release Artifacts

| Platform / Binary | Direct Download Link | Target Arch / Environment |
| :--- | :--- | :--- |
| **📱 Android Universal APK** | [**zenodeck.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.3/zenodeck.apk) | Universal signed APK supporting all 64-bit & 32-bit Android phones, tablets, and emulators. |
| **⚡ Android ARM64-v8a APK** | [**zenodeck-v3.10.3-arm64-v8a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.3/zenodeck-v3.10.3-arm64-v8a.apk) | Dedicated lightweight build for modern 64-bit ARM phones (Pixel, Galaxy, OnePlus, Xiaomi). |
| **📱 Android ARMv7a APK** | [**zenodeck-v3.10.3-armeabi-v7a.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.3/zenodeck-v3.10.3-armeabi-v7a.apk) | Dedicated lightweight build for legacy 32-bit Android smartphones. |
| **💻 Android x86_64 APK** | [**zenodeck-v3.10.3-x86_64.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.10.3/zenodeck-v3.10.3-x86_64.apk) | Dedicated build for Android tablets, Chromebooks, and emulators. |
| **⚡ Direct Web Host Mirror** | [**zenodeck.apk (Direct Mirror)**](https://omni-tool-two.vercel.app/zenodeck.apk) | Direct fast download mirrored straight from the live web host. |
| **🍏 Apple iOS Web Clip** | [**Download zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | Apple Web Clip Configuration Profile. Installs ZenoDeck in full-screen standalone mode. |
| **🌐 Progressive Web App** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant launch in modern desktop and mobile browsers. Zero installation required. |
| **📦 GitHub Releases Hub** | [**GitHub Releases Hub (v3.10.3)**](https://github.com/lagtastic-legends/zenodeck/releases/tag/v3.10.3) | Full release notes, raw SHA256 checksums, and source tarballs. |
