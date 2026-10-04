"use client";

/**
 * GIF MAKER — two-pass palette pipeline for high-quality GIFs:
 *   pass 1: palettegen (perceptual palette from the clip, diff-weighted)
 *   pass 2: paletteuse (Bayer-dithered mapping onto that palette)
 * Time range, FPS and width are user-tunable; duration comes from a
 * native browser probe, never ffmpeg.
 */

import { motion } from "framer-motion";
import { ImagePlay, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMediaJob } from "@/hooks/use-media-job";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";
import type { VideoMeta } from "@/lib/media/probe";

const FPS_OPTIONS = ["8", "10", "12", "15", "20", "24"] as const;
const WIDTH_OPTIONS = [
  { value: "240", label: "240px · lightweight" },
  { value: "320", label: "320px · classic" },
  { value: "480", label: "480px · sharp" },
  { value: "640", label: "640px · heavy" },
];

export function GifMaker() {
  const { phase, busy, progress, passIndex, passCount, passLabel, elapsedMs, error, outputs, run, reset } =
    useMediaJob();

  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<VideoMeta | null>(null);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(5);
  const [fps, setFps] = useState<string>("15");
  const [width, setWidth] = useState<string>("480");
  const [loop, setLoop] = useState<string>("infinite");

  /* Range is reset whenever a new file is probed (via callback, not effect). */
  const handleProbed = (m: VideoMeta) => {
    setMeta(m);
    setStart(0);
    setEnd(Math.min(5, m.durationSec));
  };

  const duration = meta?.durationSec ?? 0;
  const clipLength = Math.max(end - start, 0);
  const validRange = duration > 0 && clipLength >= 0.5;
  const estFrames = Math.round(clipLength * Number(fps));

  const output = outputs[0] ?? null;
  const outputName = file ? `${baseName(file.name)}.gif` : "clip.gif";

  const setRangePreset = (preset: "full" | "first5" | "last5") => {
    if (!duration) return;
    if (preset === "full") {
      setStart(0);
      setEnd(duration);
    } else if (preset === "first5") {
      setStart(0);
      setEnd(Math.min(5, duration));
    } else {
      setStart(Math.max(0, duration - 5));
      setEnd(duration);
    }
  };

  const startJob = async () => {
    if (!file || !validRange) return;
    const srcExt = extOf(file.name) || "mp4";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    const clipLen = (end - start).toFixed(2);
    const scale = `fps=${fps},scale='min(iw,${width})':-1:flags=lanczos`;

    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: [
            "-ss", start.toFixed(2),
            "-t", clipLen,
            "-i", virtualInputPath,
            "-vf", `${scale},palettegen=stats_mode=diff`,
            "palette.png",
          ],
          label: "Pass 1 — analyzing color palette",
        },
        {
          exec: [
            "-ss", start.toFixed(2),
            "-t", clipLen,
            "-i", virtualInputPath,
            "-i", "palette.png",
            "-lavfi", `${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4`,
            "-loop", loop === "infinite" ? "0" : "-1",
            "output.gif",
          ],
          label: "Pass 2 — rendering dithered GIF",
        },
      ],
      read: [{ path: "output.gif", mime: mimeFor("gif"), name: outputName }],
      cleanup: ["palette.png", "output.gif"],
    });
  };

  const chips = useMemo(
    () => [
      { id: "full", label: "Full clip" },
      { id: "first5", label: "First 5s" },
      { id: "last5", label: "Last 5s" },
    ] as const,
    [],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* -------------------------------------------------- input + settings */}
      <div className="space-y-5">
        <DropZone
          accept="video/*"
          file={file}
          onFile={(f) => {
            reset();
            setMeta(null);
            setFile(f);
          }}
          onClear={() => {
            reset();
            setFile(null);
            setMeta(null);
          }}
          onProbed={handleProbed}
          preview="video"
          label="Drop a video to GIF-ify"
          hint="short clips work best (2–10 s)"
          disabled={busy}
        />

        {/* time range */}
        <div className="space-y-3.5 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Time range
            </p>
            <div className="flex gap-1.5">
              {chips.map((c) => {
                const isSelected =
                  duration > 0 &&
                  (c.id === "full"
                    ? start === 0 && Math.abs(end - duration) < 0.1
                    : c.id === "first5"
                    ? start === 0 && Math.abs(end - Math.min(5, duration)) < 0.1
                    : Math.abs(start - Math.max(0, duration - 5)) < 0.1 && Math.abs(end - duration) < 0.1);
                return (
                  <button
                    key={c.id}
                    onClick={() => setRangePreset(c.id)}
                    disabled={busy || !duration}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition-all cursor-pointer disabled:opacity-40 ${
                      isSelected
                        ? "border-primary bg-primary/20 text-primary font-bold shadow-[0_0_10px_rgba(139,92,246,0.25)] ring-1 ring-primary/40"
                        : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {isSelected && <Check className="size-2.5 text-primary shrink-0 stroke-[2.5]" />}
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
              <span className="uppercase tracking-[0.14em] text-muted-foreground">start</span>
              <span className="font-semibold text-neon">{start.toFixed(1)}s</span>
            </div>
            <Slider
              value={[start]}
              onValueChange={([v]) => {
                setStart(Math.min(v, end - 0.5));
              }}
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              disabled={busy || !duration}
              aria-label="Clip start time"
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
              <span className="uppercase tracking-[0.14em] text-muted-foreground">end</span>
              <span className="font-semibold text-neon">{end.toFixed(1)}s</span>
            </div>
            <Slider
              value={[end]}
              onValueChange={([v]) => {
                setEnd(Math.max(v, start + 0.5));
              }}
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              disabled={busy || !duration}
              aria-label="Clip end time"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 font-mono text-[10px]">
            <span className="text-muted-foreground">
              clip {clipLength.toFixed(1)}s · ~{estFrames} frames @ {fps}fps
            </span>
            {duration > 0 && !validRange && (
              <span className="text-amber-300">need ≥ 0.5s</span>
            )}
          </div>
        </div>

        {/* gif params */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">FPS</p>
            <Select value={fps} onValueChange={setFps} disabled={busy}>
              <SelectTrigger className="min-h-11 font-mono text-sm" aria-label="Frames per second">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FPS_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f} className="font-mono">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Width</p>
            <Select value={width} onValueChange={setWidth} disabled={busy}>
              <SelectTrigger className="min-h-11 font-mono text-sm" aria-label="Output width">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WIDTH_OPTIONS.map((w) => (
                  <SelectItem key={w.value} value={w.value} className="font-mono">
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Loop</p>
            <Select value={loop} onValueChange={setLoop} disabled={busy}>
              <SelectTrigger className="min-h-11 font-mono text-sm" aria-label="Loop mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="infinite" className="font-mono">∞ loop</SelectItem>
                <SelectItem value="once" className="font-mono">once</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <motion.button
          onClick={() => void startJob()}
          disabled={!file || busy || !validRange}
          whileHover={!file || busy || !validRange ? undefined : { scale: 1.02 }}
          whileTap={!file || busy || !validRange ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <ImagePlay className="size-4" />
          {busy ? "RENDERING…" : "GENERATE GIF"}
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
          passNames={["palette", "render"]}
        />
        {output && <OutputCard output={output} badge="gif forged" badgeTone="neon" onClear={reset} />}
        {!output && phase === "idle" && (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60">
            <p className="font-mono text-[11px] text-muted-foreground/70">
              output lands here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
