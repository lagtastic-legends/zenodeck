"use client";

/**
 * ============================================================================
 * ZenoDeck Sensory Architecture — Phase 1: The AudioContext Provider
 * File: src/components/sensory/SensoryProvider.tsx
 * ============================================================================
 * Architected for zero-latency mechanical feedback and tactile UI responses.
 * - Manages an AudioContext lifecycle initialized/unlocked on the first gesture.
 * - Preloads and decodes uncompressed .wav audio files into in-memory AudioBuffers.
 * - Provides procedural zero-latency waveform fallbacks for guaranteed resilience.
 */

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export type SensorySoundId =
  | "tap"
  | "toggleOn"
  | "toggleOff"
  | "processStart"
  | "success"
  | "error";

export interface SoundPreloadManifest {
  id: SensorySoundId;
  url: string;
}

export interface SensoryContextValue {
  isAudioReady: boolean;
  isMuted: boolean;
  masterVolume: number;
  preloadSound: (id: SensorySoundId, url: string) => Promise<AudioBuffer | null>;
  preloadManifest: (manifest: SoundPreloadManifest[]) => Promise<void>;
  playSound: (id: SensorySoundId, volumeMultiplier?: number) => void;
  setMasterVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  unlockAudio: () => Promise<AudioContext | null>;
}

const SensoryContext = createContext<SensoryContextValue | null>(null);

const DEFAULT_MANIFEST: SoundPreloadManifest[] = [
  { id: "tap", url: "/sounds/tap.wav" },
  { id: "toggleOn", url: "/sounds/toggle_on.wav" },
  { id: "toggleOff", url: "/sounds/toggle_off.wav" },
  { id: "processStart", url: "/sounds/process_start.wav" },
  { id: "success", url: "/sounds/success.wav" },
  { id: "error", url: "/sounds/error.wav" },
];

const SAMPLE_RATE = 44100;

/**
 * Generates synthetic mechanical fallback PCM buffers in-memory.
 * Guarantees zero latency even before network assets arrive or in offline environments.
 */
function generateSyntheticBuffer(
  ctx: AudioContext,
  id: SensorySoundId
): AudioBuffer {
  switch (id) {
    case "tap": {
      // 25ms crisp tactile switch click
      const length = Math.floor(SAMPLE_RATE * 0.025);
      const buffer = ctx.createBuffer(1, length, SAMPLE_RATE);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const decay = Math.exp(-t * 220);
        data[i] = Math.sin(2 * Math.PI * (2800 - t * 16000) * t) * decay * 0.85;
      }
      return buffer;
    }

    case "toggleOn": {
      // 45ms rising tactile detent (1200Hz -> 2200Hz)
      const length = Math.floor(SAMPLE_RATE * 0.045);
      const buffer = ctx.createBuffer(1, length, SAMPLE_RATE);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const decay = Math.exp(-t * 90);
        const freq = 1200 + (t / 0.045) * 1000;
        data[i] = Math.sin(2 * Math.PI * freq * t) * decay * 0.75;
      }
      return buffer;
    }

    case "toggleOff": {
      // 45ms falling tactile detent (2000Hz -> 1000Hz)
      const length = Math.floor(SAMPLE_RATE * 0.045);
      const buffer = ctx.createBuffer(1, length, SAMPLE_RATE);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const decay = Math.exp(-t * 90);
        const freq = 2000 - (t / 0.045) * 1000;
        data[i] = Math.sin(2 * Math.PI * freq * t) * decay * 0.75;
      }
      return buffer;
    }

    case "processStart": {
      // 120ms charging sub-hum with resonant harmonic (140Hz -> 380Hz)
      const length = Math.floor(SAMPLE_RATE * 0.12);
      const buffer = ctx.createBuffer(1, length, SAMPLE_RATE);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const env = Math.sin(Math.PI * (t / 0.12));
        const f1 = 140 + t * 2000;
        const f2 = f1 * 2;
        data[i] = (Math.sin(2 * Math.PI * f1 * t) * 0.7 + Math.sin(2 * Math.PI * f2 * t) * 0.3) * env * 0.7;
      }
      return buffer;
    }

    case "success": {
      // 340ms clean harmonic chord (A4 -> C#5 -> E5 -> A5)
      const length = Math.floor(SAMPLE_RATE * 0.34);
      const buffer = ctx.createBuffer(1, length, SAMPLE_RATE);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const decay1 = Math.exp(-t * 10);
        const decay2 = Math.exp(-Math.max(0, t - 0.04) * 9);
        const decay3 = Math.exp(-Math.max(0, t - 0.08) * 8);
        const n1 = Math.sin(2 * Math.PI * 440.0 * t) * decay1 * 0.3;
        const n2 = Math.sin(2 * Math.PI * 554.37 * t) * decay2 * 0.3;
        const n3 = Math.sin(2 * Math.PI * 659.25 * t) * decay3 * 0.35;
        data[i] = (n1 + n2 + n3) * 0.9;
      }
      return buffer;
    }

    case "error": {
      // 220ms damped mechanical buzz (320Hz + 210Hz dual tone)
      const length = Math.floor(SAMPLE_RATE * 0.22);
      const buffer = ctx.createBuffer(1, length, SAMPLE_RATE);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / SAMPLE_RATE;
        const decay = Math.exp(-t * 14);
        const squareApprox =
          Math.sin(2 * Math.PI * 260 * t) +
          0.33 * Math.sin(2 * Math.PI * 780 * t);
        data[i] = squareApprox * decay * 0.7;
      }
      return buffer;
    }
  }
}

export interface SensoryProviderProps {
  children: ReactNode;
  initialVolume?: number;
  autoPreloadDefaultManifest?: boolean;
}

export function SensoryProvider({
  children,
  initialVolume = 0.75,
  autoPreloadDefaultManifest = true,
}: SensoryProviderProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferCacheRef = useRef<Map<SensorySoundId, AudioBuffer>>(new Map());
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [masterVolume, setMasterVolume] = useState(initialVolume);

  /**
   * Initializes or unlocks the AudioContext upon first direct user gesture.
   * Completely bypasses browser autoplay restrictions.
   */
  const unlockAudio = useCallback(async (): Promise<AudioContext | null> => {
    if (typeof window === "undefined") return null;

    try {
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;

        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass();
        }
      }

      const ctx = audioContextRef.current;
      if (ctx && ctx.state === "suspended") {
        await ctx.resume();
      }

      if (ctx && ctx.state === "running") {
        setIsAudioReady(true);
      }

      return ctx;
    } catch (err) {
      console.warn("[SensoryProvider] AudioContext unlock deferred:", err);
      return null;
    }
  }, []);

  /**
   * Preloads and decodes an uncompressed .wav audio file into memory.
   * If decoding fails or asset is not yet available, initializes the synthetic fallback buffer.
   */
  const preloadSound = useCallback(
    async (id: SensorySoundId, url: string): Promise<AudioBuffer | null> => {
      // Return cached buffer if already available
      const existing = bufferCacheRef.current.get(id);
      if (existing) return existing;

      let ctx = audioContextRef.current;
      if (!ctx) {
        ctx = await unlockAudio();
      }

      if (!ctx) return null;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch sound: ${url} (HTTP ${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
        bufferCacheRef.current.set(id, decodedBuffer);
        return decodedBuffer;
      } catch (err) {
        // Fall back to the in-memory synthetic PCM buffer
        const syntheticBuffer = generateSyntheticBuffer(ctx, id);
        bufferCacheRef.current.set(id, syntheticBuffer);
        return syntheticBuffer;
      }
    },
    [unlockAudio]
  );

  /**
   * Preloads an array of sound assets concurrently.
   */
  const preloadManifest = useCallback(
    async (manifest: SoundPreloadManifest[]): Promise<void> => {
      await Promise.all(manifest.map((item) => preloadSound(item.id, item.url)));
    },
    [preloadSound]
  );

  /**
   * Plays a preloaded sound with true zero-latency.
   */
  const playSound = useCallback(
    (id: SensorySoundId, volumeMultiplier = 1.0) => {
      if (typeof window === "undefined" || isMuted) return;

      const ctx = audioContextRef.current;
      if (!ctx) {
        // Attempt unlock on-the-fly
        void unlockAudio().then((unlockedCtx) => {
          if (unlockedCtx) {
            playSound(id, volumeMultiplier);
          }
        });
        return;
      }

      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      let buffer = bufferCacheRef.current.get(id);
      if (!buffer) {
        // Generate fallback buffer immediately on demand
        buffer = generateSyntheticBuffer(ctx, id);
        bufferCacheRef.current.set(id, buffer);
      }

      try {
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const gainNode = ctx.createGain();
        const targetGain = Math.max(0, Math.min(1, masterVolume * volumeMultiplier));
        gainNode.gain.setValueAtTime(targetGain, ctx.currentTime);

        source.connect(gainNode);
        gainNode.connect(ctx.destination);

        source.start(0);
      } catch (playErr) {
        console.warn(`[SensoryProvider] Zero-latency play failed for ${id}:`, playErr);
      }
    },
    [isMuted, masterVolume, unlockAudio]
  );

  // Setup global user gesture listeners to immediately unlock AudioContext
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFirstGesture = () => {
      void unlockAudio();
    };

    const options = { capture: true, passive: true, once: true };
    window.addEventListener("pointerdown", handleFirstGesture, options);
    window.addEventListener("touchstart", handleFirstGesture, options);
    window.addEventListener("keydown", handleFirstGesture, options);
    window.addEventListener("click", handleFirstGesture, options);

    return () => {
      window.removeEventListener("pointerdown", handleFirstGesture, options as any);
      window.removeEventListener("touchstart", handleFirstGesture, options as any);
      window.removeEventListener("keydown", handleFirstGesture, options as any);
      window.removeEventListener("click", handleFirstGesture, options as any);
    };
  }, [unlockAudio]);

  // Preload default sound set when AudioContext is ready or auto-preload is enabled
  useEffect(() => {
    if (autoPreloadDefaultManifest && typeof window !== "undefined") {
      void preloadManifest(DEFAULT_MANIFEST);
    }
  }, [autoPreloadDefaultManifest, preloadManifest]);

  const value: SensoryContextValue = {
    isAudioReady,
    isMuted,
    masterVolume,
    preloadSound,
    preloadManifest,
    playSound,
    setMasterVolume,
    setMuted: setIsMuted,
    unlockAudio,
  };

  return (
    <SensoryContext.Provider value={value}>
      {children}
    </SensoryContext.Provider>
  );
}

export function useSensoryContext(): SensoryContextValue {
  const context = useContext(SensoryContext);
  if (!context) {
    throw new Error("useSensoryContext must be used within a <SensoryProvider />");
  }
  return context;
}
