# 🚀 ZenoDeck Release Notes — v3.13.0

> **Universal Android Phone Layout Engine, Multi-Architecture APK & Terracotta 60:30:10 Design Architecture**  
> *Release Date:* October 12, 2026  
> *Commit / Tag:* `v3.13.0`  
> *Architecture:* 100% Client-Side Web Audio API + WebAssembly (WASM) + Capacitor 8 Android Shell + Next.js 16 + SQLite Device Sync

---

## 🌟 Highlights of Release v3.13.0

Release v3.13.0 introduces a comprehensive overhaul of the mobile viewport layout engine, ensuring flawless usability across every Android form factor—from compact 320px–360px budget devices to standard phones, tall phablets, and wide foldables—alongside the new **Terracotta 60:30:10 Organic Design System** and a signed **Universal Android APK** supporting all CPU architectures (`arm64-v8a`, `armeabi-v7a`, `x86_64`).

---

### 1. 📱 Universal Phone Form-Factor Layout Architecture
- **Full Screen Density & Size Manifest Declarations (`AndroidManifest.xml`)**:
  Integrated `<supports-screens>` supporting `smallScreens`, `normalScreens`, `largeScreens`, and `xlargeScreens` with `anyDensity="true"` and `resizeable="true"`, ensuring the native WebView respects all Android display scalings without synthetic letterboxing.
- **Sub-380px Viewport Breakpoint (`xs: 380px`)**:
  Added the dedicated `xs` breakpoint in `tailwind.config.ts`, bridging the gap between ultra-compact phones (320px–360px) and standard modern smartphones (375px–412px).
- **Adaptive Quick Action Matrix (`ToolGrid.tsx`)**:
  Restructured the tool dashboard matrix to `grid-cols-2 xs:grid-cols-4 sm:grid-cols-4`:
  - **Ultra-compact phones (<380px)**: Switches automatically to an ergonomic 2-column view with enlarged touch targets and zero text cutoff.
  - **Standard phones and tablets (≥380px)**: Renders the compact 4-column quick-action matrix with robust container boundaries (`min-w-0`, `break-words`).
- **Zero-Overflow TopBar (`top-bar.tsx`)**:
  Integrated rigid `shrink-0` bounds and responsive visibility for auxiliary action pills (`hidden xs:flex`), eliminating horizontal scrolling and badge crowding on 320px viewports while preserving update alert visibility.
- **Thumb-Friendly Hero CTAs (`dashboard-view.tsx`)**:
  Added `w-full min-[420px]:w-auto` to primary hero actions, allowing single-thumb full-width taps on narrow devices and relaxing into inline buttons on larger screens.
- **Horizontal Overscroll Containment (`globals.css`)**:
  Enforced `overscroll-behavior-x: none` across root HTML and body, eliminating edge bounce displacement during touch gestures.

---

### 2. 🎨 Terracotta 60:30:10 Design System & Color Harmony Architecture
- **60% Dominant Canvas (Raw Linen & Parchment `#FAF5EE`)**:
  Soft, non-glare background providing an organic, tactile atmosphere that reduces visual fatigue during extended audio editing and media processing sessions.
- **30% Secondary Structure (Espresso Timber & Sandstone Contours)**:
  Deep timber typography (`#342A24`), warm sandstone card surfaces (`#F3ECE0`, `#EDE3D4`), and crisp linen borders (`#DFD3C2`) ensuring WCAG AAA legibility.
- **10% Hero Accent (Fired Clay & Burnt Sienna `#C2652A`, `#964228`)**:
  High-energy hero buttons with specular top rim highlights, tactile depression states, and warm amber glow shadows.
- **Interactive Color Harmony Swatch (`ThemeToggle.tsx`)**:
  Added a 3-swatch inline indicator visually communicating the 60:30:10 palette ratio with instant toggle between Terracotta Studio and Cyber Dark themes.

---

### 3. 📦 Universal Multi-Architecture Android APK
- **All ABIs Bundled**: Universal signed release APK containing native binaries and baseline profiles for `arm64-v8a`, `armeabi-v7a`, and `x86_64`.
- **Target OS**: Compatible from Android 7.0 Nougat (API 24) through Android 15 (API 36).
- **Offline Self-Contained WASM**: Bundles complete offline FFmpeg WebAssembly modules for zero-network audio and video conversions.

---

## 🧪 Quality & Verification Matrix

| Verification Gate | Target Scope | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Check** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~3.8s |
| **App Updater & Semver Suite** | Semver parser, cache invalidation, version bump verification | **12 / 12 (100%)** | ~2s |
| **ZenoTap Pairing Ease Suite** | QR code parsing, PIN segmented input, link polling | **5 / 5 (100%)** | ~2s |
| **ZenoTap Cloud Sync Suite** | Multi-device sync, CORS preflight, user isolation | **4 / 4 (100%)** | ~2s |
| **ZenoTap HMAC Security Suite** | Magic bytes, nonce validation, replay attack prevention | **7 / 7 (100%)** | ~2s |
| **Tier 1: Feature Coverage** | Storage, Muxing, Native Save, Audio DSP | **62 / 62 (100%)** | ~14ms |
| **Tier 2: Boundary & Corner Cases** | 0-byte, 2GB+, Malformed URLs, ID3v2.3 Sync | **36 / 36 (100%)** | ~5ms |
| **Tier 3: Cross-Feature Combinations**| Stream Proxy Routing, Worker Allocation, Slice Reassembly | **17 / 17 (100%)** | ~2ms |
| **Tier 4: Real-World Scenarios** | InnerTube Resolution, CDN Range Streaming, MP3 ID3 Tagging | **23 / 23 (100%)** | ~6.0s |
| **Total Test Suite Execution** | Universal End-to-End Test Suite | **138 / 138 (100%)** | ~6.0s |

---

## 📦 Binary Assets & SHA-256 Checksums

| Binary Asset | Architecture | Size | SHA-256 Checksum |
| :--- | :--- | :--- | :--- |
| **`zenodeck.apk`** | Universal (`arm64-v8a`, `armeabi-v7a`, `x86_64`) | ~62.57 MB | `EA7D195C9FEA9E736A08762E5FF3C6AE835C549FB662E91700DB9B52B451D8B8` |
| **`public/zenodeck.apk`** | Universal Web Direct Mirror | ~62.57 MB | `EA7D195C9FEA9E736A08762E5FF3C6AE835C549FB662E91700DB9B52B451D8B8` |
| **`zenodeck-v3.13.0.apk`** | Universal Versioned Archive | ~62.57 MB | `EA7D195C9FEA9E736A08762E5FF3C6AE835C549FB662E91700DB9B52B451D8B8` |
| **`zenodeck-v3.13.0-arm64-v8a.apk`** | Dedicated ARM64 64-bit Mobile Build | ~62.57 MB | `EA7D195C9FEA9E736A08762E5FF3C6AE835C549FB662E91700DB9B52B451D8B8` |
| **`zenodeck-v3.13.0-armeabi-v7a.apk`** | Dedicated ARMv7 32-bit Mobile Build | ~62.57 MB | `EA7D195C9FEA9E736A08762E5FF3C6AE835C549FB662E91700DB9B52B451D8B8` |
| **`zenodeck-v3.13.0-x86_64.apk`** | Dedicated x86_64 Emulator/Tablet Build | ~62.57 MB | `EA7D195C9FEA9E736A08762E5FF3C6AE835C549FB662E91700DB9B52B451D8B8` |
