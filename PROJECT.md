# Project: ZenoDeck Ultimate Media Downloader Audit & Speed Optimization

## Architecture
ZenoDeck Ultimate Media Downloader consists of a multi-platform client-side architecture spanning TypeScript/Next.js and native Android Kotlin:
1. **Extraction Layer (`src/lib/youtube/`, `src/lib/media/extractors/`)**:
   - YouTube InnerTube bridge with multi-client cascade (iOS, Android VR, Android official).
   - Social media platform extractors (TikTok, Instagram Reels, Twitter/X, Reddit).
   - Generates stream URLs, quality ladders, headers, and media metadata.
2. **Download Engine Layer**:
   - **Android Native (`android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt`)**: Multi-connection parallel chunk streaming engine with sticky CDN failover, 2.5s connect timeout, dynamic range chunking, and monotonic progress tracking.
   - **Web TypeScript (`src/lib/youtube/turbo-downloader.ts`)**: In-memory chunk streaming with worker concurrency.
3. **Muxing & MediaStore Publishing Layer**:
   - **Android Native**: Hardware-accelerated `MediaMuxer` with chronologically interleaved sample streaming, PTS baseline normalization, container-codec pairing (MP4 for H.264+AAC, WebM for VP9+Opus), sandbox cleanup, and instant MediaStore gallery publication.
   - **Web**: `@ffmpeg/ffmpeg` WebAssembly muxer.
4. **Testing & Verification Layer**:
   - TypeScript verification suite (`npm test`, `npm run typecheck`).
   - Native Gradle release build (`./gradlew assembleRelease`).
   - Opaque-box 4-tier E2E testing suite + Tier 5 adversarial hardening.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Multi-Connection Parallel Chunk Streaming | Accelerated multi-worker chunk streaming replacing sequential chunk loop | M2 | R1 |
| 2 | Sticky CDN Failover & 2.5s Timeout | Shared atomic preferred host index with 2500ms connect timeout | M2 | R1 |
| 3 | Dynamic Stream Sizing & Anti-Stall Progress | Atomic monotonic progress advancing smoothly from 0% to 100% | M2 | R1 |
| 4 | Selective Range Parameter Injection | Inject `&range=` only for confirmed DASH streams, preserve standard Range header | M2 | R1 |
| 5 | Chronologically Interleaved A/V Sample Muxing | Sample-by-sample timestamp-ordered writing to eliminate player seeking and desync | M3 | R2 |
| 6 | Baseline PTS Timestamp Normalization | Subtract initial stream PTS to ensure audio and video align at t=0 | M3 | R2 |
| 7 | Strict Codec-Container Pairing | Pair H.264+AAC for MP4 and VP9+Opus for WebM to avoid MediaMuxer fatal exceptions | M3 | R2 |
| 8 | MediaStore Publishing & Sandbox Cleanup | Delete sandbox temp file after MediaStore copy; instant MediaScanner gallery publish | M3 | R2 |
| 9 | Web FFmpeg WASM Muxing Safeguards | Validate WebAssembly muxing pipelines and memory boundaries | M3 | R2 |
| 10 | YouTube InnerTube Client Priority & Sorting | Priority for iOS/VR clients, 360p rejection, and descending resolution quality ladder | M1 | R3 |
| 11 | TikTok Extractor Fallback Hardening | Implement secondary provider (`api.tikdown.org`) response parsing | M1 | R3 |
| 12 | Pre-Download Stream File Sizing | Pre-compute or probe content lengths for Instagram, Twitter/X, and Reddit streams | M1 | R3 |
| 13 | Subsystem Test Script Harmonization | Update outdated assertions in scripts for iOS client version, dynamic chunking, and app version | M1 | R3 |
| 14 | Opaque-Box E2E Test Suite Creation | 4-tier test suite covering feature coverage, boundaries, pairwise combinations, and real-world scenarios | E2E-Track | Criteria |
| 15 | 100% E2E Pass & Adversarial Hardening | Pass 100% E2E suite, followed by Tier 5 adversarial coverage hardening | M-Final | Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Multi-Platform Resolvers & Script Harmonization | TikTok fallback, Instagram/Twitter/Reddit file sizing, test script assertions | none | DONE |
| 2 | M2: Native Android Parallel Chunk Throughput | Multi-worker chunk streaming, atomic sticky CDN failover, anti-stall progress | none | DONE |
| 3 | M3: Native A/V Muxing Interleaving & MediaStore Publishing | Sample interleaving loop, PTS normalization, codec pairing, MediaStore cleanup & scan | M2 | PLANNED |
| 4 | E2E-Track: Opaque-Box Test Suite | Tiers 1-4 comprehensive test suite publishing TEST_READY.md | none | DONE |
| 5 | M-Final: 100% E2E Verification & Adversarial Hardening | Pass 100% of E2E tests, followed by Tier 5 white-box coverage hardening | M1, M3, E2E-Track | PLANNED |

## Interface Contracts
### Downloader ↔ Extractors
- Extractor Output Format:
  - `DownloadOptions`: `{ videoUrl: string, audioUrl?: string, quality: string, resolution: string, container: string, formatId: string, fileSize?: number, requiresMuxing?: boolean }`
  - When `requiresMuxing === true`, both `videoUrl` and `audioUrl` must be populated with compatible codec streams.
  - Video and audio URLs must include appropriate auth/CDN parameters or headers.

### Download Engine ↔ Muxing Engine (Android Native)
- Method: `downloadAndMuxYouTubeStreams(videoUrl, audioUrl, title, ext, ...)`
- Download Phase:
  - Downloads video stream to `tempVideoFile` using parallel chunk streaming if size known, otherwise single-pass stream.
  - Downloads audio stream to `tempAudioFile` concurrently or sequentially.
- Muxing Phase:
  - `muxVideoAndAudio(tempVideoFile, tempAudioFile, outputFile)`
  - Reads samples from both extractors, normalizes PTS to zero-based origin, and writes samples in interleaved chronological timestamp order.
  - Cleans up `tempVideoFile` and `tempAudioFile` upon completion or error.

### Muxing Engine ↔ MediaStore
- Destination:
  - Video: `MediaStore.Video.Media.EXTERNAL_CONTENT_URI`, `RELATIVE_PATH = "Movies/ZenoDeck"`
  - Audio: `MediaStore.Audio.Media.EXTERNAL_CONTENT_URI`, `RELATIVE_PATH = "Music/ZenoDeck"`
- Publication lifecycle:
  1. Insert with `IS_PENDING = 1`
  2. Copy bytes from output file to `ContentResolver.openOutputStream(uri)`
  3. Update with `IS_PENDING = 0`
  4. Delete private intermediate file from sandbox storage
  5. Request `MediaScannerConnection.scanFile` on public file path or notify URI.

## Code Layout
- `src/lib/youtube/`: YouTube extraction and web downloading
  - `innertube.ts`: InnerTube client and stream extraction
  - `turbo-downloader.ts`: Web parallel streaming & FFmpeg WASM muxing
- `src/lib/media/extractors/`: Multi-platform extractors
  - `tiktok.ts`: TikTok extraction and fallback
  - `instagram.ts`: Instagram Reels/Posts extraction
  - `twitter.ts`: Twitter/X extraction
  - `reddit.ts`: Reddit DASH extraction
- `android/app/src/main/java/com/omnitool/app/media/`: Native Android engine
  - `ZenoHeadlessMediaEngine.kt`: Download, parallel streaming, MediaMuxer, MediaStore
- `scripts/`: Verification and test scripts
  - `test-e2e-suite.ts`: Primary 4-tier test runner
  - `test-native-youtube-downloader.ts`, `test-topbar-fetch-and-layouts.ts`, `test-updater.ts`: Subsystem checks
