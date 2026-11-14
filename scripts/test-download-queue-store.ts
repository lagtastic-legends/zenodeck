setTimeout(() => { console.error("Test timeout"); process.exit(1); }, 15000).unref();

import { useDownloadQueueStore } from "../src/lib/media/download-queue-store";
import type { YouTubeQualityOption } from "../src/lib/youtube/innertube";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log("🧪 Starting Download Queue Store Test Suite...");

  const store = useDownloadQueueStore.getState();
  store.clearAll();
  assert(useDownloadQueueStore.getState().items.length === 0, "Initial store must be empty");
  assert(useDownloadQueueStore.getState().isGlobalPaused === false, "Global pause should be false initially");

  const mockQuality1: YouTubeQualityOption = {
    id: "1080p-mp4",
    itag: 137,
    container: "mp4",
    resolutionLabel: "1080p",
    approxSizeBytes: 50_000_000,
    hasVideo: true,
    hasAudio: true,
    badge: "1080P",
    formatNote: "FHD MP4",
  };

  const mockQuality2: YouTubeQualityOption = {
    id: "audio-320",
    itag: 140,
    container: "mp3",
    resolutionLabel: "320kbps",
    approxSizeBytes: 8_000_000,
    hasVideo: false,
    hasAudio: true,
    badge: "320 KBPS",
    formatNote: "High Quality Audio",
    isAudioOnly: true,
  };

  // Test 1: Enqueue Items
  console.log("▶️ Test 1: Enqueue Items");
  const id1 = store.enqueue({
    url: "https://www.youtube.com/watch?v=mock1",
    platform: "youtube",
    title: "Video One",
    author: "Creator One",
    thumbnailUrl: "https://example.com/thumb1.jpg",
    durationFormatted: "03:45",
    qualityOption: mockQuality1,
    isAudioOnly: false,
    format: "mp4",
  });

  const id2 = store.enqueue({
    url: "https://www.youtube.com/watch?v=mock2",
    platform: "youtube",
    title: "Audio Two",
    author: "Creator Two",
    thumbnailUrl: "https://example.com/thumb2.jpg",
    durationFormatted: "04:12",
    qualityOption: mockQuality2,
    isAudioOnly: true,
    format: "mp3",
  });

  let items = useDownloadQueueStore.getState().items;
  assert(items.length === 2, "Should have 2 queued items");
  assert(items[0].id === id1, "First item id match");
  assert(items[0].status === "queued", "Status must be 'queued'");
  assert(items[1].id === id2, "Second item id match");

  // Test 2: Status & Progress Updates
  console.log("▶️ Test 2: Status & Progress Updates");
  store.setStatus(id1, "downloading");
  store.updateProgress(id1, {
    percent: 45.5,
    speedMbps: 12.8,
    downloadedBytes: 22_500_000,
    totalBytes: 50_000_000,
    etaSeconds: 15,
  });

  const updatedItem1 = useDownloadQueueStore.getState().items.find((i) => i.id === id1);
  assert(updatedItem1?.status === "downloading", "Item 1 status must be 'downloading'");
  assert(updatedItem1?.progress.percent === 45.5, "Progress percent must match");
  assert(updatedItem1?.progress.speedMbps === 12.8, "Speed must match");

  // Test 3: Priority Ordering (Move Down & Move Up)
  console.log("▶️ Test 3: Priority Ordering");
  store.moveDown(id1);
  items = useDownloadQueueStore.getState().items;
  assert(items[0].id === id2, "Item 2 should now be at index 0");
  assert(items[1].id === id1, "Item 1 should now be at index 1");

  store.moveUp(id1);
  items = useDownloadQueueStore.getState().items;
  assert(items[0].id === id1, "Item 1 should be restored to index 0");
  assert(items[1].id === id2, "Item 2 should be restored to index 1");

  // Test 4: Pause & Resume Controls
  console.log("▶️ Test 4: Pause & Resume Controls");
  store.pauseItem(id1);
  assert(useDownloadQueueStore.getState().items[0].status === "paused", "Item 1 should be paused");

  store.resumeItem(id1);
  assert(useDownloadQueueStore.getState().items[0].status === "queued", "Item 1 should be queued after resume");

  store.pauseAll();
  assert(useDownloadQueueStore.getState().isGlobalPaused === true, "Global pause should be true");

  store.resumeAll();
  assert(useDownloadQueueStore.getState().isGlobalPaused === false, "Global pause should be false after resumeAll");

  // Test 5: Completion & Clear Completed
  console.log("▶️ Test 5: Completion & Clear Completed");
  store.setStatus(id1, "completed", {
    resultUrl: "blob:http://localhost/sample-video",
    localFileName: "Video_One.mp4",
    fileSizeBytes: 50_000_000,
  });

  const completedItem = useDownloadQueueStore.getState().items.find((i) => i.id === id1);
  assert(completedItem?.status === "completed", "Item 1 must be completed");
  assert(completedItem?.resultUrl === "blob:http://localhost/sample-video", "Result URL must be populated");
  assert(completedItem?.progress.percent === 100, "Progress percent must be 100 on completion");

  store.clearCompleted();
  items = useDownloadQueueStore.getState().items;
  assert(items.length === 1, "Only 1 item should remain after clearCompleted");
  assert(items[0].id === id2, "Remaining item must be Item 2");

  // Test 6: Retry Failed Item
  console.log("▶️ Test 6: Retry Failed Item");
  store.setStatus(id2, "failed", { error: "Network timeout" });
  assert(useDownloadQueueStore.getState().items[0].status === "failed", "Item 2 should be failed");
  assert(useDownloadQueueStore.getState().items[0].error === "Network timeout", "Error message must match");

  store.retryItem(id2);
  assert(useDownloadQueueStore.getState().items[0].status === "queued", "Item 2 should be queued on retry");
  assert(useDownloadQueueStore.getState().items[0].error === undefined, "Error should be cleared on retry");

  // Test 7: Dequeue & Clear All
  console.log("▶️ Test 7: Dequeue & Clear All");
  store.dequeue(id2);
  assert(useDownloadQueueStore.getState().items.length === 0, "Store should be empty after dequeue");

  console.log("✅ All Download Queue Store tests passed successfully!");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
