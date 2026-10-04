"use client";

/**
 * BASS BOOSTER — low-shelf amplifier with adjustable intensity + cutoff,
 * optional treble clarity shelf so boosted tracks don't turn to mud.
 */

import { useState } from "react";
import { Speaker, Check, Sparkles } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import {
  ParamPanel,
  ParamSelect,
  ParamSlider,
  ParamToggle,
} from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { bassFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function BassBooster() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [cutoff, setCutoff] = useState("110");
  const [clarity, setClarity] = useState(true);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const filters = bassFilters({
      intensity,
      cutoff: Number(cutoff),
      clarity,
    });
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: ["-i", virtualInputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
          label: `Boosting bass +${(intensity * 1.5).toFixed(1)} dB @ ${cutoff} Hz (anti-clip protected)`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-bass.${format}`,
        },
      ],
      cleanup: [`output.${format}`],
    });
  };

  const TIERS = [
    { tier: 1, label: "Warmth", gain: "+3.0 dB", val: 2, cut: "110", clar: false, desc: "Subtle analog warmth · zero distortion" },
    { tier: 2, label: "Punchy", gain: "+6.0 dB", val: 4, cut: "95", clar: true, desc: "Kick drum punch & transient drive" },
    { tier: 3, label: "Deep Club", gain: "+9.0 dB", val: 6, cut: "80", clar: true, desc: "Chest-thumping club sub-bass" },
    { tier: 4, label: "Heavy Sub", gain: "+12.0 dB", val: 8, cut: "65", clar: true, desc: "808 acoustic boom & pressure" },
    { tier: 5, label: "Earthquake", gain: "+15.0 dB", val: 10, cut: "55", clar: true, desc: "Max sub impact · studio peak limited" },
  ];

  const activeTier = TIERS.find((t) => t.val === intensity) ?? null;

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
      onRun={start}
      runLabel="BOOST THE BASS"
      job={job}
      output={outputs[0] ?? null}
      badge="bass boosted"
      note="Studio Butterworth low-shelf DSP with 28Hz subsonic rumble guard, dynamic headroom attenuation (-55%), and broadcast lookahead peak limiting. Delivers massive bass without digital clipping, audio tearing, or vocal distortion."
      runIcon={<Speaker className="size-4" />}
      controls={
        <ParamPanel title="low-end engine">
          {/* Refined Tier Selection ("Tear List") */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" />
                Acoustic Tier Preset
              </span>
              {activeTier && (
                <span className="text-primary font-bold">Tier {activeTier.tier} · {activeTier.gain}</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pb-1">
              {TIERS.map((t) => {
                const isSelected = intensity === t.val && cutoff === t.cut;
                return (
                  <button
                    key={t.tier}
                    type="button"
                    onClick={() => {
                      setIntensity(t.val);
                      setCutoff(t.cut);
                      setClarity(t.clar);
                    }}
                    disabled={busy}
                    className={`flex flex-col text-left rounded-xl border p-2 sm:p-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/20 shadow-[0_0_12px_rgba(139,92,246,0.25)] ring-1 ring-primary/50"
                        : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/40 hover:bg-card hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-display text-xs font-bold flex items-center gap-1.5 ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {isSelected && <Check className="size-3 text-primary shrink-0 stroke-[2.5]" />}
                        T{t.tier} · {t.label}
                      </span>
                      <span className="font-mono text-[9px] font-semibold text-primary/80">
                        {t.gain}
                      </span>
                    </div>
                    <span className="mt-1 font-mono text-[9px] text-muted-foreground/80 leading-tight">
                      {t.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Anti-Tear Studio Limiter & Dynamic Headroom Active</span>
            </div>
          </div>

          <ParamSlider
            label="Intensity"
            value={intensity}
            min={1}
            max={10}
            step={1}
            onChange={setIntensity}
            disabled={busy}
            display={(v) => `+${(v * 1.5).toFixed(1)} dB (clean headroom)`}
            hintLeft="subtle warmth"
            hintRight="earthquake sub"
          />

          <ParamSelect
            label="Cutoff frequency"
            value={cutoff}
            onChange={setCutoff}
            disabled={busy}
            options={[
              { value: "55", label: "55 Hz · deepest sub (Earthquake)" },
              { value: "65", label: "65 Hz · 808 sub pressure" },
              { value: "80", label: "80 Hz · club & dance bassline" },
              { value: "95", label: "95 Hz · punchy kick & drive" },
              { value: "110", label: "110 Hz · classic warmth" },
              { value: "140", label: "140 Hz · bass guitar body" },
            ]}
          />

          <ParamToggle
            label="Clarity shelf"
            checked={clarity}
            onChange={setClarity}
            disabled={busy}
            hint="Lifts airy highs (+1.5 to +3.5 dB @ 6.5 kHz) to keep vocals crisp and prevent muffled mud"
          />
        </ParamPanel>
      }
    />
  );
}
