"use client";

/**
 * RINGTONE MAKER — precision trim with fades, targeted at phone ringtones:
 * M4R (iPhone) / M4A (AAC) / MP3 (Android) / OGG. Warns past the classic
 * 40s iOS limit.
 */

import { motion } from "framer-motion";
import { BellRing, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import { Slider } from "@/components/ui/slider";
import {
  ParamPanel,
  ParamSelect,
  ParamSlider,
} from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { trimFadeFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";
import type { VideoMeta } from "@/lib/media/probe";

type RingFormat = "m4r" | "m4a" | "mp3" | "ogg";

const FORMAT_OPTIONS: { value: RingFormat; label: string }[] = [
  { value: "m4r", label: "M4R · iPhone ringtone" },
  { value: "m4a", label: "M4A · AAC universal" },
  { value: "mp3", label: "MP3 · Android" },
  { value: "ogg", label: "OGG · Vorbis" },
];

function ringOutputArgs(format: RingFormat): string[] {
  switch (format) {
    case "m4r":
      // ffmpeg can't guess the muxer from ".m4r" — the ipod muxer owns it.
      return ["-c:a", "aac", "-b:a", "192k", "-f", "ipod"];
    case "m4a":
      return ["-c:a", "aac", "-b:a", "192k"];
    case "mp3":
      return ["-c:a", "libmp3lame", "-b:a", "256k"];
    case "ogg":
      return ["-c:a", "libvorbis", "-q:a", "6"];
  }
}

export function RingtoneMaker() {
  const job = useMediaJob();
  const { phase, busy, progress, passIndex, passCount, passLabel, elapsedMs, error, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(20);
  const [fadeIn, setFadeIn] = useState(0.5);
  const [fadeOut, setFadeOut] = useState(1);
  const [boost, setBoost] = useState(4);
  const [format, setFormat] = useState<RingFormat>("m4r");

  const handleProbed = (m: VideoMeta) => {
    setDuration(m.durationSec);
    setStart(0);
    setEnd(Math.min(20, m.durationSec));
  };

  const clipLength = Math.max(end - start, 0);
  const valid = duration > 0 && clipLength >= 0.3;

  const startJob = async () => {
    if (!file || !valid) return;
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    const filters = trimFadeFilters({
      startSec: start,
      endSec: end,
      fadeInSec: fadeIn,
      fadeOutSec: fadeOut,
      boostDb: boost,
    });
    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: [
            "-i", virtualInputPath,
            "-af", filters.length > 0 ? filters.join(",") : "anull",
            ...ringOutputArgs(format),
            `output.${format}`,
          ],
          label: `Cutting ringtone · ${clipLength.toFixed(1)}s ${format.toUpperCase()}`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: format === "m4r" ? "audio/mp4" : mimeFor(format),
          name: `${baseName(file.name)}-ringtone.${format}`,
        },
      ],
      cleanup: [`output.${format}`],
    });
  };

  const output = outputs[0] ?? null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* -------------------------------------------------- input + settings */}
      <div className="space-y-5">
        <DropZone
          accept="audio/*"
          file={file}
          onFile={(f) => {
            reset();
            setFile(f);
          }}
          onClear={() => {
            reset();
            setFile(null);
            setDuration(0);
          }}
          onProbed={handleProbed}
          preview="audio"
          label="Drop the song to cut"
          disabled={busy}
        />

        <ParamPanel title="precision cut">
          {/* Quick Presets */}
          <div className="space-y-1.5 pb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3 text-primary" />
              Length Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Alert (5s)", len: 5, fin: 0.1, fout: 0.5, b: 4 },
                { label: "Classic (20s)", len: 20, fin: 0.5, fout: 1.0, b: 4 },
                { label: "Standard (30s)", len: 30, fin: 0.5, fout: 1.5, b: 3 },
                { label: "iOS Max (39s)", len: 39, fin: 0.5, fout: 2.0, b: 2 },
              ].map((p) => {
                const targetEnd = duration > 0 ? Math.min(p.len, duration) : p.len;
                const isActive = start === 0 && Math.abs(end - targetEnd) < 0.2;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setStart(0);
                      setEnd(targetEnd);
                      setFadeIn(p.fin);
                      setFadeOut(p.fout);
                      setBoost(p.b);
                    }}
                    disabled={busy}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.12em] transition-all cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary/20 text-primary font-bold shadow-[0_0_10px_rgba(139,92,246,0.25)] ring-1 ring-primary/40"
                        : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {isActive && <Check className="size-3 text-primary shrink-0" />}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] md:text-xs lg:text-[13px]">
              <span className="uppercase tracking-[0.14em] text-muted-foreground">start</span>
              <span className="font-semibold text-neon">{start.toFixed(1)}s</span>
            </div>
            <Slider
              value={[start]}
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              disabled={busy || !duration}
              onValueChange={([v]) => setStart(Math.min(v, end - 0.3))}
              aria-label="Ringtone start time"
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] md:text-xs lg:text-[13px]">
              <span className="uppercase tracking-[0.14em] text-muted-foreground">end</span>
              <span className="font-semibold text-neon">{end.toFixed(1)}s</span>
            </div>
            <Slider
              value={[end]}
              min={0}
              max={Math.max(duration, 1)}
              step={0.1}
              disabled={busy || !duration}
              onValueChange={([v]) => setEnd(Math.max(v, start + 0.3))}
              aria-label="Ringtone end time"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 font-mono text-[10px] md:text-xs lg:text-[13px]">
            <span className="text-muted-foreground">clip {clipLength.toFixed(1)}s</span>
            {duration > 0 && !valid && <span className="text-amber-300">need ≥ 0.3s</span>}
            {clipLength > 40 && <span className="text-amber-300">over iOS 40s limit</span>}
          </div>
        </ParamPanel>

        <ParamPanel title="polish">
          <ParamSlider
            label="Fade in"
            value={fadeIn}
            min={0}
            max={3}
            step={0.1}
            onChange={setFadeIn}
            disabled={busy}
            display={(v) => `${v.toFixed(1)}s`}
          />
          <ParamSlider
            label="Fade out"
            value={fadeOut}
            min={0}
            max={4}
            step={0.1}
            onChange={setFadeOut}
            disabled={busy}
            display={(v) => `${v.toFixed(1)}s`}
          />
          <ParamSlider
            label="Loudness boost"
            value={boost}
            min={0}
            max={12}
            step={1}
            onChange={setBoost}
            disabled={busy}
            display={(v) => `+${v} dB`}
            hintLeft="clean"
            hintRight="cuts through a pocket"
          />
          <ParamSelect
            label="Target"
            value={format}
            onChange={(v) => setFormat(v as RingFormat)}
            disabled={busy}
            options={FORMAT_OPTIONS}
          />
        </ParamPanel>

        <motion.button
          onClick={() => void startJob()}
          disabled={!file || busy || !valid}
          whileHover={!file || busy || !valid ? undefined : { scale: 1.02 }}
          whileTap={!file || busy || !valid ? undefined : { scale: 0.97 }}
          className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
        >
          <BellRing className="size-4" />
          {busy ? "CUTTING…" : "FORGE RINGTONE"}
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
            badge={`${format.toUpperCase()} · ${clipLength.toFixed(1)}s`}
            badgeTone="plasma"
          />
        )}
        {!output && phase === "idle" && (
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60">
            <p className="font-mono text-[11px] md:text-xs lg:text-[13px] text-muted-foreground/70">
              output lands here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
