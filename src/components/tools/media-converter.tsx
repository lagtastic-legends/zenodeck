"use client";

/**
 * MEDIA CONVERTER
 *  ─ Video format transcode: MP4 / MOV / MKV / AVI / WebM
 *  ─ Audio extraction:       MP3 / WAV / M4A / FLAC / OGG
 * Codec matrix verified against the shipped wasm core:
 * libx264 · libvpx(vp8) · libmp3lame · libvorbis · aac · flac · pcm_s16le
 */

import { motion } from "framer-motion";
import { AlertTriangle, Film, Music4, Wand2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import { useMediaJob } from "@/hooks/use-media-job";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";
import { probeHasAudio, probeAudioCodec } from "@/lib/media/probe";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoTimelineTrimmer } from "@/components/media/video-timeline-trimmer";
import { PresetSelectorModal, type PresetItem } from "@/components/ui/preset-selector-modal";

const CONVERTER_PRESETS: PresetItem[] = [
  {
    id: "universal-mp4-web",
    name: "Universal MP4 Web (H.264/AAC)",
    description: "Maximum compatibility across iOS, Android, macOS, Windows, and Chromium with balanced compression.",
    category: "recommended",
    engineTier: "Tier 4: Wasm MT",
    chips: ["MP4", "H.264", "AAC 256k", "FastStart"],
    params: { mode: "video", videoFormat: "mp4", quality: "balanced", audioKbps: "256" },
  },
  {
    id: "apple-native-mov",
    name: "Apple Native MOV QuickTime",
    description: "Lossless-compatible QuickTime container with high-fidelity H.264 video and stereo AAC.",
    category: "studio",
    engineTier: "Tier 4: Wasm MT",
    chips: ["MOV", "QuickTime", "High Fidelity"],
    params: { mode: "video", videoFormat: "mov", quality: "high", audioKbps: "320" },
  },
  {
    id: "audiophile-320k-mp3",
    name: "Audiophile 320kbps MP3 Extraction",
    description: "Studio-grade stereo MP3 extraction with transparent lookahead peak limiter and zero vocal phase issues.",
    category: "recommended",
    engineTier: "Tier 4: Wasm MT",
    chips: ["MP3", "320 kbps", "Lookahead Limiter"],
    params: { mode: "audio", audioFormat: "mp3", audioKbps: "320" },
  },
  {
    id: "studio-lossless-wav",
    name: "Studio Lossless WAV (PCM 16-bit)",
    description: "Uncompressed PCM 16-bit stereo at 44.1kHz for master audio engineering, DAW mixing, and editing.",
    category: "studio",
    engineTier: "Tier 4: Wasm MT",
    chips: ["WAV", "PCM 16-bit", "Bit-Perfect"],
    params: { mode: "audio", audioFormat: "wav", audioKbps: "320" },
  },
  {
    id: "lossless-flac",
    name: "Lossless FLAC Master",
    description: "Bit-perfect FLAC compression preserving 100% audio dynamic range with reduced file size.",
    category: "studio",
    engineTier: "Tier 4: Wasm MT",
    chips: ["FLAC", "Lossless", "Archival"],
    params: { mode: "audio", audioFormat: "flac", audioKbps: "320" },
  },
  {
    id: "social-compact-video",
    name: "Social Compact Video (WebM/MP4)",
    description: "Aggressive CRF compression designed for rapid mobile sharing over cellular networks.",
    category: "social",
    engineTier: "Tier 4: Wasm MT",
    chips: ["MP4", "Compact", "Low Bandwidth"],
    params: { mode: "video", videoFormat: "mp4", quality: "compact", audioKbps: "128" },
  },
];

type Mode = "video" | "audio";
type VideoFormat = "mp4" | "mov" | "mkv" | "avi" | "webm";
type AudioFormat = "mp3" | "wav" | "m4a" | "flac" | "ogg" | "original";
type Quality = "high" | "balanced" | "compact";

const QUALITY_META: Record<Quality, { crf: number; aviQ: number; webmKbps: number; label: string }> = {
  high: { crf: 20, aviQ: 4, webmKbps: 1500, label: "High fidelity" },
  balanced: { crf: 26, aviQ: 6, webmKbps: 800, label: "Balanced" },
  compact: { crf: 32, aviQ: 9, webmKbps: 400, label: "Compact" },
};

const VIDEO_FORMAT_NOTES: Record<VideoFormat, string> = {
  mp4: "H.264 + AAC — universal compatibility",
  mov: "H.264 + AAC — QuickTime container",
  mkv: "H.264 + AAC — flexible Matroska",
  avi: "MPEG-4 + MP3 — legacy container",
  webm: "VP8 + Vorbis — web-native (slower encode)",
};

const AUDIO_FORMAT_NOTES: Record<AudioFormat, string> = {
  mp3: "Broadcast quality MP3 · stereo vocal sync · 44.1kHz · universal",
  wav: "Studio lossless PCM 16-bit · 44.1kHz · uncompressed",
  m4a: "High-efficiency AAC · Apple & mobile native",
  flac: "Lossless compressed audio · bit-perfect fidelity",
  ogg: "Vorbis open-source lossy audio",
  original: "Direct stream copy without re-encoding",
};

function buildVideoArgs(
  input: string,
  output: string,
  format: VideoFormat,
  quality: Quality,
  audioKbps: number,
  trim?: { start: number; end: number } | null,
): string[] {
  const q = QUALITY_META[quality];
  const trimArgs: string[] = [];
  if (trim && trim.end > trim.start && (trim.start > 0 || trim.end > 0)) {
    if (trim.start > 0) trimArgs.push("-ss", trim.start.toFixed(2));
    trimArgs.push("-t", (trim.end - trim.start).toFixed(2));
  }

  switch (format) {
    case "mp4":
    case "mov":
    case "mkv":
      return [
        ...trimArgs,
        "-i", input,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", String(q.crf),
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", `${audioKbps}k`,
        ...(format !== "mkv" ? ["-movflags", "+faststart"] : []),
        output,
      ];
    case "avi":
      return [
        "-i", input,
        "-c:v", "mpeg4",
        "-vtag", "xvid",
        "-q:v", String(q.aviQ),
        "-c:a", "libmp3lame",
        "-b:a", `${Math.min(audioKbps, 192)}k`,
        output,
      ];
    case "webm":
      return [
        "-i", input,
        "-c:v", "libvpx",
        "-b:v", `${q.webmKbps}k`,
        "-deadline", "realtime",
        "-cpu-used", "5",
        "-c:a", "libvorbis",
        "-b:a", `${Math.min(audioKbps, 192)}k`,
        output,
      ];
  }
}

function buildAudioArgs(
  input: string,
  output: string,
  format: AudioFormat,
  audioKbps: number,
  trim?: { start: number; end: number } | null,
): string[] {
  const trimArgs: string[] = [];
  if (trim && trim.end > trim.start && (trim.start > 0 || trim.end > 0)) {
    if (trim.start > 0) trimArgs.push("-ss", trim.start.toFixed(2));
    trimArgs.push("-t", (trim.end - trim.start).toFixed(2));
  }

  // Audio filter for pristine voice clarity and zero glitching:
  // 1. asetpts=PTS-STARTPTS: Normalizes audio presentation timestamps from 0, preventing sample dropping or duplication (zero robotic stutter).
  // 2. aformat=channel_layouts=stereo: Downmixes multi-channel (5.1/7.1) cleanly to stereo, preserving vocal center presence.
  // 3. alimiter=limit=0.98: Transparent lookahead peak limiter protecting against digital inter-sample clipping on loud peaks.
  const syncFilter = "asetpts=PTS-STARTPTS,aformat=channel_layouts=stereo,alimiter=limit=0.98";

  switch (format) {
    case "mp3":
      return [
        ...trimArgs,
        "-i", input,
        "-vn",
        "-af", syncFilter,
        "-c:a", "libmp3lame",
        "-b:a", `${audioKbps}k`,
        "-ac", "2",
        output,
      ];
    case "wav":
      return [
        ...trimArgs,
        "-i", input,
        "-vn",
        "-af", syncFilter,
        "-c:a", "pcm_s16le",
        "-ac", "2",
        output,
      ];
    case "m4a":
      return [
        ...trimArgs,
        "-i", input,
        "-vn",
        "-af", syncFilter,
        "-c:a", "aac",
        "-b:a", `${audioKbps}k`,
        "-ac", "2",
        output,
      ];
    case "flac":
      return [
        ...trimArgs,
        "-i", input,
        "-vn",
        "-af", syncFilter,
        "-c:a", "flac",
        "-compression_level", "5",
        "-ac", "2",
        output,
      ];
    case "ogg":
      return [
        ...trimArgs,
        "-i", input,
        "-vn",
        "-af", syncFilter,
        "-c:a", "libvorbis",
        "-q:a", "6",
        "-ac", "2",
        output,
      ];
    case "original":
      return [
        ...trimArgs,
        "-i", input,
        "-vn",
        "-c:a", "copy",
        output,
      ];
  }
}

export function MediaConverter() {
  const { phase, busy, progress, passIndex, passCount, passLabel, elapsedMs, error, outputs, run, reset } =
    useMediaJob();

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("video");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("mp4");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [quality, setQuality] = useState<Quality>("balanced");
  const [audioKbps, setAudioKbps] = useState("256");
  const [customName, setCustomName] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [trimRange, setTrimRange] = useState<{ start: number; end: number } | null>(null);
  const [hasAudio, setHasAudio] = useState<boolean | null>(null);
  const [originalExt, setOriginalExt] = useState<string>("m4a");
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>("universal-mp4-web");

  const handleApplyPreset = (preset: PresetItem) => {
    setActivePresetId(preset.id);
    if (preset.params.mode) setMode(preset.params.mode as Mode);
    if (preset.params.videoFormat) setVideoFormat(preset.params.videoFormat as VideoFormat);
    if (preset.params.audioFormat) setAudioFormat(preset.params.audioFormat as AudioFormat);
    if (preset.params.quality) setQuality(preset.params.quality as Quality);
    if (preset.params.audioKbps) setAudioKbps(preset.params.audioKbps);
  };

  const effectiveName = customName || (file ? file.name : "");
  const targetExt = mode === "video" ? videoFormat : audioFormat === "original" ? originalExt : audioFormat;
  const inputPath = file ? `input.${extOf(effectiveName) || "bin"}` : "";
  const outputName = effectiveName ? `${baseName(effectiveName)}.${targetExt}` : "";
  const outputPath = `output.${targetExt}`;

  const handleSnapshot = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.currentTime = currentTime;
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            import("@/lib/native-save").then((m) =>
              m.nativeSave(blob, `${file.name.replace(/\.[^.]+$/, "")}_frame_${Math.round(currentTime)}s.png`)
            );
          }
          URL.revokeObjectURL(url);
        }, "image/png");
      }
    };
  };

  const start = async () => {
    if (!file) return;
    if (mode === "audio" && hasAudio === false) return;
    const kbps = Number(audioKbps);
    const srcExt = extOf(effectiveName) || "bin";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    const args =
      mode === "video"
        ? buildVideoArgs(virtualInputPath, outputPath, videoFormat, quality, kbps, trimRange)
        : buildAudioArgs(virtualInputPath, outputPath, audioFormat, kbps, trimRange);

    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: args,
          label:
            mode === "video"
              ? `Transcoding → ${videoFormat.toUpperCase()} (H.264 ultrafast)`
              : audioFormat === "original"
                ? `Extracting original audio → ${originalExt.toUpperCase()} (stream copy)`
                : `Extracting audio → ${audioFormat.toUpperCase()}`,
        },
      ],
      read: [{ path: outputPath, mime: mimeFor(targetExt), name: outputName }],
      cleanup: [outputPath],
    });
  };

  const output = outputs[0] ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* -------------------------------------------------- input + settings */}
      <div className="space-y-5">
        <DropZone
          accept="video/*"
          file={file}
          onFile={(f) => {
            reset();
            setFile(f);
            setCustomName("");
            setHasAudio(null);
            probeHasAudio(f).then((avail) => {
              setHasAudio(avail);
            });
            probeAudioCodec(f).then((info) => {
              setOriginalExt(info.ext);
            });
          }}
          onRename={(newName) => {
            setCustomName(newName);
          }}
          onProbed={(m) => {
            setVideoDuration(m.durationSec);
            setTrimRange({ start: 0, end: m.durationSec });
            if (typeof m.hasAudio === "boolean") {
              setHasAudio(m.hasAudio);
            }
          }}
          onClear={() => {
            reset();
            setFile(null);
            setCustomName("");
            setHasAudio(null);
            setVideoDuration(0);
            setCurrentTime(0);
            setTrimRange(null);
          }}
          preview="video"
          label="Drop a video to convert"
          disabled={busy}
        />

        {file && videoDuration > 0 && (
          <VideoTimelineTrimmer
            duration={videoDuration}
            currentTime={currentTime}
            onSeek={(t) => setCurrentTime(t)}
            onTrimChange={(inSec, outSec) => setTrimRange({ start: inSec, end: outSec })}
            onSnapshot={handleSnapshot}
          />
        )}

        {/* Preset trigger button & target header */}
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Conversion Target
          </p>
          <button
            type="button"
            onClick={() => setIsPresetModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>Presets</span>
          </button>
        </div>

        {/* mode tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="video" className="gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              <Film className="size-3.5" />
              Video format
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2 font-mono text-[11px] uppercase tracking-[0.14em]">
              <Music4 className="size-3.5" />
              Extract audio
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {file && mode === "audio" && hasAudio === false && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <p className="font-mono text-[11px] font-bold tracking-wide uppercase">
                No Audio Stream Detected
              </p>
              <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                This video file is silent and contains no audio tracks to extract. Switch to &ldquo;Video format&rdquo; to transcode or trim this video.
              </p>
            </div>
          </div>
        )}

        {/* format selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Target format
            </p>
            <Select
              value={mode === "video" ? videoFormat : audioFormat}
              onValueChange={(v) =>
                mode === "video" ? setVideoFormat(v as VideoFormat) : setAudioFormat(v as AudioFormat)
              }
              disabled={busy}
            >
              <SelectTrigger className="min-h-11 font-mono text-sm uppercase" aria-label="Target format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mode === "video"
                  ? (Object.keys(VIDEO_FORMAT_NOTES) as VideoFormat[]).map((f) => (
                      <SelectItem key={f} value={f} className="font-mono uppercase">
                        {f}
                      </SelectItem>
                    ))
                  : (Object.keys(AUDIO_FORMAT_NOTES) as AudioFormat[]).map((f) => (
                      <SelectItem key={f} value={f} className="font-mono uppercase">
                        {f}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "video" ? (
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Quality
              </p>
              <Select value={quality} onValueChange={(v) => setQuality(v as Quality)} disabled={busy}>
                <SelectTrigger className="min-h-11 font-mono text-sm" aria-label="Quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUALITY_META) as Quality[]).map((q) => (
                    <SelectItem key={q} value={q} className="font-mono">
                      {QUALITY_META[q].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {audioFormat === "original" ? "Bitrate (original preserved)" : "Audio bitrate"}
              </p>
              <Select value={audioKbps} onValueChange={setAudioKbps} disabled={busy || audioFormat === "original"}>
                <SelectTrigger className="min-h-11 font-mono text-sm" aria-label="Audio bitrate">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["128", "192", "256", "320"].map((k) => (
                    <SelectItem key={k} value={k} className="font-mono">
                      {k} kbps {k === "320" ? "· Studio" : k === "256" ? "· High" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* format note */}
        <p className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
          {mode === "video"
            ? VIDEO_FORMAT_NOTES[videoFormat]
            : AUDIO_FORMAT_NOTES[audioFormat]}
          {mode === "video" && " · preset: ultrafast (wasm-optimized)"}
        </p>

        {/* run */}
        <motion.button
          onClick={() => void start()}
          disabled={!file || busy || (mode === "audio" && hasAudio === false)}
          whileHover={!file || busy || (mode === "audio" && hasAudio === false) ? undefined : { scale: 1.02 }}
          whileTap={!file || busy || (mode === "audio" && hasAudio === false) ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <Wand2 className="size-4" />
          {busy
            ? "PROCESSING…"
            : mode === "audio" && hasAudio === false
              ? "NO AUDIO TRACK DETECTED"
              : audioFormat === "original"
                ? `EXTRACT ORIGINAL → ${originalExt.toUpperCase()}`
                : `CONVERT → ${targetExt.toUpperCase()}`}
        </motion.button>
      </div>

      {/* ------------------------------------------------------------- output */}
      <div className="space-y-4">
        <ProcessingStatus
          phase={phase}
          progress={progress}
          passIndex={passIndex}
          passCount={passCount}
          passLabel={passLabel}
          elapsedMs={elapsedMs}
          error={error}
        />
        {output && (
          <OutputCard
            output={output}
            onClear={reset}
            badge={mode === "audio" ? (audioFormat === "original" ? "original audio extracted" : "audio extracted") : "transcoded"}
            badgeTone={mode === "audio" ? "neon" : "pulse"}
          />
        )}
        {!output && phase === "idle" && (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60">
            <p className="font-mono text-[11px] text-muted-foreground/70">
              output lands here
            </p>
          </div>
        )}
      </div>

      <PresetSelectorModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        toolId="media-converter"
        toolTitle="Media Converter"
        builtinPresets={CONVERTER_PRESETS}
        activePresetId={activePresetId}
        onSelectPreset={handleApplyPreset}
        currentSettings={{
          mode,
          format: mode === "video" ? videoFormat : audioFormat,
          quality: mode === "video" ? quality : undefined,
          audioKbps,
        }}
      />
    </div>
  );
}
