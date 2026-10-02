# 🚀 ZenoDeck v3.6.6 — Engine In-Memory Transfer, Watchdog Resilience, Zero-Loop Vault & Shell Decoupling

**Release Version:** `v3.6.6`  
**Build Target:** Universal Web & Android Multi-Architecture Native Ecosystem  
**Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
**Live Web Deployment:** [omni-tool-two.vercel.app](https://omni-tool-two.vercel.app)

---

## 📦 Direct Downloads & Distribution Assets

| Asset / Package | Download Link | Architecture / Compatibility |
| :--- | :--- | :--- |
| **📱 Android Universal APK (All Phones)** | [zenodeck.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.6/zenodeck.apk) (~24 MB) | `Universal: All 64-bit & 32-bit Phones + Emulators` |
| **⚡ ARM64-v8a Dedicated APK** | [zenodeck-v3.6.6-arm64-v8a.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.6/zenodeck-v3.6.6-arm64-v8a.apk) | `Modern Android Phones (Pixel, Samsung Galaxy, OnePlus, Xiaomi)` |
| **📱 ARMv7a Dedicated APK** | [zenodeck-v3.6.6-armeabi-v7a.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.6/zenodeck-v3.6.6-armeabi-v7a.apk) | `Legacy 32-bit Android Phones & Budget Devices` |
| **💻 x86_64 Dedicated APK** | [zenodeck-v3.6.6-x86_64.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.6/zenodeck-v3.6.6-x86_64.apk) | `Android Tablets, Chromebooks, Android Studio & WSA` |
| **🏷️ Versioned Archive APK** | [zenodeck-v3.6.6.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.6/zenodeck-v3.6.6.apk) | `Official v3.6.6 Archive Universal Build` |
| **🍏 Apple iOS Profile** | [zenodeck.mobileconfig](https://omni-tool-two.vercel.app/api/ios-profile) | `iOS / iPadOS Home Screen Web Clip Standalone Profile` |

---

## 🌟 What's New in v3.6.6

### 1. ⚡ Zero-Copy WebAssembly Engine In-Memory Transfer
- **Eliminated Base64 IPC Bottlenecks**: Replaced legacy `data:application/wasm;base64,...` message serialization across Web Worker boundaries with direct `wasmBinary` transfer.
- **Instant Boot Performance**: Android devices and browser clients now boot the full multi-threaded FFmpeg core in **~1.9 seconds**, down from 15+ seconds.
- **Zero Heap Spikes**: Avoided the 100MB+ memory inflation caused by stringification, completely eliminating out-of-memory worker termination on low-RAM hardware.

### 2. ⏱️ 120-Second Compilation Watchdog & Offline Cache Guard
- **Extended Compilation Watchdog**: Extended the WebAssembly compilation watchdog to a generous 120 seconds with live telemetry countdown, preventing premature timeout false-positives during heavy JIT compilation on mobile CPUs.
- **Cache Eviction Protection**: Guarded the IndexedDB WASM offline cache from premature clearing on timeout aborts; cache purges now only execute on genuine magic-byte header corruption.

### 3. 🛡️ Eradication of React Error #185 in Workstation Vault
- **Diagnosed and Cured**: Resolved the infinite re-render loop (`Maximum update depth exceeded`) triggered when generating sample media or previewing files in the Local Vault (IDB).
- **Callback Stabilization**: Memoized `handleClosePreview` and `handleDelete` in `VaultView`.
- **Ref-Backed Lifecycle Handlers**: Backed `onClose` with `useRef` inside `VaultPreviewModal`, ensuring Android back button overlay registration runs strictly when a preview item opens or closes.
- **Static External Store Subscription**: Replaced inline `useSyncExternalStore` dummy subscription with a static singleton to comply with React 19 / Compiler optimizations.

### 4. 🏎️ Atomic Zustand Selectors & Application Shell Decoupling
- **Selective Re-renders**: Upgraded `AppShell`, `DesktopSidebar`, `StickyMobileCta`, and `WorkstationRibbon` to use atomic selectors (`useNavStore((s) => s.view)`, `useNavStore((s) => s.navigate)`).
- **Decoupled Back Navigation**: Registering overlays, dirty guards, or multi-step tool handlers no longer causes full-canvas shell re-renders, delivering smooth 60fps/120Hz frame rates throughout navigation.

### 5. 🌐 SSR Hydration Guarding
- **Server/Client Parity**: Gated the dynamic user profile and auth state display in `TopBar` behind client mounting, eliminating React SSR hydration mismatch warnings on cold page loads.

---

## 🔒 Security & Privacy Guarantee
ZenoDeck runs **100% on-device** for all media processing, video transcoding, PDF tools, QR generation, audio DSP mastering, and document manipulation. Files never touch any remote servers.
