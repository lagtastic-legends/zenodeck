# ZenoDeck & ZenoTap v1.0.24 Release Notes

**Release Date:** November 14, 2026  
**Version:** `1.0.24` (`versionCode 10024`)  
**Package:** `zenodeck`  
**Git Tag:** `v1.0.24`  

---

## 🌟 Executive Summary

ZenoDeck v1.0.24 brings the **Google Stitch "Precision Engineering" Material Design 3 (M3) Workstation Design System** exclusively to the **Android APK**, accompanied by complete **Multi-Phone Form-Factor Layout Perfection**.

This release introduces an optical-grade light palette engineered for long media production sessions, full-pill geometry, M3 surface tonal hierarchy, and tabular numeric typography—while strictly preserving the existing dark `cyber` and `terracotta` themes for all web browser users. Simultaneously, the application layout has been comprehensively hardened to fit every phone on the market: from ultra-compact 320px screens (Galaxy Z Fold outer cover, iPhone SE) to standard flagships (375px–414px) and large phablet/ultra devices (430px–480px), with zero horizontal overflow, ergonomic $44\text{px} - 48\text{px}$ touch targets, and full safe-area protection for notches, punch-holes, and gesture navigation bars.

---

## 🛠️ Highlights & Core Features

### 1. 📐 Precision Engineering M3 Design System (Exclusive to APK)
* **Optical-Grade Tonal Architecture (`globals.css`)**:
  * **Base Canvas (`#f3fbff`)**: High-legibility optical backing engineered for sustained audio/video editing under bright ambient lighting without eye fatigue.
  * **Docked Surface Containers (`#e7eff3`)**: Hairline 1px `#bfc8ce` borders enclosing inspector property sheets, track control lanes, and toolcards.
  * **Waveform & Viewport Canvas (`#ffffff`)**: High-contrast, pure-light display surface for audio waveforms and video monitors.
  * **Oceanic Cyan Primary (`#006889`)**: Primary interactive actions, transport playheads, and rendering state triggers.
  * **Primary Container (`#bfeaff`) & Secondary Slate-Teal (`#cee6f3` / `#4c626c`)**: Distinct accents for active scrubber selections, loop brackets, and inactive track indicators.
* **Full-Pill Geometry (`rounded-full: 9999px`)**:
  * Replaced square buttons with fluid, tactile full-pill geometry across primary buttons, category filter tokens, search inputs, and mobile action bars.
* **Tabular Numeric Telemetry (`Geist Mono`)**:
  * Configured `font-variant-numeric: tabular-nums` across all real-time counters, download transfer rates, and audio SMPTE timecodes to completely eliminate character jitter during 60 FPS playback.
* **Native Android Light System Bars (`android/app/src/main/res/values/`)**:
  * Updated `colors.xml` and `styles.xml` with `#f3fbff` splash backgrounds and enabled `android:windowLightStatusBar = true` and `android:windowLightNavigationBar = true` for high-contrast, native dark system icons.
* **Zero-Flicker Pre-Hydration Initialization (`src/app/layout.tsx`)**:
  * Implemented an inline `<head>` script that synchronously detects the APK/Capacitor environment before first paint, applying `data-platform="apk"` and `data-theme="precision"` with zero theme flash.
* **Strict Web Platform Isolation**:
  * Standard desktop and mobile web browser visits (`http://`, `https://`, `localhost:3000`) evaluate `isApkPlatform() === false`, maintaining the user's selected `cyber` or `terracotta` web themes untouched.

---

### 2. 📱 Universal Smartphone & Multi-Phone Form-Factor Perfection
* **Ultra-Compact Phones (320px–360px, e.g. Galaxy Z Fold Cover, iPhone mini)**:
  * **TopBar**: Logo is dynamically sized (`size-8`), brand text scales (`text-xs sm:text-base truncate`), and the engine status pill displays a compact dot indicator (`size-2`) so the bar never clips or wraps.
  * **Bento & Stats Chips**: Sized with responsive padding (`px-2 xs:px-2.5 py-2`) so metrics and labels never overflow on 320px viewports.
  * **Tool Matrix**: 2-column grid mode (`gap-1.5`) preserves clean thumb-sized touch cards ($145\text{px} - 160\text{px}$).
* **Standard & Large Phablets (375px–480px, e.g. Pixel, Galaxy S24 Ultra, Pro Max)**:
  * Fluid typography scaling, smooth horizontal filter rail, and accessible $44\text{px} - 48\text{px}$ touch targets.
* **Notch, Dynamic Island & Navigation Bar Insets**:
  * Dynamic viewport padding via `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` across headers, modals, floating toolbars, and tool workspace shells.
* **Zero Horizontal Overflow Guarantee**:
  * Enforced `overflow-x: hidden` and `max-w-[100vw]` across root and body elements, completely eliminating horizontal drift and rubber-banding on all mobile devices.
* **Native Android Scrolling Feel**:
  * Disabled browser scrollbars on APK (`::-webkit-scrollbar { display: none; }`) for smooth, native Android app scrolling.

---

### 3. 🛠️ Semantic Tool Workspace Shell Modernization (`ToolLaunchShell.tsx`)
* **Dynamic Theme Variable Migration**:
  * Replaced legacy hardcoded green-black colors (`#090D0C`, `#102C26`, `#F7E7CE`, `#A79277`) with semantic theme variables (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border/60`).
  * Enables the 120fps FLIP tool workspace to adopt the Precision Engineering M3 light palette on APK, while retaining dark styling on web.
* **Velocity Pull-to-Dismiss Handle & Back Button**:
  * Back button and icon wrappers styled with full-pill ergonomics, $44\text{px} \times 44\text{px}$ minimum hit-targets, and safe-area top padding (`pt-[calc(0.75rem+env(safe-area-inset-top,0px))]`).

---

## 🔬 Verification & Quality Assurance

| Verification Suite | Tests | Result | Status |
| :--- | :--- | :--- | :--- |
| **APK Precision Design Test Suite** (`scripts/test-apk-precision-design.ts`) | 6 | 6 Passed | ✅ Clean |
| **End-to-End Test Suite** (`scripts/test-e2e-suite.ts`) | 217 | 217 Passed | ✅ 100% |
| **TypeScript Typecheck** (`npm run typecheck`) | — | 0 Errors | ✅ Clean |
| **Static Mobile Export Build** (`npm run build:mobile`) | 24 Pages | 0 Failures | ✅ Passed |
| **Static Asset Verification** (`out/index.html`) | 2 Flags | `data-platform="apk"` & `data-theme="precision"` verified | ✅ Passed |
