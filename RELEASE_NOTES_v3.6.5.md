# 🚀 ZenoDeck v3.6.5 — Multi-Architecture APKs, Zero-Loop Web Stability & AI Route Hardening

**Release Version:** `v3.6.5`  
**Build Target:** Universal Web & Android Multi-Architecture Native Ecosystem  
**Repository:** [lagtastic-legends/zenodeck](https://github.com/lagtastic-legends/zenodeck)  
**Live Web Deployment:** [omni-tool-two.vercel.app](https://omni-tool-two.vercel.app)

---

## 📦 Direct Downloads & Distribution Assets

| Asset / Package | Download Link | Architecture / Compatibility |
| :--- | :--- | :--- |
| **📱 Android Universal APK (All Phones)** | [zenodeck.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.5/zenodeck.apk) (~24 MB) | `Universal: All 64-bit & 32-bit Phones + Emulators` |
| **⚡ ARM64-v8a Dedicated APK** | [zenodeck-v3.6.5-arm64-v8a.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.5/zenodeck-v3.6.5-arm64-v8a.apk) | `Modern Android Phones (Pixel, Samsung Galaxy, OnePlus, Xiaomi)` |
| **📱 ARMv7a Dedicated APK** | [zenodeck-v3.6.5-armeabi-v7a.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.5/zenodeck-v3.6.5-armeabi-v7a.apk) | `Legacy 32-bit Android Phones & Budget Devices` |
| **💻 x86_64 Dedicated APK** | [zenodeck-v3.6.5-x86_64.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.5/zenodeck-v3.6.5-x86_64.apk) | `Android Tablets, Chromebooks, Android Studio & Windows Subsystem for Android` |
| **🏷️ Versioned Archive APK** | [zenodeck-v3.6.5.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.5/zenodeck-v3.6.5.apk) | `Official v3.6.5 Archive Universal Build` |
| **🍏 Apple iOS Profile** | [zenodeck.mobileconfig](https://omni-tool-two.vercel.app/api/ios-profile) | `iOS / iPadOS Home Screen Web Clip Standalone Profile` |

---

## 🌟 What's New in v3.6.5

### 1. 📱 Multi-Architecture APK Builds for All Phone Types
- **ABI Split Generation**: Configured Gradle ABI splits in `android/app/build.gradle` to build optimized, tailored APKs for `arm64-v8a`, `armeabi-v7a`, `x86_64`, alongside the all-in-one `universalApk`.
- **Automated CI/CD Staging**: Enhanced `.github/workflows/release.yml` to automatically package, sign, and publish all 4 architecture-specific APK binaries to GitHub Releases on tag pushes.
- **Universal Device Coverage**: Every user gets the smallest, fastest binary for their exact hardware with zero ABI incompatibility issues.

### 2. 🛡️ Minified React Error #185 Permanent Fix (Web Stability)
- **Root Cause Eliminated**: Resolved the infinite render loop (`Maximum update depth exceeded`) on `omni-tool-two.vercel.app`.
- **Singleton Capability Caching**: In `src/lib/ffmpeg/ffmpeg-context.tsx`, `getEngineCapabilities()` previously constructed a new object literal on every render. Because React's `useSyncExternalStore` uses `Object.is()` for snapshot comparison, newly allocated objects caused an infinite render loop. Cached the capabilities object as a stable singleton reference.

### 3. 🤖 AI Assistant (Ask Zeno) Route Hardening
- **Canonical Trailing Slash Routing**: Next.js is configured with `trailingSlash: true`, causing `/api/ai` calls to trigger an HTTP 308 redirect with body `"Redirecting..."`. `response.json()` crashed parsing this non-JSON response.
- **Canonical Endpoint**: Updated `src/lib/gemini.ts` to always route directly to `/api/ai/` and `/api/ai/${query}`, bypassing 308 redirects completely.
- **Safe Response Parsing**: Wrapped response consumption in `response.text()` with structured JSON try/catch logic to prevent any unhandled JSON parse exceptions.
- **Verified Gemini Connectivity**: Live remote probe verified HTTP 200 responses with active Gemini streaming and conversational responses.

### 4. 🎮 Call of Duty-Style Tactical Auto-Login Polish
- **Smooth 60fps Progress Animation**: Replaced jumpy intervals with a fluid 16ms tick rate and calibrated 4% increments.
- **Phased Tactical HUD Status**:
  1. `ESTABLISHING OPERATOR LINK…`
  2. `VERIFYING SECURITY CLEARANCE…`
  3. `DEPLOYING TO DASHBOARD…`
  4. `OPERATOR VERIFIED · ACCESS GRANTED`
- **Instant Account Switching**: 1-click account switching and manual override with zero stutter.

### 5. 🔘 Circular Remove Button & Quick Auto-Update Toggle
- **Tactile Dismissal**: Added the circular dismiss icon button in the "All Systems Up to Date" state of the update dialog.
- **Header Auto-Update Switch**: Fast toggle in the navigation top bar for instant control over automated update background polling.

---

## 🔒 Security & Privacy Guarantee
ZenoDeck runs **100% on-device** for all media processing, video transcoding, PDF tools, QR generation, and document manipulation. Files never touch any remote servers.
