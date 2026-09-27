"use client";

/**
 * ZenoDeck Background Mini Player Deck (src/components/tools/youtube-mini-player.tsx)
 * =================================================================================
 * Floating audio player with hardware-accelerated playback and full
 * `navigator.mediaSession` integration for Android notification / lock-screen controls.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  X,
  Volume2,
  VolumeX,
  RotateCcw,
  FastForward,
  ChevronDown,
  ChevronUp,
  Music,
} from "lucide-react";
import { usePlayerStore } from "@/lib/youtube/player-store";
import { formatDuration } from "@/lib/youtube/innertube";
import { useHaptics } from "@/hooks/use-haptics";

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

export function YouTubeMiniPlayer() {
  const {
    activeTrack,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    volume,
    isMuted,
    isMinimized,
    pause,
    resume,
    togglePlay,
    setCurrentTime,
    setDuration,
    setPlaybackRate,
    toggleMute,
    toggleMinimized,
    closePlayer,
  } = usePlayerStore();

  const haptics = useHaptics();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  // Sync audio element with store play state
  useEffect(() => {
    if (!audioRef.current || !activeTrack) return;

    if (isPlaying) {
      audioRef.current.play().catch(() => {
        pause();
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, activeTrack, pause]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync volume and mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // MediaSession API Integration for Android Lock-Screen & Status Bar controls
  useEffect(() => {
    if (typeof window === "undefined" || !("mediaSession" in navigator) || !activeTrack) {
      return;
    }

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeTrack.title,
        artist: activeTrack.artist,
        album: "ZenoDeck Audio Vault",
        artwork: activeTrack.thumbnailUrl
          ? [
              {
                src: activeTrack.thumbnailUrl,
                sizes: "512x512",
                type: "image/jpeg",
              },
            ]
          : [],
      });

      navigator.mediaSession.setActionHandler("play", () => {
        resume();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        pause();
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const offset = details.seekOffset || 10;
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - offset);
        }
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const offset = details.seekOffset || 10;
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(
            audioRef.current.duration || 0,
            audioRef.current.currentTime + offset
          );
        }
      });
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        closePlayer();
      });
    } catch (e) {
      console.warn("MediaSession registration failed:", e);
    }

    return () => {
      if ("mediaSession" in navigator) {
        try {
          navigator.mediaSession.setActionHandler("play", null);
          navigator.mediaSession.setActionHandler("pause", null);
          navigator.mediaSession.setActionHandler("seekbackward", null);
          navigator.mediaSession.setActionHandler("seekforward", null);
          navigator.mediaSession.setActionHandler("seekto", null);
          navigator.mediaSession.setActionHandler("stop", null);
        } catch {}
      }
    };
  }, [activeTrack, resume, pause, closePlayer]);

  // Update MediaSession position state periodically
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "mediaSession" in navigator &&
      "setPositionState" in navigator.mediaSession &&
      duration > 0
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(0, duration),
          playbackRate: playbackRate,
          position: Math.min(Math.max(0, currentTime), duration),
        });
      } catch {}
    }
  }, [currentTime, duration, playbackRate]);

  // Handle scrubber change
  const handleScrub = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setCurrentTime(val);
      if (audioRef.current) {
        audioRef.current.currentTime = val;
      }
    },
    [setCurrentTime]
  );

  const cycleSpeed = useCallback(() => {
    const nextIdx = (SPEED_OPTIONS.indexOf(playbackRate) + 1) % SPEED_OPTIONS.length;
    setPlaybackRate(SPEED_OPTIONS[nextIdx]);
    void haptics.light();
  }, [playbackRate, setPlaybackRate, haptics]);

  if (!activeTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 pointer-events-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={activeTrack.audioUrl}
          preload="metadata"
          onTimeUpdate={() => {
            if (!isSeeking && audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration || 0);
            }
          }}
          onEnded={() => {
            pause();
            setCurrentTime(0);
          }}
        />

        {/* Player Container */}
        <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl shadow-elevation3 text-foreground">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-background/50 border-b border-border/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center size-6 rounded-lg bg-red-500/20 text-red-400 shrink-0">
                <Music className="size-3.5 animate-pulse" />
              </div>
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                Audio Audition Deck
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  toggleMinimized();
                  void haptics.light();
                }}
                className="size-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title={isMinimized ? "Expand" : "Minimize"}
                aria-label={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  closePlayer();
                  void haptics.medium();
                }}
                className="size-7 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all cursor-pointer"
                title="Close Player"
                aria-label="Close Player"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Player Body */}
          {!isMinimized && (
            <div className="p-3.5 space-y-3">
              {/* Track Info */}
              <div className="flex items-center gap-3">
                {activeTrack.thumbnailUrl ? (
                  <img
                    src={activeTrack.thumbnailUrl}
                    alt={activeTrack.title}
                    className="size-12 rounded-xl object-cover border border-border/60 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="size-12 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0 border border-border/40">
                    <Music className="size-6" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4 className="font-display text-xs font-bold text-foreground truncate" title={activeTrack.title}>
                    {activeTrack.title}
                  </h4>
                  <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                    {activeTrack.artist}
                  </p>
                </div>
              </div>

              {/* Progress Scrubber */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onMouseDown={() => setIsSeeking(true)}
                  onMouseUp={() => setIsSeeking(false)}
                  onTouchStart={() => setIsSeeking(true)}
                  onTouchEnd={() => setIsSeeking(false)}
                  onChange={handleScrub}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-red-500 focus:outline-hidden"
                />
                <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Transport Controls */}
              <div className="flex items-center justify-between pt-1">
                {/* Speed toggle */}
                <button
                  type="button"
                  onClick={cycleSpeed}
                  className="rounded-lg border border-border/60 bg-muted/40 px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title="Playback Speed"
                >
                  {playbackRate}x
                </button>

                {/* Rewind 10s */}
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                      setCurrentTime(audioRef.current.currentTime);
                    }
                    void haptics.light();
                  }}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title="Rewind 10 seconds"
                >
                  <RotateCcw className="size-4" />
                </button>

                {/* Play / Pause Primary Button */}
                <button
                  type="button"
                  onClick={() => {
                    togglePlay();
                    void haptics.light();
                  }}
                  className="size-11 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-0.5" />}
                </button>

                {/* Forward 10s */}
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
                      setCurrentTime(audioRef.current.currentTime);
                    }
                    void haptics.light();
                  }}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title="Forward 10 seconds"
                >
                  <FastForward className="size-4" />
                </button>

                {/* Mute toggle */}
                <button
                  type="button"
                  onClick={() => {
                    toggleMute();
                    void haptics.light();
                  }}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="size-4 text-red-400" /> : <Volume2 className="size-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Minimized Compact Bar */}
          {isMinimized && (
            <div className="flex items-center justify-between p-2.5 gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {activeTrack.thumbnailUrl && (
                  <img
                    src={activeTrack.thumbnailUrl}
                    alt={activeTrack.title}
                    className="size-7 rounded-md object-cover border border-border/60 shrink-0"
                  />
                )}
                <span className="font-display text-xs font-bold text-foreground truncate">
                  {activeTrack.title}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  togglePlay();
                  void haptics.light();
                }}
                className="size-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xs shrink-0 cursor-pointer"
              >
                {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
