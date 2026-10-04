"use client";

/**
 * SLOWED + REVERB
 * The late-night signature: asetrate pitch-drop slow (sample rate detected
 * live via the engine's ffprobe) + tiered aecho reverb.
 */

import { useState } from "react";
import { AudioWaveform, Check, Sparkles } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import { ParamPanel, ParamSlider } from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function SlowedReverb() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [factor, setFactor] = useState(0.85);
  const [reverb, setReverb] = useState(0.55);

  const start = async ({ format, outputArgs }: {
    format: string; kbps: number; outputArgs: string[];
  }) => {
    if (!file) return;
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;

    // Zero-copy WORKERFS audio pipeline:
    // Normalizing to 44.1kHz ensures exact pitch/tempo drop across any source sample rate
    // (e.g. 48kHz mobile recordings) with 0 MB JavaScript RAM overhead.
    const filters = [
      "aformat=sample_rates=44100",
      `asetrate=${Math.round(44100 * factor)}`,
      "aresample=44100",
    ];

    if (reverb >= 0.05) {
      if (reverb < 0.35) {
        // Light room ambience: Haas micro-reflections (16ms & 24ms), zero slapback
        filters.push("aecho=0.85:0.7:16|24:0.22|0.16,highpass=f=50,treble=g=-2:f=6500");
      } else if (reverb < 0.7) {
        // Medium studio hall: dense 4-tap diffuse reflections, warm damping
        filters.push("aecho=0.82:0.75:18|26|34|42:0.28|0.22|0.16|0.12,highpass=f=50,treble=g=-3:f=5500");
      } else {
        // Deep cathedral wash: multi-tap spatial bloom with progressive decay
        filters.push("aecho=0.80:0.8:20|28|36|48:0.34|0.26|0.20|0.14,highpass=f=50,treble=g=-3:f=5000");
      }
      filters.push("alimiter=limit=0.98");
    }

    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: ["-i", virtualInputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
          label: `Slowing to ${Math.round(factor * 100)}% · reverb ${Math.round(reverb * 100)}%`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-slowed.${format}`,
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
      runLabel="APPLY SLOWED + REVERB"
      job={job}
      output={outputs[0] ?? null}
      badge="slowed + reverbed"
      badgeTone="plasma"
      note="Classic 33rpm aesthetic — tempo and pitch drop together, drenched in tape-style echo. Sample rate is detected automatically so the factor stays exact on 44.1k and 48k sources."
      runIcon={<AudioWaveform className="size-4" />}
      controls={
        <ParamPanel title="signature">
          {/* Acoustic Presets */}
          <div className="space-y-1.5 pb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1">
              <Sparkles className="size-2.5 text-primary" />
              Acoustic Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Classic 85%", f: 0.85, r: 0.65 },
                { label: "Lofi Chill (80%)", f: 0.8, r: 0.5 },
                { label: "Late-Night Echo (75%)", f: 0.75, r: 0.85 },
                { label: "Deep Sludge (65%)", f: 0.65, r: 0.7 },
                { label: "Subtle Warmth (90%)", f: 0.9, r: 0.3 },
              ].map((p) => {
                const isActive = Math.abs(factor - p.f) < 0.01 && Math.abs(reverb - p.r) < 0.01;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFactor(p.f);
                      setReverb(p.r);
                    }}
                    disabled={busy}
                    className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.12em] transition-all cursor-pointer ${
                      isActive
                        ? "border-primary bg-primary/25 text-primary font-bold shadow-[0_0_10px_rgba(139,92,246,0.3)] ring-1 ring-primary/40"
                        : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-background/80"
                    }`}
                  >
                    {isActive && <Check className="size-2.5 shrink-0 text-primary stroke-[2.5]" />}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <ParamSlider
            label="Speed"
            value={factor}
            min={0.5}
            max={0.95}
            step={0.05}
            onChange={setFactor}
            disabled={busy}
            display={(v) => `${Math.round(v * 100)}%`}
            hintLeft="50% · deep"
            hintRight="95% · subtle"
          />
          <ParamSlider
            label="Reverb"
            value={reverb}
            min={0}
            max={1}
            step={0.05}
            onChange={setReverb}
            disabled={busy}
            display={(v) => (v < 0.05 ? "dry" : `${Math.round(v * 100)}%`)}
            hintLeft="dry"
            hintRight="cathedral"
          />
        </ParamPanel>
      }
    />
  );
}
