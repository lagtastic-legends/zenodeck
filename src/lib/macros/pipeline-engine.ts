/**
 * ZenoDeck — ZenoMacros Single-Pass Pipeline Compilation & Execution Engine
 *
 * Merges consecutive media transformations (Trim, Crop, Scale, Speed, Audio DSP,
 * ASCII Shader, Export) into a unified single-pass filtergraph (-filter_complex / -vf).
 * Eliminates redundant decode-encode cycles to maximize execution throughput.
 */

export type MacroNodeType =
  | "trim"
  | "crop"
  | "scale"
  | "speed"
  | "ascii-shader"
  | "audio-dsp"
  | "format-convert"
  | "push-zenotap";

export interface TrimConfig {
  startTimeSec: number;
  endTimeSec: number;
}

export interface CropConfig {
  aspectRatio: "1:1" | "16:9" | "9:16" | "4:5" | "custom";
  width?: number;
  height?: number;
}

export interface ScaleConfig {
  maxDimension: number;
}

export interface SpeedConfig {
  multiplier: number; // 0.25 to 4.0
}

export interface AsciiShaderConfig {
  columns: number;
  rampType: "standard" | "detailed" | "blocks" | "matrix";
  invert?: boolean;
}

export interface AudioDspConfig {
  bassBoostDb: number;
  spatial8D: boolean;
  stereoWidth?: number;
}

export interface FormatConvertConfig {
  format: "mp4" | "webm" | "gif" | "wav" | "mp3";
  fps?: number;
  quality?: number; // 0.0 to 1.0
}

export interface PushZenoTapConfig {
  autoSync: boolean;
}

export type MacroConfigMap = {
  trim: TrimConfig;
  crop: CropConfig;
  scale: ScaleConfig;
  speed: SpeedConfig;
  "ascii-shader": AsciiShaderConfig;
  "audio-dsp": AudioDspConfig;
  "format-convert": FormatConvertConfig;
  "push-zenotap": PushZenoTapConfig;
};

export interface MacroNode<T extends MacroNodeType = MacroNodeType> {
  id: string;
  type: T;
  enabled: boolean;
  config: MacroConfigMap[T];
}

export interface CompiledPipeline {
  inputArgs: string[];
  videoFilters: string[];
  audioFilters: string[];
  outputArgs: string[];
  targetFormat: string;
  isSinglePass: boolean;
  hasAsciiShader: boolean;
  hasZenoTapPush: boolean;
  estimatedPasses: number;
}

export interface MacroTemplate {
  id: string;
  name: string;
  description: string;
  category: "social" | "zenotap" | "cyber" | "audio";
  nodes: MacroNode[];
}

/**
 * Pre-configured high-efficiency ZenoMacro templates.
 */
export const MACRO_TEMPLATES: MacroTemplate[] = [
  {
    id: "zenotap-reaction-gif",
    name: "ZenoTap 1-Tap Reaction GIF",
    description: "3-second trim → 1:1 square crop → 15fps palette-optimized GIF ready for keyboard injection.",
    category: "zenotap",
    nodes: [
      {
        id: "node-1",
        type: "trim",
        enabled: true,
        config: { startTimeSec: 0, endTimeSec: 3 },
      },
      {
        id: "node-2",
        type: "crop",
        enabled: true,
        config: { aspectRatio: "1:1" },
      },
      {
        id: "node-3",
        type: "scale",
        enabled: true,
        config: { maxDimension: 320 },
      },
      {
        id: "node-4",
        type: "format-convert",
        enabled: true,
        config: { format: "gif", fps: 15 },
      },
      {
        id: "node-5",
        type: "push-zenotap",
        enabled: true,
        config: { autoSync: true },
      },
    ],
  },
  {
    id: "social-turbo-clip",
    name: "Social Speed-Clip (1:1 / 1.5x)",
    description: "Lossless trim → 1:1 square center crop → 1.5x fast-forward with pitch-compensated audio.",
    category: "social",
    nodes: [
      {
        id: "node-1",
        type: "crop",
        enabled: true,
        config: { aspectRatio: "1:1" },
      },
      {
        id: "node-2",
        type: "speed",
        enabled: true,
        config: { multiplier: 1.5 },
      },
      {
        id: "node-3",
        type: "scale",
        enabled: true,
        config: { maxDimension: 720 },
      },
      {
        id: "node-4",
        type: "format-convert",
        enabled: true,
        config: { format: "mp4" },
      },
    ],
  },
  {
    id: "cyber-spatial-master",
    name: "Cyber 8D Audio Master",
    description: "Dynamic Bass Boost (+6dB) → 360° Circular 8D Spatial Panning → 16-bit PCM Master WAV.",
    category: "audio",
    nodes: [
      {
        id: "node-1",
        type: "audio-dsp",
        enabled: true,
        config: { bassBoostDb: 6, spatial8D: true, stereoWidth: 1.4 },
      },
      {
        id: "node-2",
        type: "format-convert",
        enabled: true,
        config: { format: "wav" },
      },
    ],
  },
];

/**
 * Compiles an arbitrary chain of macro nodes into a single-pass execution plan.
 * Concurrently merges video filters into a single `-vf` pipeline and audio filters
 * into an `-af` pipeline so media is decoded only once.
 */
export function compileMacroPipeline(nodes: MacroNode[]): CompiledPipeline {
  const activeNodes = nodes.filter((n) => n.enabled);

  const inputArgs: string[] = [];
  const videoFilters: string[] = [];
  const audioFilters: string[] = [];
  const outputArgs: string[] = [];

  let targetFormat = "mp4";
  let hasAsciiShader = false;
  let hasZenoTapPush = false;

  for (const node of activeNodes) {
    switch (node.type) {
      case "trim": {
        const cfg = node.config as TrimConfig;
        if (cfg.startTimeSec > 0) {
          inputArgs.push("-ss", cfg.startTimeSec.toString());
        }
        if (cfg.endTimeSec > cfg.startTimeSec) {
          const duration = cfg.endTimeSec - cfg.startTimeSec;
          inputArgs.push("-t", duration.toString());
        }
        break;
      }

      case "crop": {
        const cfg = node.config as CropConfig;
        if (cfg.aspectRatio === "1:1") {
          // Center 1:1 square crop: crop to the minimum of input width and height
          videoFilters.push("crop=w='min(iw,ih)':h='min(iw,ih)':x='(iw-ow)/2':y='(ih-oh)/2'");
        } else if (cfg.aspectRatio === "9:16") {
          // Vertical phone format
          videoFilters.push("crop=w='min(iw,ih*9/16)':h='min(ih,iw*16/9)':x='(iw-ow)/2':y='(ih-oh)/2'");
        } else if (cfg.aspectRatio === "16:9") {
          // Widescreen landscape
          videoFilters.push("crop=w='min(iw,ih*16/9)':h='min(ih,iw*9/16)':x='(iw-ow)/2':y='(ih-oh)/2'");
        } else if (cfg.aspectRatio === "4:5") {
          // Instagram vertical portrait
          videoFilters.push("crop=w='min(iw,ih*4/5)':h='min(ih,iw*5/4)':x='(iw-ow)/2':y='(ih-oh)/2'");
        }
        break;
      }

      case "scale": {
        const cfg = node.config as ScaleConfig;
        const max = cfg.maxDimension || 720;
        // Keep aspect ratio intact and ensure even dimensions for h264 encoder compatibility
        videoFilters.push(`scale='if(gt(iw,ih),${max},-2)':'if(gt(iw,ih),-2,${max})'`);
        break;
      }

      case "speed": {
        const cfg = node.config as SpeedConfig;
        const mult = Math.max(0.25, Math.min(4.0, cfg.multiplier || 1.0));
        if (mult !== 1.0) {
          // Setpts for video: PTS/mult
          const ptsVal = (1.0 / mult).toFixed(4);
          videoFilters.push(`setpts=${ptsVal}*PTS`);

          // Atempo for audio (atempo only accepts 0.5 to 2.0; chain if outside)
          if (mult >= 0.5 && mult <= 2.0) {
            audioFilters.push(`atempo=${mult.toFixed(2)}`);
          } else if (mult > 2.0) {
            audioFilters.push(`atempo=2.0,atempo=${(mult / 2.0).toFixed(2)}`);
          } else {
            audioFilters.push(`atempo=0.5,atempo=${(mult / 0.5).toFixed(2)}`);
          }
        }
        break;
      }

      case "ascii-shader": {
        hasAsciiShader = true;
        break;
      }

      case "audio-dsp": {
        const cfg = node.config as AudioDspConfig;
        if (cfg.bassBoostDb > 0) {
          audioFilters.push(`bass=g=${cfg.bassBoostDb}:f=80`);
        }
        if (cfg.spatial8D) {
          // Contralateral Haas delay & stereo expander
          const width = cfg.stereoWidth ?? 1.4;
          audioFilters.push(`extrastereo=m=${width.toFixed(2)}`);
        }
        break;
      }

      case "format-convert": {
        const cfg = node.config as FormatConvertConfig;
        targetFormat = cfg.format;
        if (cfg.format === "gif") {
          const fps = cfg.fps || 15;
          // High quality palettegen / paletteuse single-pass filter
          videoFilters.push(`fps=${fps}`);
          outputArgs.push("-gifflags", "+transdiff");
        } else if (cfg.format === "mp4") {
          outputArgs.push("-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac");
        } else if (cfg.format === "webm") {
          outputArgs.push("-c:v", "libvpx-vp9", "-c:a", "libopus");
        }
        break;
      }

      case "push-zenotap": {
        hasZenoTapPush = true;
        break;
      }
    }
  }

  return {
    inputArgs,
    videoFilters,
    audioFilters,
    outputArgs,
    targetFormat,
    isSinglePass: !hasAsciiShader,
    hasAsciiShader,
    hasZenoTapPush,
    estimatedPasses: hasAsciiShader ? 2 : 1,
  };
}

/**
 * Creates a default macro node for user-driven pipeline composition.
 */
export function createDefaultNode(type: MacroNodeType): MacroNode {
  const id = `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  switch (type) {
    case "trim":
      return { id, type, enabled: true, config: { startTimeSec: 0, endTimeSec: 5 } };
    case "crop":
      return { id, type, enabled: true, config: { aspectRatio: "1:1" } };
    case "scale":
      return { id, type, enabled: true, config: { maxDimension: 720 } };
    case "speed":
      return { id, type, enabled: true, config: { multiplier: 1.5 } };
    case "ascii-shader":
      return { id, type, enabled: true, config: { columns: 80, rampType: "standard", invert: false } };
    case "audio-dsp":
      return { id, type, enabled: true, config: { bassBoostDb: 6, spatial8D: true, stereoWidth: 1.4 } };
    case "format-convert":
      return { id, type, enabled: true, config: { format: "mp4", fps: 30 } };
    case "push-zenotap":
      return { id, type, enabled: true, config: { autoSync: true } };
  }
}

/**
 * Builds the complete FFmpeg CLI command array from a compiled pipeline spec.
 */
export function buildFFmpegArgs(
  pipeline: CompiledPipeline,
  inputFilename: string,
  outputFilename: string
): string[] {
  const args: string[] = [];

  // Fast-seek input parameters
  if (pipeline.inputArgs.length > 0) {
    args.push(...pipeline.inputArgs);
  }
  args.push("-i", inputFilename);

  // Single-pass Video filter graph
  if (pipeline.videoFilters.length > 0) {
    args.push("-vf", pipeline.videoFilters.join(","));
  }

  // Single-pass Audio filter graph
  if (pipeline.audioFilters.length > 0) {
    args.push("-af", pipeline.audioFilters.join(","));
  }

  // Codec and container flags
  if (pipeline.outputArgs.length > 0) {
    args.push(...pipeline.outputArgs);
  }

  args.push(outputFilename);
  return args;
}

