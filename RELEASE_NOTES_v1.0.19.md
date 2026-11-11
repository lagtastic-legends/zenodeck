# ZenoDeck & ZenoTap v1.0.19 Release Notes

**Release Date:** November 11, 2026  
**Version:** `1.0.19` (`versionCode 10019`)  
**Commit:** `HEAD`  
**Target Architecture:** Universal Android APK (`arm64-v8a`, `armeabi-v7a`, `x86_64`) + Web PWA / Desktop  

---

## 🌟 What's New in v1.0.19

### 1. 🌐 Bento Grid Exposure: In-App Browser & Universal Downloader
- **First-Class Bento Citizens**: Registered `in-app-browser` ("In-App Browser & Sniffer", category `studio`, accent `cyan`, icon `Globe`) and re-registered `youtube-downloader` ("Universal Media Downloader", category `video`, accent `red`, icon `Download`) directly in `TOOL_REGISTRY`.
- **Router Unblocking**: Removed legacy suppression logic in `nav-store.ts`, allowing direct deep linking and smooth FLIP morphing from the Bento grid into both tools.
- **Unified Launch Routing**: Mapped both tools in `app-shell.tsx` with asynchronous code-split lazy loaders.

---

### 2. 📱 Universal Mobile Phone Layout Fit (All Form Factors)
- **Compact & Foldable Screens**: Adaptive responsive layout fitting 320px ultra-compact phones (2 columns, zero horizontal overflow), standard 390–412px devices, tall 21:9 aspect ratios, and wide foldables/tablets.
- **Hardware Safe-Area Insets**:
  - `ToolLaunchShell` header accounts for top status bar, camera hole-punch, Dynamic Island, and notches with `pt-[calc(0.75rem+env(safe-area-inset-top,0px))]`.
  - Body container safely accounts for bottom Android gesture navigation bar / iOS home pill with `pb-[calc(1rem+env(safe-area-inset-bottom,0px))]`.
- **Dynamic Viewport Height**: In-app mini browser and workspace canvases use dynamic `100dvh` (`h-[calc(100dvh-9rem)]`), preventing virtual keyboard and address bar layout jumps.
- **Pulsing VidMate FAB Safe Margins**: Added bottom and right safe-area inset calculations to floating action buttons so they never overlap Android system navigation bars.

---

### 3. 👈 Multi-Section Mobile Edge Back Gestures & Hierarchical Navigation
- **Interactive Left Edge Swipe (`use-edge-swipe-back.ts`)**:
  - Detects touch gestures starting within 40px of the screen's left edge (`clientX <= 40px`).
  - Fluid horizontal tracking requiring `dx > 75px` or velocity `> 0.4px/ms` with horizontal dominance (`dx > |dy| * 1.3`).
  - Haptic feedback tick on gesture commit and visual edge chevron animation on the shell border.
- **Multi-Section Step Handlers**:
  - **In-App Browser**: Traverses browser history (`historyIndex > 0`) back to previous web pages before closing the tool.
  - **Universal Downloader**: Closes VidMate Quality Sheet -> exits in-app browser mode -> clears search results -> collapses to Bento dashboard.
- **Fixed Hardware Back Button**: Removed direct hard-close listener in `ToolLaunchShell` in favor of `useNavStore.getState().handleBack()`, preserving modals, sheet dismissals, unsaved work guards, and browser history.

---

## 🛠️ Verification & Test Coverage
- **Automated Test Suites:** 28 passing test suites (100% pass rate across CI).
- **TypeScript:** 0 compile errors (`npm run typecheck`).
- **Static Export & Web Build:** Clean Next.js 16 webpack production build.
- **Android Native Sync & APK Build:** Clean Gradle 8.14.5 release build with R8 resource shrinking and ProGuard optimization.

---

## 📦 APK Artifacts (v1.0.19)
- **Universal Release APK:** `android/app/build/outputs/apk/release/app-universal-release.apk`
- **ARM64 (Modern Android):** `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`
- **ARMeabi-v7a (Legacy 32-bit):** `android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk`
- **x86_64 (Emulators / ChromeOS):** `android/app/build/outputs/apk/release/app-x86_64-release.apk`
