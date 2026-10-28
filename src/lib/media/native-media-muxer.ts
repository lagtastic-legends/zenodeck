import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";

export interface ZenoMedia3PluginInterface {
  isHardwareEncodingSupported(): Promise<{ supported: boolean; codecs: string[] }>;
  transcodeVideo(options: {
    sourcePath: string;
    outputPath: string;
    targetWidth?: number;
    targetHeight?: number;
    targetBitrate?: number;
  }): Promise<{ success: boolean; outputPath: string; sourceSize: number; outputSize: number }>;
  muxVideoAndAudio(options: {
    videoPath: string;
    audioPath: string;
    outputPath: string;
  }): Promise<{ success: boolean; outputPath: string; fileSize: number }>;
  getMediaStorageDirectory(): Promise<{
    success: boolean;
    directoryName: string;
    parentDirectory: string;
    absolutePath: string;
  }>;
  scanMediaFile(options: {
    filePath: string;
    mimeType?: string;
  }): Promise<{ success: boolean; path: string; uri: string }>;
  extractWithYtDlp(options: {
    url: string;
  }): Promise<{ success: boolean; dataJson?: string; error?: string }>;
  downloadAndMuxYouTube(options: {
    videoUrl: string;
    audioUrl?: string;
    userAgent?: string;
    audioUserAgent?: string;
    fallbackVideoUrl?: string;
    originalUrl?: string;
    useYtDlp?: boolean;
    ytdlpVideoFormatId?: string;
    ytdlpAudioFormatId?: string;
    outputFileName: string;
    approxSizeBytes?: number;
  }): Promise<{ success: boolean; outputPath: string; fileSizeBytes: number; filename: string }>;
  addListener(
    eventName: "downloadProgress",
    listenerFunc: (data: {
      percent: number;
      bytesDownloaded: number;
      totalBytes: number;
      speedMbps: number;
      phase: string;
    }) => void
  ): Promise<any>;
}

export const ZenoMedia3 = registerPlugin<ZenoMedia3PluginInterface>("ZenoMedia3Plugin");

export function isNativeAndroidPlatform(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

const WRITE_CHUNK_SIZE = 512 * 1024; // 512 KB per IPC chunk

async function blobToBase64(slice: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const commaIdx = dataUrl.indexOf(",");
      resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
    };
    reader.onerror = reject;
    reader.readAsDataURL(slice);
  });
}

/**
 * Writes an in-memory Uint8Array to a temporary cache file using sliced IPC writes.
 */
export async function writeBufferToCacheFile(data: Uint8Array, fileName: string): Promise<string> {
  const blob = new Blob([data.buffer as ArrayBuffer]);
  const totalChunks = Math.ceil(blob.size / WRITE_CHUNK_SIZE);

  const firstSlice = blob.slice(0, Math.min(WRITE_CHUNK_SIZE, blob.size));
  const firstBase64 = await blobToBase64(firstSlice);

  await Filesystem.writeFile({
    path: `zeno_temp/${fileName}`,
    data: firstBase64,
    directory: Directory.Cache,
    recursive: true,
  });

  for (let i = 1; i < totalChunks; i++) {
    const start = i * WRITE_CHUNK_SIZE;
    const end = Math.min(start + WRITE_CHUNK_SIZE, blob.size);
    const slice = blob.slice(start, end);
    const base64 = await blobToBase64(slice);
    await Filesystem.appendFile({
      path: `zeno_temp/${fileName}`,
      data: base64,
      directory: Directory.Cache,
    });
  }

  const uriRes = await Filesystem.getUri({
    path: `zeno_temp/${fileName}`,
    directory: Directory.Cache,
  });

  return uriRes.uri.replace(/^file:\/\//, "");
}

/**
 * Executes zero-memory, disk-to-disk MediaMuxer muxing on native Android devices.
 * Directly outputs the packaged video into Movies/ZenoDeck, scans into Gallery,
 * and cleans up temporary stream cache files.
 */
export async function executeNativeAndroidMux({
  videoBytes,
  audioBytes,
  outputFilename,
  mimeType,
  onProgress,
}: {
  videoBytes: Uint8Array;
  audioBytes: Uint8Array;
  outputFilename: string;
  mimeType: string;
  onProgress?: (msg: string) => void;
}): Promise<{
  outputPath: string;
  fileSizeBytes: number;
  filename: string;
  mimeType: string;
}> {
  onProgress?.("Writing adaptive streams to high-speed disk cache…");

  const vExt = outputFilename.endsWith(".webm") ? "webm" : "mp4";
  const aExt = outputFilename.endsWith(".webm") ? "webm" : "m4a";
  const tempId = Date.now();
  const vFileName = `stream_v_${tempId}.${vExt}`;
  const aFileName = `stream_a_${tempId}.${aExt}`;

  const videoPath = await writeBufferToCacheFile(videoBytes, vFileName);
  const audioPath = await writeBufferToCacheFile(audioBytes, aFileName);

  onProgress?.("Resolving primary media storage directory…");
  let storageDir: string;
  try {
    const dirInfo = await ZenoMedia3.getMediaStorageDirectory();
    storageDir = dirInfo.absolutePath;
  } catch {
    const fallbackRes = await Filesystem.getUri({
      path: "Movies/ZenoDeck",
      directory: Directory.Documents,
    });
    storageDir = fallbackRes.uri.replace(/^file:\/\//, "");
  }

  const finalOutputPath = `${storageDir}/${outputFilename}`;

  onProgress?.("Running native hardware MediaMuxer (zero RAM overhead)…");

  const muxRes = await ZenoMedia3.muxVideoAndAudio({
    videoPath,
    audioPath,
    outputPath: finalOutputPath,
  });

  if (!muxRes.success) {
    throw new Error("Native Android MediaMuxer failed to multiplex streams.");
  }

  // Cleanup temporary cache files
  try {
    await Filesystem.deleteFile({ path: `zeno_temp/${vFileName}`, directory: Directory.Cache });
    await Filesystem.deleteFile({ path: `zeno_temp/${aFileName}`, directory: Directory.Cache });
  } catch {}

  // Explicitly ensure MediaScanner index
  try {
    await ZenoMedia3.scanMediaFile({
      filePath: finalOutputPath,
      mimeType,
    });
  } catch {}

  return {
    outputPath: finalOutputPath,
    fileSizeBytes: muxRes.fileSize,
    filename: outputFilename,
    mimeType,
  };
}

/**
 * Direct-to-disk native stream downloader and hardware MediaMuxer on Android.
 * Runs completely on native Kotlin Dispatchers.IO with HttpURLConnection and MediaMuxer.
 * Bypasses Chromium WebView fetch(), avoids CORS/403, preserves exact User-Agent,
 * and eliminates memory strain.
 */
export async function executeNativeYouTubeDownload({
  videoUrl,
  audioUrl,
  userAgent,
  audioUserAgent,
  fallbackVideoUrl,
  originalUrl,
  useYtDlp,
  ytdlpVideoFormatId,
  ytdlpAudioFormatId,
  outputFilename,
  approxSizeBytes,
  onProgress,
  signal,
}: {
  videoUrl: string;
  audioUrl?: string;
  userAgent?: string;
  audioUserAgent?: string;
  fallbackVideoUrl?: string;
  originalUrl?: string;
  useYtDlp?: boolean;
  ytdlpVideoFormatId?: string;
  ytdlpAudioFormatId?: string;
  outputFilename: string;
  approxSizeBytes?: number;
  onProgress?: (data: {
    percent: number;
    bytesDownloaded: number;
    totalBytes: number;
    speedMbps: number;
    phase: string;
  }) => void;
  signal?: AbortSignal;
}): Promise<{
  outputPath: string;
  fileSizeBytes: number;
  filename: string;
  mimeType: string;
}> {
  let progressHandle: any = null;
  if (onProgress) {
    try {
      progressHandle = await ZenoMedia3.addListener("downloadProgress", (data) => {
        if (!signal?.aborted) {
          onProgress(data);
        }
      });
    } catch (e) {
      console.warn("Could not register downloadProgress listener:", e);
    }
  }

  const isWebm = outputFilename.endsWith(".webm");
  const isM4a = outputFilename.endsWith(".m4a");
  const isMp3 = outputFilename.endsWith(".mp3");
  const mimeType = isWebm ? "video/webm" : isM4a ? "audio/mp4" : isMp3 ? "audio/mpeg" : "video/mp4";

  try {
    const res = await ZenoMedia3.downloadAndMuxYouTube({
      videoUrl,
      audioUrl: audioUrl || undefined,
      userAgent: userAgent || undefined,
      audioUserAgent: audioUserAgent || undefined,
      fallbackVideoUrl: fallbackVideoUrl || undefined,
      originalUrl: originalUrl || undefined,
      useYtDlp: useYtDlp || undefined,
      ytdlpVideoFormatId: ytdlpVideoFormatId || undefined,
      ytdlpAudioFormatId: ytdlpAudioFormatId || undefined,
      outputFileName: outputFilename,
      approxSizeBytes: approxSizeBytes || 0,
    });

    if (!res.success) {
      throw new Error("Native YouTube download/muxing failed.");
    }

    return {
      outputPath: res.outputPath,
      fileSizeBytes: res.fileSizeBytes,
      filename: res.filename || outputFilename,
      mimeType,
    };
  } finally {
    if (progressHandle && typeof progressHandle.remove === "function") {
      try {
        await progressHandle.remove();
      } catch {}
    }
  }
}
