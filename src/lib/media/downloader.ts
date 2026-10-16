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
import { zenoApiFetch, resolveApiUrl } from "@/lib/api-gateway";
import { isNativeAndroidPlatform, executeNativeAndroidMux, executeNativeYouTubeDownload } from "./native-media-muxer";

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
  const directUrl = url.startsWith("http") ? url : resolveApiUrl(url);

  let lastStatus = 0;
  let serverErrMsg: string | null = null;

  // 1. Primary: Streaming fetch reader for progress tracking and CORS endpoints
  try {
    const res = await zenoApiFetch(directUrl, { signal: abortSignal });
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
      const proxyUrl = resolveApiUrl(
        `/api/youtube/stream?url=${encodeURIComponent(directUrl)}`
      );
      const res = await zenoApiFetch(proxyUrl, { signal: abortSignal });
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
 * Resolves relative URLs against a base URL
 */
function resolveHlsUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

/**
 * Downloads and remuxes an HLS (.m3u8) playlist into a complete MP4 stream
 */
export async function fetchHlsStreamAndRemux(
  m3u8Url: string,
  onProgress?: (completedSegments: number, totalSegments: number) => void,
  abortSignal?: AbortSignal,
  ffmpegEngine?: any
): Promise<Uint8Array> {
  const directM3u8Url = m3u8Url.startsWith("http") ? m3u8Url : resolveApiUrl(m3u8Url);

  // 1. Fetch the master / media playlist
  let playlistRes = await zenoApiFetch(directM3u8Url, { signal: abortSignal }).catch(() => null);
  if (!playlistRes || !playlistRes.ok) {
    // Try via stream proxy
    const proxyUrl = resolveApiUrl(`/api/youtube/stream?url=${encodeURIComponent(directM3u8Url)}`);
    playlistRes = await zenoApiFetch(proxyUrl, { signal: abortSignal });
  }

  if (!playlistRes || !playlistRes.ok) {
    throw new Error(`Failed to fetch HLS playlist: HTTP ${playlistRes?.status || "network error"}`);
  }

  const playlistText = await playlistRes.text();
  let mediaPlaylistUrl = directM3u8Url;
  let mediaPlaylistText = playlistText;

  // 2. Check if master playlist containing variants (#EXT-X-STREAM-INF)
  if (playlistText.includes("#EXT-X-STREAM-INF")) {
    const lines = playlistText.split(/\r?\n/);
    let bestBandwidth = -1;
    let bestUri = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("#EXT-X-STREAM-INF")) {
        const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
        const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
        let j = i + 1;
        while (j < lines.length && (lines[j].trim().startsWith("#") || lines[j].trim() === "")) {
          j++;
        }
        if (j < lines.length) {
          const uri = lines[j].trim();
          if (bandwidth > bestBandwidth && uri) {
            bestBandwidth = bandwidth;
            bestUri = uri;
          }
        }
      }
    }

    if (bestUri) {
      mediaPlaylistUrl = resolveHlsUrl(bestUri, directM3u8Url);
      let mediaRes = await zenoApiFetch(mediaPlaylistUrl, { signal: abortSignal }).catch(() => null);
      if (!mediaRes || !mediaRes.ok) {
        const proxyMediaUrl = resolveApiUrl(`/api/youtube/stream?url=${encodeURIComponent(mediaPlaylistUrl)}`);
        mediaRes = await zenoApiFetch(proxyMediaUrl, { signal: abortSignal });
      }
      if (mediaRes && mediaRes.ok) {
        mediaPlaylistText = await mediaRes.text();
      }
    }
  }

  // 3. Extract segment URIs and optional init segment (#EXT-X-MAP)
  const lines = mediaPlaylistText.split(/\r?\n/);
  const segmentUrls: string[] = [];
  let initSegmentUrl: string | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#EXT-X-MAP:")) {
      const uriMatch = line.match(/URI=["']?([^"']+)["']?/i);
      if (uriMatch && uriMatch[1]) {
        initSegmentUrl = resolveHlsUrl(uriMatch[1], mediaPlaylistUrl);
      }
    } else if (!line.startsWith("#")) {
      segmentUrls.push(resolveHlsUrl(line, mediaPlaylistUrl));
    }
  }

  if (segmentUrls.length === 0) {
    throw new Error("No media segments found in HLS playlist.");
  }

  // 4. Concurrently fetch segments with controlled concurrency
  const CONCURRENCY = 4;
  const segments: Uint8Array[] = new Array(segmentUrls.length);
  let totalBytes = 0;
  let completed = 0;

  // Optional: fetch init segment if present (fMP4)
  let initBytes: Uint8Array | null = null;
  if (initSegmentUrl) {
    try {
      const initRes = await zenoApiFetch(initSegmentUrl, { signal: abortSignal });
      if (initRes.ok) {
        const arrBuf = await initRes.arrayBuffer();
        initBytes = new Uint8Array(arrBuf);
        totalBytes += initBytes.length;
      }
    } catch {}
  }

  for (let i = 0; i < segmentUrls.length; i += CONCURRENCY) {
    if (abortSignal?.aborted) throw new Error("HLS download cancelled.");
    const batch = segmentUrls.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (url, idx) => {
        const segIdx = i + idx;
        let sRes = await zenoApiFetch(url, { signal: abortSignal }).catch(() => null);
        if (!sRes || !sRes.ok) {
          const pUrl = resolveApiUrl(`/api/youtube/stream?url=${encodeURIComponent(url)}`);
          sRes = await zenoApiFetch(pUrl, { signal: abortSignal });
        }
        if (!sRes || !sRes.ok) {
          throw new Error(`Failed to fetch HLS segment ${segIdx + 1}`);
        }
        const buf = await sRes.arrayBuffer();
        const u8 = new Uint8Array(buf);
        segments[segIdx] = u8;
        totalBytes += u8.length;
        completed++;
        onProgress?.(completed, segmentUrls.length);
      })
    );
  }

  // Assemble all segment chunks
  const combinedBuffer = new Uint8Array(totalBytes);
  let offset = 0;
  if (initBytes) {
    combinedBuffer.set(initBytes, offset);
    offset += initBytes.length;
  }
  for (const seg of segments) {
    if (seg) {
      combinedBuffer.set(seg, offset);
      offset += seg.length;
    }
  }

  // 5. Remux if MPEG-TS into MP4 container
  const isTs = segmentUrls.some((u) => u.includes(".ts")) ||
    (combinedBuffer.length > 0 && combinedBuffer[0] === 0x47);

  if (isTs) {
    try {
      const engine = await getOrInitTurboEngine(ffmpegEngine);
      if (engine) {
        const inTs = `hls_in_${Date.now()}.ts`;
        const outMp4 = `hls_out_${Date.now()}.mp4`;
        await engine.writeFile(inTs, combinedBuffer);
        await engine.exec(["-i", inTs, "-c", "copy", outMp4]);
        const mp4Data = (await engine.readFile(outMp4)) as Uint8Array;
        try {
          await engine.deleteFile(inTs);
          await engine.deleteFile(outMp4);
        } catch {}
        return mp4Data;
      }
    } catch (ffmpegErr) {
      console.warn("FFmpeg remux of HLS MPEG-TS to MP4 failed, returning raw stream:", ffmpegErr);
    }
  }

  return combinedBuffer;
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
    clipRange?: { startTime?: string | number; endTime?: string | number };
  }
): Promise<TurboDownloadResult> {
  const onProgress = options?.onProgress || (() => {});
  const safeTitle = media.title.replace(/[^\w\s.-]/g, "_").slice(0, 50).trim() || "media";

  const clipArgs: string[] = [];
  if (options?.clipRange?.startTime) {
    clipArgs.push("-ss", String(options.clipRange.startTime));
  }
  if (options?.clipRange?.endTime) {
    clipArgs.push("-to", String(options.clipRange.endTime));
  }
  const isClipped = clipArgs.length > 0;
  const clipSuffix = isClipped ? " [Clip]" : "";

  onProgress({
    phase: "downloading",
    message: `Starting ${media.platform.toUpperCase()} download…`,
    percent: 5,
  });

  // 1. Native Android Hardware Engine Fast-Path:
  // Downloads directly to flash storage via Kotlin HttpURLConnection with 2MB chunks,
  // hardware MediaMuxer, and system MediaScanner indexing into Movies/ZenoDeck.
  // Bypasses Chromium WebView fetch(), avoids CORS, and eliminates memory strain.
  if (isNativeAndroidPlatform() && !isClipped) {
    const finalFilename = `${safeTitle}.${option.ext}`;
    onProgress({
      phase: "downloading",
      message: `Starting native Android download (${media.platform.toUpperCase()})…`,
      percent: 5,
    });

    const res = await executeNativeYouTubeDownload({
      videoUrl: option.downloadUrl,
      audioUrl: option.audioUrl || undefined,
      outputFilename: finalFilename,
      approxSizeBytes: option.fileSize,
      onProgress: (data) => {
        onProgress({
          phase: (data.phase === "muxing" ? "muxing" : "downloading") as any,
          message:
            data.phase === "muxing"
              ? "Muxing streams via Android hardware MediaMuxer…"
              : `Downloading ${media.platform} stream…`,
          percent: data.percent,
          transferredBytes: data.bytesDownloaded,
          totalBytes: data.totalBytes,
          speedMBs: data.speedMbps,
        });
      },
      signal: options?.abortSignal,
    });

    const finalBlob = new Blob([new Uint8Array(0)], { type: res.mimeType });
    onProgress({ phase: "complete", message: "Download complete!", percent: 100 });
    return {
      blob: finalBlob,
      url: "",
      filename: res.filename,
      fileSizeBytes: res.fileSizeBytes,
      mimeType: res.mimeType,
      is4K: false,
      is60fps: false,
    };
  }

  // 2. Web/Desktop: Check if stream requires FFmpeg muxing (e.g. Reddit DASH video + audio)
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

      if (!audioBytes && !isClipped) {
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

      // Native Android Hardware MediaMuxer Fast Path (zero RAM overhead, unless clipped)
      if (isNativeAndroidPlatform() && !isClipped) {
        onProgress({
          phase: "muxing",
          message: "Muxing streams via Android hardware MediaMuxer…",
          percent: 75,
        });
        const finalFilename = `${safeTitle}.${option.ext}`;
        const muxRes = await executeNativeAndroidMux({
          videoBytes,
          audioBytes: audioBytes || new Uint8Array(0),
          outputFilename: finalFilename,
          mimeType: "video/mp4",
          onProgress: (msg) => onProgress({ phase: "muxing", message: msg, percent: 80 }),
        });
        const finalBlob = new Blob([new Uint8Array(0)], { type: "video/mp4" });
        onProgress({ phase: "complete", message: "Download and hardware muxing complete!", percent: 100 });
        return {
          blob: finalBlob,
          url: "",
          filename: finalFilename,
          fileSizeBytes: muxRes.fileSizeBytes,
          mimeType: "video/mp4",
          is4K: false,
          is60fps: false,
        };
      }

      // Web / Desktop FFmpeg WASM Muxing
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
      if (audioBytes) await engine.writeFile(inA, audioBytes);

      try {
        // Fast stream copy mux
        await engine.exec(["-i", inV, ...(audioBytes ? ["-i", inA] : []), ...clipArgs, "-c", "copy", outV]);
      } catch {
        // Audio transcode fallback
        await engine.exec(["-i", inV, ...(audioBytes ? ["-i", inA] : []), ...clipArgs, "-c:v", "copy", "-c:a", "aac", outV]);
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

  // 2. Check if stream is an HLS playlist (.m3u8)
  const isHls = Boolean(
    option.downloadUrl && (option.downloadUrl.includes(".m3u8") || option.ext === "m3u8")
  );

  if (isHls) {
    onProgress({
      phase: "downloading",
      message: "Fetching HLS playlist and assembling video segments…",
      percent: 20,
    });
    let hlsBytes: Uint8Array;
    try {
      hlsBytes = await fetchHlsStreamAndRemux(
        option.downloadUrl,
        (completed, total) => {
          const pct = total ? Math.min(85, 20 + Math.round((completed / total) * 65)) : 50;
          onProgress({
            phase: "downloading",
            message: `HLS segments: ${completed}/${total || "?"} downloaded…`,
            percent: pct,
          });
        },
        options?.abortSignal,
        options?.ffmpegEngine
      );
    } catch (hlsErr) {
      console.warn("Direct HLS assembly failed, trying proxy/yt-dlp fallback:", hlsErr);
      const fallbackUrl = resolveApiUrl(
        `/api/media/download?url=${encodeURIComponent(media.url)}&quality=${encodeURIComponent(
          option.badge || option.resolution || "best"
        )}&format=mp4`
      );
      hlsBytes = await fetchStreamWithProgress(fallbackUrl, (rec, tot) => {
        const pct = tot ? Math.min(85, 30 + Math.round((rec / tot) * 55)) : 60;
        onProgress({
          phase: "downloading",
          message: `Remuxed stream: ${Math.round(rec / 1024 / 1024)} MB received…`,
          percent: pct,
          transferredBytes: rec,
          totalBytes: tot,
        });
      }, options?.abortSignal);
    }

    const finalBlob = new Blob([hlsBytes.buffer as ArrayBuffer], { type: "video/mp4" });
    const finalFilename = `${safeTitle}.mp4`;
    const finalBlobUrl = URL.createObjectURL(finalBlob);

    onProgress({ phase: "saving", message: "Saving assembled MP4 to device…", percent: 90 });
    await nativeSave(finalBlob, finalFilename);
    onProgress({ phase: "complete", message: "Download and assembly complete!", percent: 100 });

    return {
      blob: finalBlob,
      url: finalBlobUrl,
      filename: finalFilename,
      fileSizeBytes: hlsBytes.length,
      mimeType: "video/mp4",
      is4K: false,
      is60fps: false,
    };
  }

  // 3. Direct single-stream download (TikTok, Instagram, Twitter/X, audio tracks)
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
    const fallbackUrl = resolveApiUrl(
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
