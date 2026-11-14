# ZenoDeck & ZenoTap v1.0.23 Release Notes

**Release Date:** November 14, 2026  
**Version:** `1.0.23` (`versionCode 10023`)  
**Package:** `zenodeck`  
**Git Tag:** `v1.0.23`  

---

## 🌟 Executive Summary

ZenoDeck v1.0.23 delivers **Universal Phone Support across All Mobile Form Factors and CPU Architectures**, alongside the **Precision Audio Cutter Elastic Engine**. 

This release guarantees flawless performance, responsive scaling, and ergonomic touch interaction across every category of smartphone—from ultra-compact screens (320px) to flagship phones (375px–414px), phablet/ultra devices (430px–480px), and foldable/tablet displays (600px+). In the Android ecosystem, native build configurations now supply optimized APK splits for `arm64-v8a`, `armeabi-v7a`, `x86_64`, and an all-inclusive `Universal APK` deployable on any Android 7.0+ (API 24 to 36) device.

Simultaneously, the Precision Audio Cutter console receives an intelligent **elastic sliding engine** that permanently eliminates cross-clamping deadlocks between In-Points and Out-Points, adds two-digit padded centiseconds (`.00`–`.99`), dedicated digital micro-steppers (`▲` / `▼`), symmetrical non-wrapping action grids, and dynamic track duration synchronization.

---

## 🛠️ Highlights & Core Features

### 1. 📱 Universal Smartphone & Multi-Architecture Matrix
- **Native Android CPU Architecture Splits (`android/app/build.gradle`)**:
  - `arm64-v8a`: Ultra-fast native execution on modern 64-bit flagships (Pixel 6–9, Samsung Galaxy S20–S25, Xiaomi, OnePlus).
  - `armeabi-v7a`: Maximum battery efficiency and backward compatibility for 32-bit legacy and budget devices worldwide.
  - `x86_64`: Full acceleration for ChromeOS, Android emulators, and Intel-based mobile workstations.
  - `Universal APK`: Single consolidated APK bundle running out-of-the-box on any hardware from Android 7.0 (Nougat, API 24) through Android 16 (API 36).
- **Responsive Screen Form-Factor Adaptation**:
  - **Compact Phones (320px–360px)**: Engineered two-tier symmetrical action grids in the audio workstation and topbar preventing button truncation and horizontal overflow on devices like iPhone SE and folded cover screens (Galaxy Z Fold).
  - **Standard Flagship Phones (375px–414px)**: Pixel-perfect proportions with strict $\ge 44\text{px}$ touch targets meeting WCAG 2.2 accessibility standards.
  - **Phablet & Ultra Phones (430px–480px)**: Adaptive typography, expanded waveform scrubber tracks, and roomy parameter sliders.
  - **Foldable Displays & Tablets (600px+)**: Dynamic grid expansion (`grid-cols-1 md:grid-cols-2`) rendering In-Point and Out-Point consoles side-by-side without vertical crowding.
- **Notch, Punch-Hole & Gesture Navigation Shield**:
  - Configured `viewport-fit=cover` and `interactiveWidget=resizes-content` with CSS environment safe-area padding (`env(safe-area-inset-left)`, `env(safe-area-inset-right)`, `env(safe-area-inset-top)`).
  - Complete protection against virtual keyboard overlap, bottom gesture navigation bars, and top camera cutouts.

---

## 2. 🎛️ Precision Audio Cutter Elastic Deadlock Engine (`PrecisionAudioCutterDeck.tsx`)
- **Anti-Deadlock Elastic Sliding**:
  - Solved the 50ms cross-boundary pinch bug where Start Offset was trapped against End Timestamp (`00:29.95` vs `00:30.00`).
  - Advancing the In-Point past the Out-Point now automatically pushes `endSec` ahead, preserving a healthy cut window without freezing or reverting typed values.
  - Decreasing Out-Point past the In-Point automatically slides `startSec` backward.
- **Dynamic Track Duration Synchronization (`UnifiedAudioStudio.tsx`)**:
  - Switching to the Trimmer or Audio Editor tool now automatically binds `endSec` to the probed track duration (`meta.durationSec`), eliminating false 30-second truncations on long tracks.
- **Collapsed Region Warning & Quick-Expand**:
  - If a cut selection is compressed below 0.1s, the HUD displays an interactive warning badge: `⚠️ Collapsed (0.05s) — Expand` which restores a clean 30s or full-track range in a single tap.

---

## 3. ⏱️ Digital Micro-Steppers & Two-Digit Centiseconds
- **Two-Digit Padded Display**:
  - Fixed single-digit display glitch for zero milliseconds; centiseconds now strictly format from `.00` to `.99`.
- **Digital Stepper Buttons (`▲` / `▼`)**:
  - Built `TimeDigitSegment` sub-component with top increment and bottom decrement steppers for `HR`, `MIN`, `SEC`, and `MS` units.
  - Supports keyboard `ArrowUp` / `ArrowDown` stepping and single-tap auto-selection on focus (`e.target.select()`).
- **Symmetrical Two-Tier Action Layout**:
  - **Tier 1 (Navigation & Auditioning: 3 columns)**: `[⏮ 0:00]` · `[📍 Playhead]` · `[▶ Audition]`
  - **Tier 2 (Micro-Nudges: 4 columns)**: `[-1s]` · `[-0.1s]` · `[+0.1s]` · `[+1s]`
  - Eliminates button wrapping and ensures identical card heights across both consoles.
- **Direct Boundary Auditioning**:
  - Added dedicated `[▶ Audition]` buttons to preview cuts directly from the In-Point and 2-second pre-roll before the Out-Point.
- **Studio Color Demarcation**:
  - Emerald/Mint badges and focus rings for In-Point; Rose/Crimson accents for Out-Point.

---

## 4. 📥 Unified Download Manager & Background Queuing
- Persistent Zustand store with `localStorage` fail-safe backup.
- Sequential FIFO queue runner with pause/resume and cancellation.
- Real-time throughput gauge (MB/s) and live progress telemetry.
- 4-tab media view integration: Downloader, Queue, Subtitles, and Vault.

---

## 🧪 Verification & Quality Assurance

- **Multi-Device Screen Emulation**: Verified zero layout overflow across 320px, 360px, 390px, 430px, and 768px viewports.
- **Android ABI Compilation**: Verified `arm64-v8a`, `armeabi-v7a`, `x86_64`, and universal APK build configs.
- **Precision Audio Cutter Suite**: Verified adaptive timestamp formatting, component parsing, roundtrips, and elastic boundaries (`test-audio-cutter-precision.ts`).
- **Full CI Battery**: 38 test suites executed with 100% pass rate.
