# ZenoDeck & ZenoTap v1.0.40 Release Notes

**Release Date:** November 26, 2026  
**Build:** Signed Universal & Split-ABI Release APKs (`versionName 1.0.40`, `versionCode 10040`)  
**Engine:** Universal Media Downloader, SSRF-Hardened Stream Proxy, Studio Audio DSP Engine, Zero-Latency Android IME (`com.omnitool.app`), Capacitor 8, Next.js 16 / React 19

---

## 🌟 Executive Overview
ZenoDeck v1.0.40 resolves the Web App `403 Forbidden: URL host is not an authorized video stream CDN` error when resolving `youtu.be` short links and cloud-restricted fallback streams, introduces a unified YouTube URL canonicalization and SSRF-hardened CDN security module, and refines the cloud fallback download UX cleanly around the Embedded Web Player and native Android APK.

---

## 🚀 Key Fixes & Improvements

### 1. 🔗 YouTube Short-Link Canonicalization (`src/lib/media/stream-security.ts`)
- **Unified Canonicalizer (`canonicalizeYouTubeUrl`)**: Normalizes `youtu.be/<id>`, `m.youtube.com/watch?v=<id>`, `music.youtube.com/watch?v=<id>`, `youtube.com/shorts/<id>`, and `youtube.com/live/<id>` into `https://www.youtube.com/watch?v=<id>` across `detectPlatform`, `resolveMediaUrl`, `extractYouTubeId`, `/api/youtube/info`, `/api/media/download`, `youtube-downloader.tsx`, and `DownloadQueueService`.
- **Host-Anchored Extraction**: Uses strict `URL` hostname verification (`YOUTUBE_ALLOWED_HOSTS`) so query strings on unrelated domains cannot spoof YouTube video IDs, while preserving valid `list=` playlist IDs and `youtube-nocookie.com/embed/...` URLs.

### 2. 🛡️ SSRF-Hardened Media CDN Proxy (`src/app/api/youtube/stream/route.ts`)
- **Expanded Authorized CDN Domains**: Added `youtube-nocookie.com`, `ytimg.com`, `ggpht.com`, and `tiktokv.com` to `ALLOWED_STREAM_DOMAINS` alongside `youtube.com`, `youtu.be`, `googlevideo.com`, `tiktokcdn.com`, `cdninstagram.com`, `fbcdn.net`, `twimg.com`, `redd.it`, `vimeocdn.com`, and `sndcdn.com`.
- **Strict SSRF & Redirect Guards**: `isAllowedStreamHost` and `isPrivateOrLoopbackHost` strictly reject non-HTTP(S) schemes, URL credentials (`user:pass@host`), localhost/internal domains, loopback/private/CGNAT/metadata IPs (`127.0.0.1`, `10.*`, `172.16-31.*`, `192.168.*`, `169.254.169.254`, `[::1]`, integer/hex IP encodings), and unsafe `3xx` redirects (`redirect: "manual"` with hop-by-hop `isAllowedHost` verification).

### 3. 🌐 Clean Cloud Fallback UX (`src/components/tools/youtube-downloader.tsx`)
- **Stale Error Banner Suppression**: Clears `resolveError` cleanly across every `setVideoInfo` / fallback resolution transition and suppresses redundant `403 Forbidden` banners above verified `isCloudRestricted` cards.
- **Embed HTML Protection & Web Player Routing**: Prevents `/api/media/download` and Web App chunk workers from fetching `youtube-nocookie.com/embed` HTML pages as `.mp4` streams, smoothly opening the Embedded Web Player preview with a clear Android APK CTA when datacenter extraction is restricted.

---

## 🧪 Verification & Release Packaging
- Verified 0 TypeScript errors (`npm run typecheck`).
- Verified 82/82 URL canonicalization, CDN allowlist, SSRF guard, and UI regression assertions in `scripts/test-youtu-be-cdn-allowlist.ts`, plus `scripts/test-universal-downloader.ts`, `scripts/test-youtube-suite.ts`, `scripts/test-web-youtube-fallback.ts`, and `scripts/test-v1-0-40-release.ts`.
- Synced Web/Capacitor assets (`npm run build:mobile`, `npx cap sync android`) and packaged signed multi-ABI release APKs via GitHub Actions Release workflow.
