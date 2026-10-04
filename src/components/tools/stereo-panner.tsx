"use client";

/**
 * STEREO PANNER — stereotools balance with a center-snap chip.
 */

import { useState } from "react";
import { AudioLines, Check, Sparkles } from "lucide-react";
import { AudioWorkbench } from "@/components/audio/audio-workbench";
import { ParamPanel, ParamSlider } from "@/components/audio/param-controls";
import { useMediaJob } from "@/hooks/use-media-job";
import { panFilters } from "@/lib/audio/filters";
import { baseName, extOf, mimeFor } from "@/lib/media/ffmpeg-jobs";

export function StereoPanner() {
  const job = useMediaJob();
  const { busy, outputs, run, reset } = job;

  const [file, setFile] = useState<File | null>(null);
  const [balance, setBalance] = useState(0);

  const start = async ({ format, outputArgs }: { format: string; outputArgs: string[] }) => {
    if (!file) return;
    const filters = panFilters({ balance });
    const srcExt = extOf(file.name) || "mp3";
    const virtualInputPath = `/mnt_0/input.${srcExt}`;
    await run({
      inputFiles: [{ file, name: `input.${srcExt}`, mountPoint: "/mnt_0" }],
      passes: [
        {
          exec: ["-i", virtualInputPath, "-af", filters.join(","), ...outputArgs, `output.${format}`],
          label: `Panning ${balance === 0 ? "center" : balance < 0 ? `${Math.round(-balance * 100)}% left` : `${Math.round(balance * 100)}% right`}`,
        },
      ],
      read: [
        {
          path: `output.${format}`,
          mime: mimeFor(format),
          name: `${baseName(file.name)}-panned.${format}`,
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
      runLabel="APPLY PANNING"
      job={job}
      output={outputs[0] ?? null}
      badge="panned"
      note="Mono sources are upmixed to stereo first so the balance control always has both channels to work with."
      runIcon={<AudioLines className="size-4" />}
      controls={
        <ParamPanel title="image position">
          <div className="flex flex-wrap gap-1.5 pb-1">
            {[
              { label: "Hard Left", val: -1 },
              { label: "Soft Left", val: -0.35 },
              { label: "Center", val: 0 },
              { label: "Soft Right", val: 0.35 },
              { label: "Hard Right", val: 1 },
            ].map((p) => {
              const isActive = Math.abs(balance - p.val) < 0.02;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setBalance(p.val)}
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
          <ParamSlider
            label="Balance"
            value={balance}
            min={-1}
            max={1}
            step={0.05}
            onChange={setBalance}
            disabled={busy}
            display={(v) =>
              v === 0 ? "center" : v < 0 ? `L${Math.round(-v * 100)}` : `R${Math.round(v * 100)}`
            }
            hintLeft="full left"
            hintRight="full right"
          />
        </ParamPanel>
      }
    />
  );
}
