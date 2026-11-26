/**
 * ZenoDeck — Modular Real-Time Audio FX Rack Engine
 * ==================================================
 * Multi-effect cascade manager supporting dynamic module chaining,
 * per-slot bypass, wet/dry blend, smooth parameter de-zippering,
 * real-time Web Audio API auditioning, and 1-pass offline FFmpeg compilation.
 */

import {
  FXRackConfig,
  FXRackModuleConfig,
  FXRackModuleId,
  ISO_10_BAND_FREQUENCIES,
  clampGain,
} from "./dsp-types";
import { REVERB_SPACES, BASS_BOOST_TIERS, type BassTier } from "../audio-dsp";

export const DEFAULT_FX_RACK_CONFIG: FXRackConfig = {
  isBypassed: false,
  masterGainDb: 0,
  modules: [
    {
      id: "tempo-changer",
      name: "Tempo & Pitch Shifter",
      enabled: false,
      wetDry: 1.0,
      params: { tempo: 0.87, preservePitch: false },
    },
    {
      id: "pre-amp",
      name: "Pre-Amp & DC Guard",
      enabled: false,
      wetDry: 1.0,
      params: { gainDb: 0, highpassHz: 25 },
    },
    {
      id: "bass-booster",
      name: "Dynamic Bass Booster",
      enabled: false,
      wetDry: 1.0,
      params: { tier: 3, cutoff: 80, clarity: true },
    },
    {
      id: "equalizer",
      name: "10-Band Graphic EQ",
      enabled: false,
      wetDry: 1.0,
      params: { gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    },
    {
      id: "saturation",
      name: "Tape / Analog Warmth",
      enabled: false,
      wetDry: 1.0,
      params: { warmth: 0.35 },
    },
    {
      id: "stereo-imager",
      name: "Stereo Imager & Dimension",
      enabled: false,
      wetDry: 1.0,
      params: { width: 1.25, pan: 0 },
    },
    {
      id: "spatial-8d",
      name: "8D Spatial Panner",
      enabled: false,
      wetDry: 1.0,
      params: {
        orbitRateHz: 0.12,
        panDepth: 0.88,
        haasDelayMs: 0.35,
        rearHeadLowpassHz: 7200,
        bassMonoCrossoverHz: 120,
      },
    },
    {
      id: "reverb",
      name: "Studio Reverb",
      enabled: false,
      wetDry: 0.3,
      params: { preset: "medium-room" },
    },
    {
      id: "master-limiter",
      name: "Broadcast Peak Limiter",
      enabled: true,
      wetDry: 1.0,
      params: { ceilingDb: -0.2, attackMs: 4, releaseMs: 60 },
    },
  ],
};

/**
 * Default "Slowed + Reverb (Studio Balanced)" Preset:
 * Signal Chain Order: 1. Tempo Changer -> 2. Reverb
 * - Tempo Changer: tempo 0.87, preservePitch false (analog tape pitch drop)
 * - Reverb: reverberance 45%, roomScale 90%, hfDamping 65% (~4800Hz),
 *           preDelayMs 35ms, stereoDepth 100%, wetGainDb -5.0dB, wetHighPassHz 140Hz
 */
export const SLOWED_REVERB_STUDIO_PRESET: FXRackConfig = {
  isBypassed: false,
  masterGainDb: 0,
  modules: [
    {
      id: "tempo-changer",
      name: "Tempo & Pitch Shifter",
      enabled: true,
      wetDry: 1.0,
      params: {
        tempo: 0.87,
        preservePitch: false,
      },
    },
    {
      id: "reverb",
      name: "Studio Reverb",
      enabled: true,
      wetDry: 0.562, // 10^(-5/20) = ~0.5623
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
    },
    {
      id: "master-limiter",
      name: "Broadcast Peak Limiter",
      enabled: true,
      wetDry: 1.0,
      params: { ceilingDb: -0.5, attackMs: 4, releaseMs: 60 },
    },
  ],
};

/**
 * Secondary Preset "Slowed + Reverb (Deep Atmospheric / Phonk)":
 * - Tempo: 0.84 (preservePitch: false)
 * - Reverb: reverberance 58%, roomScale 100%, hfDamping 70%,
 *           preDelayMs 25ms, stereoDepth 100%, wetGainDb -3.5dB, wetHighPassHz 150Hz
 */
export const SLOWED_REVERB_PHONK_PRESET: FXRackConfig = {
  isBypassed: false,
  masterGainDb: 0,
  modules: [
    {
      id: "tempo-changer",
      name: "Tempo & Pitch Shifter",
      enabled: true,
      wetDry: 1.0,
      params: {
        tempo: 0.84,
        preservePitch: false,
      },
    },
    {
      id: "reverb",
      name: "Studio Reverb",
      enabled: true,
      wetDry: 0.668, // 10^(-3.5/20) = ~0.6683
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
    },
    {
      id: "master-limiter",
      name: "Broadcast Peak Limiter",
      enabled: true,
      wetDry: 1.0,
      params: { ceilingDb: -0.5, attackMs: 4, releaseMs: 60 },
    },
  ],
};

/**
 * Preset A — "8D Spatial + Slowed & Reverb (Studio Balanced)":
 * Signal Chain: 1. Tempo Changer -> 2. 8D Spatial Panner -> 3. Stereo Reverb
 * - Stage 1 (Tempo Changer): tempo 0.87, preservePitch false (true analog tape drop)
 * - Stage 2 (8D Spatial Panner): orbitRateHz 0.12 (8.33s orbit), panDepth 0.88 (88%),
 *                                haasDelayMs 0.35ms, rearHeadLowpassHz 7200Hz, bassMonoCrossoverHz 120Hz
 * - Stage 3 (Stereo Reverb): preDelayMs 35ms, reverberance 46%, roomScale 92%, hfDamping 65%,
 *                            stereoDepth 100%, wetGainDb -5.5dB, wetHighPassHz 140Hz
 */
export const EIGHT_D_SLOWED_REVERB_STUDIO_PRESET: FXRackConfig = {
  isBypassed: false,
  masterGainDb: 0,
  modules: [
    {
      id: "tempo-changer",
      name: "Tempo Changer",
      enabled: true,
      wetDry: 1.0,
      params: {
        tempo: 0.87,
        preservePitch: false,
      },
    },
    {
      id: "spatial-8d",
      name: "8D Spatial Panner",
      enabled: true,
      wetDry: 1.0,
      params: {
        orbitRateHz: 0.12,
        panDepth: 0.88,
        haasDelayMs: 0.35,
        rearHeadLowpassHz: 7200,
        bassMonoCrossoverHz: 120,
      },
    },
    {
      id: "reverb",
      name: "Stereo Reverb",
      enabled: true,
      wetDry: 0.531, // 10^(-5.5/20) = ~0.5309
      params: {
        preset: "slowed-reverb-8d",
        preDelayMs: 35,
        reverberance: 46,
        roomScale: 92,
        hfDamping: 65,
        stereoDepth: 100,
        wetGainDb: -5.5,
        wetHighPassHz: 140,
      },
    },
    {
      id: "master-limiter",
      name: "Broadcast Peak Limiter",
      enabled: true,
      wetDry: 1.0,
      params: { ceilingDb: -0.5, attackMs: 4, releaseMs: 60 },
    },
  ],
};

/**
 * Preset B — "8D Spatial + Slowed & Reverb (Deep Hypnotic)":
 * Signal Chain: 1. Tempo Changer -> 2. 8D Spatial Panner -> 3. Stereo Reverb
 * - Stage 1: tempo 0.84, preservePitch false
 * - Stage 2: orbitRateHz 0.09 (11.1s orbit), panDepth 0.94 (94%),
 *            haasDelayMs 0.45ms, rearHeadLowpassHz 5800Hz, bassMonoCrossoverHz 120Hz
 * - Stage 3: preDelayMs 28ms, reverberance 56%, roomScale 100%, hfDamping 70%,
 *            stereoDepth 100%, wetGainDb -4.0dB, wetHighPassHz 150Hz
 */
export const EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET: FXRackConfig = {
  isBypassed: false,
  masterGainDb: 0,
  modules: [
    {
      id: "tempo-changer",
      name: "Tempo Changer",
      enabled: true,
      wetDry: 1.0,
      params: {
        tempo: 0.84,
        preservePitch: false,
      },
    },
    {
      id: "spatial-8d",
      name: "8D Spatial Panner",
      enabled: true,
      wetDry: 1.0,
      params: {
        orbitRateHz: 0.09,
        panDepth: 0.94,
        haasDelayMs: 0.45,
        rearHeadLowpassHz: 5800,
        bassMonoCrossoverHz: 120,
      },
    },
    {
      id: "reverb",
      name: "Stereo Reverb",
      enabled: true,
      wetDry: 0.631, // 10^(-4.0/20) = ~0.6310
      params: {
        preset: "slowed-reverb-8d-hypnotic",
        preDelayMs: 28,
        reverberance: 56,
        roomScale: 100,
        hfDamping: 70,
        stereoDepth: 100,
        wetGainDb: -4.0,
        wetHighPassHz: 150,
      },
    },
    {
      id: "master-limiter",
      name: "Broadcast Peak Limiter",
      enabled: true,
      wetDry: 1.0,
      params: { ceilingDb: -0.5, attackMs: 4, releaseMs: 60 },
    },
  ],
};

export const SLOWED_REVERB_8D_STUDIO_PRESET = EIGHT_D_SLOWED_REVERB_STUDIO_PRESET;
export const SLOWED_REVERB_8D_HYPNOTIC_PRESET = EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET;

export const SLOWED_REVERB_PRESETS = {
  "studio-balanced": SLOWED_REVERB_STUDIO_PRESET,
  "deep-atmospheric-phonk": SLOWED_REVERB_PHONK_PRESET,
  "8d-slowed-reverb-studio": EIGHT_D_SLOWED_REVERB_STUDIO_PRESET,
  "8d-slowed-reverb-hypnotic": EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET,
} as const;

/**
 * Synthesizes a deterministic stereo Impulse Response buffer (early reflections + velvet noise decay)
 */
export function createStudioImpulseResponse(
  ctx: BaseAudioContext,
  decaySec: number = 2.5,
  dampingHz: number = 4800,
  preDelayMs: number = 0
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * decaySec));
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const preDelaySamples = Math.floor((preDelayMs / 1000) * sampleRate);
  const decayConstant = 6.91 / (decaySec * sampleRate);

  for (let i = 0; i < length; i++) {
    if (i < preDelaySamples) {
      left[i] = 0;
      right[i] = 0;
      continue;
    }
    const n = i - preDelaySamples;
    const env = Math.exp(-decayConstant * n);
    const isEarly = n < sampleRate * 0.05;
    const density = isEarly ? 0.35 : 1.0;
    left[i] = (Math.random() * 2 - 1) * env * density;
    right[i] = (Math.random() * 2 - 1) * env * density;
  }
  return buffer;
}

/**
 * Compiles the active FX rack configuration into an optimized FFmpeg filterchain.
 */
export function buildFXRackFilterChain(config: FXRackConfig): string[] {
  if (config.isBypassed) {
    return [];
  }

  const filters: string[] = [
    // Input format normalization
    "aformat=sample_fmts=fltp:channel_layouts=stereo",
  ];

  for (const mod of config.modules) {
    if (!mod.enabled) continue;

    switch (mod.id) {
      case "tempo-changer": {
        const tempo = Number(mod.params.tempo ?? 0.87);
        const preservePitch = mod.params.preservePitch === true;
        if (!preservePitch) {
          filters.push(`asetrate=44100*${tempo.toFixed(4)}`);
          filters.push("aresample=44100");
        } else {
          let rem = tempo;
          while (rem < 0.5) { filters.push("atempo=0.5"); rem /= 0.5; }
          while (rem > 2.0) { filters.push("atempo=2.0"); rem /= 2.0; }
          filters.push(`atempo=${rem.toFixed(4)}`);
        }
        break;
      }

      case "pre-amp": {
        const hp = mod.params.highpassHz || 25;
        filters.push(`highpass=f=${hp}:p=2`);
        if (mod.params.gainDb && mod.params.gainDb !== 0) {
          filters.push(`volume=${Number(mod.params.gainDb).toFixed(1)}dB`);
        }
        break;
      }

      case "bass-booster": {
        const tierKey = (mod.params.tier as BassTier) || 3;
        const tier = BASS_BOOST_TIERS[tierKey] || BASS_BOOST_TIERS[3];
        const gain = typeof mod.params.customGainDb === "number" ? mod.params.customGainDb : tier.gain;
        const cutoff = mod.params.cutoff || tier.defaultCutoff;

        filters.push(`bass=g=${gain.toFixed(1)}:f=${cutoff}`);
        if (mod.params.clarity !== false) {
          const clarityGain = Math.min(3.5, 1.5 + gain * 0.12).toFixed(1);
          filters.push(`treble=g=${clarityGain}:f=6500`);
        }
        const headroomDb = (gain * 0.55).toFixed(1);
        filters.push(`volume=-${headroomDb}dB`);
        break;
      }

      case "equalizer": {
        const gains: number[] = Array.isArray(mod.params.gains)
          ? mod.params.gains
          : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        ISO_10_BAND_FREQUENCIES.forEach((freq, idx) => {
          const g = clampGain(gains[idx] || 0);
          if (g !== 0) {
            filters.push(`equalizer=f=${freq}:width_type=o:width=1.0:g=${g.toFixed(1)}`);
          }
        });
        break;
      }

      case "saturation": {
        const warmth = Math.max(0, Math.min(1, mod.params.warmth ?? 0.35));
        if (warmth > 0) {
          const paramVal = (1.0 + warmth * 0.8).toFixed(2);
          filters.push(`asoftclip=type=tan:param=${paramVal}`);
        }
        break;
      }

      case "stereo-imager": {
        const width = Math.max(0.5, Math.min(2.0, mod.params.width ?? 1.25));
        const pan = Math.max(-1, Math.min(1, mod.params.pan ?? 0));
        if (width !== 1.0 || pan !== 0) {
          filters.push(`stereotools=mlev=1.0:slev=${width.toFixed(2)}:mpan=${pan.toFixed(2)}`);
        }
        break;
      }

      case "spatial-8d": {
        const p = mod.params || {};
        const orbitRateHz = typeof p.orbitRateHz === "number" ? p.orbitRateHz : 0.12;
        const panDepth = typeof p.panDepth === "number" ? p.panDepth : 0.88;
        const bassMonoCrossoverHz = typeof p.bassMonoCrossoverHz === "number" ? p.bassMonoCrossoverHz : 120;
        filters.push(
          `asplit=2[bass_in][spatial_in];[bass_in]lowpass=f=${bassMonoCrossoverHz},pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1[bass_mono];[spatial_in]highpass=f=${bassMonoCrossoverHz},apulsator=mode=sine:hz=${orbitRateHz}:amount=${panDepth}:offset_l=0:offset_r=0.5[spatial_orbit];[bass_mono][spatial_orbit]amix=inputs=2:weights=1 1:normalize=0`
        );
        break;
      }

      case "reverb": {
        const p = mod.params || {};
        if (p.preset?.startsWith("slowed-reverb") || p.preDelayMs !== undefined) {
          const preDelayMs = p.preDelayMs ?? 35;
          const wetHighPassHz = p.wetHighPassHz ?? 140;
          const hfDamping = p.hfDamping ?? 65;
          const lowpassHz = p.lowpassHz ?? Math.max(1500, Math.round(14000 - (hfDamping / 100) * 14154));
          const wetGainDb = p.wetGainDb ?? -5.0;
          filters.push(
            `asplit=2[dry][wet];[wet]adelay=${preDelayMs}|${preDelayMs},highpass=f=${wetHighPassHz},aecho=0.8:0.88:60|120:0.4|0.25,lowpass=f=${lowpassHz},stereotools=mlev=1.0:slev=1.2,volume=${wetGainDb}dB[w];[dry][w]amix=inputs=2:weights=1 1:normalize=0,alimiter=limit=0.944`
          );
        } else {
          const spacePreset = p.preset || "medium-room";
          const space = REVERB_SPACES[spacePreset] || REVERB_SPACES["medium-room"];
          const spaceFilters = space.buildFilter(44100);
          // Exclude trailing limiter from sub-space to prevent limiter cascade
          const filtered = spaceFilters.filter((f) => !f.startsWith("alimiter="));
          filters.push(...filtered);
        }
        break;
      }

      case "master-limiter": {
        const ceilingDb = mod.params.ceilingDb ?? -0.2;
        const ceilingLin = Math.min(0.995, Math.pow(10, ceilingDb / 20)).toFixed(4);
        const attack = mod.params.attackMs || 4;
        const release = mod.params.releaseMs || 60;
        filters.push(`alimiter=level_in=1.0:level_out=${ceilingLin}:limit=${ceilingLin}:attack=${attack}:release=${release}`);
        break;
      }
    }
  }

  // Master Gain adjustment
  if (config.masterGainDb && config.masterGainDb !== 0) {
    filters.push(`volume=${config.masterGainDb.toFixed(1)}dB`);
  }

  // Final true-peak safety ceiling
  if (!filters.some((f) => f.includes("alimiter="))) {
    filters.push("alimiter=level_in=1.0:level_out=0.98:limit=0.98:attack=4:release=60");
  }

  return filters;
}

/**
 * Creates live Web Audio API nodes for previewing the entire FX Rack in real time.
 */
export function createFXRackWebAudioNodes(
  ctx: AudioContext,
  source: AudioNode,
  config: FXRackConfig
): {
  masterGain: GainNode;
  cleanup: () => void;
} {
  const masterGain = ctx.createGain();
  masterGain.gain.value = Math.pow(10, (config.masterGainDb || 0) / 20);

  if (config.isBypassed) {
    source.connect(masterGain);
    return {
      masterGain,
      cleanup: () => {
        try { source.disconnect(masterGain); } catch {}
      },
    };
  }

  const nodesToCleanup: AudioNode[] = [masterGain];
  let currentHead: AudioNode = source;

  for (const mod of config.modules) {
    if (!mod.enabled) continue;

    switch (mod.id) {
      case "tempo-changer": {
        // Handled via audioRef.playbackRate & preservesPitch in MediaElement
        break;
      }

      case "pre-amp": {
        const hpf = ctx.createBiquadFilter();
        hpf.type = "highpass";
        hpf.frequency.value = mod.params.highpassHz || 25;
        currentHead.connect(hpf);
        currentHead = hpf;
        nodesToCleanup.push(hpf);

        if (mod.params.gainDb && mod.params.gainDb !== 0) {
          const preGain = ctx.createGain();
          preGain.gain.value = Math.pow(10, mod.params.gainDb / 20);
          currentHead.connect(preGain);
          currentHead = preGain;
          nodesToCleanup.push(preGain);
        }
        break;
      }

      case "bass-booster": {
        const tierKey = (mod.params.tier as BassTier) || 3;
        const tier = BASS_BOOST_TIERS[tierKey] || BASS_BOOST_TIERS[3];
        const gain = typeof mod.params.customGainDb === "number" ? mod.params.customGainDb : tier.gain;
        const cutoff = mod.params.cutoff || tier.defaultCutoff;

        const bassFilter = ctx.createBiquadFilter();
        bassFilter.type = "lowshelf";
        bassFilter.frequency.value = cutoff;
        bassFilter.gain.value = gain;

        currentHead.connect(bassFilter);
        currentHead = bassFilter;
        nodesToCleanup.push(bassFilter);

        if (mod.params.clarity !== false) {
          const trebleFilter = ctx.createBiquadFilter();
          trebleFilter.type = "highshelf";
          trebleFilter.frequency.value = 6500;
          trebleFilter.gain.value = Math.min(3.5, 1.5 + gain * 0.12);
          currentHead.connect(trebleFilter);
          currentHead = trebleFilter;
          nodesToCleanup.push(trebleFilter);
        }
        break;
      }

      case "equalizer": {
        const gains: number[] = Array.isArray(mod.params.gains)
          ? mod.params.gains
          : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        ISO_10_BAND_FREQUENCIES.forEach((freq, idx) => {
          const g = clampGain(gains[idx] || 0);
          if (g !== 0) {
            const filter = ctx.createBiquadFilter();
            filter.type = "peaking";
            filter.frequency.value = freq;
            filter.Q.value = 1.0;
            filter.gain.value = g;
            currentHead.connect(filter);
            currentHead = filter;
            nodesToCleanup.push(filter);
          }
        });
        break;
      }

      case "saturation": {
        const warmth = Math.max(0, Math.min(1, mod.params.warmth ?? 0.35));
        if (warmth > 0) {
          const shaper = ctx.createWaveShaper();
          const samples = 512;
          const curve = new Float32Array(samples);
          const k = warmth * 2.5;
          for (let i = 0; i < samples; ++i) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
          }
          shaper.curve = curve;
          currentHead.connect(shaper);
          currentHead = shaper;
          nodesToCleanup.push(shaper);
        }
        break;
      }

      case "stereo-imager": {
        if (ctx.createStereoPanner) {
          const panner = ctx.createStereoPanner();
          panner.pan.value = Math.max(-1, Math.min(1, mod.params.pan ?? 0));
          currentHead.connect(panner);
          currentHead = panner;
          nodesToCleanup.push(panner);
        }
        break;
      }

      case "spatial-8d": {
        const p = mod.params || {};
        const orbitRateHz = typeof p.orbitRateHz === "number" ? p.orbitRateHz : 0.12;
        const panDepth = typeof p.panDepth === "number" ? p.panDepth : 0.88;
        const haasDelayMs = typeof p.haasDelayMs === "number" ? p.haasDelayMs : 0.35;
        const rearHeadLowpassHz = typeof p.rearHeadLowpassHz === "number" ? p.rearHeadLowpassHz : 7200;
        const bassMonoCrossoverHz = typeof p.bassMonoCrossoverHz === "number" ? p.bassMonoCrossoverHz : 120;

        // 1. Crossover splitter at bassMonoCrossoverHz (120 Hz)
        // Low Band (< 120 Hz): Summed to mono center
        const lowpassFilter = ctx.createBiquadFilter();
        lowpassFilter.type = "lowpass";
        lowpassFilter.frequency.value = bassMonoCrossoverHz;

        const monoBassGain = ctx.createGain();
        monoBassGain.gain.value = 1.0;
        currentHead.connect(lowpassFilter);
        lowpassFilter.connect(monoBassGain);

        // High Band (>= 120 Hz): 8D Spatial Panner with LFO + Haas delay + Rear-azimuth LPF
        const highpassFilter = ctx.createBiquadFilter();
        highpassFilter.type = "highpass";
        highpassFilter.frequency.value = bassMonoCrossoverHz;
        currentHead.connect(highpassFilter);

        let spatialOutput: AudioNode = highpassFilter;

        if (ctx.createStereoPanner) {
          const pannerNode = ctx.createStereoPanner();
          const lfoOsc = ctx.createOscillator();
          const lfoGain = ctx.createGain();

          lfoOsc.type = "sine";
          lfoOsc.frequency.value = orbitRateHz;
          lfoGain.gain.value = panDepth;

          lfoOsc.connect(lfoGain);
          lfoGain.connect(pannerNode.pan);
          try { lfoOsc.start(); } catch {}

          highpassFilter.connect(pannerNode);

          // Haas micro delay (0.35 ms = 0.00035s)
          const haasDelay = ctx.createDelay(0.01);
          haasDelay.delayTime.value = Math.max(0.0001, haasDelayMs / 1000);
          pannerNode.connect(haasDelay);

          // Rear-azimuth lowpass filter (7200 Hz)
          const rearLpf = ctx.createBiquadFilter();
          rearLpf.type = "lowpass";
          rearLpf.frequency.value = rearHeadLowpassHz;
          haasDelay.connect(rearLpf);

          spatialOutput = rearLpf;
          nodesToCleanup.push(lfoOsc, lfoGain, pannerNode, haasDelay, rearLpf);
        }

        // Recombine Low mono bass + High 8D spatial band
        const combiner = ctx.createGain();
        combiner.gain.value = 1.0;
        monoBassGain.connect(combiner);
        spatialOutput.connect(combiner);

        currentHead = combiner;
        nodesToCleanup.push(lowpassFilter, monoBassGain, highpassFilter, combiner);
        break;
      }

      case "reverb": {
        const p = mod.params || {};
        const preDelayMs = typeof p.preDelayMs === "number" ? p.preDelayMs : 35;
        const wetHighPassHz = typeof p.wetHighPassHz === "number" ? p.wetHighPassHz : 140;
        const hfDamping = typeof p.hfDamping === "number" ? p.hfDamping : 65;
        const lowpassHz = typeof p.lowpassHz === "number" ? p.lowpassHz : Math.max(1500, Math.round(14000 - (hfDamping / 100) * 14154));
        const wetGainDb = typeof p.wetGainDb === "number" ? p.wetGainDb : -5.0;
        const wetGainLinear = typeof p.wetGainDb === "number" ? Math.pow(10, wetGainDb / 20) : (mod.wetDry ?? 0.562);
        const dryGainLinear = 1.0;

        const dryGain = ctx.createGain();
        dryGain.gain.value = dryGainLinear;

        // 1. DelayNode for pre-delay (preDelayMs / 1000, 0.035s default)
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = Math.max(0, Math.min(1.0, preDelayMs / 1000));

        // 2. BiquadFilterNode highpass at 140Hz (strips low-mid mud from wet path)
        const highpass = ctx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = wetHighPassHz;

        // 3. BiquadFilterNode lowpass mapped from hfDamping (~4800Hz at 65% damping)
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = lowpassHz;

        // 4. ConvolverNode + wet GainNode (Math.pow(10, wetGainDb / 20) = 0.562 at -5 dB)
        const convolver = ctx.createConvolver();
        try {
          const roomSec = typeof p.roomScale === "number" ? p.roomScale / 30 : 3.0;
          convolver.buffer = createStudioImpulseResponse(ctx, roomSec, lowpassHz, 0);
        } catch {}

        const wetGain = ctx.createGain();
        wetGain.gain.value = wetGainLinear;

        const summer = ctx.createGain();

        // Connect Dry Path: currentHead -> dryGain -> summer
        currentHead.connect(dryGain);
        dryGain.connect(summer);

        // Connect Wet Path: currentHead -> delay -> highpass -> lowpass -> convolver -> wetGain -> summer
        currentHead.connect(delay);
        delay.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(summer);

        // Master brickwall safety limiter with -0.5 dB ceiling
        const brickwallLimiter = ctx.createDynamicsCompressor();
        brickwallLimiter.threshold.value = -0.5;
        brickwallLimiter.knee.value = 0;
        brickwallLimiter.ratio.value = 20;
        brickwallLimiter.attack.value = 0.003;
        brickwallLimiter.release.value = 0.05;

        summer.connect(brickwallLimiter);
        currentHead = brickwallLimiter;

        nodesToCleanup.push(dryGain, delay, highpass, lowpass, convolver, wetGain, summer, brickwallLimiter);
        break;
      }

      case "master-limiter": {
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = mod.params.ceilingDb ?? -0.2;
        limiter.knee.value = 0;
        limiter.ratio.value = 20;
        limiter.attack.value = (mod.params.attackMs || 4) / 1000;
        limiter.release.value = (mod.params.releaseMs || 60) / 1000;
        currentHead.connect(limiter);
        currentHead = limiter;
        nodesToCleanup.push(limiter);
        break;
      }
    }
  }

  currentHead.connect(masterGain);

  return {
    masterGain,
    cleanup: () => {
      nodesToCleanup.forEach((n) => {
        try { n.disconnect(); } catch {}
      });
    },
  };
}
