"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Scissors, Play, Pause, RotateCcw, Maximize2, Sparkles } from "lucide-react";
import { useHaptics } from "@/hooks/use-haptics";

export function VideoTimelineTrimmer({
  duration = 10,
  currentTime = 0,
  onSeek,
  onTrimChange,
  onSnapshot,
}: {
  duration?: number;
  currentTime?: number;
  onSeek?: (time: number) => void;
  onTrimChange?: (inSec: number, outSec: number) => void;
  onSnapshot?: () => void;
}) {
  const haptics = useHaptics();
  const [inPoint, setInPoint] = useState(0);
  const [outPoint, setOutPoint] = useState(duration || 10);
  const frameNumber = Math.round(currentTime * 30);

  useEffect(() => {
    if (duration > 0) {
      setOutPoint(duration);
      onTrimChange?.(0, duration);
    }
  }, [duration]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const cs = Math.floor((sec % 1) * 100);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };

  const handleSetIn = () => {
    haptics.light();
    const newIn = Math.min(currentTime, Math.max(0, outPoint - 0.5));
    setInPoint(newIn);
    onTrimChange?.(newIn, outPoint);
  };

  const handleSetOut = () => {
    haptics.light();
    const newOut = Math.max(currentTime, inPoint + 0.5);
    setOutPoint(newOut);
    onTrimChange?.(inPoint, newOut);
  };

  const handleReset = () => {
    haptics.light();
    setInPoint(0);
    setOutPoint(duration);
    onTrimChange?.(0, duration);
  };

  const safeDuration = duration > 0 ? duration : 1;
  const inPct = Math.min(100, Math.max(0, (inPoint / safeDuration) * 100));
  const outPct = Math.min(100, Math.max(0, (outPoint / safeDuration) * 100));
  const playheadPct = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  return (
    <div className="panel-hud rounded-tactile border border-border/80 bg-card/85 p-3 text-card-foreground shadow-tactile backdrop-blur-md">
      {/* Telemetry Bar */}
      <div className="flex items-center justify-between font-mono text-[11px] pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <span className="text-chart-2 font-bold">
            {formatTime(currentTime)} <span className="text-muted-foreground font-normal">/ {formatTime(duration)}</span>
          </span>
          <span className="rounded border border-border/60 bg-background/50 px-1.5 py-0.5 text-muted-foreground">
            FRAME #{frameNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            IN: <strong className="text-foreground">{formatTime(inPoint)}</strong>
          </span>
          <span className="text-muted-foreground">
            OUT: <strong className="text-foreground">{formatTime(outPoint)}</strong>
          </span>
          <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary font-semibold">
            {(outPoint - inPoint).toFixed(2)}s CLIP
          </span>
        </div>
      </div>

      {/* Visual Filmstrip & Timeline Scrubber */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          onSeek?.(pct * safeDuration);
        }}
        className="relative my-3 h-10 w-full rounded-md border border-border/70 bg-background/90 overflow-hidden select-none cursor-pointer touch-none"
      >
        {/* Filmstrip frame grid placeholders */}
        <div className="absolute inset-0 flex divide-x divide-border/20 opacity-25 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 bg-gradient-to-b from-secondary/50 to-transparent" />
          ))}
        </div>

        {/* Selected In-Out Highlight Region */}
        <div
          style={{
            left: `${inPct}%`,
            width: `${outPct - inPct}%`,
          }}
          className="absolute inset-y-0 bg-primary/20 border-x-2 border-primary pointer-events-none"
        />

        {/* In Point Handle Marker */}
        <div
          style={{ left: `${inPct}%` }}
          className="absolute inset-y-0 w-1 bg-chart-2 z-20 pointer-events-none"
        >
          <span className="absolute -top-4 -left-3 rounded bg-chart-2 px-1 font-mono text-[8px] font-bold text-background uppercase">
            IN
          </span>
        </div>

        {/* Out Point Handle Marker */}
        <div
          style={{ left: `${outPct}%` }}
          className="absolute inset-y-0 w-1 bg-chart-2 z-20 pointer-events-none"
        >
          <span className="absolute -top-4 -left-4 rounded bg-chart-2 px-1 font-mono text-[8px] font-bold text-background uppercase">
            OUT
          </span>
        </div>

        {/* Playhead */}
        <div
          style={{ left: `${playheadPct}%` }}
          className="absolute inset-y-0 w-0.5 bg-foreground z-30 shadow-[0_0_8px_rgba(255,255,255,0.8)] pointer-events-none"
        />
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] pt-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSetIn}
            className="flex items-center gap-1 rounded border border-border/70 bg-card/60 px-2.5 py-1 text-muted-foreground hover:border-chart-2 hover:text-chart-2 active:scale-95 transition-all"
          >
            <Scissors className="size-3.5" />
            <span>MARK IN [I]</span>
          </button>
          <button
            onClick={handleSetOut}
            className="flex items-center gap-1 rounded border border-border/70 bg-card/60 px-2.5 py-1 text-muted-foreground hover:border-chart-2 hover:text-chart-2 active:scale-95 transition-all"
          >
            <Scissors className="size-3.5 rotate-180" />
            <span>MARK OUT [O]</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 rounded border border-border/70 bg-card/60 px-2 py-1 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            title="Reset trim markers"
          >
            <RotateCcw className="size-3" />
            <span>RESET</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              haptics.light();
              onSnapshot?.();
            }}
            className="flex items-center gap-1.5 rounded border border-border/70 bg-card/60 px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-foreground active:scale-95 transition-all"
          >
            <Camera className="size-3.5 text-primary" />
            <span>SNAPSHOT PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
