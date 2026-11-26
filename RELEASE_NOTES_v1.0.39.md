# ZenoDeck & ZenoTap v1.0.39 Release Notes

**Release Date:** November 26, 2026  
**Build:** Signed Universal & Split-ABI Release APKs (`versionName 1.0.39`, `versionCode 10039`)  
**Engine:** Studio Audio DSP Engine, WebAudio & FFmpeg WASM Core, Zero-Latency Android IME (`com.omnitool.app`), Capacitor 8, Next.js 16 / React 19

---

## 🌟 Executive Overview
ZenoDeck v1.0.39 delivers a comprehensive **UI Contrast & Mobile Ergonomics Overhaul** across dark-mode viewports and Precision Light/APK surfaces, fixes vertically squished toggle pills on Android WebViews, and locks down the studio-calibrated **3-Stage 8D Spatial + Slowed & Reverb DSP Chain** with 1:1 parity between live WebAudio auditioning and offline FFmpeg WASM exports.

---

## 🚀 Key Fixes & Improvements

### 1. 🎨 Global CSS Contrast Shield & Android Toggle Pill Fix (`src/app/globals.css`)
- **APK Toggle Pill Protection**: Exempted `[role="switch"]` and `[data-slot="switch"]` from `[data-platform="apk"] button { min-height: 44px; }`, ensuring every toggle across Keyboard Deck, Audio Editor, Video Compressor, Lock PDF, and Scan -> PDF stays a crisp `44×24px` (`h-6 w-11 shrink-0`) horizontal pill rather than stretching into a `44px` tall squished oval.
- **Dark-Container Typography Shield**: Protected `.text-muted-foreground` inside permanently dark stages (`bg-black`, `#090D0C`, `#102C26`, `#0a0e1a`, `#111828`, `#141c2e`) under `[data-theme="precision"]` so status labels never flip to low-contrast charcoal on black canvases.

### 2. 📱 Cross-Tool Polish & Deep Forest Palette Alignment
- **Universal Media Downloader (`youtube-downloader.tsx`)**: Fixed inactive view-switcher icon contrast across light/dark themes and unified the primary download CTA with Deep Forest (`#102C26`), Champagne (`#F7E7CE`), and Warm Bronze (`#A79277`) tokens.
- **ZenoTap Keyboard Deck (`keyboard-deck-manager.tsx`)**: Upgraded all Tactile Suite feature switches to semantic `role="switch"` `44×24px` pills, darkened the live sandbox input to `!bg-[#090D0C]/90 !text-[#F7E7CE]`, and bound Native IME badges dynamically to `APP_VERSION` (`v1.0.39`).
- **Studio Recorder, Audio Editor, Video Compressor, Equalizer & ASCII Gallery**: Brightened `studio-recorder.tsx` empty stage labels to `text-[#F7E7CE]/85 font-medium`, hardened switch flex rows (`gap-4`, `min-w-0 flex-1`), upgraded `ascii-generator.tsx` gallery tiles to `#090D0C` / `#F7E7CE`, and unified `equalizer-tool.tsx` preset rail scrolling.

### 3. 🎧 3-Stage "8D Spatial + Slowed & Reverb" DSP Safety & Parity
- **HF Damping Safe Floor**: Clamped high-frequency tape damping roll-off (`Math.max(1500, ...)`) across WebAudio and FFmpeg graphs—preserving the calibrated `4800Hz` sweet spot at `65%` damping while preventing sub-zero frequencies at `100%` damping.
- **Modular Helper & 1:1 Parity**: Verified `Slowed + Reverb (Studio Balanced)` (`0.87x`, `35ms` pre-delay, `65%` HF damping, `-5dB` wet gain, `140Hz` HPF) and `8D Spatial + Slowed & Reverb` (`0.12Hz` orbit, `88%` pan depth, `0.35ms` Haas delay, `120Hz` mono bass anchor) across both WebAudio preview and offline FFmpeg WASM export.

---

## 🧪 Verification & Release Packaging
- Verified 0 TypeScript errors (`npm run typecheck`).
- Verified full CI suite including `scripts/test-v1-0-19-ui-polish.ts`, `scripts/test-v1-0-39-release.ts`, and `scripts/test-audio-20-modules.ts`.
- Exported static mobile bundle (`npm run build:mobile`), synced Capacitor (`npx cap sync android`), and assembled signed release APKs (`gradlew.bat assembleRelease --no-daemon`).
