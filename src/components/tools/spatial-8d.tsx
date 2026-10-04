"use client";

/**
 * 3D / 8D AUDIO — sine apulsator swings the stereo field around the
 * listener on a configurable cycle; extrastereo widens the image first.
 */

import { useState } from "react";
import { Orbit, Check, Sparkles } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import { ParamPanel, ParamSlider } from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { spatialFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

const SPATIAL_PRESETS = [
  { label: "Natural 360°", cycleSec: 8, intensity: 0.9 },
  { label: "Slow Orbit", cycleSec: 12, intensity: 0.85 },
  { label: "Hypnotic Dream", cycleSec: 16, intensity: 0.95 },
  { label: "Fast Whirl", cycleSec: 5, intensity: 0.8 },
] as const;

export function Spatial8D() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [cycleSec, setCycleSec] = useState(8);
  const [intensity, setIntensity] = useState(0.9);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const filters = spatialFilters({ cycleSec, intensity });
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: ["-i", virtualInputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
          label: `Rendering 8D rotation · ${cycleSec}s/cycle`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-8d.${format}`,
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
      runLabel="RENDER 8D AUDIO"
      job={job}
      output={outputs[0] ?? null}
      badge="8D spatialized"
      badgeTone="neon"
      note="Best with headphones — the sound orbits your head on a sine LFO. Mono sources are auto-upmixed to stereo before rotation."
      runIcon={<Orbit className="size-4" />}
      controls={
        <ParamPanel title="rotation field">
          <div className="mb-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block mb-2">
              Calibrated DSP Profiles
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {SPATIAL_PRESETS.map((p) => {
                const isActive = cycleSec === p.cycleSec && Math.abs(intensity - p.intensity) < 0.02;
                return (
                  <button
                    key={p.label}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setCycleSec(p.cycleSec);
                      setIntensity(p.intensity);
                    }}
                    className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all text-center border cursor-pointer ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/40 font-semibold"
                        : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground"
                    } disabled:opacity-50`}
                  >
                    {isActive && <Check className="size-3 text-cyan-400 stroke-[2.5]" />}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <ParamSlider
            label="Cycle length"
            value={cycleSec}
            min={4}
            max={16}
            step={1}
            onChange={setCycleSec}
            disabled={busy}
            display={(v) => `${v}s / rotation`}
            hintLeft="4s · dizzy"
            hintRight="16s · hypnotic"
          />
          <ParamSlider
            label="Swing intensity"
            value={intensity}
            min={0.3}
            max={1}
            step={0.05}
            onChange={setIntensity}
            disabled={busy}
            display={(v) => `${Math.round(v * 100)}%`}
            hintLeft="gentle drift"
            hintRight="full orbit"
          />
        </ParamPanel>
      }
    />
  );
}
