/**
 * Test & Verification Script for ZenoDeck v1.0.11
 * Pure yt-dlp Python Video Downloader Engine (Chaquopy) + Post-Download "Convert Video to Audio" Workflow
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    process.exit(1);
  }
}

console.log("=== ZenoDeck v1.0.11 Verification Suite ===\n");

// 1. Python Syntax & Compilation Check
runTest("ytdlp_engine.py syntax and bytecode compilation", () => {
  const pyPath = path.resolve("android/app/src/main/python/ytdlp_engine.py");
  execSync(`python -m py_compile "${pyPath}"`, { stdio: "pipe" });
  const content = readFileSync(pyPath, "utf-8");
  if (!content.includes("def extract_video_info(") || !content.includes("def download_video_with_ytdlp(")) {
    throw new Error("Missing required function signatures in ytdlp_engine.py");
  }
});

// 2. Chaquopy Gradle Configuration Check
runTest("Chaquopy & yt-dlp pip configuration in Gradle", () => {
  const rootGradle = readFileSync(path.resolve("android/build.gradle"), "utf-8");
  if (!rootGradle.includes("com.chaquo.python:gradle:15.0.1")) {
    throw new Error("Missing Chaquopy plugin in android/build.gradle");
  }
  const appGradle = readFileSync(path.resolve("android/app/build.gradle"), "utf-8");
  if (!appGradle.includes("com.chaquo.python") || !appGradle.includes("pip") || !appGradle.includes("yt-dlp")) {
    throw new Error("Missing Chaquopy pip install yt-dlp in android/app/build.gradle");
  }
});

// 3. Kotlin Plugin Methods Check
runTest("ZenoMedia3Plugin.kt Chaquopy & yt-dlp bindings", () => {
  const pluginKt = readFileSync(
    path.resolve("android/app/src/main/java/com/omnitool/app/media/ZenoMedia3Plugin.kt"),
    "utf-8"
  );
  if (!pluginKt.includes("fun extractWithYtDlp(") || !pluginKt.includes("ensurePython()")) {
    throw new Error("Missing extractWithYtDlp or ensurePython in ZenoMedia3Plugin.kt");
  }
  if (!pluginKt.includes("download_video_with_ytdlp")) {
    throw new Error("Missing download_video_with_ytdlp call in ZenoMedia3Plugin.kt");
  }
});

// 4. Native Muxer & Turbo Downloader Interface Check
runTest("native-media-muxer.ts and turbo-downloader.ts yt-dlp signatures", () => {
  const muxerTs = readFileSync(path.resolve("src/lib/media/native-media-muxer.ts"), "utf-8");
  if (!muxerTs.includes("extractWithYtDlp") || !muxerTs.includes("useYtDlp?: boolean;")) {
    throw new Error("Missing yt-dlp types in native-media-muxer.ts");
  }
  const turboTs = readFileSync(path.resolve("src/lib/youtube/turbo-downloader.ts"), "utf-8");
  if (!turboTs.includes("ytdlpVideoFormatId") || !turboTs.includes("useYtDlp: true")) {
    throw new Error("turbo-downloader.ts does not pass yt-dlp format IDs or useYtDlp");
  }
});

// 5. YouTube Downloader UI Video-Only & CTA Check
runTest("youtube-downloader.tsx Video-Only UI & CTA handoff", () => {
  const ytDownloader = readFileSync(path.resolve("src/components/tools/youtube-downloader.tsx"), "utf-8");
  if (!ytDownloader.includes("extractWithYtDlp")) {
    throw new Error("Missing extractWithYtDlp call in youtube-downloader.tsx");
  }
  if (!ytDownloader.includes("Convert to Audio (MP3/M4A)")) {
    throw new Error("Missing 'Convert to Audio (MP3/M4A)' CTA button in youtube-downloader.tsx");
  }
  if (!ytDownloader.includes("sourceTool: \"youtube-downloader\"")) {
    throw new Error("Missing sourceTool handoff in youtube-downloader.tsx");
  }
});

// 6. Save Result Modal CTA Check
runTest("save-result-modal.tsx Video-to-Audio CTA banner", () => {
  const saveModal = readFileSync(path.resolve("src/components/dialogs/save-result-modal.tsx"), "utf-8");
  if (!saveModal.includes("Want MP3 or M4A Audio from this Video?")) {
    throw new Error("Missing Video-to-Audio CTA card in save-result-modal.tsx");
  }
});

// 7. Media Converter Handoff Auto-Selection Check
runTest("media-converter.tsx handoff consumption and MP3 320k auto-selection", () => {
  const mediaConv = readFileSync(path.resolve("src/components/tools/media-converter.tsx"), "utf-8");
  if (!mediaConv.includes("consumeHandoffFile") || !mediaConv.includes("audiophile-320k-mp3")) {
    throw new Error("media-converter.tsx does not consume handoff or auto-select 320k MP3 preset");
  }
});

console.log("\nAll 7 verification checks passed successfully!");
