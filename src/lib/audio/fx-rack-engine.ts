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

      case "reverb": {
        const spacePreset = mod.params.preset || "medium-room";
        const space = REVERB_SPACES[spacePreset] || REVERB_SPACES["medium-room"];
        const spaceFilters = space.buildFilter(44100);
        // Exclude trailing limiter from sub-space to prevent limiter cascade
        const filtered = spaceFilters.filter((f) => !f.startsWith("alimiter="));
        filters.push(...filtered);
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

      case "reverb": {
        const wet = Math.max(0, Math.min(1, mod.wetDry ?? 0.3));
        const wetGain = ctx.createGain();
        wetGain.gain.value = wet;
        const dryGain = ctx.createGain();
        dryGain.gain.value = 1.0 - wet * 0.4;

        const delay = ctx.createDelay();
        delay.delayTime.value = 0.028;
        const damp = ctx.createBiquadFilter();
        damp.type = "lowpass";
        damp.frequency.value = 4800;

        const summer = ctx.createGain();

        currentHead.connect(dryGain);
        dryGain.connect(summer);

        currentHead.connect(delay);
        delay.connect(damp);
        damp.connect(wetGain);
        wetGain.connect(summer);

        currentHead = summer;
        nodesToCleanup.push(wetGain, dryGain, delay, damp, summer);
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
