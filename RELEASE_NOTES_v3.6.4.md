# 🚀 ZenoDeck v3.6.4 — AI Assistant Resilient Failover & Tactile Update Dismissal

**Release Date:** October 1, 2026  
**Codename:** *NeuralPulse & KineticShield*

---

## 📦 Downloads & Live Deployment

| Platform | Link | SHA-256 Checksum |
|:---|:---|:---|
| **🌐 Web Application** | [omni-tool-two.vercel.app](https://omni-tool-two.vercel.app) | `Live PWA · Zero Installation` |
| **📱 Android Universal APK (All Phones)** | [zenodeck.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.4/zenodeck.apk) (~24 MB) | `Signed Universal Android APK · ARM64 / x86_64` |
| **🏷️ Versioned APK (v3.6.4)** | [zenodeck-v3.6.4.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.4/zenodeck-v3.6.4.apk) | `Release v3.6.4 Dedicated Archive Package` |
| **🍏 iOS Web Clip Profile** | [zenodeck.mobileconfig](https://omni-tool-two.vercel.app/api/ios-profile) | `Apple MobileConfig Profile for iOS / iPadOS` |

---

## 🎯 What Was Fixed & Delivered

### 1. 🤖 AI Assistant (Ask Omni) Fully Restored & Hardened
- **Resilient Multi-Tier Model Failover**: Resolved the AI non-replying defect caused by upstream Google Gemini API `503 Service Unavailable` demand spikes on `gemini-3.8-flash`. Configured an instant, zero-delay failover hierarchy:
  `gemini-3.8-flash` ➔ `gemini-3.6-flash` ➔ `gemini-flash-lite-latest` ➔ `gemini-flash-latest`.
- **Query Parameter Separator Syntax Fix**: Corrected the Google API endpoint URL builder where `:generateContent&key=` was malformed without a query delimiter (`?`). Replaced with compliant `:generateContent?key=` and `:streamGenerateContent?alt=sse&key=`.
- **Native Android Endpoint Routing**: In `src/lib/gemini.ts`, fixed mobile WebView endpoint routing. When running natively on Android (`Capacitor.isNativePlatform()`), requests are dynamically routed to `https://omni-tool-two.vercel.app/api/ai` instead of failing on unserved `https://localhost/api/ai/`.
- **Dual-Layer Non-Streaming Fallback**: In `AskOmni.tsx`, added automatic graceful fallback from streaming to standard generation if mobile network proxies buffer or interrupt SSE streams.

---

### 2. 🔘 Circular Remove Button in Update Modal ("Circle One")
- **Requested Remove Button**: Added the requested **Remove** action button directly in the "All Systems Up to Date" section of the update modal (in the exact position indicated in user feedback).
- **Tactile Circular Icon Badge**: Styled the Remove action with an ergonomic circular badge (`grid size-5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400`) and subtle hover scaling.
- **Cache Purge & Modal Dismissal**: Tapping Remove clears update notification local storage, executes haptic confirmation, and dismisses the update modal smoothly.
- **Unified Styling**: Standardized the Remove circular icon button across both the up-to-date state, the pending OTA release view, and the Auth Gateway dashboard.

---

### 3. 📱 Mobile Display & Cutout Padding
- **Safe Area Inset Normalization**: Added safe `env(safe-area-inset-top, 24px) + 1rem` offsets to `UpdateModal`, ensuring that the status bar and camera punch-holes never obscure the header on modern notched and pinhole Android screens.
- **Centering Polish**: Added responsive vertical margin centering (`my-auto`) to guarantee optimal viewport placement on all phone aspect ratios.

---

## 🧪 Quality Assurance & Test Verification

- **TypeScript Typecheck**: 0 errors (`tsc --noEmit`).
- **Comprehensive E2E Suite**: 125/125 assertions passed (100% pass rate).
- **Updater & Semver Suite**: 12/12 unit tests passed.
- **AI Route & CORS Suite**: 3/3 assertions passed (`test-ai-route.ts`).
- **Mobile Static Export**: Compiled cleanly with Next.js 16.3.2.
- **Web Production Build**: Compiled cleanly with Next.js 16.3.2.
- **Capacitor Android Sync**: Assets synchronized to native Android project.
