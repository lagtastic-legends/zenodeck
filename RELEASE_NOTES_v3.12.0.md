# 🚀 ZenoDeck Release Notes — v3.12.0

> **Effortless ZenoTap Cloud Deck & Keyboard Sync: Instant QR Camera Pairing, Real-Time Auto-Polling & Segmented PIN Input**  
> *Release Date:* October 11, 2026  
> *Commit / Tag:* `v3.12.0`  
> *Architecture:* 100% Client-Side Web Audio API + WebAssembly (WASM) + Capacitor 8 Android Shell + Next.js 16 + SQLite Device Sync

---

## 🌟 Highlights of Release v3.12.0

Release v3.12.0 eliminates all friction in cross-device pairing between desktop/web **ZenoDeck Cloud Deck** and the mobile **ZenoTap Android Keyboard Companion**. Linking devices and synchronizing custom reaction GIFs is now instantaneous, tactile, and completely automatic.

### 1. 📷 Instant QR Code Camera Scanner (`ZenoTapPairScanner.tsx`)
- **Point & Connect in 1s**: Replaced tedious manual number entry with high-speed camera scanning driven by `Html5Qrcode`.
- **Laser-Guided Viewfinder**: Visual laser scanline beam and dashed focus frame with vibration haptic feedback upon decode.
- **Permission Resilience**: Seamlessly integrates with native Android Capacitor camera permissions via `ensureCameraPermission`, with fallback to system settings and manual PIN entry when access is restricted.

### 2. ⚡ Dynamic Desktop QR Generation & Real-Time Auto-Polling
- **Dynamic QR Code Rendering**: Desktop sessions immediately render a crisp QR code (`QRCode.toDataURL`) encoding a magic pairing URL (`https://omni-tool-two.vercel.app/?pair=123456`) and the 6-digit code.
- **Real-Time Polling Engine**: Desktop sessions query `GET /api/zenotap/v1/device/pair?linkId=...` every 2 seconds.
- **Zero-Refresh Link Detection**: As soon as the mobile device scans the code, the desktop UI instantly transitions to a confirmed state:  
  `🎉 Linked to [DeviceName]! Ready to sync.`

### 3. ⌨️ Tactile 6-Digit Segmented PIN Input (`PinCodeInput.tsx`)
- **6-Slot Segmented Layout**: Individual high-contrast, glassmorphic boxes with centered monospace digits and dash separation (`[ ][ ][ ] - [ ][ ][ ]`).
- **Auto-Advance & Smart Backspace**: Digits advance automatically to the next box upon entry; pressing backspace jumps backwards and clears the previous box.
- **Paste Auto-Distribution**: Pasting any 6-digit code automatically parses digits and distributes them across all 6 slots, auto-triggering connection without extra clicks.

### 4. 📋 Smart System Clipboard & Deep Link Detection
- **Clipboard Detection**: Upon opening the mobile companion, ZenoDeck automatically inspects the clipboard for 6-digit codes and magic URLs, presenting a 1-tap connection banner:  
  `📋 Pair code 847291 detected in clipboard → [Connect (1-Tap)]`
- **Deep Link Navigation**: URLs containing `?pair=123456` automatically route `AppShell` straight into the `keyboard-deck` tool and pre-fill the PIN.

### 5. 🔄 Background Auto-Sync on App Resume
- **Resume Delta Sync**: Automatically triggers delta synchronization whenever the app returns from the background or receives window focus.
- **Live Telemetry Badge**: Displays real-time relative sync time (`Last synced: Just now / 5m ago`).
- **Toggleable Control**: Simple one-tap toggle (`Auto-Sync: ON / OFF`) preserved across app launches.

### 6. 🎛️ Tool Registry & Workstation Ribbon Integration
- **Discoverability**: Registered `keyboard-deck` in `TOOL_REGISTRY` under Phase 6 (Capacitor / Android), mapped to `KeyboardDeckTool` in `app-shell.tsx`, and added to the workstation ribbon header.

---

## 🧪 Quality & Verification Matrix

| Test Suite / Gate | Coverage | Result | Execution Time |
| :--- | :--- | :--- | :--- |
| **TypeScript Strict Validation** | All Project Files (`tsc --noEmit`) | **0 Errors** | ~4s |
| **ZenoTap Pairing Ease Suite** | Code extractor, linkId generation, pending vs confirmed polling, expiration | **5 / 5 (100%)** | ~2s |
| **ZenoTap Cloud Sync Suite** | URL normalization, CORS preflights, device pairing flow, user isolation | **4 / 4 (100%)** | ~2s |
| **ZenoTap HMAC & Security Suite** | HMAC tickets, nonces, magic byte inspection, anti-replay guards | **7 / 7 (100%)** | ~2s |
| **Tier 1: Feature Coverage** | Media Processing, Storage, Navigation, Audio | **62 / 62 (100%)** | ~9ms |
| **Tier 2: Boundary & Corner Cases** | 0-byte, 2GB+, Malformed URLs, ID3v2.3 Sync | **36 / 36 (100%)** | ~3ms |
| **Tier 3: Cross-Feature Combinations**| Stream Proxy Routing, Worker Allocation, Slice Reassembly | **17 / 17 (100%)** | ~4ms |
| **Tier 4: Real-World Scenarios** | InnerTube Resolution, CDN Range Streaming, MP3 ID3 Tagging | **23 / 23 (100%)** | ~5.7s |
| **Total Test Suite Execution** | Universal End-to-End Test Suite | **138 / 138 (100%)** | ~5.7s |

---

## 📦 Download Binaries

- **📱 Android Universal APK**: `zenodeck.apk` (All 64-bit & 32-bit devices)
- **⚡ Android ARM64-v8a APK**: `zenodeck-v3.12.0-arm64-v8a.apk` (Modern 64-bit phones)
- **🌐 Web App**: [https://omni-tool-two.vercel.app](https://omni-tool-two.vercel.app)
- **🍏 iOS Web Clip Profile**: [https://omni-tool-two.vercel.app/api/ios-profile](https://omni-tool-two.vercel.app/api/ios-profile)
