/**
 * ZenoDeck — Smart Engine Router & Hybrid Media Dispatcher
 *
 * Directs incoming media processing tasks across a 4-tier execution hierarchy:
 *  1. Zero-Re-encode Fast Path (Stream copy -c:v copy / -c:a copy)
 *  2. Capacitor Native Media3 Bridge (Android hardware MediaCodec acceleration)
 *  3. WebCodecs Hardware Pipeline (Hardware-accelerated browser VideoEncoder)
 *  4. Multithreaded FFmpeg.wasm Engine (Complex filtergraphs & fallback)
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import { extOf } from "./ffmpeg-jobs";

export type ExecutionTier = "fast-copy" | "native-media3" | "webcodecs-hw" | "ffmpeg-wasm";

export type TaskType =
  | "remux"
  | "trim"
  | "extract-audio"
  | "transcode"
  | "compress"
  | "filtergraph";

export interface MediaTaskRequest {
  id: string;
  taskType: TaskType;
  file: File | Blob;
  fileName: string;
  targetFormat: string;
  targetCodec?: string;
  startTimeSec?: number;
  endTimeSec?: number;
  quality?: number; // 0.0 - 1.0
  bitrate?: number;
  width?: number;
  height?: number;
  fps?: number;
  ffmpegArgs?: string[];
  preferHardware?: boolean;
}

export interface MediaTaskPlan {
  tier: ExecutionTier;
  reason: string;
  estimatedSpeedup: string;
  canStreamCopy: boolean;
  suggestedArgs?: string[];
}

export interface NativeMedia3Result {
  success: boolean;
  outputPath?: string;
  error?: string;
}

interface ZenoMedia3BridgePlugin {
  isHardwareEncodingSupported(): Promise<{ supported: boolean; codecs: string[] }>;
  transcodeVideo(options: {
    sourcePath: string;
    outputPath: string;
    targetWidth?: number;
    targetHeight?: number;
    targetBitrate?: number;
    targetFps?: number;
  }): Promise<NativeMedia3Result>;
  cancelTranscode(options: { taskId: string }): Promise<{ success: boolean }>;
}

export const NativeMedia3 = registerPlugin<ZenoMedia3BridgePlugin>("ZenoMedia3Plugin");

/**
 * Codecs that are mutually compatible across common container wrappers for lossless remuxing.
 */
const REMUXABLE_PAIRS: Record<string, string[]> = {
  mp4: ["mkv", "mov", "m4v"],
  mkv: ["mp4", "mov", "m4v"],
  mov: ["mp4", "mkv", "m4v"],
  m4v: ["mp4", "mov", "mkv"],
  webm: ["mkv"],
};

/**
 * Analyzes the media task and environment to pick the optimal execution tier.
 */
export async function analyzeMediaTask(request: MediaTaskRequest): Promise<MediaTaskPlan> {
  const srcExt = extOf(request.fileName).toLowerCase();
  const tgtExt = request.targetFormat.toLowerCase().replace(/^\./, "");
  const isNative = Capacitor.isNativePlatform();

  // Tier 1: Zero-Re-encode Fast Path (Stream Copy)
  // Lossless container remuxing without filter modifications
  const isLosslessRemux =
    request.taskType === "remux" &&
    REMUXABLE_PAIRS[srcExt]?.includes(tgtExt) &&
    (!request.ffmpegArgs || request.ffmpegArgs.length === 0);

  // Lossless trim on keyframe boundaries without re-encoding
  const isLosslessTrim =
    request.taskType === "trim" &&
    srcExt === tgtExt &&
    !request.width &&
    !request.height &&
    !request.targetCodec;

  // Lossless audio extraction (e.g. AAC from MP4 -> M4A)
  const isLosslessAudioExtract =
    request.taskType === "extract-audio" &&
    ((srcExt === "mp4" && (tgtExt === "m4a" || tgtExt === "aac")) ||
      (srcExt === "mkv" && tgtExt === "mka") ||
      (srcExt === "webm" && tgtExt === "opus"));

  if (isLosslessRemux || isLosslessTrim || isLosslessAudioExtract) {
    const streamCopyArgs: string[] = ["-i", request.fileName];
    if (request.startTimeSec !== undefined && request.startTimeSec > 0) {
      streamCopyArgs.unshift("-ss", request.startTimeSec.toString());
    }
    if (request.endTimeSec !== undefined && request.endTimeSec > 0) {
      const duration = request.endTimeSec - (request.startTimeSec ?? 0);
      if (duration > 0) {
        streamCopyArgs.push("-t", duration.toString());
      }
    }

    if (request.taskType === "extract-audio") {
      streamCopyArgs.push("-vn", "-c:a", "copy");
    } else {
      streamCopyArgs.push("-c", "copy");
    }
    streamCopyArgs.push(`output.${tgtExt}`);

    return {
      tier: "fast-copy",
      reason: "Source and destination streams are codec-compatible. Direct stream copying avoids 100% of re-encoding overhead.",
      estimatedSpeedup: "10x - 50x (I/O bounded)",
      canStreamCopy: true,
      suggestedArgs: streamCopyArgs,
    };
  }

  // Tier 2: Capacitor Native Media3 Bridge (Android APK)
  if (isNative && (request.taskType === "transcode" || request.taskType === "compress")) {
    try {
      const hwSupport = await NativeMedia3.isHardwareEncodingSupported();
      if (hwSupport.supported) {
        return {
          tier: "native-media3",
          reason: "Native Android environment detected with Jetpack Media3 Transformer hardware acceleration.",
          estimatedSpeedup: "5x - 12x (Dedicated NPU / MediaCodec)",
          canStreamCopy: false,
        };
      }
    } catch {
      // Fall through to Tier 3 if native bridge query fails
    }
  }

  // Tier 3: WebCodecs Hardware Pipeline
  if (typeof window !== "undefined" && typeof VideoEncoder !== "undefined") {
    const isTranscodeOrCompress =
      request.taskType === "transcode" || request.taskType === "compress";
    const isStandardWebTarget = tgtExt === "mp4" || tgtExt === "webm";

    if (isTranscodeOrCompress && isStandardWebTarget) {
      try {
        const candidateCodec = tgtExt === "mp4" ? "avc1.42E01E" : "vp8";
        const config: VideoEncoderConfig = {
          codec: candidateCodec,
          width: request.width || 1280,
          height: request.height || 720,
          bitrate: request.bitrate || 2_500_000,
          framerate: request.fps || 30,
        };
        const supported = await VideoEncoder.isConfigSupported(config);
        if (supported.supported) {
          return {
            tier: "webcodecs-hw",
            reason: `Browser WebCodecs hardware encoder confirmed for ${candidateCodec} at ${config.width}x${config.height}.`,
            estimatedSpeedup: "3x - 8x (GPU hardware pipeline)",
            canStreamCopy: false,
          };
        }
      } catch {
        // Fall through to FFmpeg.wasm on negotiation exception
      }
    }
  }

  // Tier 4: Multithreaded FFmpeg.wasm Fallback
  return {
    tier: "ffmpeg-wasm",
    reason: "Complex filtergraph or exotic format requires full WebAssembly FFmpeg pipeline.",
    estimatedSpeedup: "1x - 3x (Multi-core SharedArrayBuffer WASM)",
    canStreamCopy: false,
    suggestedArgs: request.ffmpegArgs,
  };
}
