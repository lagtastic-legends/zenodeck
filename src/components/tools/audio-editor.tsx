"use client";

/**
 * MP3 AUDIO EDITOR — the flagship deck. Composes trim, reverse, speed,
 * volume/normalize and fades into one filter graph, showing the projected
 * timeline as params change.
 */

import { motion } from "framer-motion";
import { AudioLines, Scissors } from "lucide-react";
import { useState } from "react";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { ProcessingStatus } from "@/components/media/processing-status";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  ParamPanel,
  ParamSelect,
  ParamSlider,
} from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { formatAdaptiveTimestamp } from "@/lib/audio-dsp";
import {
  audioOutputArgs,
  editorFilters,
  type AudioFormat,
} from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";
import type { VideoMeta } from "@/lib/media/probe";

export function AudioEditor() {
  const job = useMediaJob();
  const { phase, busy, progress, passIndex, passCount, passLabel, elapsedMs, error, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);

  const [trimEnabled, setTrimEnabled] = useState(true);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(10);
  const [reverse, setReverse] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [volumeDb, setVolumeDb] = useState(0);
  const [normalize, setNormalize] = useState(false);
  const [fadeIn, setFadeIn] = useState(0);
  const [fadeOut, setFadeOut] = useState(0);
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [kbps, setKbps] = useState("256");

  const handleProbed = (m: VideoMeta) => {
    setDuration(m.durationSec);
    setStart(0);
    setEnd(m.durationSec);
  };

  const valid =
    duration > 0 &&
    (!trimEnabled || end - start >= 0.3) &&
    (!trimEnabled || start < duration);

  /* Live projection of the final timeline for the header readout. */
  const projection = editorFilters({
    startSec: start,
    endSec: end,
    durationSec: duration || 1,
    trimEnabled,
    speed,
    reverse,
    volumeDb,
    normalize,
    fadeInSec: fadeIn,
    fadeOutSec: fadeOut,
  });

  const dirty =
    (trimEnabled && (start > 0 || end < duration - 0.05)) ||
    reverse ||
    speed !== 1 ||
    volumeDb !== 0 ||
    normalize ||
    fadeIn > 0 ||
    fadeOut > 0;

  const startJob = async () => {
    if (!file || !valid) return;
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    const k = Number(kbps);
    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: [
            "-i", virtualInputPath,
            "-af", projection.filters.length > 0 ? projection.filters.join(",") : "anull",
            ...audioOutputArgs(format, k),
            `output.${format}`,
          ],
          label: projection.filters.length > 0
            ? `Editing · ${projection.filters.length} filter${projection.filters.length === 1 ? "" : "s"}`
            : "Exporting audio passthrough",
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-edited.${format}`,
        },
      ],
      cleanup: [`output.${format}`],
    });
  };

  const output = outputs[0] ?? null;

  return (
    <div className="space-y-6">
      {/* projection strip ------------------------------------------------ */}
      <div className="panel-hud flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl px-4 py-3">
        <p className="flex items-center gap-2 font-mono text-[10px] md:text-xs lg:text-[13px] uppercase tracking-[0.2em] text-neon">
          <Scissors className="size-3.5" />
          timeline projection
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] md:text-xs lg:text-[13px] text-muted-foreground">
          <span>
            out length{" "}
            <span className="font-semibold text-foreground">
              {formatAdaptiveTimestamp(projection.finalLengthSec, { forceHours: projection.finalLengthSec >= 3600 })}
            </span>
          </span>
          <span>
            filters{" "}
            <span className="font-semibold text-foreground">
              {projection.filters.length}
            </span>
          </span>
          {reverse && <span className="text-plasma">reversed</span>}
          {speed !== 1 && (
            <span className="text-neon">{speed < 1 ? "slowed" : "sped up"} ×{speed.toFixed(2)}</span>
          )}
          {normalize ? (
            <span className="text-neon">normalized</span>
          ) : volumeDb !== 0 ? (
            <span className="text-neon">{volumeDb > 0 ? "+" : ""}{volumeDb} dB</span>
          ) : null}
        </div>
        <span
          className={`mt-2 w-full text-center sm:w-auto sm:mt-0 sm:ml-auto rounded-full border px-2.5 py-0.5 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.14em] ${
            dirty
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/60 text-muted-foreground"
          }`}
        >
          {dirty ? "changes pending" : "source passthrough"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
        {/* ------------------------------------------------ input + params */}
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
            label="Drop audio to edit"
            disabled={busy}
          />

          {/* trim */}
          <ParamPanel title="trim">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[10px] md:text-xs lg:text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
                enable cut range
              </p>
              <Switch checked={trimEnabled} onCheckedChange={setTrimEnabled} disabled={busy} aria-label="Enable trim" />
            </div>
            {trimEnabled && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] md:text-xs lg:text-[13px]">
                    <span className="uppercase tracking-[0.14em] text-muted-foreground">start offset</span>
                    <span className="font-semibold text-neon font-mono">
                      {formatAdaptiveTimestamp(start, { forceHours: duration >= 3600 })}
                    </span>
                  </div>
                  <Slider
                    value={[start]}
                    min={0}
                    max={Math.max(duration, 1)}
                    step={0.1}
                    disabled={busy || !duration}
                    onValueChange={([v]) => setStart(Math.min(v, end - 0.3))}
                    aria-label="Edit start time"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] md:text-xs lg:text-[13px]">
                    <span className="uppercase tracking-[0.14em] text-muted-foreground">end timestamp</span>
                    <span className="font-semibold text-neon font-mono">
                      {formatAdaptiveTimestamp(end, { forceHours: duration >= 3600 })}
                    </span>
                  </div>
                  <Slider
                    value={[end]}
                    min={0}
                    max={Math.max(duration, 1)}
                    step={0.1}
                    disabled={busy || !duration}
                    onValueChange={([v]) => setEnd(Math.max(v, start + 0.3))}
                    aria-label="Edit end time"
                  />
                </div>
                <p className="font-mono text-[10px] md:text-xs lg:text-[13px] text-muted-foreground">
                  selection {formatAdaptiveTimestamp(Math.max(end - start, 0), { forceHours: duration >= 3600 })} of{" "}
                  {formatAdaptiveTimestamp(duration, { forceHours: duration >= 3600 })}
                </p>
              </div>
            )}
          </ParamPanel>

          {/* transform */}
          <ParamPanel title="transform">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[10px] md:text-xs lg:text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
                reverse playback
              </p>
              <Switch checked={reverse} onCheckedChange={setReverse} disabled={busy} aria-label="Reverse" />
            </div>
            <ParamSlider
              label="Speed (pitch-preserving)"
              value={speed}
              min={0.5}
              max={2}
              step={0.05}
              onChange={setSpeed}
              disabled={busy}
              display={(v) => `×${v.toFixed(2)}`}
              hintLeft="0.5× slowed"
              hintRight="2.0× double-time"
            />
          </ParamPanel>

          {/* levels */}
          <ParamPanel title="levels">
            <ParamSlider
              label="Volume"
              value={volumeDb}
              min={-30}
              max={20}
              step={1}
              onChange={setVolumeDb}
              disabled={busy || normalize}
              display={(v) => `${v > 0 ? "+" : ""}${v} dB`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[10px] md:text-xs lg:text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
                loudness normalize
              </p>
              <Switch checked={normalize} onCheckedChange={setNormalize} disabled={busy} aria-label="Normalize" />
            </div>
          </ParamPanel>

          {/* fades + format */}
          <ParamPanel title="finish">
            <ParamSlider
              label="Fade in"
              value={fadeIn}
              min={0}
              max={5}
              step={0.1}
              onChange={setFadeIn}
              disabled={busy}
              display={(v) => `${v.toFixed(1)}s`}
            />
            <ParamSlider
              label="Fade out"
              value={fadeOut}
              min={0}
              max={6}
              step={0.1}
              onChange={setFadeOut}
              disabled={busy}
              display={(v) => `${v.toFixed(1)}s`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ParamSelect
                label="Output format"
                value={format}
                onChange={(v) => setFormat(v as AudioFormat)}
                disabled={busy}
                options={[
                  { value: "mp3", label: "MP3" },
                  { value: "wav", label: "WAV" },
                  { value: "flac", label: "FLAC" },
                  { value: "ogg", label: "OGG" },
                  { value: "m4a", label: "M4A" },
                ]}
              />
              <ParamSelect
                label="Bitrate"
                value={kbps}
                onChange={setKbps}
                disabled={busy || format === "wav" || format === "flac"}
                options={[
                  { value: "128", label: "128 kbps" },
                  { value: "192", label: "192 kbps" },
                  { value: "256", label: "256 kbps" },
                  { value: "320", label: "320 kbps" },
                ]}
              />
            </div>
          </ParamPanel>

          <motion.button
            onClick={() => void startJob()}
            disabled={!file || busy || !valid || !dirty}
            whileHover={!file || busy || !valid || !dirty ? undefined : { scale: 1.02 }}
            whileTap={!file || busy || !valid || !dirty ? undefined : { scale: 0.97 }}
            className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 glow-box-violet"
          >
            <AudioLines className="size-4" />
            {busy ? "RENDERING…" : "APPLY EDITS"}
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
          {output && <OutputCard output={output} badge="edited" badgeTone="neon" onClear={reset} />}
          {!output && phase === "idle" && (
            <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60">
              <p className="font-mono text-[11px] md:text-xs lg:text-[13px] text-muted-foreground/70">
                output lands here
              </p>
            </div>
          )}
          {phase === "done" && (
            <p className="rounded-lg border border-border/60 bg-card/40 px-3 py-2 font-mono text-[10px] md:text-xs lg:text-[13px] leading-relaxed text-muted-foreground">
              final length {projection.finalLengthSec.toFixed(1)}s ·{" "}
              {format.toUpperCase()} · trimmed, transformed and faded in a
              single pass.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
