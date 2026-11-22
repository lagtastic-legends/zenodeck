# ZenoDeck v1.0.36 Release Notes

**Release Date:** November 21, 2026  
**Build Target:** Web (Wasm PWA) + Android APK (Universal & Architecture-Specific)  
**Package:** `com.omnitool.app` | **Version Code:** `10036` | **Version Name:** `1.0.36`

---

## 🚀 Key Highlights & Enhancements

### 1. ⌨️ Flagship Zero-Latency Android IME Upgrade
- **Proportional Height Scaling (`keyboardHeightScale`):** Configurable from `0.85x` to `1.30x` (default `1.18x`), elevating character key rows to 54dp with 6dp–8dp vertical gaps (~305dp portrait height) for superior thumb ergonomics without dead bottom padding.
- **Zero-Latency Touch Pipeline:** Commits standard character keys immediately on `ACTION_DOWN` / `ACTION_POINTER_DOWN` instead of waiting for touch release.
- **Multi-Touch Rollover:** Preallocated pointer tracking ensures rapid two-thumb typing registers every keystroke in exact chronological sequence.
- **Immediate Glide Gesture Retraction:** Moving past the gesture typing threshold immediately retracts the speculative touch-down letter, preventing duplicated first characters in swiped words.
- **120fps GPU Popups & Non-Blocking Haptics:** Key highlights and floating previews transform via GPU layer properties without triggering full-keyboard relayout passes.
- **Smart Backspace & Spacebar Cursor Scrubbing:** Progressive repeat backspace safely handles multi-codepoint emojis and surrogate pairs; horizontal drag on the spacebar provides buttery cursor scrubbing.

### 2. 🎛️ Live Keyboard Height Scale Configurator & Interactive Preview
- **Live Range Slider:** Seamless `0.85x` to `1.30x` slider with real-time percentage and portrait dp readout (`Math.round(258 * scale)`).
- **Quick Preset Pills:** One-tap chips for `Compact (0.95x)`, `Standard (1.00x)`, `Ergonomic (1.18x)`, and `Tall (1.28x)`, plus a dedicated `Reset (1.18x)` button.
- **Live Dynamic Preview:** Interactive keyboard preview updates in real time, visually scaling key heights and row spacing at 120fps.
- **Capacitor Bridge Sync:** Persisted with 120ms debounce and pointer-release guarantees, updating active IME instances live without restarting the keyboard.

---

## 📦 Verification & Quality Gates
- **TypeScript Typecheck:** 100% Passing (`tsc --noEmit`)
- **Automated Test Suites:** 45+ E2E, Unit & IME test suites passing in `npm run test:ci`
- **Android Native Compilation:** `compileDebugSources` & `assembleRelease` verified clean
- **Universal APK:** Signed, self-contained standalone Android APK produced in `dist/` and `android/app/build/outputs/apk/release/`
