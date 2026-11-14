# ZenoDeck & ZenoTap v1.0.25 Release Notes

**Release Date:** November 14, 2026  
**Version:** `1.0.25` (`versionCode 10025`)  
**Package:** `zenodeck`  
**Git Tag:** `v1.0.25`  

---

## 🌟 Executive Summary

ZenoDeck v1.0.25 extends the **Google Stitch "Precision Engineering" Material Design 3 (M3) Workstation Design System** into the **Precision Audio Waveform Cutter & Splicer Deck**, exclusively on the **Android APK**, with complete **Multi-Phone Form-Factor Ergonomics** and **Audio Probing & Elastic Sliding Engine Fixes**.

This release eliminates all legacy hardcoded dark values from the audio workstation, rendering an optical-grade light palette (`#f3fbff` / `#e7eff3` / `#006889`) on native Android while strictly preserving the dark `cyber` and `terracotta` themes on web. Additionally, audio duration probing in dropzones and native audio metadata capture have been hardened to eliminate duration truncation, and phone ergonomics have been perfected for compact (320px–360px), standard (375px–414px), phablet (430px–480px), and tablet/foldable (600px+) displays.

---

## 🛠️ Highlights & Core Features

### 1. 🎛️ Precision Audio Cutter M3 Workstation Adaptation (Exclusive to APK)
* **Optical-Grade Tonal Surfaces (`PrecisionAudioCutterDeck.tsx`)**:
  * Replaced all 21 raw hardcoded dark hex colors (`#090D0C`, `#102C26`, `#F7E7CE`, `#A79277`) with semantic design variables (`bg-card`, `bg-background`, `bg-secondary`, `border-border/70`, `text-foreground`).
  * **Base Canvas & Docked Containers**: Optical-grade light `#f3fbff` base with `#e7eff3` surface containers.
  * **Digit Micro-Steppers**: High-contrast `#ffffff` display boxes (`bg-background/90`) with bold tabular numerics (`#151d20`).
  * **Interactive Waveform Scrubber**: Clean container with Oceanic Cyan (`#006889`) waveform bars (`bg-primary/40`) and contrast rings.
  * **Accessible Telemetry Badges**: High-contrast `text-emerald-700` (In-Point) and `text-rose-700` (Out-Point) text on light `#edf5f9` containers for WCAG 2.2 AAA readability.
* **Strict Web Platform Theme Isolation**:
  * Desktop and mobile web browser sessions (`data-theme="cyber"`) strictly retain the obsidian & champagne gold dark theme via `dark:` variants with zero visual regression.

---

### 2. 📱 Universal Smartphone Touch & Viewport Ergonomics (All Phone Types)
* **Micro-Stepper Distortion Shield**:
  * Attached `no-touch-target` to chevron up/down buttons, preventing Android's $44\text{px}$ minimum button rule from vertically stretching micro-steppers while preserving $24\text{px}$ touch pads.
* **Wider Scrubber Thumb Hit-Targets**:
  * Widened interactive waveform scrubber handles to $24\text{px}$ touch hit targets (`w-6 -ml-3`) with smooth pointer capture, preventing touch-drag misses on phone screens.
* **Symmetrical Non-Wrapping Grids**:
  * Action triggers (3 columns) and micro-nudging buttons (4 columns) fit seamlessly on compact $320\text{px} - 360\text{px}$ screens (e.g. Galaxy Z Fold outer, iPhone SE) without text clipping or awkward wrapping.
* **Tactile Full-Pill Geometry**:
  * Migrated all transport buttons, action triggers, range presets, and audio audition controls to fluid full-pill geometry (`rounded-full`).
* **Foldables & Tablets (600px+)**:
  * Responsive dual console layout transitions seamlessly to side-by-side (`grid-cols-1 md:grid-cols-2`).

---

### 3. 🛠️ Audio Duration Probing & Anti-Deadlock Engine Fixes
* **Audio Duration Probing in Dropzone (`drop-zone.tsx`)**:
  * Fixed bug where `preview === "none"` silently aborted `probeAudioDuration(file)` and `onProbed?.(m)` for audio files, ensuring full audio duration metadata is immediately extracted upon drag-and-drop or file pick.
* **Native Audio Metadata Capture (`UnifiedAudioStudio.tsx`)**:
  * Added `onLoadedMetadata` event listener to native audio element to synchronize decoded duration and prevent selection clamping to 30s.
* **Sub-Unit Overflow Auto-Zeroing**:
  * Eliminating bouncing when setting boundary timestamps (e.g. `29.95s` vs `30.00s`), with atomic two-way elastic sliding and one-click full track reset (`[⏮ Reset Full]` and `⚠️ Collapsed — Reset Full`).

---

## 🔬 Verification & Quality Assurance

| Verification Suite | Tests | Result | Status |
| :--- | :--- | :--- | :--- |
| **APK Precision Design Test Suite** (`scripts/test-apk-precision-design.ts`) | 7 | 7 Passed | ✅ Clean |
| **Precision Audio Cutter Suite** (`scripts/test-audio-cutter-precision.ts`) | 5 | 5 Passed | ✅ Clean |
| **End-to-End Test Suite** (`scripts/test-e2e-suite.ts`) | 217 | 217 Passed | ✅ 100% |
| **TypeScript Typecheck** (`npm run typecheck`) | — | 0 Errors | ✅ Clean |
| **Static Mobile Export Build** (`npm run build:mobile`) | 24 Pages | 0 Failures | ✅ Passed |
