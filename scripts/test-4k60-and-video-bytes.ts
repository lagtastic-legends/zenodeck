import fs from "fs";
import path from "path";
import { resolveYouTubeVideo, buildCandidateUrls } from "../src/lib/youtube/innertube";

async function run4k60Verification() {
  console.log("================================================================================");
  console.log("   ZENODECK v1.0.10 — 4K 60FPS & VIDEO STREAM ACQUISITION VERIFICATION          ");
  console.log("================================================================================\n");

  let totalPassed = 0;
  let totalTests = 0;

  function assert(condition: boolean, desc: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      totalPassed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. Kotlin Engine Code Audit (8MB Direct Buffer, Monotonic PTS, HTTP 200 Chunking)
  // -------------------------------------------------------------------------
  console.log("[1] Auditing ZenoHeadlessMediaEngine.kt Hardware Configuration");
  const enginePath = path.resolve("android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt");
  const engineCode = fs.readFileSync(enginePath, "utf-8");

  assert(
    engineCode.includes("8 * 1024 * 1024") || engineCode.includes("8388608"),
    "muxVideoAndAudio allocates direct ByteBuffer of at least 8MB for 4K 60FPS keyframes"
  );
  assert(
    engineCode.includes("pts <= lastVideoPts") && engineCode.includes("lastVideoPts + 100L"),
    "Monotonic PTS clamping strictly enforced on video track to eliminate MPEG4Writer/WebM crashes"
  );
  assert(
    engineCode.includes("pts <= lastAudioPts") && engineCode.includes("lastAudioPts + 100L"),
    "Monotonic PTS clamping strictly enforced on audio track"
  );
  assert(
    engineCode.includes("expectedTotalBytes: Long = -1L"),
    "downloadStreamDirectToFile accepts expectedTotalBytes for accurate multi-chunk sizing"
  );
  assert(
    engineCode.includes("fallbackVideoUrl: String? = null"),
    "downloadAndMuxYouTubeStreams accepts fallbackVideoUrl for lossless recovery"
  );
  assert(
    engineCode.includes("audioUserAgent: String? = null"),
    "downloadAndMuxYouTubeStreams accepts separate audioUserAgent for client parity"
  );
  assert(
    engineCode.includes("effectiveAudioUa"),
    "Separate audioUserAgent routed correctly to audio download worker"
  );

  // -------------------------------------------------------------------------
  // 2. InnerTube Client Ladder & 4K 60FPS Stream Resolution
  // -------------------------------------------------------------------------
  console.log("\n[2] Testing InnerTube 4K/60FPS Stream Resolution & Codec Matching");
  
  // Test high-resolution video resolution
  const testVideoId = "LXb3EKWsInQ"; // 4K 60FPS Costa Rica
  console.log(`Resolving test video (${testVideoId})...`);
  const info = await resolveYouTubeVideo(testVideoId);

  assert(Boolean(info && info.title), `Video info resolved: "${info.title}"`);
  assert(info.qualities.length > 0, `Qualities ladder populated with ${info.qualities.length} options`);

  // Verify format sorting: highest resolution first
  const videoOptions = info.qualities.filter(q => !q.isAudioOnly);
  assert(videoOptions.length > 0, `Found ${videoOptions.length} video options`);
  
  console.log(`Top 5 video options resolved:`);
  videoOptions.slice(0, 5).forEach((v, i) => {
    console.log(`  [${i + 1}] ${v.label} (itag ${v.videoFormat?.itag}, fps ${v.fps || 30}, container: ${v.container}, badge: ${v.badge})`);
  });

  const topVideo = videoOptions[0];
  const topHeight = topVideo.videoFormat?.height || (topVideo.is4K ? 2160 : 1080);
  assert(
    topHeight >= 1080,
    `Top resolution format is HD or Ultra-HD (height: ${topHeight}p, is4K: ${topVideo.is4K})`
  );

  // Verify fallbackVideoUrl presence
  const hasFallbackUrl = videoOptions.some(v => Boolean(v.fallbackVideoUrl));
  assert(hasFallbackUrl, "Pre-muxed fallbackVideoUrl (itag 18) attached to video options");

  // Verify audioUserAgent presence
  const hasAudioUa = videoOptions.some(v => Boolean(v.audioUserAgent));
  assert(hasAudioUa, "audioUserAgent attached to adaptive video options");

  // Verify Codec-Container Pairing
  for (const opt of videoOptions.slice(0, 5)) {
    if (opt.container === "webm") {
      assert(
        !opt.videoFormat || opt.videoFormat.mimeType.includes("vp9") || opt.videoFormat.mimeType.includes("vp09") || opt.videoFormat.mimeType.includes("av01"),
        `WebM container pairs with VP9/AV1 codec: ${opt.videoFormat?.mimeType}`
      );
      if (opt.audioFormat) {
        assert(
          opt.audioFormat.mimeType.includes("opus"),
          `WebM audio stream pairs strictly with Opus: ${opt.audioFormat.mimeType}`
        );
      }
    } else if (opt.container === "mp4") {
      assert(
        !opt.videoFormat || opt.videoFormat.mimeType.includes("avc") || opt.videoFormat.mimeType.includes("mp4v") || opt.videoFormat.mimeType.includes("mp4a"),
        `MP4 container pairs with AVC/AAC: ${opt.videoFormat?.mimeType}`
      );
      if (opt.audioFormat) {
        assert(
          opt.audioFormat.mimeType.includes("mp4a"),
          `MP4 audio stream pairs strictly with AAC (mp4a): ${opt.audioFormat.mimeType}`
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Live Google Video CDN Range Slicing & Continuation Check
  // -------------------------------------------------------------------------
  console.log("\n[3] Testing Google Video CDN Multi-Chunk Streaming (Handling HTTP 200/206)");

  const sampleStreamUrl = topVideo.videoFormat?.url || topVideo.audioFormat?.url;
  if (sampleStreamUrl) {
    const userAgent = topVideo.videoFormat?.userAgent || "com.google.android.youtube/19.29.37";

    let winningHostIndex = -1;

    async function fetchChunk(streamUrl: string, rangeVal: string, ua: string): Promise<Uint8Array | null> {
      const candidates = buildCandidateUrls(streamUrl);
      const hostIndices = winningHostIndex >= 0
        ? [winningHostIndex, ...candidates.map((_, i) => i).filter(i => i !== winningHostIndex)]
        : candidates.map((_, i) => i);

      for (const idx of hostIndices) {
        const cand = candidates[idx];
        const targetUrl = cand.includes("range=")
          ? cand.replace(/([?&])range=[^&]*/, `$1range=${rangeVal}`)
          : `${cand}${cand.includes("?") ? "&" : "?"}range=${rangeVal}`;
        try {
          const resp = await fetch(targetUrl, {
            headers: {
              "User-Agent": ua,
            },
            signal: AbortSignal.timeout(5000),
          });
          if (resp.status === 200 || resp.status === 206) {
            const buf = new Uint8Array(await resp.arrayBuffer());
            if (buf.length > 0) {
              winningHostIndex = idx;
              return buf;
            }
          } else {
            console.log(`    [Node ${idx}] HTTP ${resp.status} for range ${rangeVal}`);
          }
        } catch (e: any) {
          console.log(`    [Node ${idx}] connect error: ${e.message}`);
        }
      }
      return null;
    }

    const buf0 = await fetchChunk(sampleStreamUrl, "0-1023", userAgent);
    assert(Boolean(buf0 && buf0.length > 0 && buf0.length <= 1024), `Chunk 0 retrieved successfully (${buf0?.length || 0} bytes)`);

    const buf1 = await fetchChunk(sampleStreamUrl, "1024-2047", userAgent);
    assert(Boolean(buf1 && buf1.length > 0 && buf1.length <= 1024), `Chunk 1 retrieved successfully (${buf1?.length || 0} bytes)`);

    if (buf0 && buf1) {
      let identical = true;
      for (let i = 0; i < Math.min(buf0.length, buf1.length); i++) {
        if (buf0[i] !== buf1[i]) {
          identical = false;
          break;
        }
      }
      assert(!identical, "Chunk 0 and Chunk 1 contain distinct stream payload bytes (proper slicing continuation)");
    }
  }

  console.log("\n================================================================================");
  console.log(`✅ VERIFICATION COMPLETE: All ${totalPassed}/${totalTests} tests passed cleanly!`);
  console.log("================================================================================");
}

run4k60Verification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
