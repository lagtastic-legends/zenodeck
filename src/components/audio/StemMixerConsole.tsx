"use client";

/**
 * ZenoDeck — 4-Track Stem Separation & Mixing Console
 * ====================================================
 * Interactive 4-channel audio mixing desk providing solo/mute,
 * independent gain and panning for Vocals, Bass, Drums, and Instruments,
 * with real-time Web Audio API monitoring and single-pass WASM export.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Disc,
  Music,
  Sliders,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sparkles,
  Waves,
} from "lucide-react";
import {
  StemType,
  StemMixerState,
  AudioFormat,
} from "@/lib/audio/dsp-types";
import {
  STEM_DEFINITIONS,
  DEFAULT_STEM_MIXER_STATE,
  buildSingleStemFilter,
  createStemMixerWebAudioNodes,
} from "@/lib/audio/stem-separator";
import { useAudioProcessor } from "@/hooks/useAudioProcessor";
import { useHaptics } from "@/hooks/use-haptics";
import { OutputCard } from "@/components/media/output-card";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";

interface StemMixerConsoleProps {
  file: File | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  format: AudioFormat;
  kbps: string;
}

const STEM_ICONS: Record<StemType, typeof Mic> = {
  vocals: Mic,
  bass: Waves,
  drums: Disc,
  instruments: Music,
};

export function StemMixerConsole({
  file,
  audioRef,
  isPlaying,
  onTogglePlay,
  format,
  kbps,
}: StemMixerConsoleProps) {
  const haptics = useHaptics();
  const [mixer, setMixer] = useState<StemMixerState>(() => ({
    ...DEFAULT_STEM_MIXER_STATE,
    tracks: {
      vocals: { ...DEFAULT_STEM_MIXER_STATE.tracks.vocals },
      bass: { ...DEFAULT_STEM_MIXER_STATE.tracks.bass },
      drums: { ...DEFAULT_STEM_MIXER_STATE.tracks.drums },
      instruments: { ...DEFAULT_STEM_MIXER_STATE.tracks.instruments },
    },
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

  /* Web Audio Real-Time Stem Nodes */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const stemNodesRef = useRef<any>(null);

  const connectWebAudioMixer = useCallback(() => {
    if (!audioRef.current || typeof window === "undefined") return;

    try {
      if (stemNodesRef.current?.cleanup) {
        stemNodesRef.current.cleanup();
        stemNodesRef.current = null;
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

      const nodes = createStemMixerWebAudioNodes(ctx, source);
      nodes.masterGain.connect(ctx.destination);
      stemNodesRef.current = nodes;

      // Apply initial gains & pans
      updateLiveStemParams();
    } catch {}
  }, [audioRef]);

  const updateLiveStemParams = useCallback(() => {
    if (!stemNodesRef.current) return;
    const { stemGains, stemPanners, masterGain } = stemNodesRef.current;

    // Check if any track is soloed
    const hasSolo = Object.values(mixer.tracks).some((t) => t.soloed);

    (Object.keys(mixer.tracks) as StemType[]).forEach((stemKey) => {
      const track = mixer.tracks[stemKey];
      const gainNode = stemGains[stemKey];
      const panNode = stemPanners[stemKey];
      if (!gainNode || !panNode) return;

      const isAudible = hasSolo ? track.soloed : !track.muted;
      const targetGain = isAudible ? Math.pow(10, track.volumeDb / 20) : 0;
      gainNode.gain.setTargetAtTime(targetGain, 0, 0.02);
      panNode.pan.setTargetAtTime(track.pan, 0, 0.02);
    });

    masterGain.gain.setTargetAtTime(Math.pow(10, mixer.masterVolumeDb / 20), 0, 0.02);
  }, [mixer]);

  useEffect(() => {
    if (isPlaying) {
      connectWebAudioMixer();
    }
    return () => {
      if (stemNodesRef.current?.cleanup) {
        stemNodesRef.current.cleanup();
        stemNodesRef.current = null;
      }
    };
  }, [isPlaying, connectWebAudioMixer]);

  useEffect(() => {
    updateLiveStemParams();
  }, [mixer, updateLiveStemParams]);

  /* Track Control Toggles */
  const toggleMute = (stem: StemType) => {
    void haptics.light();
    setMixer((prev) => ({
      ...prev,
      tracks: {
        ...prev.tracks,
        [stem]: { ...prev.tracks[stem], muted: !prev.tracks[stem].muted },
      },
    }));
  };

  const toggleSolo = (stem: StemType) => {
    void haptics.light();
    setMixer((prev) => ({
      ...prev,
      tracks: {
        ...prev.tracks,
        [stem]: { ...prev.tracks[stem], soloed: !prev.tracks[stem].soloed },
      },
    }));
  };

  const updateTrackVolume = (stem: StemType, vol: number) => {
    setMixer((prev) => ({
      ...prev,
      tracks: {
        ...prev.tracks,
        [stem]: { ...prev.tracks[stem], volumeDb: vol },
      },
    }));
  };

  const updateTrackPan = (stem: StemType, panVal: number) => {
    setMixer((prev) => ({
      ...prev,
      tracks: {
        ...prev.tracks,
        [stem]: { ...prev.tracks[stem], pan: panVal },
      },
    }));
  };

  /* Quick Macro Presets */
  const applyMacro = (macro: "karaoke" | "acapella" | "bass-solo" | "reset") => {
    void haptics.medium();
    switch (macro) {
      case "karaoke":
        setMixer((prev) => ({
          ...prev,
          tracks: {
            ...prev.tracks,
            vocals: { ...prev.tracks.vocals, muted: true, soloed: false },
            bass: { ...prev.tracks.bass, muted: false, soloed: false },
            drums: { ...prev.tracks.drums, muted: false, soloed: false },
            instruments: { ...prev.tracks.instruments, muted: false, soloed: false },
          },
        }));
        break;

      case "acapella":
        setMixer((prev) => ({
          ...prev,
          tracks: {
            ...prev.tracks,
            vocals: { ...prev.tracks.vocals, muted: false, soloed: true },
            bass: { ...prev.tracks.bass, muted: false, soloed: false },
            drums: { ...prev.tracks.drums, muted: false, soloed: false },
            instruments: { ...prev.tracks.instruments, muted: false, soloed: false },
          },
        }));
        break;

      case "bass-solo":
        setMixer((prev) => ({
          ...prev,
          tracks: {
            ...prev.tracks,
            vocals: { ...prev.tracks.vocals, muted: false, soloed: false },
            bass: { ...prev.tracks.bass, muted: false, soloed: true },
            drums: { ...prev.tracks.drums, muted: false, soloed: false },
            instruments: { ...prev.tracks.instruments, muted: false, soloed: false },
          },
        }));
        break;

      case "reset":
        setMixer({
          ...DEFAULT_STEM_MIXER_STATE,
          tracks: {
            vocals: { ...DEFAULT_STEM_MIXER_STATE.tracks.vocals },
            bass: { ...DEFAULT_STEM_MIXER_STATE.tracks.bass },
            drums: { ...DEFAULT_STEM_MIXER_STATE.tracks.drums },
            instruments: { ...DEFAULT_STEM_MIXER_STATE.tracks.instruments },
          },
        });
        break;
    }
  };

  /* Export Single Stem via WASM */
  const handleExportSingleStem = async (stem: StemType) => {
    if (!file || busy) return;
    void haptics.medium();
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }

    const filters = buildSingleStemFilter(stem);

    await processAudio({
      file,
      effect: "equalizer",
      params: {},
      outputFormat: format,
      kbps: Number(kbps),
      sampleRate: 44100,
      customFilterArgs: filters,
    });
  };

  return (
    <div className="space-y-6">
      {/* Mixer HUD Header */}
      <div className="rounded-2xl border border-border/80 bg-card/90 p-4 sm:p-5 backdrop-blur-2xl shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
              <Sliders className="size-5" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold tracking-tight text-foreground">
                4-Track Stem Separation & Console
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground">
                Acoustic decomposition into Vocals, Bass, Drums, and Instruments
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyMacro("karaoke")}
              className="rounded-xl border border-border/80 bg-secondary/80 px-3 py-1.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer"
            >
              🎤 Karaoke Cut
            </button>
            <button
              type="button"
              onClick={() => applyMacro("acapella")}
              className="rounded-xl border border-border/80 bg-secondary/80 px-3 py-1.5 font-mono text-xs font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer"
            >
              🎙️ Acapella Solo
            </button>
            <button
              type="button"
              onClick={() => applyMacro("reset")}
              className="rounded-xl border border-border/80 bg-secondary/80 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4-Channel Mixer Console Bay */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(mixer.tracks) as StemType[]).map((stemKey) => {
          const track = mixer.tracks[stemKey];
          const def = STEM_DEFINITIONS[stemKey];
          const Icon = STEM_ICONS[stemKey];
          const isSoloed = track.soloed;
          const isMuted = track.muted;

          return (
            <motion.div
              key={stemKey}
              layout
              className={`rounded-2xl border p-4 backdrop-blur-xl transition-all space-y-4 ${
                isSoloed
                  ? "border-primary bg-card/95 shadow-lg shadow-primary/10"
                  : isMuted
                  ? "border-border/40 bg-card/40 opacity-60"
                  : "border-border/70 bg-card/85"
              }`}
            >
              {/* Channel Header */}
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div
                    className="flex size-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${def.color}25`, color: def.color }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs font-bold text-foreground">
                      {def.label}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleSolo(stemKey)}
                    className={`size-6 rounded-md font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                      isSoloed
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/80 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    S
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMute(stemKey)}
                    className={`size-6 rounded-md font-mono text-[10px] font-bold border transition-all cursor-pointer ${
                      isMuted
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "bg-secondary/80 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    M
                  </button>
                </div>
              </div>

              {/* Volume Fader */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-muted-foreground">Level Fader:</span>
                  <span className="font-bold text-foreground">
                    {track.volumeDb > 0 ? `+${track.volumeDb}` : track.volumeDb} dB
                  </span>
                </div>
                <input
                  type="range"
                  min={-36}
                  max={6}
                  step={0.5}
                  value={track.volumeDb}
                  onChange={(e) => updateTrackVolume(stemKey, Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                />
              </div>

              {/* Stereo Pan Control */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-muted-foreground">Stereo Pan:</span>
                  <span className="font-bold text-muted-foreground">
                    {track.pan === 0 ? "Center (C)" : track.pan < 0 ? `L ${Math.abs(Math.round(track.pan * 100))}%` : `R ${Math.round(track.pan * 100)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={track.pan}
                  onChange={(e) => updateTrackPan(stemKey, Number(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                />
              </div>

              {/* Single Stem Direct Export Button */}
              <button
                type="button"
                onClick={() => handleExportSingleStem(stemKey)}
                disabled={!file || busy}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-secondary/80 hover:bg-secondary py-2 font-mono text-[11px] font-bold text-foreground transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="size-3 text-primary" />
                Export {def.label} Stem
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Global Master Transport Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={!file}
            className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 font-mono text-xs font-bold text-foreground hover:bg-secondary/80 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPlaying ? <Pause className="size-4 text-primary" /> : <Play className="size-4 text-primary" />}
            {isPlaying ? "Pause Audition" : "Audition Stems"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleExportSingleStem("vocals")}
          disabled={!file || busy}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
        >
          <Download className="size-4" />
          {busy ? currentPassLabel || "Rendering Stem..." : "Export Isolated Stem"}
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
