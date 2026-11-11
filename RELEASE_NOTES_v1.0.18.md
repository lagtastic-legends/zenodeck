# ZenoDeck & ZenoTap v1.0.18 Release Notes

**Release Date:** November 11, 2026  
**Tag:** `v1.0.18`  
**Android Build:** `versionCode 10018` · `versionName "1.0.18"`  
**Target Environments:** Android (APK: Universal, ARM64-v8a, ARMv7a, x86_64), Modern Web Browsers, PWA, iOS (Web Clip)  
**Security & Type Safety:** 100% Strict TypeScript Passing (`tsc --noEmit`), 0 Compiler Errors, Kotlin 2.1.0 (JDK 21)  
**Universal APK Size:** **~72.8 MB** (Includes Chaquopy Python Runtime & WebAssembly Runtimes)

---

## 🚀 Executive Summary

**ZenoDeck & ZenoTap v1.0.18** introduces the upgraded **In-App Mini Browser** with the signature Deep Forest & Champagne palette, the **Pulsing Floating VidMate-Style Download Action Button (FAB)** with direct `<VidMateQualitySheet />` handoff, and the **Native Android WebView OG & Video Sniffer** for real-time page metadata and stream extraction.

---

## 🌟 Key Upgrades & Highlights

### 1. 🌐 Upgraded In-App Mini Browser & Omnibox Strip (`mini-browser-view.tsx`)
- **Omnibox URL Form & Search Fallback:**
  - Automatic URL normalization with protocol prepending and privacy-first DuckDuckGo query fallback.
  - Live progress bar indicator, back/forward history navigation, reload, and one-tap Home return.
- **Deep Forest & Champagne Palette Styling:**
  - Full aesthetic refactoring matching ZenoDeck's signature dark-mode palette: Deep Forest Green (`#102C26`), Champagne (`#F7E7CE`), Donkey Brown (`#A79277`), and Obsidian (`#090D0C`).
- **8-Tile Quick Site Portal Grid:**
  - Direct bookmarks for YouTube, TikTok, Instagram, Facebook, X/Twitter, Reddit, Vimeo, and SoundCloud with category chips and quality badges.

### 2. ⚡ Pulsing VidMate-Style Floating Download Action Button (FAB)
- **Bottom-Right Screen Docking:**
  - Docked to `bottom-5 right-5 z-30` for comfortable one-handed mobile thumb access.
- **Glowing Visual Pulse:**
  - Whenever media or streaming URLs are detected on the active webpage, the button glows with Forest & Champagne accenting (`bg-[#102C26] text-[#F7E7CE] border-2 border-[#F7E7CE] ring-4 ring-emerald-500/35 animate-bounce`) reading `⚡ Download Video / MP3`.
- **VidMate Quality Sheet Handoff:**
  - Tapping the FAB immediately passes the detected URL to the downloader controller, triggers stream resolution, and opens `<VidMateQualitySheet />`.

### 3. 🔍 Native Android WebView OG & Video Sniffer (`ZenoMedia3Plugin.kt`, `native-media-muxer.ts`)
- **Metadata Extraction on `onPageFinished`:**
  - Extracts `ogTitle` (`meta[property="og:title"]` or `document.title`).
  - Extracts `ogImage` (`meta[property="og:image"]`).
  - Extracts `directVideoSrc` (`document.querySelector('video')?.src || document.querySelector('video source')?.src`).
- **Zero-Drop Bridge Serialization:**
  - Passes extracted metadata into the resolved `JSObject` for immediate UI presentation.

---

## 📦 Verified Binary Distribution

| Platform / Target | Artifact File | Target Device | Binary Size |
| :--- | :--- | :--- | :--- |
| **📱 Universal Android APK** | [**app-universal-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.18/app-universal-release.apk) | All Android Phones & Tablets | **~72.8 MB** |
| **⚡ ARM64-v8a APK** | [**app-arm64-v8a-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.18/app-arm64-v8a-release.apk) | Modern 64-bit Android Phones | **~45.9 MB** |
| **📱 ARMv7a APK** | [**app-armeabi-v7a-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.18/app-armeabi-v7a-release.apk) | Legacy 32-bit Android Phones | **~41.3 MB** |
| **💻 x86_64 APK** | [**app-x86_64-release.apk**](https://github.com/lagtastic-legends/zenodeck/releases/download/v1.0.18/app-x86_64-release.apk) | Android Tablets, Emulators | **~47.2 MB** |
| **🍏 Apple iOS Web Clip** | [**zenodeck.mobileconfig**](https://omni-tool-two.vercel.app/api/ios-profile) | iPhone & iPad Standalone PWA | **~0.1 MB** |
| **🌐 Web Application** | [**omni-tool-two.vercel.app**](https://omni-tool-two.vercel.app) | Instant Desktop / Browser Access | Cloud |
