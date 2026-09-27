/**
 * Universal Media Downloader Engine
 * Downloads media from TikTok, Instagram, Twitter/X, and Reddit
 * Handles multi-stream FFmpeg muxing (e.g. Reddit DASH video + audio)
 */

import { universalFetch } from "./innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "./types";
import { nativeSave } from "@/lib/native-save";
import { updateDownloadNotification } from "@/lib/notifications";
import { getOrInitTurboEngine } from "@/lib/youtube/turbo-downloader";

export interface MediaDownloadProgress {
  phase: "downloading" | "muxing" | "saving" | "complete";
  message: string;
  percent: number;
  transferredBytes?: number;
  totalBytes?: number;
  speedMBs?: number;
}

import type { TurboDownloadResult } from "@/lib/youtube/turbo-downloader";

/**
 * Downloads a media stream using progressive fetching.
 */
async function fetchStreamWithProgress(
  url: string,
  onProgress?: (receivedBytes: number, totalBytes?: number) => void,
  abortSignal?: AbortSignal
): Promise<Uint8Array> {
  const res = await universalFetch(url, {
    signal: abortSignal,
  });

  if (!res.ok) {
    throw new Error(`Stream download failed with status ${res.status}`);
  }

  // Check if browser native fetch body is readable stream
  const responseAny = res as any;
  if (responseAny._res && typeof responseAny._res.blob === "function") {
    const blob = await responseAny._res.blob();
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  // For CapacitorHttp or standard response
  if (typeof responseAny.blob === "function") {
    const blob = await responseAny.blob();
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  }

  // Fallback: standard fetch if in browser
  const directRes = await fetch(url, { signal: abortSignal });
  if (!directRes.ok) {
    throw new Error(`Direct stream fetch failed with status ${directRes.status}`);
  }

  const contentLength = directRes.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : undefined;

  if (!directRes.body) {
    const buf = await directRes.arrayBuffer();
    return new Uint8Array(buf);
  }

  const reader = directRes.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (onProgress) onProgress(received, total);
    }
  }

  const result = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/**
 * Universal media downloader for non-YouTube media files
 */
export async function downloadUniversalMedia(
  media: UniversalMediaInfo,
  option: UniversalQualityOption,
  options?: {
    ffmpegEngine?: any;
    onProgress?: (progress: MediaDownloadProgress) => void;
    abortSignal?: AbortSignal;
  }
): Promise<TurboDownloadResult> {
  const onProgress = options?.onProgress || (() => {});
  const safeTitle = media.title.replace(/[^\w\s.-]/g, "_").slice(0, 50).trim() || "media";

  onProgress({
    phase: "downloading",
    message: `Starting ${media.platform.toUpperCase()} download…`,
    percent: 5,
  });

  // 1. Check if stream requires FFmpeg muxing (e.g. Reddit DASH video + audio)
  if (option.requiresMuxing && option.audioUrl) {
    onProgress({
      phase: "downloading",
      message: "Downloading video and audio streams concurrently…",
      percent: 15,
    });

    const [videoBytes, audioBytes] = await Promise.all([
      fetchStreamWithProgress(option.downloadUrl, (rec, tot) => {
        const pct = tot ? Math.min(45, 15 + Math.round((rec / tot) * 30)) : 30;
        onProgress({
          phase: "downloading",
          message: "Downloading video stream…",
          percent: pct,
        });
      }, options?.abortSignal),
      fetchStreamWithProgress(option.audioUrl, undefined, options?.abortSignal).catch((err) => {
        console.warn("Audio stream fetch failed, continuing video only:", err);
        return null;
      }),
    ]);

    if (!audioBytes) {
      // Audio stream unavailable, save video directly
      const blob = new Blob([videoBytes.buffer as ArrayBuffer], { type: "video/mp4" });
      const filename = `${safeTitle}.${option.ext}`;
      const blobUrl = URL.createObjectURL(blob);
      await nativeSave(blob, filename);
      onProgress({ phase: "complete", message: "Download complete!", percent: 100 });
      return {
        blob,
        url: blobUrl,
        filename,
        fileSizeBytes: videoBytes.length,
        mimeType: "video/mp4",
        is4K: false,
        is60fps: false,
      };
    }

    // Mux with FFmpeg WASM
    onProgress({
      phase: "muxing",
      message: "Muxing video & audio with FFmpeg WebAssembly…",
      percent: 60,
    });

    const engine = await getOrInitTurboEngine(options?.ffmpegEngine);
    if (!engine) {
      const blob = new Blob([videoBytes.buffer as ArrayBuffer], { type: "video/mp4" });
      const filename = `${safeTitle}.${option.ext}`;
      const blobUrl = URL.createObjectURL(blob);
      await nativeSave(blob, filename);
      onProgress({ phase: "complete", message: "Download complete!", percent: 100 });
      return {
        blob,
        url: blobUrl,
        filename,
        fileSizeBytes: videoBytes.length,
        mimeType: "video/mp4",
        is4K: false,
        is60fps: false,
      };
    }
    const inV = `in_v_${Date.now()}.mp4`;
    const inA = `in_a_${Date.now()}.mp4`;
    const outV = `out_${Date.now()}.mp4`;

    await engine.writeFile(inV, videoBytes);
    await engine.writeFile(inA, audioBytes);

    try {
      // Fast stream copy mux
      await engine.exec(["-i", inV, "-i", inA, "-c", "copy", outV]);
    } catch {
      // Audio transcode fallback
      await engine.exec(["-i", inV, "-i", inA, "-c:v", "copy", "-c:a", "aac", outV]);
    }

    const outputData = (await engine.readFile(outV)) as Uint8Array;
    try {
      await engine.deleteFile(inV);
      await engine.deleteFile(inA);
      await engine.deleteFile(outV);
    } catch {}

    const finalBlob = new Blob([outputData.buffer as ArrayBuffer], { type: "video/mp4" });
    const finalFilename = `${safeTitle}.${option.ext}`;
    const finalBlobUrl = URL.createObjectURL(finalBlob);

    onProgress({ phase: "saving", message: "Saving to device…", percent: 90 });
    await nativeSave(finalBlob, finalFilename);

    void updateDownloadNotification({
      id: 8888,
      title: "Download Complete",
      itemTitle: finalFilename,
      progress: 100,
      speedMbps: 0,
      isComplete: true,
    });
    onProgress({ phase: "complete", message: "Download and muxing complete!", percent: 100 });

    return {
      blob: finalBlob,
      url: finalBlobUrl,
      filename: finalFilename,
      fileSizeBytes: outputData.length,
      mimeType: "video/mp4",
      is4K: false,
      is60fps: false,
    };
  }

  // 2. Direct single-stream download (TikTok, Instagram, Twitter/X, audio tracks)
  onProgress({
    phase: "downloading",
    message: `Fetching ${media.platform} ${option.label}…`,
    percent: 25,
  });

  const bytes = await fetchStreamWithProgress(option.downloadUrl, (rec, tot) => {
    const pct = tot ? Math.min(85, 25 + Math.round((rec / tot) * 60)) : 55;
    onProgress({
      phase: "downloading",
      message: `Downloading: ${Math.round(rec / 1024 / 1024)} MB transferred…`,
      percent: pct,
      transferredBytes: rec,
      totalBytes: tot,
    });
  }, options?.abortSignal);

  const mimeType = option.isAudioOnly ? (option.ext === "mp3" ? "audio/mpeg" : "audio/mp4") : "video/mp4";
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  const filename = `${safeTitle}.${option.ext}`;
  const blobUrl = URL.createObjectURL(blob);

  onProgress({ phase: "saving", message: "Saving file…", percent: 90 });
  await nativeSave(blob, filename);

  void updateDownloadNotification({
    id: 8888,
    title: "Download Complete",
    itemTitle: filename,
    progress: 100,
    speedMbps: 0,
    isComplete: true,
  });
  onProgress({ phase: "complete", message: "Download complete!", percent: 100 });

  return {
    blob,
    url: blobUrl,
    filename,
    fileSizeBytes: bytes.length,
    mimeType,
    is4K: false,
    is60fps: false,
  };
}
