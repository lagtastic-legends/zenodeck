# ZenoDeck v1.0.37 Release Notes

**Release Date:** November 22, 2026  
**Build:** Universal Release APK (`versionName 1.0.37`, `versionCode 10037`)  
**Engine:** Zero-Latency Android IME (`InputMethodService`), Capacitor 6.0, Next.js / React 19

---

## 🌟 Executive Overview
ZenoDeck v1.0.37 introduces the **ZenoTap Tactile & Ergonomic Control Suite**, bringing flagship-grade customization, accessibility, and visual feedback to the native Android keyboard. Building on the zero-latency typing pipeline introduced in v1.0.36, this release delivers customizable 4-tier hardware haptics, one-handed keyboard docking with dynamic side gutters, 320ms long-press character rails with instant speculative character retraction, and a 120fps zero-allocation Champagne Gold glide typing trail.

---

## 🚀 Key Features & Architectural Upgrades

### 1. 🎛️ Unified Settings Schema (Native IME + Capacitor Bridge + Web Fallback)
- **5 New Persistent Settings** synchronized across Android `SharedPreferences` (`zenodeck_prefs`), the Capacitor Bridge (`ZenoDeckKeyboardBridgePlugin.kt`), and browser `localStorage`:
  - `keyboard_haptic_strength`: Integer `0` (Off), `1` (Light / Virtual Key), `2` (Crisp Default / Keyboard Tap), `3` (Strong / Confirm Click).
  - `keyboard_key_popup_enabled`: Boolean (default `true`) controlling floating character preview popups above tapped keycaps.
  - `keyboard_cursor_scrub_enabled`: Boolean (default `true`) controlling spacebar horizontal trackpad cursor navigation.
  - `keyboard_glide_trail_enabled`: Boolean (default `true`) controlling 120fps particle trail rendering during swipe gestures.
  - `keyboard_one_handed_mode`: String `"off"`, `"left"`, or `"right"` (default `"off"`).
- **Live Broadcast Synchronization**: Settings update in real time via Android `ACTION_SETTINGS_UPDATED` broadcasts without requiring IME destruction or restart.

### 2. 📱 One-Handed Mode (82% Width Docked Grid & 18% Ergonomic Side Gutters)
- **Ergonomic Compression**: Compresses the active key grid to `82%` of screen width (`oneHandedWidthRatio = 0.82f`) aligned to either the left or right screen edge while strictly preserving `keyboardHeightScale` and system `WindowInsets`.
- **18% Side Gutters**: Renders a dedicated side gutter containing quick-action buttons:
  - **Expand to Full Width (`⤢`)**: Restores full-width layout with a single tap.
  - **Flip Hand (`⇄`)**: Toggles between Left-Hand and Right-Hand docking modes instantly.
- **Hit-Testing Coordinates**: Button `getLocationOnScreen` hitboxes automatically align to docked positions for off-center thumb typing accuracy.

### 3. ⏱️ Long-Press Secondary Character Rail (320ms Timer & Speculative Retraction)
- **Preallocated 320ms Timer**: Keycaps with secondary alternates (numbers `1–0` on top row `Q–P`, common symbols `@`, `#`, `$`, `&`, and accented vowels) activate an alternate rail when held for 320ms.
- **Speculative Retraction**: Automatically calls `InputConnection.deleteSurroundingText(1, 0)` upon timer expiration to cleanly retract the speculative `ACTION_DOWN` character before revealing the rail.
- **Horizontal Drag Selection**: Dragging across the floating rail highlights the selected alternate and commits it immediately on `ACTION_UP`.
- **Password Safety**: Secondary character popovers are automatically suppressed in password fields (`isPasswordInputType()`).

### 4. ✨ 120fps Zero-Allocation Glide Typing Trail
- **GlideTrailOverlayView**: Custom hardware-accelerated overlay utilizing a preallocated circular ring buffer with 24-point capacity `(x, y, timestamp)`.
- **Zero Per-Frame Allocations**: Uses a single preallocated `Path` and `Paint` object, rendering smooth quadratic bezier curve midpoint smoothing in Champagne Gold (`#F7E7CE`).
- **140ms Hardware Fade**: Smoothly fades out upon touch release or cancel via a 140ms `ValueAnimator`.

### 5. 🎚️ React Keyboard Deck UI & Interactive Simulator Synchronization
- **Tactile & Ergonomics Control Suite Card**: Dedicated controls in `keyboard-deck-manager.tsx` matching the Deep Forest (`#102C26`) and Champagne (`#F7E7CE`) design language.
- **Interactive Simulator Sync**: `ZenoTapKeyboardSimulator.tsx` renders 82% one-handed compression with live Expand and Flip buttons, respects key popup toggles, and showcases the Champagne Gold glide trail.

---

## 🧪 Verification & Quality Assurance
- **Full CI Test Suite**: All 48+ test suites pass 100% green (`npm run test:ci`).
- **TypeScript Typecheck**: Zero errors (`tsc --noEmit`).
- **Native Android Build**: Zero Kotlin compiler errors or warnings (`./gradlew compileDebugSources`).
- **Zero Hot-Path Allocations**: Strict memory conservation on hot touch and draw frames.
