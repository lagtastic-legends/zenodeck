"use client";

/**
 * ZenoDeck Audio DSP Studio Panel
 * ================================
 * Interactive 10-band equalizer, effect toggles, preset chips,
 * live spectrum visualizer, and A/B bypass — slides up from the
 * mini player as a collapsible deck.
 */

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  Zap,
  Radio,
  Mic,
  MicOff,
  RotateCcw,
} from "lucide-react";
import { useAudioDspStore } from "@/lib/audio/dsp-store";
import {
  DSP_PRESETS,
  ISO_10_BAND_FREQUENCIES,
  MIN_EQ_GAIN_DB,
  MAX_EQ_GAIN_DB,
  VocalMode,
} from "@/lib/audio/dsp-types";
import { AudioDspEngine } from "@/lib/audio/dsp-engine";

const FREQ_LABELS = ["32", "64", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"];

const VOCAL_CYCLE: VocalMode[] = ["off", "isolate", "remove"];
const VOCAL_LABEL: Record<VocalMode, string> = {
  off: "Off",
  isolate: "Solo",
  remove: "Cut",
};

// ─── Spectrum Visualizer ────────────────────────────────────────────

function SpectrumCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const engine = AudioDspEngine.getInstance();
      const analyser = engine.getAnalyser();
      if (!analyser) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      if (!dataRef.current || dataRef.current.length !== analyser.frequencyBinCount) {
        dataRef.current = new Uint8Array(analyser.frequencyBinCount);
      }
      engine.getFrequencyData(dataRef.current);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bins = dataRef.current.length;
      const barW = Math.max(1, (w / bins) * 1.8);
      const gap = (w - barW * bins) / (bins + 1);

      for (let i = 0; i < bins; i++) {
        const val = dataRef.current[i] / 255;
        const barH = val * h;
        const x = gap + i * (barW + gap);

        // Gradient: green → yellow → red based on magnitude
        const r = Math.round(val > 0.5 ? 255 : val * 2 * 255);
        const g = Math.round(val < 0.5 ? 255 : (1 - val) * 2 * 255);
        ctx.fillStyle = `rgb(${r},${g},80)`;
        ctx.fillRect(x, h - barH, barW, barH);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={52}
      className="w-full h-[52px] rounded-lg bg-black/30"
    />
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────

interface DspStudioPanelProps {
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  isOpen: boolean;
  onToggle: () => void;
}

export function DspStudioPanel({ audioRef, isOpen, onToggle }: DspStudioPanelProps) {
  const {
    eqGains,
    bassBoost,
    spatial8D,
    vocalMode,
    isBypassed,
    activePresetId,
    setBandGain,
    setBassBoost,
    setSpatial8D,
    setVocalMode,
    setBypass,
    applyPreset,
    resetAll,
    syncWithEngine,
  } = useAudioDspStore();

  const presetsRef = useRef<HTMLDivElement>(null);

  // Attach audio element to DSP engine
  useEffect(() => {
    if (audioRef?.current) {
      const engine = AudioDspEngine.getInstance();
      engine.attachElement(audioRef.current);
    }
  }, [audioRef?.current]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync persisted state with engine on mount
  useEffect(() => {
    syncWithEngine();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cycleVocal = useCallback(() => {
    const idx = VOCAL_CYCLE.indexOf(vocalMode);
    const next = VOCAL_CYCLE[(idx + 1) % VOCAL_CYCLE.length];
    setVocalMode(next);
  }, [vocalMode, setVocalMode]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="overflow-hidden"
        >
          <div className="bg-card/95 backdrop-blur-xl border-t border-border/50 rounded-t-2xl shadow-elevation3 p-3 space-y-3 max-h-[420px] overflow-y-auto">
            {/* ── Header + Bypass ── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-primary" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                  DSP Studio
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBypass(!isBypassed)}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isBypassed
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                }`}
                title="A/B Bypass Toggle"
              >
                <span className={`size-2 rounded-full ${isBypassed ? "bg-red-400 animate-pulse" : "bg-green-400"}`} />
                {isBypassed ? "Bypass" : "Active"}
              </button>
            </div>

            {/* ── Preset Chips Rail ── */}
            <div
              ref={presetsRef}
              className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              {DSP_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activePresetId === preset.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* ── 10-Band EQ Sliders ── */}
            <div className="flex justify-between items-end gap-0.5 px-1">
              {ISO_10_BAND_FREQUENCIES.map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="font-mono text-[8px] text-muted-foreground tabular-nums">
                    {eqGains[i] > 0 ? "+" : ""}
                    {eqGains[i]}
                  </span>
                  <input
                    type="range"
                    min={MIN_EQ_GAIN_DB}
                    max={MAX_EQ_GAIN_DB}
                    step={0.5}
                    value={eqGains[i]}
                    onChange={(e) => setBandGain(i, parseFloat(e.target.value))}
                    className="h-24 accent-primary cursor-pointer"
                    style={{
                      writingMode: "vertical-lr",
                      direction: "rtl",
                      width: "20px",
                    }}
                    title={`${FREQ_LABELS[i]} Hz: ${eqGains[i]} dB`}
                  />
                  <span className="font-mono text-[8px] text-muted-foreground">
                    {FREQ_LABELS[i]}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Effect Toggles ── */}
            <div className="flex items-center gap-2">
              {/* Bass Boost */}
              <button
                type="button"
                onClick={() => setBassBoost({ enabled: !bassBoost.enabled })}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  bassBoost.enabled
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                }`}
                title="Dynamic Bass Boost"
              >
                <Zap className="size-3.5" />
                Bass
              </button>

              {/* 8D Spatial */}
              <button
                type="button"
                onClick={() => setSpatial8D({ enabled: !spatial8D.enabled })}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  spatial8D.enabled
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                    : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                }`}
                title="8D Spatial Audio"
              >
                <Radio className="size-3.5" />
                8D
              </button>

              {/* Vocal Mode */}
              <button
                type="button"
                onClick={cycleVocal}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold transition-all cursor-pointer ${
                  vocalMode !== "off"
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/40"
                    : "bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted"
                }`}
                title={`Vocal: ${VOCAL_LABEL[vocalMode]}`}
              >
                {vocalMode === "remove" ? (
                  <MicOff className="size-3.5" />
                ) : (
                  <Mic className="size-3.5" />
                )}
                Vocal: {VOCAL_LABEL[vocalMode]}
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Reset */}
              <button
                type="button"
                onClick={resetAll}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 font-mono text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                title="Reset All DSP"
              >
                <RotateCcw className="size-3" />
              </button>
            </div>

            {/* ── Spectrum Visualizer ── */}
            <SpectrumCanvas />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Toggle Button (for mini player transport row) ──────────────────

interface DspStudioToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function DspStudioToggle({ isOpen, onToggle }: DspStudioToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`size-8 flex items-center justify-center rounded-lg transition-all cursor-pointer ${
        isOpen
          ? "bg-primary/20 text-primary"
          : "hover:bg-muted text-muted-foreground hover:text-foreground"
      }`}
      title="DSP Studio"
      aria-label="Toggle DSP Studio"
    >
      <SlidersHorizontal className="size-4" />
    </button>
  );
}
