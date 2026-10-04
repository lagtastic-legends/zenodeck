"use client";

/**
 * EQUALIZER — six-band peaking EQ with preset chip rail. Only bands with
 * non-zero gain are emitted into the filter chain.
 */

import { useState } from "react";
import { SlidersVertical, Check, Sparkles } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import { ParamPanel, ParamSlider } from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { EQ_BANDS, EQ_PRESETS, eqFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

const BAND_LABELS = ["60 Hz · sub", "150 Hz · bass", "400 Hz · low-mid", "1 kHz · mid", "2.4 kHz · high-mid", "15 kHz · air"];

export function EqualizerTool() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [gains, setGains] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  const activeBands = gains.filter((g) => g !== 0).length;

  const applyPreset = (idx: number) => setGains([...EQ_PRESETS[idx].gains]);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const filters = eqFilters(gains);
    const finalFilters = filters.length > 0 ? filters : ["anull"];
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: ["-i", virtualInputPath, "-af", finalFilters.join(","), ...outputArgs, `output.${format}`],
          label: activeBands > 0 ? `Applying EQ · ${activeBands} active band${activeBands === 1 ? "" : "s"}` : "Exporting audio with flat EQ",
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-eq.${format}`,
        },
      ],
      cleanup: [`output.${format}`],
    });
  };

  return (
    <AudioWorkbench
      file={file}
      onFile={(f) => {
        reset();
        setFile(f);
      }}
      onClear={() => {
        reset();
        setFile(null);
      }}
      busy={busy}
      onRun={(o) => void start(o)}
      runLabel="APPLY EQUALIZER"
      job={job}
      output={outputs[0] ?? null}
      badge="equalized"
      badgeTone="neon"
      note="Six peaking bands, Q=1. Flat bands are skipped in the filter graph so light tweaks process faster."
      runIcon={<SlidersVertical className="size-4" />}
      controls={
        <ParamPanel title="6-band shaper">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-hud">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground shrink-0 pr-1 flex items-center gap-1">
              <Sparkles className="size-2.5 text-primary" />
              Presets:
            </span>
            {EQ_PRESETS.map((p, i) => {
              const isActive = gains.every((g, gi) => Math.abs(g - p.gains[gi]) < 0.1);
              return (
                <button
                  key={p.name}
                  onClick={() => applyPreset(i)}
                  disabled={busy}
                  className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.12em] transition-all cursor-pointer disabled:opacity-40 ${
                    isActive
                      ? "border-primary bg-primary/25 text-primary font-bold shadow-[0_0_10px_rgba(139,92,246,0.3)] ring-1 ring-primary/40"
                      : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {isActive && <Check className="size-2.5 shrink-0 text-primary stroke-[2.5]" />}
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {EQ_BANDS.map((band, i) => (
              <ParamSlider
                key={band}
                label={BAND_LABELS[i] ?? `${band} Hz`}
                value={gains[i] ?? 0}
                min={-12}
                max={12}
                step={1}
                onChange={(v) =>
                  setGains((prev) => prev.map((g, gi) => (gi === i ? v : g)))
                }
                disabled={busy}
                display={(v) => `${v > 0 ? "+" : ""}${v} dB`}
              />
            ))}
          </div>
        </ParamPanel>
      }
    />
  );
}
