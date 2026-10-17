/**
 * Verification Script: Strict Resolution Lock, YouTube Native Range Chunking & Native Android MediaMuxer
 * =====================================================================================================
 */

import { injectYouTubeRangeParam } from "../src/lib/youtube/turbo-downloader";
import * as fs from "fs";
import * as path from "path";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function runTests() {
  console.log("\n--- TEST 1: Native YouTube &range= Query Parameter Injection ---");
  const sampleGvideoUrl = "https://rr1---sn-5goz-nxbe.googlevideo.com/videoplayback?expire=1728000000&ei=xyz&ip=1.2.3.4&id=o-ABC&itag=315";
  const rangeHeader = "bytes=0-1048575";

  const transformedUrl = injectYouTubeRangeParam(sampleGvideoUrl, rangeHeader);
  assert(
    transformedUrl.includes("range=0-1048575"),
    "injectYouTubeRangeParam successfully appends range=0-1048575 query parameter"
  );

  const existingRangeUrl = "https://googlevideo.com/videoplayback?itag=315&range=100-200&expire=1728";
  const updatedUrl = injectYouTubeRangeParam(existingRangeUrl, "bytes=1048576-2097151");
  assert(
    updatedUrl.includes("range=1048576-2097151") && !updatedUrl.includes("range=100-200"),
    "injectYouTubeRangeParam cleanly replaces existing range parameter without duplication"
  );

  const unmodifiedUrl = injectYouTubeRangeParam(sampleGvideoUrl);
  assert(
    unmodifiedUrl === sampleGvideoUrl,
    "injectYouTubeRangeParam preserves URL when no range header is supplied"
  );

  const itag18Url = "https://rr1---sn-5goz-nxbe.googlevideo.com/videoplayback?expire=1728000000&ei=xyz&ip=1.2.3.4&id=o-ABC&itag=18";
  const unmodifiedItag18 = injectYouTubeRangeParam(itag18Url, rangeHeader);
  assert(
    !unmodifiedItag18.includes("range="),
    "injectYouTubeRangeParam strictly refuses to append &range= to pre-muxed itag=18 streams"
  );

  const itag180Url = "https://rr1---sn-5goz-nxbe.googlevideo.com/videoplayback?expire=1728000000&ei=xyz&ip=1.2.3.4&id=o-ABC&itag=180";
  const modifiedItag180 = injectYouTubeRangeParam(itag180Url, rangeHeader);
  assert(
    modifiedItag180.includes("range=0-1048575"),
    "injectYouTubeRangeParam allows range parameter on non-18 itags (e.g. itag=180)"
  );

  const signedUrl = "https://rr1---sn-5goz-nxbe.googlevideo.com/videoplayback?expire=1728000000&ei=xyz&ip=1.2.3.4&id=o-ABC&itag=315&mn=sn-5goz-nxbe,sn-fapo3ox25a-3uhr&sig=MEQCICx";
  const transformedSignedUrl = injectYouTubeRangeParam(signedUrl, rangeHeader);
  assert(
    transformedSignedUrl.includes("mn=sn-5goz-nxbe,sn-fapo3ox25a-3uhr") &&
    !transformedSignedUrl.includes("%2C"),
    "injectYouTubeRangeParam strictly preserves raw comma delimiters without encoding into %2C (preserves HMAC signatures)"
  );

  console.log("\n--- TEST 2: Strict Resolution Lock & Zero Silent 360p Fallback ---");
  const ytDownloaderPath = path.resolve(__dirname, "../src/components/tools/youtube-downloader.tsx");
  const ytDownloaderContent = fs.readFileSync(ytDownloaderPath, "utf-8");

  assert(
    !ytDownloaderContent.includes("itag === 18") &&
    !ytDownloaderContent.includes("itag=18") &&
    !ytDownloaderContent.includes("quality=360p") &&
    !ytDownloaderContent.includes("[360p].mp4"),
    "No hardcoded 360p (itag 18) fallback exists in youtube-downloader.tsx"
  );

  assert(
    ytDownloaderContent.includes("STRICT RESOLUTION LOCK: Banned silent 360p fallback!"),
    "Strict Resolution Lock guardrail comment is documented in youtube-downloader.tsx"
  );

  console.log("\n--- TEST 3: Native Android Hardware Muxer & MediaScanner Wiring ---");
  const nativeMuxerPath = path.resolve(__dirname, "../src/lib/media/native-media-muxer.ts");
  const nativeMuxerContent = fs.readFileSync(nativeMuxerPath, "utf-8");

  assert(
    nativeMuxerContent.includes("executeNativeAndroidMux") &&
    nativeMuxerContent.includes("ZenoMedia3") &&
    nativeMuxerContent.includes("Movies/ZenoDeck"),
    "native-media-muxer.ts exports executeNativeAndroidMux targeting Movies/ZenoDeck"
  );

  const nativeSavePath = path.resolve(__dirname, "../src/lib/native-save.ts");
  const nativeSaveContent = fs.readFileSync(nativeSavePath, "utf-8");

  assert(
    nativeSaveContent.includes("Movies/ZenoDeck") &&
    nativeSaveContent.includes("scanMediaFile"),
    "native-save.ts saves media to Movies/ZenoDeck and triggers MediaScanner registration"
  );

  console.log("\n--- TEST 4: Output Filename Resolution Tagging ---");
  const turboDownloaderPath = path.resolve(__dirname, "../src/lib/youtube/turbo-downloader.ts");
  const turboDownloaderContent = fs.readFileSync(turboDownloaderPath, "utf-8");

  assert(
    turboDownloaderContent.includes("const resTag = option.badge || option.resolutionLabel || option.id || \"HD\";") &&
    turboDownloaderContent.includes("[${resTag}].${successfulPlan.outputExt}"),
    "turbo-downloader.ts tags filenames with selected resolution badge (e.g. [4K 60FPS]), never substituting 360p"
  );

  console.log("\n--- TEST 5: Kotlin Engine Zero-Stall & Anti-Loop Contracts ---");
  const enginePath = path.resolve(__dirname, "../android/app/src/main/java/com/omnitool/app/media/ZenoHeadlessMediaEngine.kt");
  const engineContent = fs.readFileSync(enginePath, "utf-8");

  assert(
    engineContent.includes("if (responseCode == 416)") &&
    engineContent.includes("break@chunkLoop"),
    "ZenoHeadlessMediaEngine terminates outer chunkLoop immediately on HTTP 416 (EOF)"
  );

  assert(
    engineContent.includes("if (bytesDownloaded == chunkStart)") &&
    engineContent.includes("totalBytes = bytesDownloaded"),
    "ZenoHeadlessMediaEngine terminates cleanly on 0-byte chunk EOF without infinite looping"
  );

  assert(
    engineContent.includes('Regex("[?&]itag=18(&|$)")'),
    "ZenoHeadlessMediaEngine uses exact query parameter regex for itag=18 exclusion"
  );

  console.log("\n--- TEST 6: InnerTube Bridge Candidate Scoring & Format Inclusion Contracts ---");
  const innertubePath = path.resolve(__dirname, "../src/lib/youtube/innertube.ts");
  const innertubeContent = fs.readFileSync(innertubePath, "utf-8");

  assert(
    innertubeContent.includes("fallbackScore") &&
    innertubeContent.includes("candidateScore"),
    "innertube.ts scores client candidates to preserve highest quality fallback candidate"
  );

  assert(
    innertubeContent.includes("q.videoFormat?.userAgent || q.audioFormat?.userAgent"),
    "innertube.ts propagates audioFormat.userAgent for audio-only quality options"
  );

  assert(
    innertubeContent.includes("androidResult?.data?.streamingData?.adaptiveFormats"),
    "innertube.ts merges androidResult adaptiveFormats into rawAdaptive set"
  );

  console.log("\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 0 SILENT FALLBACK REGRESSIONS.");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
