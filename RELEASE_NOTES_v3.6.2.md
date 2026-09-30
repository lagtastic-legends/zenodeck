# 🚀 ZenoDeck v3.6.2 — Universal Android APK for All Phones (COD Auto-Login, OTA Controls & Display Cutout Responsive Layout)

**Release Date:** September 30, 2026  
**Codename:** *OmniDevice & KineticMatrix*

---

## 📦 Download

| Platform | Link | SHA-256 Checksum |
|:---|:---|:---|
| **🌐 Web App** | [omni-tool-two.vercel.app](https://omni-tool-two.vercel.app) | `Live PWA · Zero Install` |
| **📱 Android Universal APK (All Phones)** | [zenodeck.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.2/zenodeck.apk) (~24.08 MB) | `E9A304FFACC7D96E2CECB06FCB925B1C06ACD6710BB6DE981805A269080106FF` |
| **🏷️ Versioned APK (v3.6.2)** | [zenodeck-v3.6.2.apk](https://github.com/lagtastic-legends/zenodeck/releases/download/v3.6.2/zenodeck-v3.6.2.apk) | `E9A304FFACC7D96E2CECB06FCB925B1C06ACD6710BB6DE981805A269080106FF` |
| **🍏 iOS Profile** | [zenodeck.mobileconfig](https://omni-tool-two.vercel.app/api/ios-profile) | `Apple Web Clip Configuration` |

---

## 📱 Universal Phone Architecture for All Phone Models

Engineered to deliver an uncompromised native experience across every Android phone form-factor:

### 1. Universal Hardware & Aspect Ratio Compatibility
- **Compact Phones (<360px width)**: Media selector tabs dynamically wrap (`flex-wrap`) and buttons adapt with responsive text sizing (`text-[11px] sm:text-xs`) and truncation, eliminating horizontal overflow and clipped text.
- **Tall Slabs (19.5:9, 20:9, 21:9)**: Dynamic viewport height calculations (`100dvh`) prevent letterboxing and bottom navigation clipping.
- **Flip Phones (Samsung Galaxy Z Flip Flex Mode 90°)**: Constrained viewport height auto-scrolling (`max-h-[calc(100dvh-4rem)]` with `overscroll-contain`) prevents layout lockup in tabletop mode.
- **Foldables & Tablets**: Seamless responsive scaling across inner and outer screens with balanced panel elevation and touch ergonomics.

### 2. Display Cutout & Safe Area Normalization
- Configured Android Display Cutout Mode (`shortEdges`) in Android styles (`android:windowLayoutInDisplayCutoutMode`), allowing edge-to-edge rendering without intrusive black letterbox bars around center camera punches, pill cutouts, and corner notches.
- Consolidated status bar safe-area offsets to the persistent `TopBar` component, eliminating double-padding on notched displays.

---

## 🏎️ 120Hz Hardware Kinetic Momentum & Touch Scrolling

Resolves touch scrolling freezes on high-refresh-rate Android screens:

- **Root Viewport Delegation**: Delegated scrolling cleanly to the root document (`html { overflow-x: clip; scroll-behavior: smooth; }`, `body { overflow-y: visible; touch-action: pan-y pinch-zoom; -webkit-overflow-scrolling: touch; }`).
- **Eliminated WebView Gesture Trapping**: Removed internal `overflow-y: auto` containment on `body` that prevented Chromium WebView from passing touch gestures to Android's `NestedScrollingChild` gesture detector.
- **Fluid 120Hz Flings**: Delivers buttery hardware-accelerated momentum and natural fling physics across 60Hz, 90Hz, 120Hz, and 144Hz displays.

---

## 🎮 Call of Duty-Style Auto-Login Sequence for Saved Accounts

Introduces high-tempo, seamless authentication on Android APK and Web:

- **Automated Sign-In Sequence**: When returning users launch ZenoDeck with a saved device account, a prominent 3-second animated laser countdown begins immediately.
- **Instant Override Controls**: Users can tap **"Instant Sign In"** to bypass the countdown immediately or **"Cancel"** to abort the sequence and switch accounts without getting trapped in a loop (`sessionStorage` cancel latching).
- **Auto-Login Master Switch**: Added a dedicated `Auto-Login: ON / OFF` toggle switch directly in the "Accounts on this device" header, allowing users to disable automatic sign-ins permanently.
- **Account Priority Tagging**: The active primary auto-login account is clearly labeled with an amber `Auto-Login` badge in the saved accounts roster.

---

## 🔄 Universal Update Dismissal & Cache Purge ("Remove" Button)

Provides full user autonomy over pending Over-The-Air (OTA) updates:

- **Update Removal**: Added a red **"Remove"** button with trash icon in both the `UpdateModal` and `AuthGateway` update action rows.
- **Storage Sanitization**: Clicking "Remove" removes `zenodeck_update_cache` from `localStorage`, logs the dismissal timestamp to prevent nagging popups, resets local notification state, and broadcasts the `zenodeck:update-dismissed` event across all open components.
- **Cross-Component Synchronization**: TopBar badge and notification indicators instantly clear in real-time when an update is dismissed or removed.

---

## ⚙️ Auto-Update Engine Controls in Auth Gateway & TopBar

Empowers users to manage background OTA update checks:

- **Auth Gateway Card**: Dedicated "Automatic Updates" card displaying installed version (`v3.6.2`), live background update toggle (`ON / OFF`), on-demand "Check Updates" button, and inline update installation/removal actions.
- **TopBar Quick-Access**: Replaced the ambiguous AI sparkles button with an interactive `UPDATES` button. Features a subtle rotating sync indicator and a live glowing emerald pulse dot when Auto-Update is active.
- **Zustand Persistence**: Auto-update preferences persist in local storage via `useUpdateStore` (`zenodeck_auto_update_enabled`).

---

## 🎥 Universal YouTube Stream Resolution & Anti-Throttling Engine

Resolves the `"unable to resolve stream"` error and stream loading failures:

- **On-Device CapacitorHttp Streaming**: Routes media chunk downloads through native `CapacitorHttp` on Android APK, matching the on-device IP bound to YouTube InnerTube URLs while bypassing browser CORS constraints.
- **Dynamic Candidate Edge Node Failover**: Automatically parses secondary edge servers from the `mn` URL parameter (`sn-fapo3ox25a-3uh6`) and fails over instantly if the primary node times out or throttles.
- **iOS Client UA Alignment**: Forwards authentic iOS InnerTube User-Agent on proxy and direct fetches for `c=IOS` stream streams.
- **Route Normalization**: Normalized API query routing to prevent Next.js 308 redirects that strip `Range` headers.
- **COEP `credentialless` Support**: Upgraded Cross-Origin Embedder Policy to preserve `SharedArrayBuffer` multithreading without blocking external media streams.

---

## 🧪 Verification & Test Suite

All 9 automated test suites pass with 100% success:

| Test Suite | Total Tests | Status |
|:---|:---:|:---:|
| Core E2E Verification Suite | 100 | ✅ 100% Pass |
| YouTube Engine Suite | 44 | ✅ 100% Pass |
| M2 Container Muxing Suite | 36 | ✅ 100% Pass |
| M3 Native Save & Storage Suite | 33 | ✅ 100% Pass |
| Subtitles & Vault Suite | 23 | ✅ 100% Pass |
| Multi-Platform Downloader Suite | 22 | ✅ 100% Pass |
| Audio DSP M1 Unit Suite | 111 | ✅ 100% Pass |
| Audio DSP E2E 4-Tier Suite | 125 | ✅ 100% Pass |
| Updater & Cache Test Suite | 12 | ✅ 100% Pass |
| **Total Test Assertions** | **506** | **✅ 100% PASS** |

- Static Typecheck: `npx tsc --noEmit` → **0 errors**
- Mobile Static Export: `npm run build:mobile` → **Clean build**
- Android Release APK: `gradlew.bat assembleRelease` → **BUILD SUCCESSFUL**
