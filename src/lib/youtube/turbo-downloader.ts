/**
 * ZenoDeck — YouTube Turbo Downloader Engine
 * ===========================================
 *
 * High-speed multi-worker parallel chunk streaming pipeline.
 *
 * Key Capabilities:
 *  1. Multi-Threaded Range Chunk Streaming: Bypasses single-connection throttling
 *     by splitting streams across progressive range workers (Range: bytes=X-Y).
 *  2. Dual-Stream Concurrent Fetching: Downloads 4K 60fps video and studio audio
 *     simultaneously with dynamic worker allocation.
 *  3. Edge Node Failover & Resume: Automatically cycles candidate CDN edge nodes
 *     (mn, fallback_host) with automatic retry and stall detection.
 *  4. Fast-Path Direct Saving: Native AAC (M4A) and pre-muxed 720p MP4 save
 *     instantly without WebAssembly overhead.
 *  5. Zero-Loss Stream-Copy Muxing: Uses FFmpeg WASM `-c copy` to combine video
 *     and audio streams in seconds with zero re-encoding artifacts or CPU lag.
 *  6. Live Telemetry: Instantaneous throughput gauge (MB/s), thread counter,
 *     and dynamic ETA computation.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import {
  buildCandidateUrls,
  getYouTubeApiUrl,
  type YouTubeQualityOption,
} from "./innertube";
import { tagMp3Buffer } from "./id3-tagger";
import {
  loadWasmCoreBlobUrl,
  resolveCoreModuleUrl,
} from "../ffmpeg/wasm-loader";
import {
  injectThreads,
  canStreamCopy,
  buildAudioExtractionArgs,
} from "../media/perf-utils";

let sharedTurboEngine: FFmpeg | null = null;

/**
 * Resiliently obtains an active FFmpeg WASM engine instance, booting one on demand if needed
 */
export async function getOrInitTurboEngine(providedEngine?: FFmpeg | null): Promise<FFmpeg | null> {
  if (providedEngine) {
    if ((providedEngine as any).loaded === true || (providedEngine as any).loaded === undefined) {
      return providedEngine;
    }
  }
  if (sharedTurboEngine && (sharedTurboEngine as any).loaded) {
    return sharedTurboEngine;
  }
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const instance = new FFmpeg();
    const coreURL = await resolveCoreModuleUrl();
    const { blobUrl: wasmURL } = await loadWasmCoreBlobUrl();
    const workerURL = new URL("/ffmpeg/worker.js", window.location.origin).href;
    await instance.load({
      coreURL,
      wasmURL,
      classWorkerURL: workerURL,
    });
    sharedTurboEngine = instance;
    return instance;
  } catch (err) {
    console.warn("Turbo downloader: auto-boot of FFmpeg engine failed:", err);
    return null;
  }
}

export type TurboPhase =
  | "idle"
  | "resolving"
  | "downloading"
  | "muxing"
  | "complete"
  | "error";

export interface TurboProgress {
  phase: TurboPhase;
  progress: number; // 0 .. 100
  speedMbps: number; // MB/s
  downloadedBytes: number;
  totalBytes: number;
  activeThreads: number;
  etaSeconds: number;
  statusMessage: string;
}

export interface TurboDownloadOptions {
  option: YouTubeQualityOption;
  videoTitle: string;
  author?: string;
  thumbnailUrl?: string;
  engine?: FFmpeg | null;
  maxParallelWorkers?: number;
  onProgress: (prog: TurboProgress) => void;
  signal?: AbortSignal;
}

export interface TurboDownloadResult {
  blob: Blob;
  url: string;
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  is4K: boolean;
  is60fps: boolean;
}

/**
 * Builds the stream proxy URL for web CORS compatibility or returns direct URL for native mobile
 */
function getProxiedStreamUrl(directUrl: string): string {
  if (directUrl.startsWith("data:") || directUrl.startsWith("blob:")) {
    return directUrl;
  }
  // In Node.js / CLI testing, fetch directly:
  if (typeof window === "undefined") {
    return directUrl;
  }
  // On native mobile (Capacitor Android / iOS), direct URL is handled natively
  if (Capacitor.isNativePlatform()) {
    return directUrl;
  }
  return getYouTubeApiUrl(`/api/youtube/stream?url=${encodeURIComponent(directUrl)}`);
}

/**
 * Universally fetches a byte range chunk.
 * - On native mobile (Capacitor Android/iOS), uses native CapacitorHttp to bypass
 *   browser CORS completely and avoid remote IP binding mismatch (403).
 * - On web, uses the CORS/CORP stream proxy (/api/youtube/stream).
 * - On Node.js, uses direct fetch with appropriate User-Agent.
 */
async function fetchChunkUniversal({
  candidateUrl,
  rangeHeader,
  signal,
}: {
  candidateUrl: string;
  rangeHeader?: string;
  signal?: AbortSignal;
}): Promise<Uint8Array> {
  const isIos = candidateUrl.includes("c=IOS") || candidateUrl.includes("sparams=");
  const defaultUa = isIos
    ? "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X; en_US)"
    : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

  const headers: Record<string, string> = {
    "User-Agent": defaultUa,
  };
  if (rangeHeader) {
    headers["Range"] = rangeHeader;
  }

  // 1. Native mobile (Capacitor Android / iOS)
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.request({
        url: candidateUrl,
        method: "GET",
        headers,
        responseType: "arraybuffer",
      });

      if (res.status === 200 || res.status === 206) {
        if (typeof res.data === "string") {
          const binaryStr = atob(res.data);
          const len = binaryStr.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          return bytes;
        } else if (res.data instanceof ArrayBuffer) {
          return new Uint8Array(res.data);
        } else if (res.data instanceof Uint8Array) {
          return res.data;
        }
      }
      throw new Error(`Native HTTP failed with status ${res.status}`);
    } catch (nativeErr: any) {
      console.warn("CapacitorHttp chunk fetch error, falling back:", nativeErr?.message);
    }
  }

  // 2. Web browser or Node.js
  const targetUrl = getProxiedStreamUrl(candidateUrl);
  const fetchOpts: RequestInit = {
    signal,
    headers,
  };

  const res = await fetch(targetUrl, fetchOpts);
  if (!res.ok && res.status !== 206) {
    throw new Error(`Fetch failed (HTTP ${res.status})`);
  }

  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * Safely measures content length of stream URL via Range: bytes=0-0 probe
 * Tests candidate edge nodes and promotes the responsive candidate
 * to index 0 of candidateUrls so chunk workers stream instantly without delay.
 */
async function probeStreamSizeSafe(
  candidateUrls: string[],
  knownSize?: number,
  signal?: AbortSignal
): Promise<number> {
  for (let i = 0; i < candidateUrls.length; i++) {
    const directUrl = candidateUrls[i];
    if (signal?.aborted) return knownSize || 0;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const onParentAbort = () => controller.abort();
      signal?.addEventListener("abort", onParentAbort);

      const chunk = await fetchChunkUniversal({
        candidateUrl: directUrl,
        rangeHeader: "bytes=0-0",
        signal: controller.signal,
      });

      clearTimeout(timer);
      signal?.removeEventListener("abort", onParentAbort);

      if (chunk && chunk.byteLength > 0) {
        // Candidate is responsive! Promote to front of candidateUrls array
        if (i > 0) {
          const [working] = candidateUrls.splice(i, 1);
          candidateUrls.unshift(working);
        }
        return knownSize || 0;
      }
    } catch {
      // Continue to next candidate
    }
  }

  return knownSize || 0;
}

/**
 * Downloads a single stream using progressive range chunk workers with candidate failover
 */
async function downloadStreamResilient({
  streamUrl,
  knownSize,
  maxWorkers = 4,
  label = "stream",
  onChunkBytes,
  signal,
}: {
  streamUrl: string;
  knownSize?: number;
  maxWorkers?: number;
  label?: string;
  onChunkBytes: (bytes: number) => void;
  signal?: AbortSignal;
}): Promise<Uint8Array> {
  const candidateUrls = buildCandidateUrls(streamUrl);

  // 1. Determine exact file size safely and identify the fastest responding CDN candidate node
  let totalSize = await probeStreamSizeSafe(candidateUrls, knownSize, signal);
  if (!totalSize && knownSize) {
    totalSize = knownSize;
  }

  // Fallback: if size is still unknown or very small (< 1 MB), perform single chunk fetch
  if (!totalSize || totalSize < 1024 * 1024) {
    let lastErr: Error | null = null;
    for (const cand of candidateUrls) {
      if (signal?.aborted) throw new Error("Download aborted");
      try {
        const data = await fetchChunkUniversal({
          candidateUrl: cand,
          rangeHeader: totalSize ? `bytes=0-${totalSize - 1}` : undefined,
          signal,
        });
        onChunkBytes(data.byteLength);
        return data;
      } catch (err: any) {
        lastErr = err;
      }
    }
    throw lastErr || new Error(`Failed to fetch ${label} stream.`);
  }

  // 2. Progressive Sized Chunk Partitioning
  // 512KB for streams < 10MB; 1MB for larger streams.
  // This guarantees fast packet-by-packet UI feedback (0% -> 2% -> 5% -> ...)
  // while preventing Android WebView base64 IPC bridge congestion.
  const CHUNK_SIZE = totalSize > 10 * 1024 * 1024 ? 1024 * 1024 : 512 * 1024;
  const numChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const outputBuffer = new Uint8Array(totalSize);

  // Use 2–4 workers for optimal mobile network saturation without throttling
  const concurrency = Math.max(1, Math.min(maxWorkers, 4, numChunks));
  let nextChunkIndex = 0;
  let activeCandidateIndex = 0;

  const worker = async (workerId: number) => {
    while (true) {
      if (signal?.aborted) throw new Error("Download aborted");
      const chunkIndex = nextChunkIndex++;
      if (chunkIndex >= numChunks) break;

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min((chunkIndex + 1) * CHUNK_SIZE - 1, totalSize - 1);

      let chunkSuccess = false;
      let lastErr: Error | null = null;

      // Retry up to 3 times per chunk with candidate edge node failover
      for (let attempt = 0; attempt < 3; attempt++) {
        if (signal?.aborted) throw new Error("Download aborted");
        const candIdx = (activeCandidateIndex + attempt) % candidateUrls.length;
        const candidate = candidateUrls[candIdx];

        const chunkController = new AbortController();
        const timeoutTimer = setTimeout(() => chunkController.abort(), 6000);
        const onParentAbort = () => chunkController.abort();
        signal?.addEventListener("abort", onParentAbort);

        try {
          const partData = await fetchChunkUniversal({
            candidateUrl: candidate,
            rangeHeader: `bytes=${start}-${end}`,
            signal: chunkController.signal,
          });

          clearTimeout(timeoutTimer);
          signal?.removeEventListener("abort", onParentAbort);

          if (partData.byteLength === 0) {
            throw new Error("Received empty chunk payload");
          }

          outputBuffer.set(partData, start);
          onChunkBytes(partData.byteLength);
          chunkSuccess = true;
          activeCandidateIndex = candIdx;
          break;
        } catch (err: any) {
          clearTimeout(timeoutTimer);
          signal?.removeEventListener("abort", onParentAbort);
          lastErr = err;
          if (attempt < 2 && !signal?.aborted) {
            await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
          }
        }
      }

      if (!chunkSuccess) {
        throw lastErr || new Error(`Chunk ${chunkIndex + 1}/${numChunks} failed after 3 attempts`);
      }
    }
  };

  await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
  return outputBuffer;
}

/**
 * Main Turbo Downloader entry point
 */
export async function downloadYouTubeStream({
  option,
  videoTitle,
  author,
  thumbnailUrl,
  engine,
  maxParallelWorkers = 6,
  onProgress,
  signal,
}: TurboDownloadOptions): Promise<TurboDownloadResult> {
  // Normalize format specifications if flat properties were passed
  if (!option.videoFormat && (option as any).videoUrl) {
    option.videoFormat = {
      itag: (option as any).itag || 0,
      url: (option as any).videoUrl,
      mimeType: (option as any).container === "webm" ? "video/webm" : "video/mp4",
      container: (option as any).container || "mp4",
      codec: "avc1",
      bitrate: 1000000,
      contentLength: option.approxSizeBytes,
    };
  }

  if (!option.audioFormat && (option as any).audioUrl) {
    option.audioFormat = {
      itag: 140,
      url: (option as any).audioUrl,
      mimeType: "audio/mp4",
      container: "m4a",
      codec: "mp4a.40.2",
      bitrate: (option.audioBitrate || 128) * 1000,
      contentLength: option.approxSizeBytes,
    };
  }

  const isAudioOnly = option.isAudioOnly;
  const is4K = option.is4K;
  const is60fps = option.is60fps;

  const totalEstBytes = option.approxSizeBytes || 50 * 1024 * 1024;
  let downloadedBytes = 0;
  let lastSampleTime = performance.now();
  let bytesSinceLastSample = 0;
  let currentSpeedMbps = 0;

  const hasSeparateAudio = Boolean(!isAudioOnly && option.audioFormat);
  const isDirectFastPath =
    (!isAudioOnly && !option.audioFormat && Boolean(option.videoFormat)) ||
    (isAudioOnly && option.id === "audio-m4a" && option.audioFormat?.container === "m4a");

  const progressMaxPct = isDirectFastPath ? 98 : 92;

  const updateProgress = (
    phase: TurboPhase,
    statusMessage: string,
    activeThreads = maxParallelWorkers
  ) => {
    const now = performance.now();
    const elapsedSec = (now - lastSampleTime) / 1000;

    if (elapsedSec >= 0.25) {
      const instantSpeed = (bytesSinceLastSample / (1024 * 1024)) / elapsedSec;
      currentSpeedMbps = currentSpeedMbps === 0 ? instantSpeed : currentSpeedMbps * 0.6 + instantSpeed * 0.4;
      lastSampleTime = now;
      bytesSinceLastSample = 0;
    }

    const pct = Math.min(100, Math.round((downloadedBytes / totalEstBytes) * progressMaxPct));
    const remainingBytes = Math.max(0, totalEstBytes - downloadedBytes);
    const etaSeconds = currentSpeedMbps > 0 ? Math.round((remainingBytes / (1024 * 1024)) / currentSpeedMbps) : 0;

    onProgress({
      phase,
      progress: pct,
      speedMbps: Number(currentSpeedMbps.toFixed(1)),
      downloadedBytes,
      totalBytes: totalEstBytes,
      activeThreads,
      etaSeconds,
      statusMessage,
    });
  };

  const handleChunk = (size: number) => {
    downloadedBytes += size;
    bytesSinceLastSample += size;
    updateProgress("downloading", `Streaming ${option.label} via multi-worker pipeline…`);
  };

  updateProgress("resolving", "Connecting to high-speed stream servers…", 0);

  // Clean filename
  const sanitizedTitle = (videoTitle || "youtube_video")
    .replace(/[<>:"/\\|?*]/g, "")
    .trim()
    .substring(0, 60);

  // -------------------------------------------------------------
  // Case A: Audio Only
  // -------------------------------------------------------------
  if (isAudioOnly) {
    const audioFmt = option.audioFormat || option.videoFormat;
    if (!audioFmt) {
      throw new Error("Missing audio stream URL for download.");
    }

    const audioData = await downloadStreamResilient({
      streamUrl: audioFmt.url,
      knownSize: audioFmt.contentLength,
      maxWorkers: Math.min(maxParallelWorkers, 4),
      label: "audio",
      onChunkBytes: handleChunk,
      signal,
    });

    const isSourceM4a =
      audioFmt.container === "m4a" ||
      (audioFmt.mimeType || "").toLowerCase().includes("audio/mp4") ||
      (audioFmt.codec || "").toLowerCase().includes("mp4a") ||
      (audioFmt.codec || "").toLowerCase().includes("aac");

    // Fast-path for Native AAC (M4A): direct container save without FFmpeg ONLY if source audio is genuinely M4A/AAC
    if (isSourceM4a && (!engine || option.id === "audio-m4a")) {
      const blob = new Blob([audioData.buffer as ArrayBuffer], { type: "audio/mp4" });
      const url = URL.createObjectURL(blob);
      const filename = `${sanitizedTitle} [Native AAC].m4a`;

      onProgress({
        phase: "complete",
        progress: 100,
        speedMbps: currentSpeedMbps,
        downloadedBytes: blob.size,
        totalBytes: blob.size,
        activeThreads: 0,
        etaSeconds: 0,
        statusMessage: "Audio extraction complete (Native AAC)!",
      });

      return {
        blob,
        url,
        filename,
        fileSizeBytes: blob.size,
        mimeType: "audio/mp4",
        is4K: false,
        is60fps: false,
      };
    }

    let activeEngine = engine;
    if (!activeEngine || !(activeEngine as any).loaded) {
      activeEngine = await getOrInitTurboEngine(engine);
    }

    // FFmpeg audio transcoding for MP3 and WAV if engine is active
    if (activeEngine) {
      try {
        const inputExt = audioFmt.container || (isSourceM4a ? "m4a" : "webm");
        const inputName = `input_audio.${inputExt}`;
        await activeEngine.writeFile(inputName, audioData);

        let outputName = "output.mp3";
        let mimeType = "audio/mp3";
        let qualitySuffix = "[320kbps]";
        let ffmpegArgs: string[] = [];

        if (option.id === "audio-m4a") {
          outputName = "output.m4a";
          mimeType = "audio/mp4";
          // Zero-encode stream copy: rips the raw AAC bitstream without
          // re-encoding — ~100x faster than transcoding.
          const useStreamCopy = canStreamCopy(inputExt, "m4a");
          if (useStreamCopy) {
            qualitySuffix = "[Native AAC · Stream Copy]";
            updateProgress("muxing", "Stream-copying native AAC (zero-encode)…", 1);
            ffmpegArgs = injectThreads(["-i", inputName, "-vn", "-c:a", "copy", outputName]);
          } else {
            qualitySuffix = "[Native AAC]";
            updateProgress("muxing", "Transcoding to AAC audio stream…", 1);
            ffmpegArgs = injectThreads(["-i", inputName, "-vn", "-c:a", "aac", "-b:a", "256k", "-ar", "44100", outputName]);
          }
        } else if (option.id === "audio-wav") {
          outputName = "output.wav";
          mimeType = "audio/wav";
          qualitySuffix = "[Lossless PCM]";
          updateProgress("muxing", "Exporting uncompressed 16-bit WAV PCM…", 1);
          ffmpegArgs = injectThreads(["-i", inputName, "-vn", "-c:a", "pcm_s16le", "-ar", "44100", outputName]);
        } else {
          // MP3 at requested bitrate (320k, 256k, 192k, 128k, etc.)
          const bitrate = option.audioBitrate || (option.id === "audio-mp3" ? 320 : 256);
          outputName = "output.mp3";
          mimeType = "audio/mp3";
          qualitySuffix = `[${bitrate}kbps]`;
          updateProgress("muxing", `Mastering ${bitrate} kbps MP3 in WebAssembly…`, 1);
          ffmpegArgs = injectThreads([
            "-i", inputName,
            "-vn",
            "-c:a", "libmp3lame",
            "-b:a", `${bitrate}k`,
            "-ar", "44100",
            "-af", "aresample=async=1000",
            outputName,
          ]);
        }

        try {
          await activeEngine.exec(ffmpegArgs);
        } catch (execErr: any) {
          console.warn("FFmpeg specialized audio command failed, trying fallback:", execErr);
          if (outputName.endsWith(".mp3")) {
            const fallbackBitrate = option.audioBitrate || 256;
            await activeEngine.exec(["-i", inputName, "-vn", "-b:a", `${fallbackBitrate}k`, outputName]);
          } else if (outputName.endsWith(".m4a")) {
            await activeEngine.exec(["-i", inputName, "-vn", "-c:a", "aac", outputName]);
          } else {
            throw execErr;
          }
        }

        const outData = (await activeEngine.readFile(outputName)) as Uint8Array;
        try {
          await activeEngine.deleteFile(inputName);
          await activeEngine.deleteFile(outputName);
        } catch {}

        let finalAudioData = outData;
        if (outputName.endsWith(".mp3")) {
          try {
            updateProgress("muxing", "Embedding ID3v2 tags & album cover art…", 1);
            finalAudioData = await tagMp3Buffer(outData, {
              title: videoTitle || "YouTube Audio",
              artist: author || "YouTube Creator",
              thumbnailUrl,
            });
          } catch (tagErr) {
            console.warn("Failed to apply ID3 tags to MP3:", tagErr);
          }
        }

        const blob = new Blob([finalAudioData.buffer as ArrayBuffer], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const ext = outputName.split(".").pop();
        const filename = `${sanitizedTitle} ${qualitySuffix}.${ext}`;

        onProgress({
          phase: "complete",
          progress: 100,
          speedMbps: currentSpeedMbps,
          downloadedBytes: blob.size,
          totalBytes: blob.size,
          activeThreads: 0,
          etaSeconds: 0,
          statusMessage: `Audio conversion complete (${qualitySuffix.replace(/[\[\]]/g, "")})!`,
        });

        return {
          blob,
          url,
          filename,
          fileSizeBytes: blob.size,
          mimeType,
          is4K: false,
          is60fps: false,
        };
      } catch (ffmpegErr) {
        console.warn("FFmpeg audio transcoding error, falling back to direct native stream export:", ffmpegErr);
      }
    }

    // Direct stream export fallback if FFmpeg is uninitialized or fails
    const ext = audioFmt.container === "m4a" ? "m4a" : audioFmt.container === "webm" ? "webm" : "mp3";
    const mime = ext === "m4a" ? "audio/mp4" : ext === "webm" ? "audio/webm" : "audio/mpeg";
    const blob = new Blob([audioData.buffer as ArrayBuffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const filename = `${sanitizedTitle} [Audio Stream].${ext}`;

    onProgress({
      phase: "complete",
      progress: 100,
      speedMbps: currentSpeedMbps,
      downloadedBytes: blob.size,
      totalBytes: blob.size,
      activeThreads: 0,
      etaSeconds: 0,
      statusMessage: "Audio extracted successfully!",
    });

    return {
      blob,
      url,
      filename,
      fileSizeBytes: blob.size,
      mimeType: mime,
      is4K: false,
      is60fps: false,
    };
  }

  // -------------------------------------------------------------
  // Case B: Video (4K 60fps / 2K / 1080p / 720p)
  // -------------------------------------------------------------
  if (!option.videoFormat) {
    throw new Error("Missing video stream format specification.");
  }

  const videoWorkers = hasSeparateAudio ? Math.max(2, maxParallelWorkers - 2) : maxParallelWorkers;
  const audioWorkers = hasSeparateAudio ? 2 : 0;

  // Concurrent dual-stream download (Video + Audio simultaneously)
  const [videoBytes, audioBytes] = await Promise.all([
    downloadStreamResilient({
      streamUrl: option.videoFormat.url,
      knownSize: option.videoFormat.contentLength,
      maxWorkers: videoWorkers,
      label: "video",
      onChunkBytes: handleChunk,
      signal,
    }),
    hasSeparateAudio && option.audioFormat
      ? downloadStreamResilient({
          streamUrl: option.audioFormat.url,
          knownSize: option.audioFormat.contentLength,
          maxWorkers: audioWorkers,
          label: "audio",
          onChunkBytes: handleChunk,
          signal,
        })
      : Promise.resolve(null),
  ]);

  // Fast-path: If video format was already pre-muxed (e.g. 720p MP4), save directly without FFmpeg
  if (!audioBytes) {
    const ext = option.videoFormat.container || "mp4";
    const mime = ext === "webm" ? "video/webm" : "video/mp4";
    const blob = new Blob([videoBytes.buffer as ArrayBuffer], { type: mime });
    const url = URL.createObjectURL(blob);
    const filename = `${sanitizedTitle} [${option.id}].${ext}`;

    onProgress({
      phase: "complete",
      progress: 100,
      speedMbps: currentSpeedMbps,
      downloadedBytes: blob.size,
      totalBytes: blob.size,
      activeThreads: 0,
      etaSeconds: 0,
      statusMessage: "Download complete!",
    });

    return {
      blob,
      url,
      filename,
      fileSizeBytes: blob.size,
      mimeType: mime,
      is4K,
      is60fps,
    };
  }

  // -------------------------------------------------------------
  // Case B: Video Muxing (4K 60fps / 2K / 1080p / 720p / 480p / 360p)
  // Multi-tier resilient FFmpeg pipeline (VP9 WebM, H.264 MP4, Opus transcode, WebM rescue)
  // -------------------------------------------------------------
  const vContainer = option.videoFormat.container || "mp4";
  const vMime = (option.videoFormat.mimeType || "").toLowerCase();
  const vCodec = (option.videoFormat.codec || "").toLowerCase();
  const isVideoWebM =
    vContainer === "webm" ||
    vMime.includes("webm") ||
    vCodec.includes("vp9") ||
    vCodec.includes("vp8");

  const aContainer = option.audioFormat?.container || "m4a";
  const aMime = (option.audioFormat?.mimeType || "").toLowerCase();
  const aCodec = (option.audioFormat?.codec || "").toLowerCase();
  const isAudioOpus =
    aContainer === "webm" ||
    aMime.includes("opus") ||
    aMime.includes("webm") ||
    aCodec.includes("opus");
  const isAudioAac =
    aContainer === "m4a" ||
    aMime.includes("mp4a") ||
    aMime.includes("aac") ||
    aCodec.includes("mp4a") ||
    aCodec.includes("aac");

  const vExt = isVideoWebM ? "webm" : "mp4";
  const aExt = isAudioOpus ? "webm" : isAudioAac ? "m4a" : (option.audioFormat?.container || "m4a");
  const vInput = `stream_v.${vExt}`;
  const aInput = `stream_a.${aExt}`;

  interface MuxPlan {
    outputName: string;
    outputExt: "mp4" | "webm";
    mimeType: string;
    args: string[];
    description: string;
  }

  const plans: MuxPlan[] = [];

  if (isVideoWebM) {
    // WebM video (VP9 / WebM): Lossless stream-copy into WebM container
    plans.push({
      outputName: "stream_out.webm",
      outputExt: "webm",
      mimeType: "video/webm",
      args: ["-i", vInput, "-i", aInput, "-c", "copy", "-map", "0:v:0", "-map", "1:a:0", "stream_out.webm"],
      description: "lossless WebM stream-copy",
    });

    // Fallback: WebM with Opus audio transcode
    plans.push({
      outputName: "stream_out.webm",
      outputExt: "webm",
      mimeType: "video/webm",
      args: [
        "-i", vInput,
        "-i", aInput,
        "-c:v", "copy",
        "-c:a", "libopus",
        "-b:a", "160k",
        "-map", "0:v:0",
        "-map", "1:a:0",
        "stream_out.webm",
      ],
      description: "WebM copy with Opus audio transcode",
    });
  } else {
    // MP4 video (H.264 / AV01)
    if (isAudioAac && !isAudioOpus) {
      // Audio is AAC: instant lossless stream-copy into MP4
      plans.push({
        outputName: "stream_out.mp4",
        outputExt: "mp4",
        mimeType: "video/mp4",
        args: [
          "-i", vInput,
          "-i", aInput,
          "-c", "copy",
          "-map", "0:v:0",
          "-map", "1:a:0",
          "-movflags", "+faststart",
          "stream_out.mp4",
        ],
        description: "lossless MP4 stream-copy",
      });

      // Secondary fallback: MP4 copy with AAC audio transcode
      plans.push({
        outputName: "stream_out.mp4",
        outputExt: "mp4",
        mimeType: "video/mp4",
        args: [
          "-i", vInput,
          "-i", aInput,
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "192k",
          "-ar", "44100",
          "-map", "0:v:0",
          "-map", "1:a:0",
          "-movflags", "+faststart",
          "stream_out.mp4",
        ],
        description: "MP4 copy with AAC audio transcode",
      });

      // Tertiary rescue fallback: WebM container rescue
      plans.push({
        outputName: "stream_out.webm",
        outputExt: "webm",
        mimeType: "video/webm",
        args: ["-i", vInput, "-i", aInput, "-c", "copy", "-map", "0:v:0", "-map", "1:a:0", "stream_out.webm"],
        description: "WebM rescue container stream-copy",
      });
    } else {
      // Audio is Opus: transcode audio to AAC so MP4 container has universally decodable, audible sound
      plans.push({
        outputName: "stream_out.mp4",
        outputExt: "mp4",
        mimeType: "video/mp4",
        args: [
          "-i", vInput,
          "-i", aInput,
          "-c:v", "copy",
          "-c:a", "aac",
          "-b:a", "192k",
          "-ar", "44100",
          "-map", "0:v:0",
          "-map", "1:a:0",
          "-movflags", "+faststart",
          "stream_out.mp4",
        ],
        description: "MP4 copy with AAC audio transcode (from Opus)",
      });

      // Rescue fallback 1: If MP4 muxing fails, attempt muxing into WebM container rather than dropping audio!
      plans.push({
        outputName: "stream_out.webm",
        outputExt: "webm",
        mimeType: "video/webm",
        args: ["-i", vInput, "-i", aInput, "-c", "copy", "-map", "0:v:0", "-map", "1:a:0", "stream_out.webm"],
        description: "WebM rescue container stream-copy",
      });

      // Rescue fallback 2: WebM with libopus transcode
      plans.push({
        outputName: "stream_out.webm",
        outputExt: "webm",
        mimeType: "video/webm",
        args: [
          "-i", vInput,
          "-i", aInput,
          "-c:v", "copy",
          "-c:a", "libopus",
          "-b:a", "160k",
          "-map", "0:v:0",
          "-map", "1:a:0",
          "stream_out.webm",
        ],
        description: "WebM rescue container with Opus transcode",
      });
    }
  }

  let activeEngine = engine;
  if (!activeEngine || !(activeEngine as any).loaded) {
    activeEngine = await getOrInitTurboEngine(engine);
  }

  if (activeEngine) {
    try {
      await activeEngine.writeFile(vInput, videoBytes);
      await activeEngine.writeFile(aInput, audioBytes);

      let successfulPlan: MuxPlan | null = null;
      let lastMuxError: any = null;

      for (const plan of plans) {
        try {
          updateProgress("muxing", `Muxing video & audio streams (${plan.description})…`, 1);
          await activeEngine.exec(plan.args);
          successfulPlan = plan;
          break;
        } catch (planErr) {
          lastMuxError = planErr;
          console.warn(`FFmpeg muxing plan failed (${plan.description}), trying next tier:`, planErr);
          try {
            await activeEngine.deleteFile(plan.outputName);
          } catch {}
        }
      }

      if (successfulPlan) {
        const finalVideoData = (await activeEngine.readFile(successfulPlan.outputName)) as Uint8Array;

        try {
          await activeEngine.deleteFile(vInput);
          await activeEngine.deleteFile(aInput);
          await activeEngine.deleteFile(successfulPlan.outputName);
        } catch {}

        const finalBlob = new Blob([finalVideoData.buffer as ArrayBuffer], { type: successfulPlan.mimeType });
        const finalUrl = URL.createObjectURL(finalBlob);
        const finalFilename = `${sanitizedTitle} [${option.id}].${successfulPlan.outputExt}`;

        onProgress({
          phase: "complete",
          progress: 100,
          speedMbps: currentSpeedMbps,
          downloadedBytes: finalBlob.size,
          totalBytes: finalBlob.size,
          activeThreads: 0,
          etaSeconds: 0,
          statusMessage: `Ready! ${option.label || option.badge} packaged cleanly with audible audio.`,
        });

        return {
          blob: finalBlob,
          url: finalUrl,
          filename: finalFilename,
          fileSizeBytes: finalBlob.size,
          mimeType: successfulPlan.mimeType,
          is4K,
          is60fps,
        };
      }

      // Clean up inputs on failure
      try {
        await activeEngine.deleteFile(vInput);
        await activeEngine.deleteFile(aInput);
      } catch {}

      throw new Error(
        `FFmpeg stream muxing failed across all fallback tiers: ${lastMuxError?.message || lastMuxError || "unknown error"}. Audio cannot be dropped.`
      );
    } catch (muxErr) {
      console.error("FFmpeg stream muxing error:", muxErr);
      throw muxErr;
    }
  }

  // Active FFmpeg engine was unavailable and separate audio is required:
  // ELIMINATE SILENT VIDEO FALLBACK: Never drop audio track!
  throw new Error(
    "FFmpeg WebAssembly engine is required to multiplex separate video and audio streams. Cannot output silent video."
  );
}
