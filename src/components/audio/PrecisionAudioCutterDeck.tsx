"use client";

/**
 * ZenoDeck — Precision Audio Waveform Cutter & Splicer Deck
 * ==========================================================
 * Professional studio-grade audio cutting, trimming, splicing, and muting workstation.
 * Features:
 * - Dynamic adaptive time formatting (MM:SS.ss for < 1hr, HH:MM:SS.ss for >= 1hr)
 * - Full track access without duration caps (handles tracks from seconds to 5+ hours)
 * - Dual visual range scrubber with draggable in/out handles & playhead needle
 * - Direct segmented time inputs (HH : MM : SS . ms) with keyboard and stepper control
 * - Multi-tier micro-nudging (-1s, -100ms, +100ms, +1s) & quick-snap markers
 * - 4 cutout action modes: Keep (Trim), Cut (Splice), Silence (Mute), and Envelope (Fade)
 * - Studio S-curve acoustic fades and lookahead peak limiter boost
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Scissors,
  Repeat,
  Magnet,
  Minus,
  Plus,
  VolumeX,
  Volume2,
  Sparkles,
  Check,
  Clock,
  Layers,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronUp,
  ChevronDown,
  Crosshair,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { useHaptics } from "@/hooks/use-haptics";
import {
  formatAdaptiveTimestamp,
  splitSecondsToComponents,
  parseTimestampToSeconds,
  type TimestampComponents,
} from "@/lib/audio-dsp";

interface TimeDigitSegmentProps {
  label: string;
  value: number;
  digits?: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  accent?: "emerald" | "rose" | "primary";
}

function TimeDigitSegment({
  label,
  value,
  digits = 2,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  accent = "primary",
}: TimeDigitSegmentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(String(value).padStart(digits, "0"));

  useEffect(() => {
    if (!isEditing) {
      setLocalText(String(value).padStart(digits, "0"));
    }
  }, [value, digits, isEditing]);

  const handleIncrement = () => {
    if (disabled) return;
    const next = value + step > max ? min : value + step;
    onChange(next);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const next = value - step < min ? max : value - step;
    onChange(next);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseInt(localText, 10);
    if (isNaN(parsed)) {
      setLocalText(String(value).padStart(digits, "0"));
    } else {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setLocalText(String(clamped).padStart(digits, "0"));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      handleDecrement();
    } else if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const accentRing =
    accent === "emerald"
      ? "focus-within:border-emerald-500/80 focus-within:ring-2 focus-within:ring-emerald-500/25 text-emerald-300"
      : accent === "rose"
      ? "focus-within:border-rose-500/80 focus-within:ring-2 focus-within:ring-rose-500/25 text-rose-300"
      : "focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/25 text-primary";

  return (
    <div className="flex flex-col items-center select-none group">
      {/* Up Stepper Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled}
        aria-label={`Increment ${label}`}
        className="w-11 sm:w-13 h-5 flex items-center justify-center rounded-t-md bg-secondary/40 hover:bg-secondary/80 border border-b-0 border-border/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-40 active:scale-95"
      >
        <ChevronUp className="size-3.5" />
      </button>

      {/* Digit Display Box */}
      <div
        className={`w-11 sm:w-13 h-10 flex items-center justify-center bg-[#090D0C] border border-border/70 ${accentRing} transition-all relative`}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={isEditing ? localText : String(value).padStart(digits, "0")}
          onFocus={(e) => {
            setIsEditing(true);
            e.target.select();
          }}
          onChange={(e) => setLocalText(e.target.value.replace(/\D/g, "").slice(0, digits))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={label}
          className="w-full h-full text-center bg-transparent font-mono text-base sm:text-lg font-black tracking-widest text-foreground focus:outline-hidden tabular-nums"
        />
      </div>

      {/* Down Stepper Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled}
        aria-label={`Decrement ${label}`}
        className="w-11 sm:w-13 h-5 flex items-center justify-center rounded-b-md bg-secondary/40 hover:bg-secondary/80 border border-t-0 border-border/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-40 active:scale-95"
      >
        <ChevronDown className="size-3.5" />
      </button>

      {/* Label (HR / MIN / SEC / MS) */}
      <span className="font-mono text-[9px] font-bold text-muted-foreground tracking-wider uppercase mt-1">
        {label}
      </span>
    </div>
  );
}

export interface PrecisionAudioCutterDeckProps {
  duration: number;
  currentTime: number;
  params: Record<string, any>;
  updateParam: (key: string, value: any) => void;
  setParams: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  loopRegion: boolean;
  setLoopRegion: (loop: boolean) => void;
  onSeek: (time: number) => void;
  busy?: boolean;
}

export function PrecisionAudioCutterDeck({
  duration,
  currentTime,
  params,
  updateParam,
  setParams,
  loopRegion,
  setLoopRegion,
  onSeek,
  busy = false,
}: PrecisionAudioCutterDeckProps) {
  const haptics = useHaptics();
  const trackRef = useRef<HTMLDivElement>(null);

  const startSec = Math.max(0, Number(params.startSec || 0));
  const effectiveDuration = Math.max(duration || 30, startSec + 0.1);
  const endSec = Math.min(effectiveDuration, Math.max(startSec + 0.05, Number(params.endSec ?? effectiveDuration)));
  const cutMode = (params.cutMode as "keep" | "cut" | "silence" | "fade_only") || "keep";
  const fadeInSec = Number(params.fadeInSec || 0);
  const fadeOutSec = Number(params.fadeOutSec || 0);
  const boostDb = Number(params.boostDb || 0);

  const isLongAudio = duration >= 3600;
  const [showHours, setShowHours] = useState(false);

  // Active dragging handle ("start" | "end" | "playhead" | null)
  const [draggingHandle, setDraggingHandle] = useState<"start" | "end" | "playhead" | null>(null);

  // Clamping helper
  const clampTime = useCallback(
    (t: number) => Math.max(0, Math.min(effectiveDuration, t)),
    [effectiveDuration]
  );

  // Direct Time Inputs Local State
  const startComponents = useMemo(() => splitSecondsToComponents(startSec), [startSec]);
  const endComponents = useMemo(() => splitSecondsToComponents(endSec), [endSec]);
  const displayHours = isLongAudio || startComponents.hours > 0 || endComponents.hours > 0 || showHours;

  // Update Start Cutpoint safely
  const updateStartCutpoint = useCallback(
    (newSec: number) => {
      const clamped = Math.max(0, Math.min(endSec - 0.05, newSec));
      updateParam("startSec", Math.round(clamped * 100) / 100);
      onSeek(clamped);
    },
    [endSec, updateParam, onSeek]
  );

  // Update End Cutpoint safely
  const updateEndCutpoint = useCallback(
    (newSec: number) => {
      const clamped = Math.min(effectiveDuration, Math.max(startSec + 0.05, newSec));
      updateParam("endSec", Math.round(clamped * 100) / 100);
    },
    [effectiveDuration, startSec, updateParam]
  );

  // Nudge Helpers
  const nudgeStart = (deltaSec: number) => {
    void haptics.light();
    updateStartCutpoint(startSec + deltaSec);
  };

  const nudgeEnd = (deltaSec: number) => {
    void haptics.light();
    updateEndCutpoint(endSec + deltaSec);
  };

  // Direct component update for Start
  const handleStartComponentChange = (field: keyof TimestampComponents, val: number) => {
    const next = { ...startComponents, [field]: Math.max(0, val) };
    const sec = parseTimestampToSeconds(next);
    updateStartCutpoint(sec);
  };

  // Direct component update for End
  const handleEndComponentChange = (field: keyof TimestampComponents, val: number) => {
    const next = { ...endComponents, [field]: Math.max(0, val) };
    const sec = parseTimestampToSeconds(next);
    updateEndCutpoint(sec);
  };

  // Scrubber drag / pointer interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busy || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * effectiveDuration;

    // Detect which handle is closer or if tapped outside
    const distToStart = Math.abs(targetSec - startSec);
    const distToEnd = Math.abs(targetSec - endSec);
    const thresholdSec = (20 / rect.width) * effectiveDuration;

    if (distToStart < thresholdSec && distToStart <= distToEnd) {
      setDraggingHandle("start");
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (distToEnd < thresholdSec) {
      setDraggingHandle("end");
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      // Direct seek or quick placement
      onSeek(targetSec);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingHandle || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSec = ratio * effectiveDuration;

    if (draggingHandle === "start") {
      updateStartCutpoint(targetSec);
    } else if (draggingHandle === "end") {
      updateEndCutpoint(targetSec);
    }
  };

  const handlePointerUp = () => {
    if (draggingHandle) {
      void haptics.selectionChanged();
      setDraggingHandle(null);
    }
  };

  // Zero-crossing snap (snap to nearest 100ms or 50ms)
  const handleZeroSnap = () => {
    void haptics.light();
    const s = Math.round(startSec * 10) / 10;
    const e = Math.round(endSec * 10) / 10;
    setParams((prev) => ({ ...prev, startSec: s, endSec: Math.max(s + 0.1, e) }));
  };

  // Quick Range Presets
  const applyPresetRange = (preset: "full" | "first30" | "first60" | "last30" | "center50") => {
    void haptics.medium();
    switch (preset) {
      case "full":
        setParams((prev) => ({ ...prev, startSec: 0, endSec: effectiveDuration }));
        break;
      case "first30":
        setParams((prev) => ({ ...prev, startSec: 0, endSec: Math.min(30, effectiveDuration) }));
        break;
      case "first60":
        setParams((prev) => ({ ...prev, startSec: 0, endSec: Math.min(60, effectiveDuration) }));
        break;
      case "last30":
        setParams((prev) => ({
          ...prev,
          startSec: Math.max(0, effectiveDuration - 30),
          endSec: effectiveDuration,
        }));
        break;
      case "center50":
        setParams((prev) => ({
          ...prev,
          startSec: Math.round(effectiveDuration * 0.25 * 100) / 100,
          endSec: Math.round(effectiveDuration * 0.75 * 100) / 100,
        }));
        break;
    }
  };

  // Calculate resulting duration based on cut mode
  const selectionLength = Math.max(0, endSec - startSec);
  const resultDuration = useMemo(() => {
    if (cutMode === "keep") return selectionLength;
    if (cutMode === "cut") return Math.max(0.1, effectiveDuration - selectionLength);
    return effectiveDuration; // silence or fade_only preserves duration
  }, [cutMode, selectionLength, effectiveDuration]);

  // Handle position percentages for timeline
  const startPct = (startSec / effectiveDuration) * 100;
  const endPct = (endSec / effectiveDuration) * 100;
  const playheadPct = (Math.max(0, Math.min(effectiveDuration, currentTime)) / effectiveDuration) * 100;

  // Active cut mode styling & label
  const modeDetails = {
    keep: {
      label: "Keep Selection (Trim)",
      desc: "Preserves only the selected region; cuts away everything outside.",
      color: "border-primary bg-primary/20 text-primary",
      bandColor: "bg-primary/30 border-x-2 border-primary",
      badgeColor: "border-primary/50 bg-primary/15 text-primary",
    },
    cut: {
      label: "Cut Out Middle (Splice)",
      desc: "Removes selected region; splices start and tail seamlessly together.",
      color: "border-rose-500 bg-rose-500/20 text-rose-300",
      bandColor: "bg-rose-500/30 border-x-2 border-rose-500",
      badgeColor: "border-rose-500/50 bg-rose-500/15 text-rose-300",
    },
    silence: {
      label: "Mute Region (Silence)",
      desc: "Zeros audio volume in selection; preserves full track length and timing.",
      color: "border-amber-500 bg-amber-500/20 text-amber-300",
      bandColor: "bg-amber-500/30 border-x-2 border-amber-500",
      badgeColor: "border-amber-500/50 bg-amber-500/15 text-amber-300",
    },
    fade_only: {
      label: "Surgical Envelope (Fades)",
      desc: "Keeps full track; applies S-curve fade-in up to In-Point & fade-out from Out-Point.",
      color: "border-cyan-500 bg-cyan-500/20 text-cyan-300",
      bandColor: "bg-cyan-500/30 border-x-2 border-cyan-500",
      badgeColor: "border-cyan-500/50 bg-cyan-500/15 text-cyan-300",
    },
  }[cutMode];

  return (
    <div className="space-y-4">
      {/* 1. Cutter Action Mode Deck */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Scissors className="size-3.5 text-primary" />
            <span>Cutter Action Mode</span>
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {modeDetails.desc}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: "keep", label: "Keep (Trim)", icon: Scissors, desc: "Isolate Clip" },
            { id: "cut", label: "Cut (Splice)", icon: Scissors, desc: "Remove Segment", rotate: true },
            { id: "silence", label: "Mute (Silence)", icon: VolumeX, desc: "Zero Volume" },
            { id: "fade_only", label: "Envelope (Fade)", icon: Sliders, desc: "Intro/Outro" },
          ].map((mode) => {
            const isSelected = cutMode === mode.id;
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  void haptics.light();
                  updateParam("cutMode", mode.id);
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border font-mono text-xs transition-all cursor-pointer text-center ${
                  isSelected
                    ? "border-primary bg-primary/20 text-primary font-bold shadow-glow ring-1 ring-primary/40"
                    : "border-border/60 bg-background/50 text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`size-3.5 ${mode.rotate ? "rotate-180" : ""}`} />
                  <span className="font-semibold">{mode.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground/80 font-sans">
                  {mode.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Visual Dual-Range Scrubber Timeline */}
      <div className="panel-hud p-4 rounded-xl border border-border/70 bg-card/60 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
              <Clock className="size-3.5 text-primary" />
              <span>Interactive Waveform Scrubber</span>
            </span>
            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border border-primary/40 bg-primary/10 text-primary">
              Full Track: {formatAdaptiveTimestamp(effectiveDuration, { forceHours: isLongAudio })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <span>Playhead:</span>
            <strong className="text-foreground">
              {formatAdaptiveTimestamp(currentTime, { forceHours: isLongAudio })}
            </strong>
          </div>
        </div>

        {/* Dual Handle Scrubber Track */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative h-14 w-full rounded-xl bg-[#090D0C] border border-[#A79277]/40 overflow-hidden cursor-crosshair select-none touch-none"
        >
          {/* Waveform Background Simulation Grid */}
          <div className="absolute inset-0 flex items-center justify-around opacity-25 pointer-events-none px-2">
            {Array.from({ length: 48 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-[#F7E7CE] rounded-full"
                style={{
                  height: `${20 + Math.sin(i * 0.4) * 45 + ((i % 5) * 6)}%`,
                }}
              />
            ))}
          </div>

          {/* Inactive Pre-Selection Mask */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none"
            style={{ width: `${startPct}%` }}
          />

          {/* Active Cutout Region Band */}
          <div
            className={`absolute top-0 bottom-0 ${modeDetails.bandColor} transition-colors pointer-events-none`}
            style={{
              left: `${startPct}%`,
              width: `${Math.max(0.5, endPct - startPct)}%`,
            }}
          >
            {/* Center Region Label */}
            <div className="h-full flex items-center justify-center">
              <span className="font-mono text-[9px] uppercase font-bold tracking-widest text-white/90 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-xs border border-white/20">
                {cutMode === "keep" ? "KEEP REGION" : cutMode === "cut" ? "CUT REGION" : cutMode.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Inactive Post-Selection Mask */}
          <div
            className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none"
            style={{ width: `${100 - endPct}%` }}
          />

          {/* Start Cutpoint Handle (In-Point) */}
          <div
            className="absolute top-0 bottom-0 w-4 -ml-2 flex flex-col items-center justify-between cursor-ew-resize z-20 group"
            style={{ left: `${startPct}%` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#F7E7CE] border-2 border-[#102C26] shadow-md flex items-center justify-center -mt-1 group-hover:scale-125 transition-transform">
              <div className="w-1 h-1 rounded-full bg-[#102C26]" />
            </div>
            <div className="w-0.5 h-full bg-[#F7E7CE] shadow-[0_0_8px_rgba(247,231,206,0.8)]" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#F7E7CE] border-2 border-[#102C26] shadow-md flex items-center justify-center -mb-1 group-hover:scale-125 transition-transform">
              <div className="w-1 h-1 rounded-full bg-[#102C26]" />
            </div>
          </div>

          {/* End Cutpoint Handle (Out-Point) */}
          <div
            className="absolute top-0 bottom-0 w-4 -ml-2 flex flex-col items-center justify-between cursor-ew-resize z-20 group"
            style={{ left: `${endPct}%` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#F7E7CE] border-2 border-[#102C26] shadow-md flex items-center justify-center -mt-1 group-hover:scale-125 transition-transform">
              <div className="w-1 h-1 rounded-full bg-[#102C26]" />
            </div>
            <div className="w-0.5 h-full bg-[#F7E7CE] shadow-[0_0_8px_rgba(247,231,206,0.8)]" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#F7E7CE] border-2 border-[#102C26] shadow-md flex items-center justify-center -mb-1 group-hover:scale-125 transition-transform">
              <div className="w-1 h-1 rounded-full bg-[#102C26]" />
            </div>
          </div>

          {/* Live Playhead Needle */}
          <div
            className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-emerald-400 z-10 pointer-events-none shadow-[0_0_10px_rgba(52,211,153,0.9)]"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="size-2 rounded-full bg-emerald-400 -ml-0.5 -mt-0.5 animate-pulse" />
          </div>
        </div>

        {/* Dynamic Range Readout Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-background/60 border border-border/50 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Range:</span>
            <span className="text-foreground font-bold">
              {formatAdaptiveTimestamp(startSec, { forceHours: isLongAudio })} → {formatAdaptiveTimestamp(endSec, { forceHours: isLongAudio })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <span className="text-muted-foreground mr-1">Span:</span>
              <strong className="text-primary">{formatAdaptiveTimestamp(selectionLength, { forceHours: isLongAudio })}</strong>
            </div>
            <div>
              <span className="text-muted-foreground mr-1">Output Duration:</span>
              <strong className="text-emerald-400">{formatAdaptiveTimestamp(resultDuration, { forceHours: isLongAudio })}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Selected Cutout Telemetry & Play HUD */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-[#090D0C]/90 border border-[#A79277]/30 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#F7E7CE]">
            <Scissors className="size-3.5 text-primary" />
            <span>Selected Region:</span>
          </span>
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/20 text-[#F7E7CE] border border-primary/30">
            {formatAdaptiveTimestamp(selectionLength, { forceHours: displayHours })} ({selectionLength.toFixed(2)}s)
          </span>
          <span className="font-mono text-[11px] text-[#A79277] hidden sm:inline">
            ({Math.round((selectionLength / effectiveDuration) * 100)}% of total track)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void haptics.light();
              onSeek(startSec);
            }}
            className="px-3 py-1.5 rounded-lg bg-[#102C26] hover:bg-[#102C26]/80 text-[#F7E7CE] border border-[#A79277]/40 flex items-center gap-1.5 font-mono text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            title="Jump to In-Point and audition selected cut"
          >
            <Play className="size-3 text-[#F7E7CE] fill-current" />
            <span>Play Cut</span>
          </button>
          <button
            type="button"
            onClick={() => {
              void haptics.light();
              setLoopRegion(!loopRegion);
            }}
            className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
              loopRegion
                ? "border-primary bg-primary/20 text-[#F7E7CE] shadow-glow"
                : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle playback looping within selected region"
          >
            <Repeat className="size-3" />
            <span>Loop: {loopRegion ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* 4. Dual Precision Time Consoles: Start Offset vs End Timestamp */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Console A: Start Offset (In-Point) */}
        <div className="p-3.5 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 bg-card/60 space-y-3.5 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span>📍 Start Offset (In-Point)</span>
            </span>
            <div className="flex items-center gap-1.5">
              {!displayHours && (
                <button
                  type="button"
                  onClick={() => setShowHours(true)}
                  className="px-1.5 py-0.5 rounded border border-border/60 bg-secondary/30 hover:bg-secondary font-mono text-[9px] text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title="Expand to show hours"
                >
                  +HR
                </button>
              )}
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                {formatAdaptiveTimestamp(startSec, { forceHours: displayHours })}
              </span>
            </div>
          </div>

          {/* Segmented Inputs: HH : MM : SEC . MS with Micro-Steppers */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 p-3 rounded-2xl bg-[#090D0C] border border-border/70 shadow-inner">
            {displayHours && (
              <>
                <TimeDigitSegment
                  label="HR"
                  value={startComponents.hours}
                  min={0}
                  max={99}
                  onChange={(v) => handleStartComponentChange("hours", v)}
                  disabled={busy}
                  accent="emerald"
                />
                <span className="font-mono font-black text-muted-foreground text-base sm:text-lg pb-5 select-none">:</span>
              </>
            )}

            <TimeDigitSegment
              label="MIN"
              value={startComponents.minutes}
              min={0}
              max={59}
              onChange={(v) => handleStartComponentChange("minutes", v)}
              disabled={busy}
              accent="emerald"
            />
            <span className="font-mono font-black text-muted-foreground text-base sm:text-lg pb-5 select-none">:</span>

            <TimeDigitSegment
              label="SEC"
              value={startComponents.seconds}
              min={0}
              max={59}
              onChange={(v) => handleStartComponentChange("seconds", v)}
              disabled={busy}
              accent="emerald"
            />
            <span className="font-mono font-black text-muted-foreground text-base sm:text-lg pb-5 select-none">.</span>

            <TimeDigitSegment
              label="MS"
              value={Math.round(startComponents.milliseconds / 10)}
              digits={2}
              min={0}
              max={99}
              step={5}
              onChange={(v) => handleStartComponentChange("milliseconds", v * 10)}
              disabled={busy}
              accent="emerald"
            />
          </div>

          {/* Row 1: Action Triggers (Grid of 3) */}
          <div className="grid grid-cols-3 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => {
                void haptics.light();
                updateStartCutpoint(0);
              }}
              className="h-8 px-2 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary/70 font-mono text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-[0.98]"
              title="Jump to track start (00:00)"
            >
              <RotateCcw className="size-3" />
              <span>0:00</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void haptics.light();
                updateStartCutpoint(currentTime);
              }}
              className="h-8 px-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 font-mono text-[11px] font-semibold text-emerald-300 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-[0.98]"
              title="Snap In-Point to Current Playhead"
            >
              <Crosshair className="size-3" />
              <span>Playhead</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void haptics.light();
                onSeek(startSec);
              }}
              className="h-8 px-2 rounded-lg border border-emerald-500/30 bg-secondary/40 hover:bg-secondary/80 font-mono text-[11px] font-semibold text-foreground transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-[0.98]"
              title="Audition audio starting from this In-Point"
            >
              <Play className="size-3 text-emerald-400 fill-emerald-400" />
              <span>Audition</span>
            </button>
          </div>

          {/* Row 2: Micro-Nudge Grid (Grid of 4) */}
          <div className="grid grid-cols-4 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => nudgeStart(-1.0)}
              className="h-7 rounded-md bg-secondary/50 hover:bg-secondary border border-border/50 font-mono text-[10px] font-bold text-foreground transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Nudge In-Point -1.0s"
            >
              -1s
            </button>
            <button
              type="button"
              onClick={() => nudgeStart(-0.1)}
              className="h-7 rounded-md bg-secondary/50 hover:bg-secondary border border-border/50 font-mono text-[10px] font-bold text-foreground transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Nudge In-Point -100ms"
            >
              -0.1s
            </button>
            <button
              type="button"
              onClick={() => nudgeStart(0.1)}
              className="h-7 rounded-md bg-secondary/50 hover:bg-secondary border border-border/50 font-mono text-[10px] font-bold text-foreground transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Nudge In-Point +100ms"
            >
              +0.1s
            </button>
            <button
              type="button"
              onClick={() => nudgeStart(1.0)}
              className="h-7 rounded-md bg-secondary/50 hover:bg-secondary border border-border/50 font-mono text-[10px] font-bold text-foreground transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Nudge In-Point +1.0s"
            >
              +1s
            </button>
          </div>
        </div>

        {/* Console B: End Timestamp (Out-Point) */}
        <div className="p-3.5 rounded-xl border border-rose-500/30 hover:border-rose-500/50 bg-card/60 space-y-3.5 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span>🏁 End Timestamp (Out-Point)</span>
            </span>
            <div className="flex items-center gap-1.5">
              {!displayHours && (
                <button
                  type="button"
                  onClick={() => setShowHours(true)}
                  className="px-1.5 py-0.5 rounded border border-border/60 bg-secondary/30 hover:bg-secondary font-mono text-[9px] text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title="Expand to show hours"
                >
                  +HR
                </button>
              )}
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md border border-rose-500/40 bg-rose-500/15 text-rose-300">
                {formatAdaptiveTimestamp(endSec, { forceHours: displayHours })}
              </span>
            </div>
          </div>

          {/* Segmented Inputs: HH : MM : SEC . MS with Micro-Steppers */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 p-3 rounded-2xl bg-[#090D0C] border border-border/70 shadow-inner">
            {displayHours && (
              <>
                <TimeDigitSegment
                  label="HR"
                  value={endComponents.hours}
                  min={0}
                  max={99}
                  onChange={(v) => handleEndComponentChange("hours", v)}
                  disabled={busy}
                  accent="rose"
                />
                <span className="font-mono font-black text-muted-foreground text-base sm:text-lg pb-5 select-none">:</span>
              </>
            )}

            <TimeDigitSegment
              label="MIN"
              value={endComponents.minutes}
              min={0}
              max={59}
              onChange={(v) => handleEndComponentChange("minutes", v)}
              disabled={busy}
              accent="rose"
            />
            <span className="font-mono font-black text-muted-foreground text-base sm:text-lg pb-5 select-none">:</span>

            <TimeDigitSegment
              label="SEC"
              value={endComponents.seconds}
              min={0}
              max={59}
              onChange={(v) => handleEndComponentChange("seconds", v)}
              disabled={busy}
              accent="rose"
            />
            <span className="font-mono font-black text-muted-foreground text-base sm:text-lg pb-5 select-none">.</span>

            <TimeDigitSegment
              label="MS"
              value={Math.round(endComponents.milliseconds / 10)}
              digits={2}
              min={0}
              max={99}
              step={5}
              onChange={(v) => handleEndComponentChange("milliseconds", v * 10)}
              disabled={busy}
              accent="rose"
            />
          </div>

          {/* Row 1: Action Triggers (Grid of 3) */}
          <div className="grid grid-cols-3 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => {
                void haptics.light();
                updateEndCutpoint(currentTime);
              }}
              className="h-8 px-2 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 font-mono text-[11px] font-semibold text-rose-300 transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-[0.98]"
              title="Snap Out-Point to Current Playhead"
            >
              <Crosshair className="size-3" />
              <span>Playhead</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void haptics.light();
                updateEndCutpoint(effectiveDuration);
              }}
              className="h-8 px-2 rounded-lg border border-border/60 bg-secondary/30 hover:bg-secondary/70 font-mono text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-[0.98]"
              title="Snap Out-Point to Full Track End"
            >
              <ChevronsRight className="size-3" />
              <span>Full End</span>
            </button>

            <button
              type="button"
              onClick={() => {
                void haptics.light();
                onSeek(Math.max(0, endSec - 2.0));
              }}
              className="h-8 px-2 rounded-lg border border-rose-500/30 bg-secondary/40 hover:bg-secondary/80 font-mono text-[11px] font-semibold text-foreground transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-[0.98]"
              title="Audition tail audio leading up to Out-Point"
            >
              <Play className="size-3 text-rose-400 fill-rose-400" />
              <span>Audition</span>
            </button>
          </div>

          {/* Row 2: Micro-Nudge Grid (Grid of 4) */}
          <div className="grid grid-cols-4 gap-1.5 w-full">
            <button
              type="button"
              onClick={() => nudgeEnd(-1.0)}
              className="h-7 rounded-md bg-secondary/50 hover:bg-secondary border border-border/50 font-mono text-[10px] font-bold text-foreground transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Nudge Out-Point -1.0s"
            >
              -1s
            </button>
            <button
              type="button"
              onClick={() => nudgeEnd(-0.1)}
              className="h-7 rounded-md bg-secondary/50 hover:bg-secondary border border-border/50 font-mono text-[10px] font-bold text-foreground transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Nudge Out-Point -100ms"
            >
              -0.1s
            </button>
            <button
              type="button"
              onClick={() => nudgeEnd(0.1)}
              className="h-7 rounded-md bg-secondary/50 hover:bg-secondary border border-border/50 font-mono text-[10px] font-bold text-foreground transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Nudge Out-Point +100ms"
            >
              +0.1s
            </button>
            <button
              type="button"
              onClick={() => nudgeEnd(1.0)}
              className="h-7 rounded-md bg-secondary/50 hover:bg-secondary border border-border/50 font-mono text-[10px] font-bold text-foreground transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Nudge Out-Point +1.0s"
            >
              +1s
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Selection Presets & Micro-Step Utility Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-background/40 border border-border/50">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase text-muted-foreground mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => applyPresetRange("full")}
            className="px-2 py-1 rounded-md border border-border/60 bg-background text-[10px] font-mono text-foreground hover:border-primary/50 transition-all cursor-pointer"
          >
            Full Track
          </button>
          <button
            type="button"
            onClick={() => applyPresetRange("first30")}
            className="px-2 py-1 rounded-md border border-border/60 bg-background text-[10px] font-mono text-foreground hover:border-primary/50 transition-all cursor-pointer"
          >
            First 30s
          </button>
          <button
            type="button"
            onClick={() => applyPresetRange("first60")}
            className="px-2 py-1 rounded-md border border-border/60 bg-background text-[10px] font-mono text-foreground hover:border-primary/50 transition-all cursor-pointer"
          >
            First 60s
          </button>
          <button
            type="button"
            onClick={() => applyPresetRange("last30")}
            className="px-2 py-1 rounded-md border border-border/60 bg-background text-[10px] font-mono text-foreground hover:border-primary/50 transition-all cursor-pointer"
          >
            Last 30s
          </button>
          <button
            type="button"
            onClick={() => applyPresetRange("center50")}
            className="px-2 py-1 rounded-md border border-border/60 bg-background text-[10px] font-mono text-foreground hover:border-primary/50 transition-all cursor-pointer"
          >
            Center 50%
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void haptics.light();
              setLoopRegion(!loopRegion);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md border font-mono text-[10px] uppercase font-semibold transition-all cursor-pointer ${
              loopRegion
                ? "border-primary bg-primary/20 text-primary"
                : "border-border/50 bg-background text-muted-foreground"
            }`}
          >
            <Repeat className="size-3" />
            <span>Loop {loopRegion ? "ON" : "OFF"}</span>
          </button>

          <button
            type="button"
            onClick={handleZeroSnap}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/50 bg-background text-muted-foreground hover:text-foreground font-mono text-[10px] uppercase font-semibold transition-all cursor-pointer"
            title="Snap cut boundaries to nearest 100ms grid"
          >
            <Magnet className="size-3 text-cyan-400" />
            <span>Zero-Snap</span>
          </button>
        </div>
      </div>

      {/* 5. Acoustic Transitions (Fades) & Volume Boost */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {/* Fade In */}
        <div className="p-3 rounded-xl border border-border/60 bg-card/40 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Fade In (S-Curve)</span>
            <span className="text-primary font-bold">{fadeInSec.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={fadeInSec}
            onChange={(e) => updateParam("fadeInSec", parseFloat(e.target.value))}
            disabled={busy}
            aria-label="Fade In Duration"
            className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
          />
        </div>

        {/* Fade Out */}
        <div className="p-3 rounded-xl border border-border/60 bg-card/40 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Fade Out (S-Curve)</span>
            <span className="text-primary font-bold">{fadeOutSec.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={fadeOutSec}
            onChange={(e) => updateParam("fadeOutSec", parseFloat(e.target.value))}
            disabled={busy}
            aria-label="Fade Out Duration"
            className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
          />
        </div>

        {/* Post-Cut Volume Boost */}
        <div className="p-3 rounded-xl border border-border/60 bg-card/40 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Volume Boost</span>
            <span className="text-emerald-400 font-bold">{boostDb > 0 ? `+${boostDb}` : boostDb} dB</span>
          </div>
          <input
            type="range"
            min={-12}
            max={12}
            step={1}
            value={boostDb}
            onChange={(e) => updateParam("boostDb", parseInt(e.target.value))}
            disabled={busy}
            aria-label="Volume Boost in Decibels"
            className="w-full accent-emerald-400 h-1.5 bg-secondary rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
