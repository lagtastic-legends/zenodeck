setTimeout(() => { console.error("Test timeout"); process.exit(1); }, 15000).unref();

import { useDownloadQueueStore } from "../src/lib/media/download-queue-store";
import { downloadQueueService } from "../src/lib/media/download-queue-runner";
import type { YouTubeQualityOption } from "../src/lib/youtube/innertube";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runRunnerTests() {
  console.log("🧪 Starting Download Queue Runner Test Suite...");

  const store = useDownloadQueueStore.getState();
  store.clearAll();

  // Test 1: Runner initial state
  console.log("▶️ Test 1: Service initial state");
  assert(downloadQueueService.getActiveTaskId() === null, "Active task id should initially be null");

  // Test 2: Pause and Resume methods do not throw when idle
  console.log("▶️ Test 2: Idle safety checks");
  downloadQueueService.pauseActiveTask();
  downloadQueueService.resumeActiveTask();
  downloadQueueService.cancelActiveTask();
  assert(downloadQueueService.getActiveTaskId() === null, "Active task should remain null");

  // Test 3: Global Pause halts processing
  console.log("▶️ Test 3: Global Pause blocks execution");
  const mockQuality: YouTubeQualityOption = {
    id: "720p-mp4",
    itag: 22,
    container: "mp4",
    resolutionLabel: "720p",
    approxSizeBytes: 20_000_000,
    hasVideo: true,
    hasAudio: true,
    badge: "720P",
    formatNote: "HD MP4",
  };

  store.enqueue({
    url: "https://www.youtube.com/watch?v=sample1",
    platform: "youtube",
    title: "Queued Video 1",
    author: "Zeno Studio",
    thumbnailUrl: "https://example.com/thumb.jpg",
    durationFormatted: "02:30",
    qualityOption: mockQuality,
    isAudioOnly: false,
    format: "mp4",
  });

  store.pauseAll();
  assert(useDownloadQueueStore.getState().isGlobalPaused === true, "isGlobalPaused should be true");

  await downloadQueueService.processNext();
  assert(downloadQueueService.getActiveTaskId() === null, "Should not start processing while globally paused");
  assert(useDownloadQueueStore.getState().items[0].status === "paused", "Item should be paused");

  store.resumeAll();
  assert(useDownloadQueueStore.getState().isGlobalPaused === false, "isGlobalPaused should be false");
  assert(useDownloadQueueStore.getState().items[0].status === "queued", "Item should be queued after resumeAll");

  store.clearAll();
  assert(useDownloadQueueStore.getState().items.length === 0, "Queue cleared successfully");

  console.log("✅ All Download Queue Runner tests passed successfully!");
  process.exit(0);
}

runRunnerTests().catch((err) => {
  console.error("Runner test execution error:", err);
  process.exit(1);
});
