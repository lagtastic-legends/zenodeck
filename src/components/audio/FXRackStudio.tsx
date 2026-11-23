"use client";

/**
 * ZenoDeck — Modular Real-Time Audio FX Rack Studio
 * =================================================
 * Interactive modular rack hosting 7 studio-grade DSP slots with
 * real-time Web Audio API monitoring and 1-pass offline WASM export.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Power,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sliders,
  Volume2,
  Wand2,
  Download,
  Flame,
  Maximize2,
  Radio,
  Layers,
} from "lucide-react";
import {
  FXRackConfig,
  FXRackModuleConfig,
  FXRackModuleId,
  ISO_10_BAND_FREQUENCIES,
  AudioFormat,
} from "@/lib/audio/dsp-types";
import {
  DEFAULT_FX_RACK_CONFIG,
  buildFXRackFilterChain,
  createFXRackWebAudioNodes,
} from "@/lib/audio/fx-rack-engine";
import { useAudioProcessor } from "@/hooks/useAudioProcessor";
import { useHaptics } from "@/hooks/use-haptics";
import { OutputCard } from "@/components/media/output-card";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";

interface FXRackStudioProps {
  file: File | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  format: AudioFormat;
  kbps: string;
}

export function FXRackStudio({
  file,
  audioRef,
  isPlaying,
  onTogglePlay,
  format,
  kbps,
}: FXRackStudioProps) {
  const haptics = useHaptics();
  const [config, setConfig] = useState<FXRackConfig>(() => ({
    ...DEFAULT_FX_RACK_CONFIG,
    modules: DEFAULT_FX_RACK_CONFIG.modules.map((m) => ({ ...m, params: { ...m.params } })),
  }));

  const {
    phase,
    busy,
    progress,
    currentPassLabel,
    elapsedMs,
    error,
    result,
    processAudio,
    reset,
  } = useAudioProcessor();

  /* Automatically surface SaveResultModal on successful export */
  useEffect(() => {
    if (result && result.blob) {
      try {
        useSaveDialogStore.getState().showSuccess({
          filename: result.name,
          blob: result.blob,
          fileSize: result.size,
        });
      } catch {}
    }
  }, [result]);

  /* Web Audio Real-Time Rack Connection */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rackCleanupRef = useRef<(() => void) | null>(null);

  const connectWebAudioRack = useCallback(() => {
    if (!audioRef.current || typeof window === "undefined") return;

    try {
      if (rackCleanupRef.current) {
        rackCleanupRef.current();
        rackCleanupRef.current = null;
      }

      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      if (!sourceNodeRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
      }
      const source = sourceNodeRef.current;
      try { source.disconnect(); } catch {}

      // Sync tempo-changer module with HTMLAudioElement
      const tempoMod = config.modules.find((m) => m.id === "tempo-changer" && m.enabled);
      if (tempoMod && audioRef.current) {
        audioRef.current.playbackRate = tempoMod.params.tempo ?? 0.87;
        try {
          (audioRef.current as any).preservesPitch = tempoMod.params.preservePitch === true;
          (audioRef.current as any).mozPreservesPitch = tempoMod.params.preservePitch === true;
          (audioRef.current as any).webkitPreservesPitch = tempoMod.params.preservePitch === true;
        } catch {}
      } else if (audioRef.current) {
        audioRef.current.playbackRate = 1.0;
        try {
          (audioRef.current as any).preservesPitch = true;
        } catch {}
      }

      const { masterGain, cleanup } = createFXRackWebAudioNodes(ctx, source, config);
      masterGain.connect(ctx.destination);
      rackCleanupRef.current = cleanup;
    } catch {
      // Audio element fallback
    }
  }, [audioRef, config]);

  useEffect(() => {
    if (isPlaying) {
      connectWebAudioRack();
    }
    return () => {
      if (rackCleanupRef.current) {
        rackCleanupRef.current();
        rackCleanupRef.current = null;
      }
    };
  }, [isPlaying, connectWebAudioRack]);

  /* Slot Toggle Helper */
  const toggleModule = (id: FXRackModuleId) => {
    void haptics.light();
    setConfig((prev) => ({
      ...prev,
      modules: prev.modules.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    }));
  };

  /* Slot Parameter Update Helper */
  const updateModuleParam = (id: FXRackModuleId, key: string, val: any) => {
    setConfig((prev) => ({
      ...prev,
      modules: prev.modules.map((m) =>
        m.id === id
          ? { ...m, params: { ...m.params, [key]: val } }
          : m
      ),
    }));
  };

  /* Curated Master Presets */
  const applyPreset = (presetName: string) => {
    void haptics.medium();
    switch (presetName) {
      case "slowed-reverb-studio":
        setConfig((prev) => ({
          ...prev,
          modules: prev.modules.map((m) => {
            if (m.id === "tempo-changer") return { ...m, enabled: true, params: { tempo: 0.87, preservePitch: false } };
            if (m.id === "reverb") return {
              ...m,
              enabled: true,
              wetDry: 0.562,
              params: {
                preset: "slowed-reverb",
                reverberance: 45,
                roomScale: 90,
                hfDamping: 65,
                preDelayMs: 35,
                stereoDepth: 100,
                wetGainDb: -5,
                wetHighPassHz: 140,
              },
            };
            if (m.id === "master-limiter") return { ...m, enabled: true, params: { ceilingDb: -0.5 } };
            return { ...m, enabled: false };
          }),
        }));
        break;

      case "8d-slowed-reverb-studio":
        setConfig((prev) => ({
          ...prev,
          modules: prev.modules.map((m) => {
            if (m.id === "tempo-changer") return { ...m, enabled: true, params: { tempo: 0.87, preservePitch: false } };
            if (m.id === "spatial-8d") return {
              ...m,
              enabled: true,
              params: {
                orbitRateHz: 0.12,
                panDepth: 0.88,
                haasDelayMs: 0.35,
                rearHeadLowpassHz: 7200,
                bassMonoCrossoverHz: 120,
              },
            };
            if (m.id === "reverb") return {
              ...m,
              enabled: true,
              wetDry: 0.531,
              params: {
                preset: "slowed-reverb-8d",
                reverberance: 46,
                roomScale: 92,
                hfDamping: 65,
                preDelayMs: 35,
                stereoDepth: 100,
                wetGainDb: -5.5,
                wetHighPassHz: 140,
              },
            };
            if (m.id === "master-limiter") return { ...m, enabled: true, params: { ceilingDb: -0.5 } };
            return { ...m, enabled: false };
          }),
        }));
        break;

      case "8d-slowed-reverb-hypnotic":
        setConfig((prev) => ({
          ...prev,
          modules: prev.modules.map((m) => {
            if (m.id === "tempo-changer") return { ...m, enabled: true, params: { tempo: 0.84, preservePitch: false } };
            if (m.id === "spatial-8d") return {
              ...m,
              enabled: true,
              params: {
                orbitRateHz: 0.09,
                panDepth: 0.94,
                haasDelayMs: 0.45,
                rearHeadLowpassHz: 5800,
                bassMonoCrossoverHz: 120,
              },
            };
            if (m.id === "reverb") return {
              ...m,
              enabled: true,
              wetDry: 0.631,
              params: {
                preset: "slowed-reverb-8d-hypnotic",
                reverberance: 56,
                roomScale: 100,
                hfDamping: 70,
                preDelayMs: 28,
                stereoDepth: 100,
                wetGainDb: -4.0,
                wetHighPassHz: 150,
              },
            };
            if (m.id === "master-limiter") return { ...m, enabled: true, params: { ceilingDb: -0.5 } };
            return { ...m, enabled: false };
          }),
        }));
        break;

      case "slowed-reverb-phonk":
        setConfig((prev) => ({
          ...prev,
          modules: prev.modules.map((m) => {
            if (m.id === "tempo-changer") return { ...m, enabled: true, params: { tempo: 0.84, preservePitch: false } };
            if (m.id === "reverb") return {
              ...m,
              enabled: true,
              wetDry: 0.668,
              params: {
                preset: "slowed-reverb-phonk",
                reverberance: 58,
                roomScale: 100,
                hfDamping: 70,
                preDelayMs: 25,
                stereoDepth: 100,
                wetGainDb: -3.5,
                wetHighPassHz: 150,
              },
            };
            if (m.id === "master-limiter") return { ...m, enabled: true, params: { ceilingDb: -0.5 } };
            return { ...m, enabled: false };
          }),
        }));
        break;

      case "analog-warmth":
        setConfig((prev) => ({
          ...prev,
          modules: prev.modules.map((m) => {
            if (m.id === "pre-amp") return { ...m, enabled: true, params: { highpassHz: 28, gainDb: 0.5 } };
            if (m.id === "saturation") return { ...m, enabled: true, params: { warmth: 0.6 } };
            if (m.id === "equalizer") return { ...m, enabled: true, params: { gains: [2, 1, 0, 0, 1, 2, 1, 0, 2, 3] } };
            if (m.id === "master-limiter") return { ...m, enabled: true, params: { ceilingDb: -0.3 } };
            return { ...m, enabled: false };
          }),
        }));
        break;

      case "club-banger":
        setConfig((prev) => ({
          ...prev,
          modules: prev.modules.map((m) => {
            if (m.id === "bass-booster") return { ...m, enabled: true, params: { tier: 4, cutoff: 80, clarity: true } };
            if (m.id === "stereo-imager") return { ...m, enabled: true, params: { width: 1.4 } };
            if (m.id === "equalizer") return { ...m, enabled: true, params: { gains: [6, 4, 2, 0, -1, 1, 2, 3, 4, 4] } };
            if (m.id === "master-limiter") return { ...m, enabled: true, params: { ceilingDb: -0.1 } };
            return { ...m, enabled: false };
          }),
        }));
        break;

      case "spatial-dream":
        setConfig((prev) => ({
          ...prev,
          modules: prev.modules.map((m) => {
            if (m.id === "stereo-imager") return { ...m, enabled: true, params: { width: 1.6 } };
            if (m.id === "reverb") return { ...m, enabled: true, wetDry: 0.45, params: { preset: "large-room" } };
            if (m.id === "saturation") return { ...m, enabled: true, params: { warmth: 0.3 } };
            if (m.id === "master-limiter") return { ...m, enabled: true, params: { ceilingDb: -0.5 } };
            return { ...m, enabled: false };
          }),
        }));
        break;

      case "reset-clean":
        setConfig({
          ...DEFAULT_FX_RACK_CONFIG,
          modules: DEFAULT_FX_RACK_CONFIG.modules.map((m) => ({ ...m, params: { ...m.params } })),
        });
        break;
    }
  };

  /* Render Full Master Chain via WASM */
  const handleRenderMaster = async () => {
    if (!file || busy) return;
    void haptics.heavy();
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }

    const filters = buildFXRackFilterChain(config);

    await processAudio({
      file,
      effect: "equalizer", // Base effect placeholder
      params: {},
      outputFormat: format,
      kbps: Number(kbps),
      customFilterArgs: filters,
    });
  };

  const activeModuleCount = config.modules.filter((m) => m.enabled).length;

  return (
    <div className="space-y-6">
      {/* Rack Global HUD Header */}
      <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 backdrop-blur-2xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Layers className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold tracking-tight text-foreground">
                  Modular Multi-FX Rack
                </h3>
                <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/30">
                  {activeModuleCount} ACTIVE
                </span>
              </div>
              <p className="font-mono text-[11px] text-muted-foreground">
                Zero-latency real-time Web Audio cascade with 1-pass master export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void haptics.light();
                setConfig((c) => ({ ...c, isBypassed: !c.isBypassed }));
              }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition-all cursor-pointer ${
                config.isBypassed
                  ? "bg-destructive/20 border-destructive/50 text-destructive"
                  : "bg-secondary/80 border-border/80 text-foreground hover:bg-secondary"
              }`}
            >
              <Power className="size-3.5" />
              {config.isBypassed ? "BYPASS ON" : "BYPASS OFF"}
            </button>

            <button
              type="button"
              onClick={() => applyPreset("reset-clean")}
              className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/80 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Quick Style Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
          <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1">
            Presets:
          </span>
          <button
            type="button"
            onClick={() => applyPreset("slowed-reverb-studio")}
            className="rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 font-mono text-[11px] text-primary font-bold transition-all cursor-pointer"
          >
            Slowed + Reverb (Studio)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("8d-slowed-reverb-studio")}
            className="rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 font-mono text-[11px] text-primary font-bold transition-all cursor-pointer"
          >
            8D Spatial + Slowed & Reverb
          </button>
          <button
            type="button"
            onClick={() => applyPreset("8d-slowed-reverb-hypnotic")}
            className="rounded-lg border border-border/60 bg-secondary/60 hover:bg-secondary hover:border-primary/40 px-2.5 py-1 font-mono text-[11px] text-foreground transition-all cursor-pointer"
          >
            8D Deep Hypnotic
          </button>
          <button
            type="button"
            onClick={() => applyPreset("slowed-reverb-phonk")}
            className="rounded-lg border border-border/60 bg-secondary/60 hover:bg-secondary hover:border-primary/40 px-2.5 py-1 font-mono text-[11px] text-foreground transition-all cursor-pointer"
          >
            Deep Phonk
          </button>
          <button
            type="button"
            onClick={() => applyPreset("analog-warmth")}
            className="rounded-lg border border-border/60 bg-secondary/60 hover:bg-secondary hover:border-primary/40 px-2.5 py-1 font-mono text-[11px] text-foreground transition-all cursor-pointer"
          >
            Tape Warmth
          </button>
          <button
            type="button"
            onClick={() => applyPreset("club-banger")}
            className="rounded-lg border border-border/60 bg-secondary/60 hover:bg-secondary hover:border-primary/40 px-2.5 py-1 font-mono text-[11px] text-foreground transition-all cursor-pointer"
          >
            Club Punch & 808
          </button>
          <button
            type="button"
            onClick={() => applyPreset("spatial-dream")}
            className="rounded-lg border border-border/60 bg-secondary/60 hover:bg-secondary hover:border-primary/40 px-2.5 py-1 font-mono text-[11px] text-foreground transition-all cursor-pointer"
          >
            Spatial Immersion
          </button>
        </div>
      </div>

      {/* Rack Module Bays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config.modules.map((mod, index) => {
          const isSlotActive = mod.enabled && !config.isBypassed;
          return (
            <motion.div
              key={mod.id}
              layout
              className={`rounded-2xl border p-4 transition-all ${
                isSlotActive
                  ? "border-primary/40 bg-card/95 shadow-lg shadow-primary/5"
                  : "border-border/60 bg-card/50 opacity-75"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-secondary font-mono text-[11px] font-bold text-muted-foreground">
                    0{index + 1}
                  </span>
                  <span className="font-mono text-xs font-bold text-foreground">
                    {mod.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-all cursor-pointer ${
                    mod.enabled
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Power className="size-3" />
                  {mod.enabled ? "ACTIVE" : "STANDBY"}
                </button>
              </div>

              {/* Module Slot Interactive Parameter Controls */}
              <div className="pt-3 space-y-3">
                {mod.id === "tempo-changer" && (
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">Playback Speed / Tempo:</span>
                      <span className="text-primary font-bold">{(mod.params.tempo || 0.87).toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.4}
                      step={0.01}
                      value={mod.params.tempo || 0.87}
                      onChange={(e) => updateModuleParam(mod.id, "tempo", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                    />
                    <div className="flex items-center justify-between font-mono text-[11px] pt-1">
                      <span className="text-muted-foreground">Preserve Pitch:</span>
                      <button
                        type="button"
                        onClick={() => updateModuleParam(mod.id, "preservePitch", !mod.params.preservePitch)}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold border transition-colors cursor-pointer ${
                          mod.params.preservePitch
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-secondary border-border text-muted-foreground"
                        }`}
                      >
                        {mod.params.preservePitch ? "ON (Granular)" : "OFF (Analog Tape Drop)"}
                      </button>
                    </div>
                  </div>
                )}

                {mod.id === "pre-amp" && (
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">Subsonic DC Filter:</span>
                      <span className="text-primary font-bold">{mod.params.highpassHz || 25} Hz</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={80}
                      step={5}
                      value={mod.params.highpassHz || 25}
                      onChange={(e) => updateModuleParam(mod.id, "highpassHz", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {mod.id === "bass-booster" && (
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">Boost Power Tier:</span>
                      <span className="text-primary font-bold">Tier {mod.params.tier || 3}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => updateModuleParam(mod.id, "tier", t)}
                          className={`rounded-lg py-1 font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                            mod.params.tier === t
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-secondary/70 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          T{t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mod.id === "equalizer" && (
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">10-Band EQ Curve:</span>
                      <button
                        type="button"
                        onClick={() => updateModuleParam(mod.id, "gains", [0, 0, 0, 0, 0, 0, 0, 0, 0, 0])}
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                      >
                        Reset Flat
                      </button>
                    </div>
                    <div className="grid grid-cols-10 gap-1 pt-1">
                      {ISO_10_BAND_FREQUENCIES.map((freq, i) => {
                        const gains = mod.params.gains || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                        const g = gains[i] || 0;
                        return (
                          <div key={freq} className="flex flex-col items-center gap-1">
                            <input
                              type="range"
                              min={-12}
                              max={12}
                              step={1}
                              value={g}
                              onChange={(e) => {
                                const next = [...gains];
                                next[i] = Number(e.target.value);
                                updateModuleParam(mod.id, "gains", next);
                              }}
                              className="h-14 -rotate-90 w-14 accent-primary cursor-pointer"
                            />
                            <span className="font-mono text-[9px] text-muted-foreground pt-4">
                              {freq >= 1000 ? `${freq / 1000}k` : freq}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {mod.id === "saturation" && (
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">Analog Tape Saturation:</span>
                      <span className="text-primary font-bold">
                        {Math.round((mod.params.warmth ?? 0.35) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={mod.params.warmth ?? 0.35}
                      onChange={(e) => updateModuleParam(mod.id, "warmth", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {mod.id === "stereo-imager" && (
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">Stereo Width Factor:</span>
                      <span className="text-primary font-bold">
                        {Math.round((mod.params.width ?? 1.25) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={mod.params.width ?? 1.25}
                      onChange={(e) => updateModuleParam(mod.id, "width", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                    />
                  </div>
                )}

                {mod.id === "spatial-8d" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-muted-foreground">360° Orbit Speed:</span>
                        <span className="text-primary font-bold">
                          {mod.params.orbitRateHz ?? 0.12} Hz ({(1 / (mod.params.orbitRateHz || 0.12)).toFixed(1)}s orbit)
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.05}
                        max={0.4}
                        step={0.01}
                        value={mod.params.orbitRateHz ?? 0.12}
                        onChange={(e) => updateModuleParam(mod.id, "orbitRateHz", Number(e.target.value))}
                        className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-muted-foreground">Pan Depth / Width:</span>
                        <span className="text-primary font-bold">
                          {Math.round((mod.params.panDepth ?? 0.88) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={1.0}
                        step={0.02}
                        value={mod.params.panDepth ?? 0.88}
                        onChange={(e) => updateModuleParam(mod.id, "panDepth", Number(e.target.value))}
                        className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div>
                        <span className="text-muted-foreground">Haas Delay:</span>
                        <span className="text-foreground font-semibold ml-1">{mod.params.haasDelayMs ?? 0.35}ms</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Bass Mono Cut:</span>
                        <span className="text-foreground font-semibold ml-1">{mod.params.bassMonoCrossoverHz ?? 120}Hz</span>
                      </div>
                    </div>
                  </div>
                )}

                {mod.id === "reverb" && (
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">Space Dimension:</span>
                      <span className="text-primary font-bold uppercase">{mod.params.preset || "medium-room"}</span>
                    </div>
                    <select
                      value={mod.params.preset || "medium-room"}
                      onChange={(e) => updateModuleParam(mod.id, "preset", e.target.value)}
                      className="w-full bg-secondary/80 border border-border rounded-xl p-2 font-mono text-xs text-foreground"
                    >
                      <option value="small-room">Small Room</option>
                      <option value="medium-room">Medium Room</option>
                      <option value="large-hall">Large Hall</option>
                      <option value="church-hall">Cathedral Echo</option>
                      <option value="slowed-reverb">Slowed & Ambient (Studio Balanced)</option>
                      <option value="slowed-reverb-phonk">Slowed & Reverb (Deep Phonk)</option>
                      <option value="slowed-reverb-8d">8D Slowed & Reverb (35ms Pre-Delay)</option>
                      <option value="slowed-reverb-8d-hypnotic">8D Deep Hypnotic Reverb</option>
                    </select>

                    {(mod.params.preset?.startsWith("slowed-reverb") || mod.params.preDelayMs !== undefined) && (
                      <div className="pt-2 space-y-2 border-t border-border/40">
                        <div className="flex justify-between font-mono text-[10px]">
                          <span className="text-muted-foreground">Pre-Delay:</span>
                          <span className="text-primary font-bold">{mod.params.preDelayMs ?? 35} ms</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          step={1}
                          value={mod.params.preDelayMs ?? 35}
                          onChange={(e) => updateModuleParam(mod.id, "preDelayMs", Number(e.target.value))}
                          className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                        />

                        <div className="flex justify-between font-mono text-[10px]">
                          <span className="text-muted-foreground">HF Damping (Roll-off):</span>
                          <span className="text-primary font-bold">{mod.params.hfDamping ?? 65}% (~4.8kHz)</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={mod.params.hfDamping ?? 65}
                          onChange={(e) => updateModuleParam(mod.id, "hfDamping", Number(e.target.value))}
                          className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                        />

                        <div className="flex justify-between font-mono text-[10px]">
                          <span className="text-muted-foreground">Wet High-Pass Cut:</span>
                          <span className="text-primary font-bold">{mod.params.wetHighPassHz ?? 140} Hz</span>
                        </div>
                        <input
                          type="range"
                          min={60}
                          max={250}
                          step={5}
                          value={mod.params.wetHighPassHz ?? 140}
                          onChange={(e) => updateModuleParam(mod.id, "wetHighPassHz", Number(e.target.value))}
                          className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                        />

                        <div className="flex justify-between font-mono text-[10px]">
                          <span className="text-muted-foreground">Wet Gain:</span>
                          <span className="text-primary font-bold">{mod.params.wetGainDb ?? -5.0} dB</span>
                        </div>
                        <input
                          type="range"
                          min={-12.0}
                          max={0.0}
                          step={0.5}
                          value={mod.params.wetGainDb ?? -5.0}
                          onChange={(e) => updateModuleParam(mod.id, "wetGainDb", Number(e.target.value))}
                          className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                )}

                {mod.id === "master-limiter" && (
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-muted-foreground">True-Peak Ceiling:</span>
                      <span className="text-primary font-bold">{mod.params.ceilingDb ?? -0.2} dBFS</span>
                    </div>
                    <input
                      type="range"
                      min={-2.0}
                      max={-0.1}
                      step={0.1}
                      value={mod.params.ceilingDb ?? -0.2}
                      onChange={(e) => updateModuleParam(mod.id, "ceilingDb", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Master Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!file}
            className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 font-mono text-xs font-bold text-foreground hover:bg-secondary/80 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPlaying ? <Pause className="size-4 text-primary" /> : <Play className="size-4 text-primary" />}
            {isPlaying ? "Pause Audition" : "Audition Rack"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleRenderMaster}
          disabled={!file || busy}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
        >
          <Download className="size-4" />
          {busy ? currentPassLabel || "Rendering Master..." : "Render Master FX Chain"}
        </button>
      </div>

      {/* Result Output Card */}
      {result && (
        <div className="pt-4">
          <OutputCard output={result} />
        </div>
      )}
    </div>
  );
}
