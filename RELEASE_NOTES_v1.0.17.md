# ZenoDeck & ZenoTap v1.0.17 Release Notes

**Release Date:** November 11, 2026  
**Tag:** `v1.0.17`  
**Android Build:** `versionCode 10017` · `versionName "1.0.17"`  
**Target Environments:** Android (APK: Universal, ARM64-v8a, ARMv7a, x86_64), Modern Web Browsers, PWA, iOS (Web Clip)  
**Security & Type Safety:** 100% Strict TypeScript Passing (`tsc --noEmit`), 0 Compiler Errors, Kotlin 2.1.0 (JDK 21)  
**Universal APK Size:** **~72.8 MB** (Includes Chaquopy Python Runtime & WebAssembly Runtimes)

---

## 🚀 Executive Summary

**ZenoDeck & ZenoTap v1.0.17** delivers the **120fps Native FLIP App-Launch Transition System** with recessed hub depth parallax and two-phase deferred hydration, alongside the **4K UHD (2160p) @ 30 FPS Video Compressor**, interactive framerate controls, production build hardening, and full version parity across the desktop and Android native ecosystems.

---

## 🌟 Key Upgrades & Highlights

### 1. 🚀 120fps Native FLIP App-Launch Transition System & Recessed Hub Parallax
- **FLIP Shared Layout Projection (`motion.ts`, `tool-grid.tsx`, `tool-launch-shell.tsx`):**
  - Shared Framer Motion layout keys (`zeno-shell-${tool.id}`, `zeno-icon-${tool.id}`, `zeno-title-${tool.id}`) projected between Bento cards and fullscreen workspaces.
  - Tuned 120Hz spring physics (`APP_LAUNCH_SPRING`: `{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }`) for instantaneous thumb responsiveness with zero bounce overshoot.
  - Forced GPU compositing via `GPU_ACCELERATED_STYLE` (`willChange: "transform, border-radius"`, `backfaceVisibility: "hidden"`, `transform: "translateZ(0)"`).
- **Recessed Background Hub Depth Parallax (`app-shell.tsx`):**
  - Whenever an active tool opens, the dashboard smoothly recesses to `scale: 0.92`, `opacity: 0.35`, and `blur(14px)` under `HUB_PARALLAX_SPRING` (`stiffness: 380, damping: 32, mass: 0.9`).
  - Closing a tool restores the hub to full scale and interactivity without layout freezes or `mode="wait"` animation deadlocks.
- **Two-Phase Deferred Hydration (Zero Frame-0 Jank):**
  - Phase A (Frame 0): Renders a lightweight ZenoDeck dark-mode skeleton (`#090D0C` base, `#102C26` pulse cards, `#F7E7CE`/10 shimmer bars, `#A79277` border accents) so shell expansion runs at a fluid 120fps.
  - Phase B (Post-Spring Peak): Mounts heavy WebAssembly, WebCodecs, or WebAudio tool trees only after `onLayoutAnimationComplete` triggers (backed by a 180ms safety fallback).
- **Velocity-Aware Pull-to-Dismiss Gesture:**
  - Integrated vertical swipe gesture on the shell header with dynamic scale (`1.0` -> `0.90`) and border radius (`0` -> `28px`). Closes if `info.offset.y > 90` or `info.velocity.y > 550px/s`.
- **Android System Back Gesture Integration:**
  - Registers `@capacitor/app` `backButton` listener to smoothly shrink the active tool back into its Bento card slot on Android edge-swipe back navigation.

### 2. 🎬 4K UHD (2160p) 30 FPS Studio Master Video Compressor
- **New 4K 30 FPS Master Preset (`4k-30fps-master`):**
  - Scales target video directly to Ultra HD 2160p (`3840×2160`).
  - Sets encoding to a steady **30 FPS cadence** for stable streaming and high-density screens.
  - Applies near-lossless `CRF 20` visual quality preserving fine detail with `AAC 192k` high-bitrate stereo audio.
- **Interactive Framerate (FPS) Control:**
  - Added dedicated FPS selector supporting **`30 FPS (Standard 4K)`**, **`60 FPS (Smooth)`**, **`24 FPS (Cinematic)`**, and **`Original (Source FPS)`**.
  - Automatically chains `-vf fps=<val>` into the WebAssembly FFmpeg pipeline before scaling.
- **Target Resolution Ladder & 4K Indicator Badge:**
  - Extended the resolution selector to feature **`4K UHD (2160p)`** and **`2K QHD (1440p)`**.
  - Surfaces a glowing `4K UHD 30 FPS Mode Configured` active status card whenever 4K 30fps parameters are selected.
- **"Force Target / Upscale" Toggle:**
  - Gives users full control over whether to enforce a non-upscaling resolution ceiling (`min(ih, 2160)`) or force upscaling lower-resolution inputs (such as 1080p or 720p) directly into full 4K UHD (`scale=-2:2160`).
- **WebAssembly Memory-Safe Execution:**
  - Uses `-preset ultrafast` and `-max_muxing_queue_size 1024` with `yuv420p` pixel format to ensure zero OOM crashes inside browser WebAssembly workers.
  - Output files automatically carry semantic names (e.g. `source-compressed-4k-30fps.mp4`).

### 3. 🛡️ Production Build & CI Hardening (Vercel Fix)
- **Standalone SVG YouTube Icon Component:**
  - Resolved Vercel production deployment failures caused by upstream Dependabot `lucide-react` upgrades deprecating the `Youtube` icon.
  - Replaced external icon imports in `src/components/tools/youtube-downloader.tsx` with an inline, zero-dependency SVG component matching the visual brand.

### 4. ✍️ Continuous Gesture / Glide Typing Engine (Native Android IME)
- **Continuous Gesture Trajectory Buffer:**
  - Dynamic `22dp` drag threshold in `ZenoDeckKeyboardService.kt` differentiating quick taps from continuous swipe paths.
  - Key centroid tracing tracking touch coordinates across all 26 keycaps during `ACTION_MOVE`.
  - Micro-haptic ticks (`VibrationEffect.EFFECT_TICK`) on key boundary crossings with a floating candidate preview echo (`showKeyEcho("~ word", 600)`).
- **Multi-Lingual Vocabulary Expansion:**
  - Built-in French vocabulary mapped to the `AZERTY` layout.
  - Built-in German vocabulary mapped to the `QWERTZ` layout.
  - Built-in Spanish and core English dictionaries mapped to `QWERTY` and `Dvorak` layouts.

### 5. ⌨️ Gboard-Grade Native Keyboard Overhaul
- **3-Candidate Predictive Suggestion Strip:** Offline predictive typing engine with curated core vocabulary and 3-slot candidate bar.
- **Contraction & Typo Auto-Correct:** Instant correction for common contractions (`dont` -> `don't`, `cant` -> `can't`, `im` -> `I'm`, `ive` -> `I've`, etc.).
- **Double-Space Period Shortcut:** Tapping Space twice within 350ms replaces trailing space with `". "` and triggers auto-capitalization.
- **Dedicated Top Number Row (`1-0`):** Toggleable in keyboard preferences and persistent across restarts.
- **Multi-Category Native Emoji Panel:** 8 categories with 200+ Unicode emojis and 24-slot recent persistence.
- **30-Slot Persistent Clipboard Vault:** Persistent clip history with pin/delete and media URL detection.
- **Live 60FPS Animated GIFs:** Hardware decoding via `AnimatedImageDrawable` (API 28+) inside the keyboard grid before sending via `commitContent()`.
- **Forest & Champagne Signature Theme:** `#102C26` Deep Forest background with `#F7E7CE` Champagne keycaps.

### 6. 🧹 Workspace Storage Optimization
- Safely purged 48 legacy `.apk` artifacts and build caches, reclaiming **~5.2 GB** of local disk space and shrinking the repository to ~1.2 GB.

---

## 🧪 Verification Matrix

| Suite / Check | Command | Result |
| :--- | :--- | :--- |
| **FLIP App-Launch System** | `npx tsx scripts/test-flip-launch-system.ts` | **25/25 Passed (100%)** |
| **Release Parity Checks** | `npx tsx scripts/test-v1-0-17-release.ts` | **15/15 Passed (100%)** |
| **TypeScript Typecheck** | `npm run typecheck` (`tsc --noEmit`) | **0 Errors (Passed)** |
| **Video Compressor 4K 30FPS** | `npx tsx scripts/test-video-compressor-4k-30fps.ts` | **7/7 Passed (100%)** |
| **Glide Typing Test Suite** | `npx tsx scripts/test-v1-0-16-glide-typing.ts` | **36/36 Passed (100%)** |
| **Full E2E Test Suite (4 Tiers)** | `npx tsx scripts/test-e2e-suite.ts` | **217/217 Passed (100%)** |
| **App Updater & Semver Suite** | `npx tsx scripts/test-updater.ts` | **16/16 Passed (100%)** |

---

## 📦 Distribution Artifacts

| Binary / Package | Architecture | Format | Status |
| :--- | :--- | :--- | :--- |
| **`app-universal-release.apk`** | All Android Devices (API 24+) | Signed APK (v1 + v2) | **Verified (72.85 MB)** |
| **`app-arm64-v8a-release.apk`** | Modern 64-bit ARM Devices | Signed APK (v1 + v2) | **Verified (45.87 MB)** |
| **`app-armeabi-v7a-release.apk`** | Legacy 32-bit ARM Devices | Signed APK (v1 + v2) | **Verified (41.25 MB)** |
| **`app-x86_64-release.apk`** | Tablets, ChromeOS & Emulators | Signed APK (v1 + v2) | **Verified (47.16 MB)** |
