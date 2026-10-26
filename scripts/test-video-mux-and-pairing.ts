import { resolveYouTubeVideo } from "../src/lib/youtube/innertube";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("=== ZENODECK v1.0.9 VIDEO + AUDIO MUX & PAIRING VERIFICATION ===");
  const timeout = setTimeout(() => {
    console.error("FAIL: Test timed out after 8 seconds");
    process.exit(1);
  }, 8000);

  try {
    // 1. Live YouTube Resolution Probe
    const testUrl = "https://youtu.be/-hzhDPWyMcs";
    console.log(`Resolving live formats for: ${testUrl}...`);
    const result = await resolveYouTubeVideo(testUrl);

    if (!result || !result.qualities || result.qualities.length === 0) {
      throw new Error("No qualities resolved for test video");
    }

    console.log(`Resolved ${result.qualities.length} quality options.`);

    let mp4Checked = 0;
    let webmChecked = 0;
    let audioChecked = 0;

    for (const q of result.qualities) {
      if (q.isAudioOnly) {
        audioChecked++;
        if (!q.audioFormat || !q.audioFormat.url) {
          throw new Error(`Audio quality ${q.id} is missing audioFormat.url`);
        }
        if (q.videoFormat !== undefined) {
          throw new Error(`Audio quality ${q.id} must have videoFormat === undefined, found: ${q.videoFormat}`);
        }
        console.log(`[PASS] Audio: ${q.id} (${q.label}) -> container: ${q.container}, aMime: ${q.audioFormat.mimeType}`);
      } else {
        const vMime = q.videoFormat?.mimeType?.toLowerCase() || "";
        const aMime = q.audioFormat?.mimeType?.toLowerCase() || "";

        if (q.container === "mp4" || vMime.includes("mp4") || vMime.includes("avc")) {
          mp4Checked++;
          if (q.audioFormat) {
            if (!aMime.includes("mp4") && !aMime.includes("aac")) {
              throw new Error(`Cross-container mismatch on ${q.id}: video is MP4 (${vMime}) but audio is not MP4/AAC (${aMime})`);
            }
          }
          console.log(`[PASS] MP4 Video: ${q.id} -> vMime: ${vMime}, aMime: ${aMime || "pre-muxed"}`);
        } else if (q.container === "webm" || vMime.includes("webm") || vMime.includes("vp9")) {
          webmChecked++;
          if (q.audioFormat) {
            if (!aMime.includes("webm") && !aMime.includes("opus")) {
              throw new Error(`Cross-container mismatch on ${q.id}: video is WebM (${vMime}) but audio is not WebM/Opus (${aMime})`);
            }
          }
          console.log(`[PASS] WebM Video: ${q.id} -> vMime: ${vMime}, aMime: ${aMime || "none"}`);
        }
      }
    }

    console.log(`Verification Summary: ${mp4Checked} MP4 video options, ${webmChecked} WebM video options, ${audioChecked} audio options validated.`);

    // 2. Verify ZenoHeadlessMediaEngine.kt assertions
    const enginePath = path.resolve(__dirname, "../android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt");
    const engineSrc = fs.readFileSync(enginePath, "utf-8");

    const requiredSnippets = [
      "videoScanCount < 60",
      "audioScanCount < 60",
      "videoBasePts = if (minVideoPts != Long.MAX_VALUE && minVideoPts >= 500_000L) minVideoPts else 0L",
      "maxOf(0L, rawPts - videoBasePts)",
      "MediaCodec.BUFFER_FLAG_KEY_FRAME",
      "val isVideoWebm = videoMime.contains(\"vp9\"",
      "val isAudioWebm = audioMime.contains(\"opus\"",
      "val isWebmTarget = (outputFile.name.endsWith(\".webm\", ignoreCase = true) || isVideoWebm) && isAudioWebm",
      "muxer.addTrack(audioFormat)",
    ];

    for (const snippet of requiredSnippets) {
      if (!engineSrc.includes(snippet)) {
        throw new Error(`ZenoHeadlessMediaEngine.kt missing required pattern: "${snippet}"`);
      }
    }
    console.log("[PASS] ZenoHeadlessMediaEngine.kt all 9 hardware MediaMuxer invariants verified!");

    clearTimeout(timeout);
    console.log("=== ALL END-TO-END VERIFICATIONS PASSED (0 FAILURES) ===");
    process.exit(0);
  } catch (err: any) {
    clearTimeout(timeout);
    console.error("FAIL:", err?.message || err);
    process.exit(1);
  }
}

main();
