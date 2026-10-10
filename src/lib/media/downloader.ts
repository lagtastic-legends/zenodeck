/**
 * Universal Media Downloader Engine
 * Downloads media from TikTok, Instagram, Twitter/X, and Reddit
 * Handles multi-stream FFmpeg muxing (e.g. Reddit DASH video + audio)
 */

import { universalFetch } from "./innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "./types";
import { nativeSave } from "@/lib/native-save";
import { getOrInitTurboEngine } from "@/lib/youtube/turbo-downloader";
import { getYouTubeApiUrl } from "@/lib/youtube/innertube";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

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
export async function fetchStreamWithProgress(
  url: string,
  onProgress?: (receivedBytes: number, totalBytes?: number) => void,
  abortSignal?: AbortSignal
): Promise<Uint8Array> {
  const directUrl = url.startsWith("http") ? url : getYouTubeApiUrl(url);

  let lastStatus = 0;
  let serverErrMsg: string | null = null;

  // 1. Primary: Streaming fetch reader for progress tracking and CORS endpoints
  try {
    const res = await fetch(directUrl, { signal: abortSignal });
    lastStatus = res.status;
    if (res.ok && res.body) {
      const contentLength = res.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : undefined;
      const reader = res.body.getReader();
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
    } else {
      const errJson = await res.json().catch(() => null);
      if (errJson?.error) {
        serverErrMsg = errJson.error;
      }
    }
  } catch (fetchErr: any) {
    if (abortSignal?.aborted) throw fetchErr;
    console.warn("Direct stream fetch reader error, trying stream proxy:", fetchErr?.message);
  }

  // 2. Fallback: Stream Proxy (/api/youtube/stream) for CORS-restricted external CDN URLs on web
  if (
    typeof window !== "undefined" &&
    !directUrl.includes("/api/youtube/stream") &&
    !directUrl.includes("/api/media/download")
  ) {
    try {
      const proxyUrl = getYouTubeApiUrl(
        `/api/youtube/stream?url=${encodeURIComponent(directUrl)}`
      );
      const res = await fetch(proxyUrl, { signal: abortSignal });
      lastStatus = res.status;
      if (res.ok && res.body) {
        const contentLength = res.headers.get("content-length");
        const total = contentLength ? parseInt(contentLength, 10) : undefined;
        const reader = res.body.getReader();
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
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson?.error) {
          serverErrMsg = errJson.error;
        }
      }
    } catch (proxyErr: any) {
      if (abortSignal?.aborted) throw proxyErr;
      console.warn("Stream proxy fetch failed, trying next fallback:", proxyErr?.message);
    }
  }

  // 3. Fallback: CapacitorHttp on native mobile for non-CORS external CDN URLs
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const nativeRes = await CapacitorHttp.request({
        url: directUrl,
        method: "GET",
        responseType: "arraybuffer",
        connectTimeout: 8000,
        readTimeout: 45000,
      });
      lastStatus = nativeRes.status;
      if (nativeRes.status === 200 || nativeRes.status === 206) {
        if (typeof nativeRes.data === "string") {
          const binaryStr = atob(nativeRes.data);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          if (onProgress) onProgress(bytes.byteLength, bytes.byteLength);
          return bytes;
        } else if (nativeRes.data instanceof ArrayBuffer) {
          const bytes = new Uint8Array(nativeRes.data);
          if (onProgress) onProgress(bytes.byteLength, bytes.byteLength);
          return bytes;
        } else if (nativeRes.data instanceof Uint8Array) {
          if (onProgress) onProgress(nativeRes.data.byteLength, nativeRes.data.byteLength);
          return nativeRes.data;
        }
      }
    } catch (nativeErr: any) {
      if (abortSignal?.aborted) throw nativeErr;
      console.warn("Native CapacitorHttp request failed:", nativeErr?.message);
    }
  }

  const endpointLabel = directUrl.includes("?") ? directUrl.split("?")[0] : directUrl;
  throw new Error(
    serverErrMsg ||
    `Failed to download stream (${lastStatus ? `HTTP ${lastStatus}` : "connection timeout"}) from ${endpointLabel}`
  );
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
    try {
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
    } catch (muxErr) {
      console.warn("Client dual-stream fetch/mux failed, falling back to server downloader:", muxErr);
    }
  }

  // 2. Direct single-stream download (TikTok, Instagram, Twitter/X, audio tracks)
  onProgress({
    phase: "downloading",
    message: `Fetching ${media.platform} ${option.label}…`,
    percent: 25,
  });

  let bytes: Uint8Array;
  try {
    if (!option.downloadUrl) {
      throw new Error("No direct download URL provided");
    }
    bytes = await fetchStreamWithProgress(option.downloadUrl, (rec, tot) => {
      const pct = tot ? Math.min(85, 25 + Math.round((rec / tot) * 60)) : 55;
      onProgress({
        phase: "downloading",
        message: `Downloading: ${Math.round(rec / 1024 / 1024)} MB transferred…`,
        percent: pct,
        transferredBytes: rec,
        totalBytes: tot,
      });
    }, options?.abortSignal);
  } catch (directErr) {
    console.warn("Direct stream fetch failed, falling back to yt-dlp server downloader:", directErr);
    onProgress({
      phase: "downloading",
      message: "Downloading high-speed stream via yt-dlp engine…",
      percent: 40,
    });
    const fallbackUrl = getYouTubeApiUrl(
      `/api/media/download?url=${encodeURIComponent(media.url)}&quality=${encodeURIComponent(
        option.badge || option.resolution || "best"
      )}${option.ext ? `&format=${encodeURIComponent(option.ext)}` : ""}`
    );
    bytes = await fetchStreamWithProgress(fallbackUrl, (rec, tot) => {
      const pct = tot ? Math.min(85, 40 + Math.round((rec / tot) * 45)) : 65;
      onProgress({
        phase: "downloading",
        message: `yt-dlp stream: ${Math.round(rec / 1024 / 1024)} MB received…`,
        percent: pct,
        transferredBytes: rec,
        totalBytes: tot,
      });
    }, options?.abortSignal);
  }


  let finalBytes = bytes;
  const mimeType = option.isAudioOnly
    ? option.ext === "mp3"
      ? "audio/mpeg"
      : option.ext === "wav"
      ? "audio/wav"
      : "audio/mp4"
    : "video/mp4";

  if (option.isAudioOnly) {
    onProgress({
      phase: "muxing",
      message: `Extracting ${option.ext.toUpperCase()} audio with FFmpeg WebAssembly…`,
      percent: 85,
    });

    try {
      const engine = await getOrInitTurboEngine(options?.ffmpegEngine);
      if (engine) {
        const inName = `audio_in_${Date.now()}.mp4`;
        const outName = `audio_out_${Date.now()}.${option.ext}`;

        await engine.writeFile(inName, bytes);

        let ffmpegArgs: string[];
        if (option.ext === "mp3") {
          const br = option.bitrate ? `${option.bitrate}k` : "320k";
          ffmpegArgs = ["-i", inName, "-vn", "-b:a", br, outName];
        } else if (option.ext === "wav") {
          ffmpegArgs = ["-i", inName, "-vn", "-c:a", "pcm_s16le", outName];
        } else if (option.ext === "m4a") {
          ffmpegArgs = ["-i", inName, "-vn", "-c:a", "aac", "-b:a", "256k", outName];
        } else {
          ffmpegArgs = ["-i", inName, "-vn", outName];
        }

        await engine.exec(ffmpegArgs);
        const transData = (await engine.readFile(outName)) as Uint8Array;

        try {
          await engine.deleteFile(inName);
          await engine.deleteFile(outName);
        } catch {}

        if (transData && transData.length > 0) {
          finalBytes = transData;
        }
      }
    } catch (ffmpegErr) {
      console.warn("FFmpeg audio extraction deferred, keeping direct stream:", ffmpegErr);
    }
  }

  const blob = new Blob([finalBytes.buffer as ArrayBuffer], { type: mimeType });
  const filename = `${safeTitle}.${option.ext}`;
  const blobUrl = URL.createObjectURL(blob);

  onProgress({ phase: "saving", message: "Saving file…", percent: 90 });
  await nativeSave(blob, filename);
  onProgress({ phase: "complete", message: "Download complete!", percent: 100 });

  return {
    blob,
    url: blobUrl,
    filename,
    fileSizeBytes: finalBytes.length,
    mimeType,
    is4K: false,
    is60fps: false,
  };
}
