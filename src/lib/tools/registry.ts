import {
  AudioLines,
  AudioWaveform,
  BellRing,
  Camera,
  FileImage,
  FileText,
  FileVideo,
  Film,
  Fingerprint,
  Gauge,
  ImagePlay,
  LockKeyhole,
  Orbit,
  Palette,
  QrCode,
  Rewind,
  ScanLine,
  ShieldCheck,
  Shrink,
  Smartphone,
  SlidersVertical,
  Speaker,
  Vault,
  Volume2,
  VolumeX,
  Eraser,
  Clock,
  MicOff,
  Sliders,
  Waves,
  Scissors,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { ToolCategory, ToolMeta } from "@/types/omni";
import { Capacitor } from "@capacitor/core";

/* ------------------------------------------------------------------ */
/* Category presentation metadata                                      */
/* ------------------------------------------------------------------ */

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  video: "Video",
  audio: "Audio",
  documents: "Documents",
  imaging: "Imaging",
  studio: "Studio",
  system: "System",
};

export const CATEGORY_ORDER: ToolCategory[] = [
  "video",
  "audio",
  "documents",
  "imaging",
  "studio",
  "system",
];

/* ------------------------------------------------------------------ */
/* The registry — tools unlock phase by phase                          */
/* ------------------------------------------------------------------ */

/**
 * Single source of truth for every module in the ZenoDeck suite.
 * Later phases flip `status` to "online" and wire implementations.
 */
export const TOOL_REGISTRY: ToolMeta[] = [
  /* ---------------- PHASE 2 — Video & Visual Engine ---------------- */
  {
    id: "youtube-downloader",
    name: "Universal Media Downloader",
    description: "Download videos & audio from YouTube (4K), TikTok (No Watermark), Instagram Reels, X/Twitter, and Reddit.",
    category: "video",
    icon: Youtube,
    phase: 2,
    status: "online",
    accent: "red",
    requiresEngine: true,
    nativeOnly: true,
  },
  {
    id: "video-editor",
    name: "Video Editor",
    description: "Timeline video editor: trim, split, color grade, titles & effects.",
    category: "video",
    icon: Film,
    phase: 2,
    status: "online",
    accent: "blue",
    requiresEngine: true,
  },
  {
    id: "video-converter",
    name: "Video Converter",
    description: "Transcode MP4, MOV, AVI, MKV & extract audio tracks.",
    category: "video",
    icon: FileVideo,
    phase: 2,
    status: "online",
    accent: "violet",
  },
  {
    id: "video-compressor",
    name: "Video Compressor",
    description: "Shrink file size with live bitrate & quality control.",
    category: "video",
    icon: Shrink,
    phase: 2,
    status: "online",
    accent: "cyan",
  },
  {
    id: "video-mute",
    name: "Video Mute",
    description: "Strip audio from any clip in a single pass.",
    category: "video",
    icon: VolumeX,
    phase: 2,
    status: "online",
    accent: "fuchsia",
  },
  {
    id: "gif-maker",
    name: "GIF Maker",
    description: "Extract frames & bake looping GIFs from video.",
    category: "video",
    icon: ImagePlay,
    phase: 2,
    status: "online",
    accent: "emerald",
  },

  /* ---------------- PHASE 3 — Audio Engineering Suite --------------- */
  {
    id: "audio-editor",
    name: "MP3 Audio Editor",
    description: "Full editing deck for MP3, WAV, FLAC & more.",
    category: "audio",
    icon: AudioLines,
    phase: 3,
    status: "online",
    accent: "violet",
  },
  {
    id: "slowed-reverb",
    name: "Slowed + Reverb",
    description: "That late-night slowed & reverbed signature sound.",
    category: "audio",
    icon: AudioWaveform,
    phase: 3,
    status: "online",
    accent: "cyan",
  },
  {
    id: "bass-booster",
    name: "Bass Booster",
    description: "Low-end amplifier with adjustable intensity.",
    category: "audio",
    icon: Speaker,
    phase: 3,
    status: "online",
    accent: "fuchsia",
    requiresEngine: false,
  },
  {
    id: "spatial-8d",
    name: "3D / 8D Audio",
    description: "Rotating binaural panning around the listener.",
    category: "audio",
    icon: Orbit,
    phase: 3,
    status: "online",
    accent: "violet",
    requiresEngine: false,
  },
  {
    id: "equalizer",
    name: "Equalizer",
    description: "Multi-band EQ sculpting with live preview.",
    category: "audio",
    icon: SlidersVertical,
    phase: 3,
    status: "online",
    accent: "emerald",
    requiresEngine: false,
  },
  {
    id: "reverse-audio",
    name: "Reverse Audio",
    description: "Flip the waveform — play any track backwards.",
    category: "audio",
    icon: Rewind,
    phase: 3,
    status: "online",
    accent: "amber",
    requiresEngine: false,
  },
  {
    id: "stereo-panner",
    name: "Stereo Panner",
    description: "Position audio left ↔ right with channel control.",
    category: "audio",
    icon: AudioLines,
    phase: 3,
    status: "online",
    accent: "cyan",
    requiresEngine: false,
  },
  {
    id: "volume-changer",
    name: "Volume Changer",
    description: "Clean gain staging from whisper to wall-shaking.",
    category: "audio",
    icon: Volume2,
    phase: 3,
    status: "online",
    accent: "fuchsia",
    requiresEngine: false,
  },
  {
    id: "audio-dsp",
    name: "Unified Audio DSP",
    description: "13-Engine master DSP suite with real-time WebAudio & WASM pipeline.",
    category: "audio",
    icon: Sliders,
    phase: 3,
    status: "online",
    accent: "violet",
    requiresEngine: false,
  },
  {
    id: "vocal-remover",
    name: "Vocal Remover",
    description: "Out-of-phase stereo (OOPS) cancellation for instant karaoke tracks.",
    category: "audio",
    icon: MicOff,
    phase: 3,
    status: "online",
    accent: "fuchsia",
    requiresEngine: false,
  },
  {
    id: "reverb",
    name: "Reverb Studio",
    description: "8 acoustic space models from intimate rooms to cathedrals.",
    category: "audio",
    icon: Waves,
    phase: 3,
    status: "online",
    accent: "cyan",
    requiresEngine: false,
  },
  {
    id: "auto-panner",
    name: "Auto Panner",
    description: "Rhythmic automated stereo movement across the soundstage.",
    category: "audio",
    icon: Waves,
    phase: 3,
    status: "online",
    accent: "cyan",
    requiresEngine: false,
  },
  {
    id: "noise-reducer",
    name: "Noise Reducer",
    description: "Adaptive spectral FFT denoising with rumble and hiss filters.",
    category: "audio",
    icon: MicOff,
    phase: 3,
    status: "online",
    accent: "violet",
    requiresEngine: false,
  },
  {
    id: "pitch-shifter",
    name: "Pitch Shifter",
    description: "Semitone transposition independent of playback tempo.",
    category: "audio",
    icon: Sliders,
    phase: 3,
    status: "online",
    accent: "emerald",
    requiresEngine: false,
  },
  {
    id: "tempo-changer",
    name: "Tempo Changer",
    description: "Pitch-preserving time stretching from 0.5x to 2.0x.",
    category: "audio",
    icon: Clock,
    phase: 3,
    status: "online",
    accent: "amber",
    requiresEngine: false,
  },
  {
    id: "trimmer",
    name: "Audio Trimmer & Cutter",
    description: "Surgical millisecond audio trimming and segment slicing.",
    category: "audio",
    icon: Scissors,
    phase: 3,
    status: "online",
    accent: "fuchsia",
    requiresEngine: false,
  },
  {
    id: "ringtone-maker",
    name: "Ringtone Maker",
    description: "Precision trim & cut for perfect ringtones.",
    category: "audio",
    icon: BellRing,
    phase: 3,
    status: "online",
    accent: "violet",
  },

  /* ---------------- PHASE 4 — Document & Image Toolkit -------------- */
  {
    id: "image-to-pdf",
    name: "Image → PDF",
    description: "Compile JPG/PNG pages into a single PDF document.",
    category: "documents",
    icon: FileImage,
    phase: 4,
    status: "online",
    accent: "amber",
    requiresEngine: false,
  },
  {
    id: "text-to-pdf",
    name: "Text → PDF",
    description: "Typeset raw text into a clean, printable PDF.",
    category: "documents",
    icon: FileText,
    phase: 4,
    status: "online",
    accent: "violet",
    requiresEngine: false,
  },
  {
    id: "lock-pdf",
    name: "Lock PDF",
    description: "Encrypt PDFs with password protection.",
    category: "documents",
    icon: LockKeyhole,
    phase: 4,
    status: "online",
    accent: "cyan",
    requiresEngine: false,
  },
  {
    id: "scan-to-pdf",
    name: "Scan → PDF",
    description: "Capture scanned pages & compile into PDF.",
    category: "documents",
    icon: ScanLine,
    phase: 4,
    status: "online",
    accent: "fuchsia",
    requiresEngine: false,
  },
  {
    id: "palette-extractor",
    name: "Palette Extractor",
    description: "Pull top HEX/RGB colors from any image instantly.",
    category: "imaging",
    icon: Palette,
    phase: 4,
    status: "online",
    accent: "emerald",
    requiresEngine: false,
  },
  {
    id: "watermark-remover",
    name: "AI Watermark Eraser",
    description: "Automatically detect & erase AI logos, DALL-E bars, and watermarks.",
    category: "imaging",
    icon: Eraser,
    phase: 4,
    status: "online",
    accent: "fuchsia",
    requiresEngine: false,
  },
  {
    id: "ascii-generator",
    name: "ASCII Generator",
    description: "Convert images to ASCII text art instantly.",
    category: "imaging",
    icon: FileImage,
    phase: 4,
    status: "online",
    accent: "amber",
    requiresEngine: false,
  },

  /* ---------------- PHASE 5 — Vault, Recorder & Dashboard ----------- */
  {
    id: "vault",
    name: "File Vault",
    description: "IndexedDB-backed manager for processed files.",
    category: "system",
    icon: Vault,
    phase: 5,
    status: "online",
    accent: "violet",
    requiresEngine: false,
  },
  {
    id: "studio-recorder",
    get name() { return Capacitor.isNativePlatform() ? "Screen Recorder" : "Studio Recorder"; },
    get description() { return Capacitor.isNativePlatform() ? "Record your screen natively — zero uploads." : "Record mic, webcam & screen — zero uploads."; },
    category: "studio",
    icon: Camera,
    phase: 5,
    status: "online",
    accent: "fuchsia",
    requiresEngine: false,
  },

  /* ---------------- PHASE 6 — Capacitor / Android -------------------- */
  {
    id: "qr-studio",
    name: "QR Studio",
    description: "Scan real-world QR codes & generate your own.",
    category: "studio",
    icon: QrCode,
    phase: 6,
    status: "online",
    accent: "cyan",
    requiresEngine: false,
  },

  /* ---------------- PHASE 7 — Auth & Security ------------------------ */
  {
    id: "auth-gateway",
    name: "Auth Gateway",
    description: "Google Sign-In across web & Android.",
    category: "system",
    icon: Fingerprint,
    phase: 7,
    status: "online",
    accent: "amber",
    requiresEngine: false,
  },
];

/* Helpers ----------------------------------------------------------- */

export function isToolSupported(tool: ToolMeta): boolean {
  if (tool.nativeOnly) {
    if (process.env.NEXT_PUBLIC_MOBILE_EXPORT === "1") return true;
    if (typeof window !== "undefined" && Capacitor.isNativePlatform?.()) return true;
    return false;
  }
  return true;
}

export function getVisibleTools(): ToolMeta[] {
  return TOOL_REGISTRY.filter(isToolSupported);
}

export function getToolsByPhase(phase: number): ToolMeta[] {
  return TOOL_REGISTRY.filter((tool) => tool.phase === phase && isToolSupported(tool));
}

export function getOnlineTools(): ToolMeta[] {
  return TOOL_REGISTRY.filter((tool) => tool.status === "online" && isToolSupported(tool));
}

export function totalToolCount(): number {
  return getVisibleTools().length;
}

/** Icon used for a category chip in the dashboard filter bar. */
export const CATEGORY_ICONS: Record<ToolCategory, LucideIcon> = {
  video: FileVideo,
  audio: AudioLines,
  documents: FileText,
  imaging: Palette,
  studio: Gauge,
  system: ShieldCheck,
};
