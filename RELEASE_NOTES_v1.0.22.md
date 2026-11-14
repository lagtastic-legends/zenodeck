# ZenoDeck & ZenoTap v1.0.22 Release Notes

**Release Date:** November 14, 2026  
**Version:** `1.0.22` (`versionCode 10022`)  
**Package:** `zenodeck`  
**Git Tag:** `v1.0.22`  

---

## 🌟 Executive Summary

ZenoDeck v1.0.22 delivers the **Universal Download Manager & Background Queuing Engine**. This release introduces a persistent, multi-platform download queue powered by Zustand and `localStorage`, an automatic sequential FIFO queue runner with streaming pause/resume and cancellation, an interactive real-time telemetry HUD with dynamic priority reordering, and unified 4-tab integration within the Universal Media Downloader.

---

## 🛠️ Highlights & Core Features

### 1. 📥 Persistent Download Queue Store (`download-queue-store.ts`)
- **State Machine Lifecycle**:
  - Tracks every media item through explicit operational states: `queued`, `resolving`, `downloading`, `paused`, `completed`, `failed`, and `cancelled`.
  - Automatically preserves metadata: original URL, platform type, title, author, thumbnail, formatted duration, audio/video flag, quality option, and target format.
- **Fail-Safe Session Restoration**:
  - Automatically persists all queue items into `localStorage` with memory fallback.
  - On browser reload or app restart, any tasks that were actively downloading cleanly reset to `"queued"` so they can resume without stream corruption or orphaned artifacts.
- **Queue Operations**:
  - Full suite of store actions: `enqueue`, `dequeue`, `pauseItem`, `resumeItem`, `pauseAll`, `resumeAll`, `retryItem`, `clearCompleted`, `clearAll`, `moveUp`, `moveDown`, `updateProgress`, and `setStatus`.

---

### 2. ⚡ Background Queue Runner Engine (`download-queue-runner.ts`)
- **Sequential FIFO Execution**:
  - Singleton `DownloadQueueService` continuously monitors the queue and auto-advances through pending downloads in strict sequential order.
- **Pause & Resume Integration**:
  - Dynamically wires `PauseController` into `downloadYouTubeStream` parallel chunk streaming, enabling instantaneous pausing and resuming of active network transfers.
- **Clean Cancellation**:
  - Leverages standard `AbortController` signals to immediately terminate active stream workers upon task deletion or cancellation without orphaned network requests.
- **Vault & Notification Integration**:
  - Completed downloads automatically register in the History Vault (`useHistoryStore`) and trigger native Android (`@capacitor/local-notifications`) and browser notifications (`notifyJobSuccess` / `notifyJobError`).
- **WakeLock Shield**:
  - Acquires screen and CPU wake locks (`acquireWakeLock`) during active background downloads to protect against mobile OS sleep interruption.

---

### 3. 📊 Interactive Download Manager Deck (`download-manager-view.tsx`)
- **Real-Time Telemetry HUD**:
  - Live network throughput gauge in MB/s (`speedMbps`).
  - Total downloaded volume readout (`downloadedBytes` vs `totalBytes`).
  - Active downloading task counter and global Pause All / Resume All toggle.
- **Active Task Progress Card**:
  - Live animated progress bar with percentage readout.
  - Active transfer rate badge and dynamic estimated time remaining (ETA).
  - Direct Pause / Resume and Cancel buttons for the currently active stream.
- **Dynamic Priority Steppers**:
  - Interactive `Move Up` (▲) and `Move Down` (▼) steppers allowing users to dynamically adjust the download priority order of scheduled tasks.
- **Multi-State Filtering & Recovery**:
  - Tabbed filters: `All`, `In Queue`, `Finished`, and `Failed`.
  - 1-click retry for failed items (`retryItem`).
  - Instant track auditioning in the Mini Player and direct device file export for completed downloads.

---

### 4. 🎛️ Downloader & Bottom Sheet Integration
- **4-Tab Navigation (`youtube-downloader.tsx`)**:
  - Expanded view switcher to 4 seamless tabs: `[ ⚡ Downloader ] · [ 📥 Queue (Live Count) ] · [ 💬 Subtitles ] · [ 🗄️ Vault ]`.
  - Live pulsing count badge indicates active background queue items.
  - Dedicated `[ 📥 Add to Queue ]` button alongside the primary `Start Turbo Download` action.
- **VidMate Quality Sheet (`vidmate-quality-sheet.tsx`)**:
  - Added dedicated `[ 📥 Queue ]` action button in the bottom sheet footer alongside `DOWNLOAD NOW`.

---

## 🧪 Verification Matrix

| Test Suite / Verification Step | Component Checked | Result |
| :--- | :--- | :--- |
| `scripts/test-v1-0-22-release.ts` | Version constants, build.gradle, changelog, notes | **PASS** (100%) |
| `scripts/test-download-queue-store.ts` | Persistent Zustand queue store, state machine, priority | **PASS** (100%) |
| `scripts/test-download-queue-runner.ts` | FIFO queue runner, Pause/Resume, abort handling | **PASS** (100%) |
| `scripts/test-topbar-fetch-and-layouts.ts` | Responsive 4-tab switcher, mobile budgets, CORS | **PASS** (100%) |
| `npm run typecheck` (`tsc --noEmit`) | TypeScript compilation across all tools & libraries | **PASS** (0 errors) |
| `npm run test:ci` | All 36 automated CI test suites | **PASS** (100%) |
| `npm run build` | Next.js production build (`next build --webpack`) | **PASS** (22.8s) |

---

## 📱 Release Artifacts

All Android release binaries are signed and staged in `apks/`:
- `apks/zenodeck-universal-release-v1.0.22.apk`
- `apks/zenodeck-arm64-v8a-release-v1.0.22.apk`
- `apks/zenodeck-armeabi-v7a-release-v1.0.22.apk`
- `apks/zenodeck-x86_64-release-v1.0.22.apk`
