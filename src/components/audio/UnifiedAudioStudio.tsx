"use client";

/**
 * OMNI TOOL — UNIFIED AUDIO DSP STUDIO (PHASE 3)
 * ==============================================
 *
 * Flagship Unified Audio DSP Workstation hosting all 13 audio manipulation
 * engines with interactive parameter sliders, real-time Web Audio API waveform
 * auditioning, and client-side @ffmpeg/ffmpeg WASM export pipeline.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Sliders,
  Waves,
  Speaker,
  SlidersVertical,
  MicOff,
  Clock,
  Scissors,
  Orbit,
  ArrowRight,
  Download,
  FileAudio,
  Check,
  ChevronDown,
  Grid,
} from "lucide-react";
import { DropZone } from "@/components/media/drop-zone";
import { OutputCard } from "@/components/media/output-card";
import { AudioToolsGrid } from "@/components/audio/AudioToolsGrid";
import {
  ParamPanel,
  ParamSelect,
  ParamSlider,
  ParamToggle,
} from "@/components/audio/param-controls";
import { BinauralRadar } from "@/components/audio/binaural-radar";
import { useAudioProcessor } from "@/hooks/useAudioProcessor";
import { useHaptics } from "@/hooks/use-haptics";
import {
  type AudioEffectType,
  type AudioFormat,
  type ReverbSpacePreset,
  type BassTier,
  AUDIO_TOOLS_CATALOG,
  BASS_BOOST_TIERS,
  EQ_FREQUENCIES,
  EQ_PRESET_MAP,
  REVERB_SPACES,
  getDefaultAudioParams,
} from "@/lib/audio-dsp";
import { formatBytes } from "@/lib/format";
import type { VideoMeta } from "@/lib/media/probe";

const FORMAT_OPTIONS: { value: AudioFormat; label: string }[] = [
  { value: "mp3", label: "MP3 · Standard Audio" },
  { value: "wav", label: "WAV · Uncompressed PCM" },
  { value: "flac", label: "FLAC · Lossless Studio" },
  { value: "ogg", label: "OGG · Vorbis High-Efficiency" },
  { value: "m4a", label: "M4A · Apple AAC" },
];

const BITRATE_OPTIONS = [
  { value: "128", label: "128 kbps (Draft)" },
  { value: "192", label: "192 kbps (Standard)" },
  { value: "256", label: "256 kbps (High Quality)" },
  { value: "320", label: "320 kbps (Studio Master)" },
];

export function UnifiedAudioStudio({
  initialToolId = "bass-booster",
}: {
  initialToolId?: AudioEffectType;
}) {
  const haptics = useHaptics();
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

  /* File state */
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0);

  /* Active Effect and Parameters */
  const [activeEffect, setActiveEffect] = useState<AudioEffectType>(initialToolId);
  const [params, setParams] = useState<Record<string, any>>(() =>
    getDefaultAudioParams(initialToolId)
  );
  const [showGridDrawer, setShowGridDrawer] = useState(false);

  /* Export Format */
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [kbps, setKbps] = useState("320");

  /* Synchronize tool when initialToolId prop changes */
  useEffect(() => {
    if (initialToolId && initialToolId !== activeEffect) {
      setActiveEffect(initialToolId);
      setParams(getDefaultAudioParams(initialToolId));
    }
  }, [initialToolId, activeEffect]);

  /* Web Audio API Real-Time Audition Engine */
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const currentDspNodesRef = useRef<AudioNode[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);
  const spatialFilterRef = useRef<BiquadFilterNode | null>(null);
  const spatialGainRef = useRef<GainNode | null>(null);

  /* Clean up audio preview url */
  useEffect(() => {
    if (file) {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(file);
      audioUrlRef.current = url;
      if (audioRef.current) {
        audioRef.current.src = url;
      }
    }
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, [file]);

  /* Build & Reconnect Real-Time Web Audio DSP Nodes */
  const setupDspGraph = useCallback(() => {
    if (!audioRef.current || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

      if (!sourceNodeRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
      }
      const source = sourceNodeRef.current;

      // Disconnect previous active DSP chain
      currentDspNodesRef.current.forEach((n) => {
        try { n.disconnect(); } catch {}
      });
      currentDspNodesRef.current = [];
      pannerNodeRef.current = null;
      spatialFilterRef.current = null;
      spatialGainRef.current = null;
      try { source.disconnect(); } catch {}

      const nodes: AudioNode[] = [];

      switch (activeEffect) {
        case "bass-booster": {
          const tier = BASS_BOOST_TIERS[params.tier as BassTier] || BASS_BOOST_TIERS[3];
          const gain = typeof params.customGainDb === "number" ? params.customGainDb : tier.gain;
          const cutoff = params.cutoff || tier.defaultCutoff;

          // 1. Subsonic highpass filter (28Hz) to prevent inaudible cone flapping & DAC clipping
          const subRumble = ctx.createBiquadFilter();
          subRumble.type = "highpass";
          subRumble.frequency.value = 28;
          nodes.push(subRumble);

          // 2. Precision low-shelf filter
          const bassFilter = ctx.createBiquadFilter();
          bassFilter.type = "lowshelf";
          bassFilter.frequency.value = cutoff;
          bassFilter.gain.value = gain;
          nodes.push(bassFilter);

          // 3. Proportional high-shelf clarity filter
          if (params.clarity !== false) {
            const clarityFilter = ctx.createBiquadFilter();
            clarityFilter.type = "highshelf";
            clarityFilter.frequency.value = 6500;
            clarityFilter.gain.value = Math.min(3.5, 1.5 + gain * 0.12);
            nodes.push(clarityFilter);
          }

          // 4. Dynamic headroom compensation (-55% of boost)
          const headroomGain = ctx.createGain();
          const headroomDb = gain * 0.55;
          headroomGain.gain.value = Math.pow(10, -headroomDb / 20);
          nodes.push(headroomGain);

          // 5. Studio peak limiter to eliminate audio tearing and crackle
          const limiter = ctx.createDynamicsCompressor();
          limiter.threshold.value = -0.5;
          limiter.knee.value = 0;
          limiter.ratio.value = 20;
          limiter.attack.value = 0.007;
          limiter.release.value = 0.1;
          nodes.push(limiter);
          break;
        }

        case "equalizer": {
          const gains = params.gains || [0, 0, 0, 0, 0, 0];
          EQ_FREQUENCIES.forEach((freq, i) => {
            const g = gains[i] || 0;
            if (g !== 0) {
              const eqFilter = ctx.createBiquadFilter();
              eqFilter.type = "peaking";
              eqFilter.frequency.value = freq;
              eqFilter.Q.value = 1.0;
              eqFilter.gain.value = g;
              nodes.push(eqFilter);
            }
          });
          break;
        }

        case "volume-changer": {
          const gainNode = ctx.createGain();
          const gainVal = params.normalize ? 1.0 : Math.pow(10, (params.gainDb || 0) / 20);
          gainNode.gain.value = Math.max(0, Math.min(gainVal, 10));
          nodes.push(gainNode);
          break;
        }

        case "stereo-panner": {
          if (ctx.createStereoPanner) {
            const panner = ctx.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, params.balance || 0));
            nodes.push(panner);
          }
          break;
        }

        case "spatial-8d": {
          if (ctx.createStereoPanner) {
            // 1. Azimuth stereo panner for smooth horizontal 360° rotation
            const panner = ctx.createStereoPanner();
            panner.pan.value = 0;
            pannerNodeRef.current = panner;

            // 2. Dynamic Head-Shadow / Pinna filter (attenuates high-freq when source is behind the head)
            const headShadowFilter = ctx.createBiquadFilter();
            headShadowFilter.type = "lowpass";
            headShadowFilter.frequency.value = 18000;
            spatialFilterRef.current = headShadowFilter;

            // 3. Proximity gain modulation (subtle volume attenuation behind head)
            const proximityGain = ctx.createGain();
            proximityGain.gain.value = 1.0;
            spatialGainRef.current = proximityGain;

            // 4. Binaural room reflection / Haas externalization micro-delay
            const roomDelay = ctx.createDelay();
            roomDelay.delayTime.value = 0.022; // 22ms Haas reflection
            const roomGain = ctx.createGain();
            roomGain.gain.value = 0.18;
            const roomDamp = ctx.createBiquadFilter();
            roomDamp.type = "lowpass";
            roomDamp.frequency.value = 4500;

            source.connect(panner);
            panner.connect(headShadowFilter);
            headShadowFilter.connect(proximityGain);
            proximityGain.connect(ctx.destination);

            source.connect(roomDelay);
            roomDelay.connect(roomDamp);
            roomDamp.connect(roomGain);
            roomGain.connect(ctx.destination);

            currentDspNodesRef.current = [
              panner,
              headShadowFilter,
              proximityGain,
              roomDelay,
              roomDamp,
              roomGain,
            ];
            return;
          }
          break;
        }

        case "auto-panner": {
          if (ctx.createStereoPanner) {
            const panner = ctx.createStereoPanner();
            panner.pan.value = 0;
            nodes.push(panner);
            pannerNodeRef.current = panner;
          }
          break;
        }

        case "noise-reducer": {
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = params.highpassHz || 80;
          nodes.push(hp);

          const lp = ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.value = params.lowpassHz || 14000;
          nodes.push(lp);
          break;
        }

        case "vocal-remover": {
          if (ctx.createChannelSplitter && ctx.createChannelMerger) {
            const splitter = ctx.createChannelSplitter(2);
            const merger = ctx.createChannelMerger(2);
            const inverter = ctx.createGain();
            inverter.gain.value = -1;

            source.connect(splitter);
            splitter.connect(merger, 0, 0); // L -> L
            splitter.connect(inverter, 1);   // R -> Inv
            inverter.connect(merger, 0, 0); // -R -> L
            splitter.connect(merger, 0, 1); // L -> R
            inverter.connect(merger, 0, 1); // -R -> R
            merger.connect(ctx.destination);
            currentDspNodesRef.current = [splitter, merger, inverter];
            return;
          }
          break;
        }

        case "reverb": {
          // Psychoacoustic Haas diffusion: wet/dry balance with zero discrete slapback delay
          const wetGain = ctx.createGain();
          wetGain.gain.value = 0.32;
          const dryGain = ctx.createGain();
          dryGain.gain.value = 0.88;

          const delay1 = ctx.createDelay();
          delay1.delayTime.value = 0.022; // 22ms Haas reflection
          const delay2 = ctx.createDelay();
          delay2.delayTime.value = 0.035; // 35ms Haas reflection

          const lowpass = ctx.createBiquadFilter();
          lowpass.type = "lowpass";
          lowpass.frequency.value = 5200; // warm acoustic absorption

          source.connect(dryGain);
          dryGain.connect(ctx.destination);

          source.connect(delay1);
          delay1.connect(delay2);
          delay2.connect(lowpass);
          lowpass.connect(wetGain);
          wetGain.connect(ctx.destination);

          currentDspNodesRef.current = [dryGain, wetGain, delay1, delay2, lowpass];
          return;
        }
      }

      // Connect linear chain: source -> node0 -> node1 -> ... -> destination
      if (nodes.length > 0) {
        let prev: AudioNode = source;
        for (const n of nodes) {
          prev.connect(n);
          prev = n;
        }
        prev.connect(ctx.destination);
        currentDspNodesRef.current = nodes;
      } else {
        source.connect(ctx.destination);
      }
    } catch {
      try {
        if (sourceNodeRef.current && audioCtxRef.current) {
          sourceNodeRef.current.connect(audioCtxRef.current.destination);
        }
      } catch {}
    }
  }, [activeEffect, params]);

  /* Live parameter updates while audio is actively playing or effect changes */
  useEffect(() => {
    if (audioRef.current) {
      if (activeEffect === "tempo-changer") {
        try {
          audioRef.current.preservesPitch = true;
        } catch {}
        audioRef.current.playbackRate = Math.max(0.5, Math.min(2.0, params.speed || 1.0));
      } else {
        audioRef.current.playbackRate = 1.0;
      }
    }
    if (isPlaying) {
      setupDspGraph();
    }
  }, [activeEffect, params, isPlaying, setupDspGraph]);

  /* Animated spatial 8D and auto-panning LFO */
  useEffect(() => {
    if (!isPlaying || !pannerNodeRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const startT = performance.now();
    const tick = () => {
      if (!pannerNodeRef.current || !isPlaying) return;
      const elapsed = (performance.now() - startT) / 1000;
      if (activeEffect === "spatial-8d") {
        const cycle = Math.max(params.cycleSec || 8, 1);
        const intensity = params.intensity ?? 0.85;
        const theta = (elapsed / cycle) * 2 * Math.PI;
        const panX = Math.sin(theta) * intensity;
        const depthY = Math.cos(theta); // +1 = directly in front, -1 = directly behind

        if (pannerNodeRef.current) {
          pannerNodeRef.current.pan.value = Math.max(-1, Math.min(1, panX));
        }
        if (spatialFilterRef.current) {
          // In front (+1): 18000 Hz (open, bright)
          // Behind (-1): 6500 Hz (warm head-shadow absorption)
          const cutoff = 12250 + 5750 * depthY;
          spatialFilterRef.current.frequency.value = Math.max(3000, Math.min(20000, cutoff));
        }
        if (spatialGainRef.current) {
          // In front (+1): 1.0
          // Behind (-1): 0.88 (subtle ear/head volume dip)
          const gain = 0.94 + 0.06 * depthY;
          spatialGainRef.current.gain.value = gain;
        }
      } else if (activeEffect === "auto-panner") {
        const freq = params.frequencyHz || 0.5;
        const depth = params.depth ?? 0.85;
        if (params.waveform === "triangle") {
          const phase = (elapsed * freq) % 1;
          const tri = phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
          pannerNodeRef.current.pan.value = tri * depth;
        } else {
          pannerNodeRef.current.pan.value = Math.sin(elapsed * freq * 2 * Math.PI) * depth;
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, activeEffect, params]);

  /* Teardown Web Audio API on unmount */
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      currentDspNodesRef.current.forEach((n) => {
        try { n.disconnect(); } catch {}
      });
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        try { void audioCtxRef.current.close(); } catch {}
      }
    };
  }, []);

  /* Synchronize parameters when active tool changes */
  const handleSelectTool = (toolId: AudioEffectType, initialParamOverrides?: Record<string, any>) => {
    void haptics.light();
    setActiveEffect(toolId);
    const defaults = getDefaultAudioParams(toolId);
    setParams(initialParamOverrides ? { ...defaults, ...initialParamOverrides } : defaults);
    setShowGridDrawer(false);
  };

  const updateParam = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    if (activeEffect === "trimmer" && key === "startSec" && audioRef.current && !isPlaying) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  /* Playback controls */
  const togglePlay = () => {
    if (!audioRef.current) return;
    void haptics.light();
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (activeEffect === "tempo-changer") {
        try {
          audioRef.current.preservesPitch = true;
        } catch {}
        audioRef.current.playbackRate = Math.max(0.5, Math.min(2.0, params.speed || 1.0));
      } else {
        audioRef.current.playbackRate = 1.0;
      }
      if (activeEffect === "trimmer") {
        const start = params.startSec || 0;
        const end = params.endSec || duration || 30;
        if (audioRef.current.currentTime < start || audioRef.current.currentTime >= end) {
          audioRef.current.currentTime = start;
          setCurrentTime(start);
        }
      }
      setupDspGraph();
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  /* Execute WASM Processing */
  const handleRunProcessing = async () => {
    if (!file || busy) return;
    void haptics.medium();
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    await processAudio({
      file,
      effect: activeEffect,
      params,
      outputFormat: format,
      kbps: Number(kbps),
      sampleRate: 44100,
    });
  };

  /* Probed duration helper */
  const handleProbed = (meta: VideoMeta) => {
    setDuration(meta.durationSec);
    if (activeEffect === "trimmer") {
      setParams((prev) => ({
        ...prev,
        startSec: 0,
        endSec: Math.min(30, meta.durationSec),
      }));
    }
  };

  const activeToolMeta = useMemo(
    () => AUDIO_TOOLS_CATALOG.find((t) => t.id === activeEffect) || AUDIO_TOOLS_CATALOG[0],
    [activeEffect]
  );

  /* Active preset matcher across all 13 modules */
  const currentPresetMatch = useMemo(() => {
    if (!activeToolMeta?.presets) return null;
    return (
      activeToolMeta.presets.find((p) => {
        return Object.entries(p.params).every(([k, v]) => {
          const currentVal = params[k];
          if (Array.isArray(v)) {
            return (
              Array.isArray(currentVal) &&
              v.length === currentVal.length &&
              v.every((val, i) => Math.abs(val - currentVal[i]) < 0.01)
            );
          }
          if (typeof v === "number" && typeof currentVal === "number") {
            return Math.abs(v - currentVal) < 0.01;
          }
          return currentVal === v;
        });
      }) || null
    );
  }, [activeToolMeta, params]);

  /* Custom glassmorphic preset dropdown state */
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const presetDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        presetDropdownRef.current &&
        !presetDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPresetMenu(false);
      }
    }
    if (showPresetMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showPresetMenu]);

  useEffect(() => {
    setShowPresetMenu(false);
  }, [activeEffect]);

  /* Dynamic real-time ETA calculation based on elapsed time and progress ratio */
  const etaSeconds = useMemo(() => {
    if (progress <= 3 || progress >= 100 || elapsedMs < 1000) return null;
    const elapsedSec = elapsedMs / 1000;
    const estimatedTotal = elapsedSec / (progress / 100);
    const remaining = Math.max(1, Math.round(estimatedTotal - elapsedSec));
    return remaining;
  }, [progress, elapsedMs]);

  return (
    <div className="space-y-6">
      {/* Hidden Audio Player for Web Audio API Audition */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const el = e.target as HTMLAudioElement;
          setCurrentTime(el.currentTime);
          if (activeEffect === "trimmer" && typeof params.endSec === "number" && params.endSec > 0) {
            if (el.currentTime >= params.endSec) {
              el.pause();
              el.currentTime = params.startSec || 0;
              setCurrentTime(params.startSec || 0);
              setIsPlaying(false);
            }
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (activeEffect === "trimmer") {
            if (audioRef.current) audioRef.current.currentTime = params.startSec || 0;
            setCurrentTime(params.startSec || 0);
          }
        }}
        className="hidden"
      />

      {/* Header Banner & Mode Switcher */}
      <div className="panel-hud relative overflow-hidden rounded-tactile border border-border/70 bg-gradient-to-r from-card/80 via-card/50 to-primary/5 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid size-12 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-glow">
              <Sliders className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Unified Audio DSP Suite
                </h1>
                <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 font-mono text-[10px] uppercase font-semibold text-primary">
                  13 Engines
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                Client-Side WebAudio & FFmpeg WASM · 120Hz Non-Blocking Pipeline
              </p>
            </div>
          </div>

          {/* Toggle Grid Drawer Button */}
          <button
            type="button"
            onClick={() => {
              void haptics.light();
              setShowGridDrawer((v) => !v);
            }}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-semibold bg-background/80 hover:bg-background border border-border/70 text-foreground transition-all duration-150 hover:border-primary/50 shadow-xs"
          >
            <Grid className="size-3.5 text-primary" />
            {showGridDrawer ? "Hide Module Grid" : "Browse All 13 Modules"}
          </button>
        </div>
      </div>

      {/* Collapsible 13-Module Grid Selector */}
      <AnimatePresence>
        {showGridDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="panel-hud p-4 rounded-tactile border border-primary/30 bg-background/80 shadow-elevation2">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/40">
                <span className="font-mono text-xs font-semibold text-foreground uppercase tracking-wider">
                  Select Audio Manipulation Module
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Click any module or preset to load into workstation
                </span>
              </div>
              <AudioToolsGrid
                selectedToolId={activeEffect}
                onSelectTool={handleSelectTool}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Dual-Engine Workstation Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Input & Interactive Parameter Deck */}
        <div className="lg:col-span-7 space-y-4">
          {/* File Intake */}
          <DropZone
            accept="audio/*"
            file={file}
            onFile={(f) => {
              reset();
              setFile(f);
            }}
            onClear={() => {
              reset();
              setFile(null);
            }}
            preview="none"
            label="Drop source audio track here"
            hint="Supports MP3, WAV, FLAC, OGG, AAC, M4A up to 20 GB"
            onProbed={handleProbed}
            disabled={busy}
          />

          {/* Engine 1: Web Audio Waveform Audition Strip */}
          {file && (
            <div className="panel-hud p-3.5 rounded-tactile border border-border/60 bg-card/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95 shadow-glow"
                  aria-label={isPlaying ? "Pause audio" : "Play audio"}
                >
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
                </button>
                <div>
                  <p className="font-medium text-xs text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                    {file.name}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {currentTime.toFixed(1)}s / {duration > 0 ? `${duration.toFixed(1)}s` : "Audition"} · {formatBytes(file.size)}
                  </p>
                </div>
              </div>

              {/* Active DSP Badge */}
              <div className="text-right">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
                  Active Filter
                </span>
                <span className="font-mono text-xs font-semibold text-primary">
                  {activeToolMeta.name}
                </span>
              </div>
            </div>
          )}

          {/* Active Tool Parameter Controls */}
          <div className="panel-hud p-5 rounded-tactile border border-border/70 bg-card/50 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                  <Wand2 className="size-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-foreground">
                    {activeToolMeta.name} Controls
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {activeToolMeta.shortDesc}
                  </p>
                </div>
              </div>

              {/* Custom Dark-Glass Preset Selector */}
              <div className="relative shrink-0" ref={presetDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    void haptics.light();
                    setShowPresetMenu((prev) => !prev);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-all shadow-xs cursor-pointer ${
                    currentPresetMatch
                      ? "border-primary/50 bg-primary/15 text-primary font-semibold hover:border-primary hover:bg-primary/20"
                      : "border-border/70 bg-background/80 text-foreground hover:border-primary/40 hover:bg-card"
                  }`}
                  aria-label="Preset Selection"
                  aria-expanded={showPresetMenu}
                >
                  <Sparkles className={`size-3.5 ${currentPresetMatch ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="max-w-[120px] sm:max-w-[200px] truncate text-left">
                    {currentPresetMatch ? currentPresetMatch.label : "Load Preset..."}
                  </span>
                  <ChevronDown
                    className={`size-3 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      showPresetMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Animated Glassmorphic Menu */}
                <AnimatePresence>
                  {showPresetMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute right-0 top-full mt-1.5 z-50 min-w-[240px] max-w-[320px] max-h-[360px] overflow-y-auto rounded-xl border border-white/15 bg-zinc-950/98 p-1.5 shadow-2xl backdrop-blur-2xl ring-1 ring-black/60 scroll-hud"
                    >
                      <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 border-b border-white/10 mb-1 flex items-center justify-between">
                        <span>{activeToolMeta.name} Presets</span>
                        <span className="text-primary font-bold">{activeToolMeta.presets.length} Presets</span>
                      </div>

                      <div className="space-y-0.5">
                        {activeToolMeta.presets.map((preset) => {
                          const isSelected = currentPresetMatch?.label === preset.label;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                void haptics.light();
                                setParams((prev) => ({ ...prev, ...preset.params }));
                                setShowPresetMenu(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left font-mono text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-primary/25 text-primary font-bold border border-primary/40 shadow-xs"
                                  : "text-zinc-200 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span className="truncate pr-2">{preset.label}</span>
                              {isSelected && <Check className="size-3.5 text-primary shrink-0 stroke-[2.5]" />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-1 mt-1 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            void haptics.light();
                            setParams(getDefaultAudioParams(activeEffect));
                            setShowPresetMenu(false);
                          }}
                          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left font-mono text-[11px] text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          <span>Reset to Factory Defaults</span>
                          <RotateCcw className="size-3 opacity-70 shrink-0" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Quick Presets Horizontal Chip Rail */}
            {activeToolMeta.presets.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-hud">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground shrink-0 pr-1 flex items-center gap-1">
                  <Sparkles className="size-2.5 text-primary" />
                  Presets:
                </span>
                {activeToolMeta.presets.map((preset) => {
                  const isSelected = currentPresetMatch?.label === preset.label;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        void haptics.light();
                        setParams((prev) => ({ ...prev, ...preset.params }));
                      }}
                      className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.1em] transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/25 text-primary font-bold shadow-[0_0_10px_rgba(139,92,246,0.3)] ring-1 ring-primary/50"
                          : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-background/80"
                      }`}
                    >
                      {isSelected && <Check className="size-2.5 shrink-0 text-primary stroke-[2.5]" />}
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Dynamic Controls per Effect */}
            {activeEffect === "bass-booster" && (
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Progressive Bass Tiers (+3dB to +18dB)
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {([1, 2, 3, 4, 5] as const).map((tierNum) => {
                      const tier = BASS_BOOST_TIERS[tierNum];
                      const isSelected = (params.tier || 3) === tierNum;
                      return (
                        <button
                          key={tierNum}
                          type="button"
                          onClick={() => {
                            void haptics.light();
                            updateParam("tier", tierNum);
                          }}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-200 font-bold shadow-[0_0_10px_rgba(217,70,239,0.2)] ring-1 ring-fuchsia-500/40"
                              : "bg-background/40 hover:bg-background/80 border-border/50 text-muted-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {isSelected && <Check className="size-2.5 text-fuchsia-400 shrink-0 stroke-[2.5]" />}
                            <span className="font-mono text-[10px]">T{tierNum}</span>
                          </div>
                          <span className="font-bold text-xs">+{tier.gain}dB</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <ParamSlider
                  label="Corner Cutoff Frequency"
                  value={params.cutoff || 90}
                  min={60}
                  max={150}
                  step={5}
                  onChange={(v) => updateParam("cutoff", v)}
                  display={(v) => `${v} Hz`}
                  hintLeft="60 Hz (Deep Sub)"
                  hintRight="150 Hz (Punchy Mids)"
                  disabled={busy}
                />

                <ParamToggle
                  label="Anti-Mud Clarity Shelf (+3dB @ 8kHz)"
                  checked={params.clarity !== false}
                  onChange={(v) => updateParam("clarity", v)}
                  hint="Keeps lead vocals and cymbals crisp while boosting low-end"
                  disabled={busy}
                />
              </div>
            )}

            {activeEffect === "reverb" && (
              <div className="space-y-3">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Acoustic Space Models (8 Presets)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(REVERB_SPACES) as ReverbSpacePreset[]).map((spaceKey) => {
                    const space = REVERB_SPACES[spaceKey];
                    const isSelected = (params.preset || "medium-room") === spaceKey;
                    return (
                      <button
                        key={spaceKey}
                        type="button"
                        onClick={() => {
                          void haptics.light();
                          updateParam("preset", spaceKey);
                        }}
                        className={`flex flex-col text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-100 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.2)] ring-1 ring-cyan-500/40"
                            : "bg-background/40 hover:bg-background/80 border-border/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-medium">{space.name}</span>
                          {isSelected && <Check className="size-3 text-cyan-400 shrink-0 stroke-[2.5]" />}
                        </div>
                        <span className="font-mono text-[9px] text-muted-foreground/80 mt-0.5">
                          {space.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeEffect === "vocal-remover" && (
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Phase Cancellation Mode
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "phase_cancel", label: "Pure OOPS", sub: "Exact Center Kill" },
                      { id: "bass_preserved", label: "Bass Preserved", sub: "Keeps Rhythm Sub" },
                      { id: "karaoke_bandpass", label: "Bandpass", sub: "Vocal Range Only" },
                    ].map((m) => {
                      const isSelected = (params.mode || "phase_cancel") === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            void haptics.light();
                            updateParam("mode", m.id);
                          }}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-100 font-semibold shadow-[0_0_10px_rgba(217,70,239,0.2)] ring-1 ring-fuchsia-500/40"
                              : "bg-background/40 hover:bg-background/80 border-border/50 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <p className="text-xs font-medium">{m.label}</p>
                            {isSelected && <Check className="size-3 text-fuchsia-400 shrink-0 stroke-[2.5]" />}
                          </div>
                          <p className="font-mono text-[9px] text-muted-foreground/80">{m.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {params.mode === "bass_preserved" && (
                  <ParamSlider
                    label="Bass Preservation Crossover"
                    value={params.bassPreserveCutoffHz || 140}
                    min={80}
                    max={220}
                    step={10}
                    onChange={(v) => updateParam("bassPreserveCutoffHz", v)}
                    display={(v) => `${v} Hz`}
                    hintLeft="80 Hz (Sub Only)"
                    hintRight="220 Hz (Sub + Low Mids)"
                    disabled={busy}
                  />
                )}
              </div>
            )}

            {activeEffect === "spatial-8d" && (
              <div className="space-y-4">
                <BinauralRadar
                  cycleSec={params.cycleSec || 8}
                  intensity={params.intensity || 0.85}
                  widening={params.widening || 1.25}
                  isPlaying={isPlaying}
                />
                <ParamSlider
                  label="Rotation Cycle Period"
                  value={params.cycleSec || 8}
                  min={2}
                  max={20}
                  step={1}
                  onChange={(v) => updateParam("cycleSec", v)}
                  display={(v) => `${v}s per full orbit`}
                  hintLeft="2s (Whirlwind)"
                  hintRight="20s (Slow Orbit)"
                  disabled={busy}
                />
                <ParamSlider
                  label="Panning Depth & Intensity"
                  value={Math.round((params.intensity || 0.85) * 100)}
                  min={10}
                  max={100}
                  step={5}
                  onChange={(v) => updateParam("intensity", v / 100)}
                  display={(v) => `${v}%`}
                  hintLeft="10% (Subtle)"
                  hintRight="100% (Full Immersion)"
                  disabled={busy}
                />
                <ParamSlider
                  label="Stereo Field Dimension Widening"
                  value={Math.round((params.widening || 1.25) * 100)}
                  min={100}
                  max={200}
                  step={5}
                  onChange={(v) => updateParam("widening", v / 100)}
                  display={(v) => `${(v / 100).toFixed(2)}x`}
                  disabled={busy}
                />
              </div>
            )}

            {activeEffect === "auto-panner" && (
              <div className="space-y-4">
                <ParamSlider
                  label="LFO Frequency"
                  value={params.frequencyHz || 0.5}
                  min={0.1}
                  max={6.0}
                  step={0.1}
                  onChange={(v) => updateParam("frequencyHz", v)}
                  display={(v) => `${v} Hz`}
                  hintLeft="0.1 Hz (Slow)"
                  hintRight="6.0 Hz (Fast Tremolo)"
                  disabled={busy}
                />
                <ParamSlider
                  label="Modulation Depth"
                  value={Math.round((params.depth || 0.85) * 100)}
                  min={10}
                  max={100}
                  step={5}
                  onChange={(v) => updateParam("depth", v / 100)}
                  display={(v) => `${v}%`}
                  disabled={busy}
                />
                <ParamToggle
                  label="Triangle LFO Waveform (Instead of Sine)"
                  checked={params.waveform === "triangle"}
                  onChange={(v) => updateParam("waveform", v ? "triangle" : "sine")}
                  hint="Produces linear ping-pong panning instead of sinusoidal easing"
                  disabled={busy}
                />
              </div>
            )}

            {activeEffect === "equalizer" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {EQ_FREQUENCIES.map((freq, i) => {
                    const gains = params.gains || [0, 0, 0, 0, 0, 0];
                    const gainVal = gains[i] || 0;
                    return (
                      <div key={freq} className="flex flex-col items-center p-2 rounded-lg bg-background/50 border border-border/50">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {freq >= 1000 ? `${freq / 1000}k` : `${freq}`}Hz
                        </span>
                        <span className={`font-mono text-xs font-semibold my-1 ${gainVal > 0 ? "text-emerald-400" : gainVal < 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {gainVal > 0 ? `+${gainVal}` : gainVal}dB
                        </span>
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={1}
                          value={gainVal}
                          onChange={(e) => {
                            const newGains = [...gains];
                            newGains[i] = Number(e.target.value);
                            updateParam("gains", newGains);
                          }}
                          className="w-full accent-emerald-500 h-1.5"
                          disabled={busy}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeEffect === "noise-reducer" && (
              <div className="space-y-4">
                <ParamSlider
                  label="Noise Reduction Attenuation"
                  value={params.noiseReductionDb || 12}
                  min={6}
                  max={30}
                  step={1}
                  onChange={(v) => updateParam("noiseReductionDb", v)}
                  display={(v) => `${v} dB`}
                  hintLeft="6 dB (Light)"
                  hintRight="30 dB (Heavy Isolation)"
                  disabled={busy}
                />
                <ParamSlider
                  label="Low Rumble Highpass Filter"
                  value={params.highpassHz || 80}
                  min={40}
                  max={160}
                  step={10}
                  onChange={(v) => updateParam("highpassHz", v)}
                  display={(v) => `${v} Hz`}
                  disabled={busy}
                />
                <ParamSlider
                  label="High Hiss Lowpass Filter"
                  value={params.lowpassHz || 14000}
                  min={8000}
                  max={18000}
                  step={500}
                  onChange={(v) => updateParam("lowpassHz", v)}
                  display={(v) => `${v} Hz`}
                  disabled={busy}
                />
              </div>
            )}

            {activeEffect === "pitch-shifter" && (
              <div className="space-y-4">
                <ParamSlider
                  label="Pitch Transpose (Semitones)"
                  value={params.semitones || 0}
                  min={-12}
                  max={12}
                  step={1}
                  onChange={(v) => updateParam("semitones", v)}
                  display={(v) => `${v > 0 ? `+${v}` : v} semitones`}
                  hintLeft="-12 (Octave Down)"
                  hintRight="+12 (Octave Up)"
                  disabled={busy}
                />
              </div>
            )}

            {activeEffect === "tempo-changer" && (
              <div className="space-y-4">
                <ParamSlider
                  label="Playback Tempo (Pitch-Preserved)"
                  value={Math.round((params.speed || 1.0) * 100)}
                  min={50}
                  max={200}
                  step={5}
                  onChange={(v) => updateParam("speed", v / 100)}
                  display={(v) => `${(v / 100).toFixed(2)}x`}
                  hintLeft="0.5x (Halftime)"
                  hintRight="2.0x (Double-Time)"
                  disabled={busy}
                />
              </div>
            )}

            {activeEffect === "stereo-panner" && (
              <div className="space-y-4">
                <ParamSlider
                  label="Stereo Soundstage Balance"
                  value={Math.round((params.balance || 0) * 100)}
                  min={-100}
                  max={100}
                  step={5}
                  onChange={(v) => updateParam("balance", v / 100)}
                  display={(v) => (v < 0 ? `${Math.abs(v)}% Left` : v > 0 ? `${v}% Right` : "Center")}
                  hintLeft="100% Left"
                  hintRight="100% Right"
                  disabled={busy}
                />
              </div>
            )}

            {activeEffect === "volume-changer" && (
              <div className="space-y-4">
                <ParamSlider
                  label="Gain Staging (dB)"
                  value={params.gainDb || 0}
                  min={-30}
                  max={20}
                  step={1}
                  onChange={(v) => updateParam("gainDb", v)}
                  display={(v) => `${v > 0 ? `+${v}` : v} dB`}
                  disabled={busy || params.normalize}
                />
                <ParamToggle
                  label="EBU R128 Dynamic Normalization (dynaudnorm)"
                  checked={params.normalize || false}
                  onChange={(v) => updateParam("normalize", v)}
                  hint="Automatically evens out quiet whispers and loud spikes into standard broadcast loudness"
                  disabled={busy}
                />
              </div>
            )}

            {activeEffect === "reverse-audio" && (
              <ParamToggle
                label="Add Ambient Echo Tail"
                checked={params.includeEcho || false}
                onChange={(v) => updateParam("includeEcho", v)}
                hint="Appends rich ambient reverb tail to the reversed audio"
                disabled={busy}
              />
            )}

            {activeEffect === "trimmer" && (
              <div className="space-y-4">
                <ParamSlider
                  label="Start Offset"
                  value={params.startSec || 0}
                  min={0}
                  max={Math.max(duration - 1, 10)}
                  step={0.5}
                  onChange={(v) => updateParam("startSec", v)}
                  display={(v) => `${v.toFixed(1)}s`}
                  disabled={busy}
                />
                <ParamSlider
                  label="End Timestamp"
                  value={params.endSec || Math.min(30, duration || 30)}
                  min={1}
                  max={Math.max(duration, 30)}
                  step={0.5}
                  onChange={(v) => updateParam("endSec", v)}
                  display={(v) => `${v.toFixed(1)}s`}
                  disabled={busy}
                />
                <div className="grid grid-cols-2 gap-3">
                  <ParamSlider
                    label="Fade In"
                    value={params.fadeInSec || 0}
                    min={0}
                    max={5}
                    step={0.2}
                    onChange={(v) => updateParam("fadeInSec", v)}
                    display={(v) => `${v.toFixed(1)}s`}
                    disabled={busy}
                  />
                  <ParamSlider
                    label="Fade Out"
                    value={params.fadeOutSec || 0}
                    min={0}
                    max={5}
                    step={0.2}
                    onChange={(v) => updateParam("fadeOutSec", v)}
                    display={(v) => `${v.toFixed(1)}s`}
                    disabled={busy}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Export Configuration, Telemetry & Output */}
        <div className="lg:col-span-5 space-y-4">
          {/* Export Settings Card */}
          <div className="panel-hud p-5 rounded-tactile border border-border/70 bg-card/50 space-y-4">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Export & Encoding Pipeline
            </h2>

            <ParamSelect
              label="Output Container"
              value={format}
              onChange={(v) => setFormat(v as AudioFormat)}
              options={FORMAT_OPTIONS}
              disabled={busy}
            />

            {(format === "mp3" || format === "m4a") && (
              <ParamSelect
                label="Audio Bitrate"
                value={kbps}
                onChange={setKbps}
                options={BITRATE_OPTIONS}
                disabled={busy}
              />
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={!file || busy}
              onClick={handleRunProcessing}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all duration-200 shadow-elevation2 ${
                !file || busy
                  ? "bg-muted text-muted-foreground border border-border/50 cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] glow-box-violet cursor-pointer"
              }`}
            >
              <Wand2 className="size-4" />
              {busy ? "Rendering Audio (WASM)..." : `Apply ${activeToolMeta.name}`}
            </button>
          </div>

          {/* Real-time WASM Telemetry Progress Bar */}
          {busy && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="panel-hud p-4 rounded-tactile border border-primary/40 bg-card/60 space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-foreground font-medium flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-primary animate-ping" />
                  {currentPassLabel || "Processing..."}
                </span>
                <span className="text-primary font-bold">{progress}%</span>
              </div>

              {/* Progress Bar Track */}
              <div className="h-2 w-full bg-background/80 rounded-full overflow-hidden border border-border/60">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary via-neon to-cyan-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut", duration: 0.2 }}
                />
              </div>

              <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                <span>Memory Safe WASM Execution</span>
                <span className="flex items-center gap-2">
                  {etaSeconds !== null && (
                    <span className="text-primary font-semibold">ETA ~{etaSeconds}s</span>
                  )}
                  <span>{(elapsedMs / 1000).toFixed(1)}s elapsed</span>
                </span>
              </div>
            </motion.div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="panel-hud p-4 rounded-tactile border border-destructive/40 bg-destructive/10 text-destructive text-xs font-mono">
              <p className="font-bold mb-1">Processing Failed:</p>
              <p className="text-destructive/90">{error}</p>
            </div>
          )}

          {/* Output Card */}
          {result && (
            <OutputCard
              output={result}
              badge={`${activeToolMeta.name} applied`}
              badgeTone="neon"
              onClear={reset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
