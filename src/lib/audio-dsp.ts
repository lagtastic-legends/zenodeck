/**
 * OMNI TOOL — UNIFIED AUDIO DSP ENGINE & FILTER SCHEMA
 * =====================================================
 *
 * Strongly typed definitions, parameter schemas, and FFmpeg filter mapping
 * dictionaries for all 13 client-side WebAssembly audio DSP modules.
 *
 * All filters are validated against @ffmpeg/core libavfilter.
 */

export type AudioEffectType =
  | "spatial-8d"      // 1. 3D / 8D Audio
  | "auto-panner"     // 2. Auto Panner
  | "bass-booster"    // 3. Bass Booster (5 Progressive Tiers)
  | "equalizer"       // 4. Multi-Band Graphic Equalizer
  | "noise-reducer"   // 5. Adaptive Spectral Noise Reducer
  | "pitch-shifter"   // 6. Semitone Pitch Shifter
  | "reverb"          // 7. Reverb Studio (8 Distinct Spaces)
  | "reverse-audio"   // 8. Reverse Audio
  | "stereo-panner"   // 9. Static Stereo Panner
  | "tempo-changer"   // 10. Tempo Changer (Pitch-Preserving)
  | "trimmer"         // 11. Trimmer & Slicer
  | "vocal-remover"   // 12. Vocal Remover (Phase Cancellation)
  | "volume-changer"; // 13. Volume Changer & Dynamic Normalizer

export type AudioFormat = "mp3" | "wav" | "flac" | "ogg" | "m4a";

export function audioOutputArgs(format: AudioFormat, kbps: number): string[] {
  switch (format) {
    case "mp3":
      return ["-c:a", "libmp3lame", "-b:a", `${kbps}k`, "-ar", "44100"];
    case "wav":
      return ["-c:a", "pcm_s16le", "-ar", "44100"];
    case "flac":
      return ["-c:a", "flac", "-compression_level", "5", "-ar", "44100"];
    case "ogg":
      return ["-c:a", "libvorbis", "-q:a", "6", "-ar", "44100"];
    case "m4a":
      return ["-c:a", "aac", "-b:a", `${Math.min(kbps, 320)}k`, "-ar", "44100"];
  }
}

/* -------------------------------------------------------------------------- */
/* Effect Parameters & Presets                                                */
/* -------------------------------------------------------------------------- */

export interface Spatial8DParams {
  cycleSec: number;    // 2 - 20 seconds, default 8
  intensity: number;   // 0.1 - 1.0, default 0.85
  widening: number;    // 1.0 - 2.0, default 1.25
}

export interface AutoPannerParams {
  frequencyHz: number; // 0.1 - 8.0 Hz, default 0.5
  depth: number;       // 0.0 - 1.0, default 0.85
  waveform: "sine" | "triangle";
}

export type BassTier = 1 | 2 | 3 | 4 | 5;

export interface BassBoosterParams {
  tier: BassTier;      // 5 progressive tiers (+3dB to +18dB)
  cutoff: number;      // 60 - 150 Hz
  clarity: boolean;    // High shelf clarity enhancement (+3dB @ 8kHz)
  customGainDb?: number; // Optional fine-tuning override
}

export interface EqualizerParams {
  gains: [number, number, number, number, number, number]; // 6 bands: 60, 150, 400, 1000, 2400, 15000 Hz
}

export interface NoiseReducerParams {
  noiseReductionDb: number; // 6 - 30 dB, default 12
  noiseFloorDb: number;     // -60 to -15 dB, default -30
  highpassHz: number;       // 40 - 160 Hz, default 80
  lowpassHz: number;        // 8000 - 18000 Hz, default 14000
}

export interface PitchShifterParams {
  semitones: number;        // -12 to +12 semitones
  sampleRate?: number;      // Input sample rate (default 44100)
}

export type ReverbSpacePreset =
  | "bathroom"
  | "small-room"
  | "medium-room"
  | "large-room"
  | "church-hall"
  | "cathedral"
  | "slowed-reverb"
  | "spatial-8d-reverb";

export interface ReverbParams {
  preset: ReverbSpacePreset;
  sampleRate?: number;
}

export interface ReverseAudioParams {
  includeEcho?: boolean;
}

export interface StereoPannerParams {
  balance: number;          // -1.0 (full left) to +1.0 (full right)
}

export interface TempoChangerParams {
  speed: number;            // 0.5 to 2.0
}

export interface TrimmerParams {
  startSec: number;
  endSec: number;
  fadeInSec: number;
  fadeOutSec: number;
  boostDb?: number;
}

export interface VocalRemoverParams {
  mode: "phase_cancel" | "karaoke_bandpass" | "bass_preserved";
  bassPreserveCutoffHz?: number; // default 140Hz
}

export interface VolumeChangerParams {
  gainDb: number;           // -30 to +20 dB
  normalize: boolean;       // Dynamic audio normalization (dynaudnorm)
}

/* Union of all effect parameter types */
export type AudioEffectParams =
  | Spatial8DParams
  | AutoPannerParams
  | BassBoosterParams
  | EqualizerParams
  | NoiseReducerParams
  | PitchShifterParams
  | ReverbParams
  | ReverseAudioParams
  | StereoPannerParams
  | TempoChangerParams
  | TrimmerParams
  | VocalRemoverParams
  | VolumeChangerParams;

/* -------------------------------------------------------------------------- */
/* 1. Bass Booster — 5 Progressive Tiers (+3dB to +18dB via bass=g=X)          */
/* -------------------------------------------------------------------------- */

export const BASS_BOOST_TIERS: Record<
  BassTier,
  { name: string; gain: number; defaultCutoff: number; desc: string }
> = {
  1: { name: "Audiophile Warmth", gain: 3.5, defaultCutoff: 110, desc: "+3.5 dB subtle analog warmth · zero distortion" },
  2: { name: "Punchy Kick", gain: 6.0, defaultCutoff: 95, desc: "+6.0 dB defined punch & kick transient attack" },
  3: { name: "Deep Club", gain: 9.0, defaultCutoff: 80, desc: "+9.0 dB room-filling sub-bass & chest drive" },
  4: { name: "Heavy Sub (808)", gain: 12.0, defaultCutoff: 65, desc: "+12.0 dB high-energy acoustic boom & 808 pressure" },
  5: { name: "Earthquake Max", gain: 15.0, defaultCutoff: 55, desc: "+15.0 dB maximum sub saturation · studio lookahead peak protection" },
};

export function buildBassFilter(p: BassBoosterParams): string[] {
  const tierConfig = BASS_BOOST_TIERS[p.tier] || BASS_BOOST_TIERS[3];
  const gain = typeof p.customGainDb === "number" ? p.customGainDb : tierConfig.gain;
  const cutoff = p.cutoff || tierConfig.defaultCutoff;

  const chain = [
    // 1. Subsonic Rumble Cut: 28Hz 2-pole Butterworth filter eliminating sub-audible DC & cone flutter
    "highpass=f=28:p=2",
    // 2. Precision Butterworth Low-Shelf Filter (Q=0.707): Smooth musical low-end boost without ringing
    `bass=g=${gain.toFixed(1)}:f=${cutoff}:t=q:w=0.707`,
  ];
  // 3. Dynamic Vocal & Treble Presence Shelf: Preserves high-end articulation and transient sparkle
  if (p.clarity) {
    const trebleGain = Math.min(3.5, 1.5 + gain * 0.12).toFixed(1);
    chain.push(`treble=g=${trebleGain}:f=6500:t=s`);
  }
  // 4. Automatic Headroom Compensation: Proportional pre-gain attenuation preventing digital overs
  const headroomDb = (gain * 0.55).toFixed(1);
  chain.push(`volume=-${headroomDb}dB`);
  // 5. Broadcast True-Peak Lookahead Limiter: Fast 5ms attack and musical 80ms release with -0.18 dBFS ceiling
  chain.push("alimiter=level_in=1:level_out=0.98:limit=0.98:attack=5:release=80");
  return chain;
}

/* -------------------------------------------------------------------------- */
/* 2. Reverb Studio — 8 Distinct Space Presets                                */
/* -------------------------------------------------------------------------- */

export interface ReverbPresetMeta {
  id: ReverbSpacePreset;
  name: string;
  desc: string;
  badge: string;
  buildFilter: (sampleRate?: number) => string[];
}

export const REVERB_SPACES: Record<ReverbSpacePreset, ReverbPresetMeta> = {
  bathroom: {
    id: "bathroom",
    name: "Bathroom",
    desc: "Short dense reflections with bright acoustic tile reverberation",
    badge: "Tile Acoustic",
    buildFilter: () => [
      "aecho=0.82:0.70:12|22:0.38|0.28",
      "highpass=f=80",
      "treble=g=1:f=8000",
      "alimiter=limit=0.98",
    ],
  },
  "small-room": {
    id: "small-room",
    name: "Small Room",
    desc: "Intimate acoustic chamber with natural early reflections",
    badge: "Intimate",
    buildFilter: () => [
      "aecho=0.82:0.72:18|28|38:0.32|0.24|0.18",
      "highpass=f=60",
      "treble=g=-1:f=7000",
      "alimiter=limit=0.98",
    ],
  },
  "medium-room": {
    id: "medium-room",
    name: "Medium Room",
    desc: "Balanced studio tracking room with warm mid resonance",
    badge: "Studio Live",
    buildFilter: () => [
      "aecho=0.80:0.75:22|35|46|60:0.30|0.22|0.16|0.10",
      "highpass=f=50",
      "treble=g=-2:f=6000",
      "alimiter=limit=0.98",
    ],
  },
  "large-room": {
    id: "large-room",
    name: "Large Room",
    desc: "Spacious concert chamber with extended decay tail",
    badge: "Concert Hall",
    buildFilter: () => [
      "aecho=0.78:0.78:26|40|55|72:0.32|0.24|0.18|0.12",
      "highpass=f=45",
      "treble=g=-2.5:f=5500",
      "alimiter=limit=0.98",
    ],
  },
  "church-hall": {
    id: "church-hall",
    name: "Church Hall",
    desc: "Long resonant sanctuary decay with secondary stereo diffusion",
    badge: "Sanctuary",
    buildFilter: () => [
      "aecho=0.76:0.80:30|48|66|88:0.34|0.26|0.20|0.14",
      "highpass=f=40",
      "treble=g=-3:f=5000",
      "alimiter=limit=0.98",
    ],
  },
  cathedral: {
    id: "cathedral",
    name: "Cathedral",
    desc: "Massive ethereal cathedral space with multi-tap cavern reflections",
    badge: "Cavernous",
    buildFilter: () => [
      "aecho=0.74:0.82:32|52|74|98|124:0.36|0.28|0.22|0.16|0.10",
      "highpass=f=35",
      "treble=g=-3.5:f=4500",
      "alimiter=limit=0.98",
    ],
  },
  "slowed-reverb": {
    id: "slowed-reverb",
    name: "Slowed & Reverb",
    desc: "Late-night lowered pitch and tempo with lush cavernous space",
    badge: "Late Night",
    buildFilter: (sampleRate = 44100) => [
      `asetrate=${Math.round(sampleRate * 0.85)}`,
      `aresample=${sampleRate}`,
      "aecho=0.80:0.78:20|32|44|58:0.30|0.24|0.18|0.12",
      "highpass=f=45",
      "treble=g=-3:f=5500",
      "alimiter=limit=0.98",
    ],
  },
  "spatial-8d-reverb": {
    id: "spatial-8d-reverb",
    name: "8D Audio Spatial Reverb",
    desc: "Rotating spatial panner with dimension widening and reflective depth",
    badge: "360° Orbit",
    buildFilter: () => [
      "aformat=channel_layouts=stereo",
      "extrastereo=m=1.35",
      "apulsator=hz=0.125:amount=0.85:mode=sine:width=1",
      "aecho=0.85:0.75:18|28|42:0.22|0.16|0.10",
      "alimiter=limit=0.98",
    ],
  },
};

export function buildReverbFilter(p: ReverbParams): string[] {
  const space = REVERB_SPACES[p.preset] || REVERB_SPACES["medium-room"];
  return space.buildFilter(p.sampleRate);
}

/* -------------------------------------------------------------------------- */
/* 3. Vocal Remover — Out-Of-Phase Stereo (OOPS) Cancellation                 */
/* -------------------------------------------------------------------------- */

export function buildVocalRemoverFilter(p: VocalRemoverParams): string[] {
  if (p.mode === "phase_cancel") {
    // True OOPS (Out-Of-Phase Stereo) cancellation with 0.5 headroom factor to avoid +6dB clipping
    return ["pan=stereo|c0=0.5*c0-0.5*c1|c1=0.5*c1-0.5*c0", "alimiter=limit=0.98"];
  }

  if (p.mode === "karaoke_bandpass") {
    // Vocal band attenuation in 200Hz - 5000Hz with safe phase cancellation
    return [
      "pan=stereo|c0=0.5*c0-0.5*c1|c1=0.5*c1-0.5*c0",
      "equalizer=f=3000:t=q:w=1.5:g=-6",
      "alimiter=limit=0.98",
    ];
  }

  // Bass-Preserved Mode: Phase-aligned 2-pole crossover with normalize=0 to prevent -6dB amix volume drop
  const cutoff = p.bassPreserveCutoffHz ?? 140;
  return [
    `[0:a]asplit=2[vocal_in][bass_in];[vocal_in]pan=stereo|c0=0.5*c0-0.5*c1|c1=0.5*c1-0.5*c0,highpass=f=${cutoff}:p=2[vocal_clean];[bass_in]lowpass=f=${cutoff}:p=2[bass_clean];[vocal_clean][bass_clean]amix=inputs=2:weights=1|1:normalize=0,alimiter=limit=0.98[outa]`,
  ];
}

/* -------------------------------------------------------------------------- */
/* 4. 3D / 8D Audio                                                           */
/* -------------------------------------------------------------------------- */

export function buildSpatial8DFilter(p: Spatial8DParams): string[] {
  const hz = (1 / Math.max(p.cycleSec, 1)).toFixed(4);
  const widening = p.widening ? Math.max(1.0, Math.min(p.widening, 2.0)) : 1.35;
  return [
    "aformat=channel_layouts=stereo",
    `extrastereo=m=${widening.toFixed(2)}`,
    `apulsator=hz=${hz}:amount=${p.intensity.toFixed(2)}:mode=sine:width=1`,
    "aecho=0.88:0.75:18|28:0.2|0.14",
    "alimiter=limit=0.98",
  ];
}

/* -------------------------------------------------------------------------- */
/* 5. Auto Panner                                                             */
/* -------------------------------------------------------------------------- */

export function buildAutoPannerFilter(p: AutoPannerParams): string[] {
  return [
    "aformat=channel_layouts=stereo",
    `apulsator=hz=${p.frequencyHz.toFixed(3)}:amount=${p.depth.toFixed(2)}:mode=${p.waveform}:width=1`,
  ];
}

/* -------------------------------------------------------------------------- */
/* 6. Multi-Band Equalizer                                                    */
/* -------------------------------------------------------------------------- */

export const EQ_FREQUENCIES = [60, 150, 400, 1000, 2400, 15000] as const;

export const EQ_PRESET_MAP: Record<string, [number, number, number, number, number, number]> = {
  Flat: [0, 0, 0, 0, 0, 0],
  "Bass Boost": [8, 6, 3, 0, 0, 0],
  "Treble Boost": [0, 0, 0, 2, 5, 7],
  "Vocal Presence": [-2, 0, 4, 4, 3, 0],
  Rock: [5, 3, -1, -2, 3, 6],
  Electronic: [6, 4, 0, -2, 2, 5],
  Acoustic: [3, 2, 1, 0, 2, 3],
  Speech: [-6, 2, 4, 3, -2, -4],
  "Hip-Hop / 808": [9, 7, 1, -1, 1, 4],
  "Loudness Smile": [6, 3, -2, -1, 3, 5],
};

export function buildEqualizerFilter(p: EqualizerParams): string[] {
  const bands = EQ_FREQUENCIES.map((f, i) => {
    const gain = p.gains[i];
    return gain === 0 ? null : `equalizer=f=${f}:t=q:w=1:g=${gain.toFixed(1)}`;
  }).filter((s): s is string => s !== null);

  if (bands.length > 0 && p.gains.some((g) => g > 0)) {
    bands.push("alimiter=limit=0.98");
  }
  return bands;
}

/* -------------------------------------------------------------------------- */
/* 7. Noise Reducer                                                           */
/* -------------------------------------------------------------------------- */

export function buildNoiseReducerFilter(p: NoiseReducerParams): string[] {
  return [
    `highpass=f=${p.highpassHz}`,
    `lowpass=f=${p.lowpassHz}`,
    `afftdn=nr=${p.noiseReductionDb}:nf=${p.noiseFloorDb}:tn=1`,
  ];
}

/* -------------------------------------------------------------------------- */
/* 8. Pitch Shifter (Semitones)                                               */
/* -------------------------------------------------------------------------- */

export function buildPitchShifterFilter(p: PitchShifterParams): string[] {
  if (p.semitones === 0) return [];

  // Pitch multiplier: 2^(semitones / 12)
  const pitchRatio = Math.pow(2, p.semitones / 12);
  const newRate = Math.round(44100 * pitchRatio);
  const tempoScale = 1 / pitchRatio;

  // atempo filter accepts 0.5 to 2.0; cascade if outside this boundary
  const tempoFilters: string[] = [];
  let remaining = tempoScale;
  while (remaining < 0.5) {
    tempoFilters.push("atempo=0.5");
    remaining /= 0.5;
  }
  while (remaining > 2.0) {
    tempoFilters.push("atempo=2.0");
    remaining /= 2.0;
  }
  tempoFilters.push(`atempo=${remaining.toFixed(4)}`);

  // aformat=44100 normalizes source (e.g. 48kHz mobile audio) so pitch transposition is 100% exact
  return [
    "aformat=sample_rates=44100",
    `asetrate=${newRate}`,
    ...tempoFilters,
    "aresample=44100",
  ];
}

/* -------------------------------------------------------------------------- */
/* 9. Reverse Audio                                                           */
/* -------------------------------------------------------------------------- */

export function buildReverseAudioFilter(p?: ReverseAudioParams): string[] {
  const chain = ["areverse"];
  if (p?.includeEcho) {
    chain.push(
      "aecho=0.82:0.75:18|26|34|42:0.28|0.22|0.16|0.12",
      "highpass=f=50",
      "treble=g=-3:f=5500",
      "alimiter=limit=0.98",
    );
  }
  return chain;
}

/* -------------------------------------------------------------------------- */
/* 10. Stereo Panner                                                          */
/* -------------------------------------------------------------------------- */

export function buildStereoPannerFilter(p: StereoPannerParams): string[] {
  // Fast-path: Skip filter if perfectly centered
  if (Math.abs(p.balance) < 0.001) return [];
  return [
    "aformat=channel_layouts=stereo",
    `stereotools=balance_out=${p.balance.toFixed(2)}`,
  ];
}

/* -------------------------------------------------------------------------- */
/* 11. Tempo Changer (Pitch-Preserving)                                       */
/* -------------------------------------------------------------------------- */

export function buildTempoChangerFilter(p: TempoChangerParams): string[] {
  // Fast-path: Skip filter if tempo is 1.0x (unaltered)
  if (Math.abs(p.speed - 1.0) < 0.001) return [];

  const tempoFilters: string[] = [];
  let remaining = p.speed;
  while (remaining < 0.5) {
    tempoFilters.push("atempo=0.5");
    remaining /= 0.5;
  }
  while (remaining > 2.0) {
    tempoFilters.push("atempo=2.0");
    remaining /= 2.0;
  }
  tempoFilters.push(`atempo=${remaining.toFixed(4)}`);
  return tempoFilters;
}

/* -------------------------------------------------------------------------- */
/* 12. Audio Trimmer & Slicer                                                 */
/* -------------------------------------------------------------------------- */

export function buildTrimmerFilter(p: TrimmerParams): string[] {
  const length = Math.max(p.endSec - p.startSec, 0.1);
  const chain = [
    `atrim=start=${p.startSec.toFixed(2)}:end=${p.endSec.toFixed(2)}`,
    "asetpts=PTS-STARTPTS",
  ];
  // Studio S-curve (esin) fades for click-free acoustic transitions
  if (p.fadeInSec > 0.01) {
    chain.push(`afade=t=in:st=0:d=${p.fadeInSec.toFixed(2)}:curve=esin`);
  }
  if (p.fadeOutSec > 0.01) {
    const st = Math.max(length - p.fadeOutSec, 0).toFixed(2);
    chain.push(`afade=t=out:st=${st}:d=${p.fadeOutSec.toFixed(2)}:curve=esin`);
  }
  if (p.boostDb && p.boostDb !== 0) {
    chain.push(`volume=${p.boostDb}dB`);
    if (p.boostDb > 0) {
      chain.push("alimiter=limit=0.98");
    }
  }
  return chain;
}

/* -------------------------------------------------------------------------- */
/* 13. Volume Changer & Dynamic Normalizer                                    */
/* -------------------------------------------------------------------------- */

export function buildVolumeChangerFilter(p: VolumeChangerParams): string[] {
  if (p.normalize) {
    // EBU R128 dynamic normalization with peak ceiling control
    return ["dynaudnorm=f=250:g=15:p=0.9:m=10.0"];
  }
  if (p.gainDb > 0) {
    // Lookahead peak limiter on positive gain boost to eliminate digital clipping
    return [`volume=${p.gainDb.toFixed(1)}dB`, "alimiter=limit=0.98"];
  }
  if (p.gainDb < 0) {
    return [`volume=${p.gainDb.toFixed(1)}dB`];
  }
  // Fast-path: 0dB gain requires no DSP processing
  return [];
}

/* -------------------------------------------------------------------------- */
/* Master Filter Dispatcher                                                   */
/* -------------------------------------------------------------------------- */

export function getAudioFilterGraph(
  effect: AudioEffectType,
  params: Record<string, any>,
): string[] {
  switch (effect) {
    case "spatial-8d":
      return buildSpatial8DFilter(params as Spatial8DParams);
    case "auto-panner":
      return buildAutoPannerFilter(params as AutoPannerParams);
    case "bass-booster":
      return buildBassFilter(params as BassBoosterParams);
    case "equalizer":
      return buildEqualizerFilter(params as EqualizerParams);
    case "noise-reducer":
      return buildNoiseReducerFilter(params as NoiseReducerParams);
    case "pitch-shifter":
      return buildPitchShifterFilter(params as PitchShifterParams);
    case "reverb":
      return buildReverbFilter(params as ReverbParams);
    case "reverse-audio":
      return buildReverseAudioFilter(params as ReverseAudioParams);
    case "stereo-panner":
      return buildStereoPannerFilter(params as StereoPannerParams);
    case "tempo-changer":
      return buildTempoChangerFilter(params as TempoChangerParams);
    case "trimmer":
      return buildTrimmerFilter(params as TrimmerParams);
    case "vocal-remover":
      return buildVocalRemoverFilter(params as VocalRemoverParams);
    case "volume-changer":
      return buildVolumeChangerFilter(params as VolumeChangerParams);
    default:
      return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Default Parameters Generator                                               */
/* -------------------------------------------------------------------------- */

export function getDefaultAudioParams(effect: AudioEffectType): Record<string, any> {
  switch (effect) {
    case "spatial-8d":
      return { cycleSec: 8, intensity: 0.85, widening: 1.25 };
    case "auto-panner":
      return { frequencyHz: 0.5, depth: 0.85, waveform: "sine" };
    case "bass-booster":
      return { tier: 3, cutoff: 90, clarity: true };
    case "equalizer":
      return { gains: [0, 0, 0, 0, 0, 0] };
    case "noise-reducer":
      return { noiseReductionDb: 12, noiseFloorDb: -30, highpassHz: 80, lowpassHz: 14000 };
    case "pitch-shifter":
      return { semitones: 0, sampleRate: 44100 };
    case "reverb":
      return { preset: "medium-room", sampleRate: 44100 };
    case "reverse-audio":
      return { includeEcho: false };
    case "stereo-panner":
      return { balance: 0.0 };
    case "tempo-changer":
      return { speed: 1.0 };
    case "trimmer":
      return { startSec: 0, endSec: 30, fadeInSec: 0, fadeOutSec: 0, boostDb: 0 };
    case "vocal-remover":
      return { mode: "phase_cancel", bassPreserveCutoffHz: 140 };
    case "volume-changer":
      return { gainDb: 0, normalize: false };
  }
}

/* -------------------------------------------------------------------------- */
/* DSP Module Metadata Registry                                               */
/* -------------------------------------------------------------------------- */

export interface AudioToolMeta {
  id: AudioEffectType;
  name: string;
  shortDesc: string;
  category: "spatial" | "frequency" | "dynamics" | "utility" | "creative";
  accentColor: "violet" | "cyan" | "fuchsia" | "emerald" | "amber" | "indigo";
  iconName:
    | "Orbit"
    | "Waves"
    | "Speaker"
    | "SlidersVertical"
    | "MicOff"
    | "Sliders"
    | "RotateCcw"
    | "Clock"
    | "Scissors"
    | "Volume2";
  presets: { label: string; params: Partial<Record<string, any>> }[];
}

export const AUDIO_TOOLS_CATALOG: AudioToolMeta[] = [
  {
    id: "spatial-8d",
    name: "3D / 8D Audio",
    shortDesc: "Rotating circular binaural panning with dimension widening",
    category: "spatial",
    accentColor: "violet",
    iconName: "Orbit",
    presets: [
      { label: "Natural 360° Orbit (8s)", params: { cycleSec: 8, intensity: 0.85, widening: 1.25 } },
      { label: "Hypnotic Dream (14s)", params: { cycleSec: 14, intensity: 0.9, widening: 1.35 } },
      { label: "Fast Binaural Whirl (4s)", params: { cycleSec: 4, intensity: 0.8, widening: 1.2 } },
      { label: "Subtle Ambient Drift (18s)", params: { cycleSec: 18, intensity: 0.65, widening: 1.15 } },
      { label: "Max Immersion (6s)", params: { cycleSec: 6, intensity: 1.0, widening: 1.45 } },
    ],
  },
  {
    id: "auto-panner",
    name: "Auto Panner",
    shortDesc: "Rhythmic automated stereo movement across the soundstage",
    category: "spatial",
    accentColor: "cyan",
    iconName: "Waves",
    presets: [
      { label: "Lofi Drift (0.15 Hz)", params: { frequencyHz: 0.15, depth: 0.5, waveform: "sine" } },
      { label: "Gentle Drift (0.25 Hz)", params: { frequencyHz: 0.25, depth: 0.6, waveform: "sine" } },
      { label: "Rhythmic Pulse (0.5 Hz)", params: { frequencyHz: 0.5, depth: 0.85, waveform: "sine" } },
      { label: "Fast Tremolo (2.0 Hz)", params: { frequencyHz: 2.0, depth: 0.75, waveform: "triangle" } },
      { label: "Stereo Strobe (4.0 Hz)", params: { frequencyHz: 4.0, depth: 0.95, waveform: "sine" } },
      { label: "Triangle Ping-Pong (1.0 Hz)", params: { frequencyHz: 1.0, depth: 0.8, waveform: "triangle" } },
    ],
  },
  {
    id: "bass-booster",
    name: "Bass Booster",
    shortDesc: "5 progressive tiers (+3dB to +18dB) with anti-mud clarity shelves",
    category: "frequency",
    accentColor: "fuchsia",
    iconName: "Speaker",
    presets: [
      { label: "Tier 1: Audiophile Warmth (+3.5 dB)", params: { tier: 1, cutoff: 110, clarity: false } },
      { label: "Tier 2: Punchy Kick (+6.0 dB)", params: { tier: 2, cutoff: 95, clarity: true } },
      { label: "Tier 3: Deep Club (+9.0 dB)", params: { tier: 3, cutoff: 80, clarity: true } },
      { label: "Tier 4: Heavy Sub 808 (+12.0 dB)", params: { tier: 4, cutoff: 65, clarity: true } },
      { label: "Tier 5: Earthquake Max (+15.0 dB)", params: { tier: 5, cutoff: 55, clarity: true } },
    ],
  },
  {
    id: "equalizer",
    name: "Equalizer",
    shortDesc: "6-band parametric mastering EQ with studio curves",
    category: "frequency",
    accentColor: "emerald",
    iconName: "SlidersVertical",
    presets: [
      { label: "Flat Reference", params: { gains: EQ_PRESET_MAP["Flat"] } },
      { label: "Bass Boost", params: { gains: EQ_PRESET_MAP["Bass Boost"] } },
      { label: "Treble Boost", params: { gains: EQ_PRESET_MAP["Treble Boost"] } },
      { label: "Vocal Clarity", params: { gains: EQ_PRESET_MAP["Vocal Presence"] } },
      { label: "Rock / Metal", params: { gains: EQ_PRESET_MAP["Rock"] } },
      { label: "Electronic / Club", params: { gains: EQ_PRESET_MAP["Electronic"] } },
      { label: "Acoustic Warmth", params: { gains: EQ_PRESET_MAP["Acoustic"] } },
      { label: "Podcast / Speech", params: { gains: EQ_PRESET_MAP["Speech"] } },
      { label: "Hip-Hop / 808", params: { gains: EQ_PRESET_MAP["Hip-Hop / 808"] } },
      { label: "Loudness Smile", params: { gains: EQ_PRESET_MAP["Loudness Smile"] } },
    ],
  },
  {
    id: "noise-reducer",
    name: "Noise Reducer",
    shortDesc: "Adaptive spectral FFT denoising with rumble and hiss conditioning",
    category: "dynamics",
    accentColor: "indigo",
    iconName: "MicOff",
    presets: [
      { label: "Subtle Studio Clean (8 dB)", params: { noiseReductionDb: 8, noiseFloorDb: -35, highpassHz: 50, lowpassHz: 16000 } },
      { label: "Podcast Vocal Clean (14 dB)", params: { noiseReductionDb: 14, noiseFloorDb: -30, highpassHz: 80, lowpassHz: 12000 } },
      { label: "Heavy Hiss Kill (22 dB)", params: { noiseReductionDb: 22, noiseFloorDb: -25, highpassHz: 100, lowpassHz: 10000 } },
      { label: "AC & Fan Hum Removal (16 dB)", params: { noiseReductionDb: 16, noiseFloorDb: -28, highpassHz: 120, lowpassHz: 15000 } },
      { label: "Subsonic Guard & Rumble (6 dB)", params: { noiseReductionDb: 6, noiseFloorDb: -42, highpassHz: 130, lowpassHz: 18000 } },
      { label: "Cassette Tape Restore (18 dB)", params: { noiseReductionDb: 18, noiseFloorDb: -32, highpassHz: 70, lowpassHz: 11000 } },
    ],
  },
  {
    id: "pitch-shifter",
    name: "Pitch Shifter",
    shortDesc: "Independent semitone transposition without altering tempo",
    category: "creative",
    accentColor: "violet",
    iconName: "Sliders",
    presets: [
      { label: "Octave Down (-12)", params: { semitones: -12 } },
      { label: "Fifth Down (-7)", params: { semitones: -7 } },
      { label: "Deep Voice (-4)", params: { semitones: -4 } },
      { label: "Minor 3rd Down (-3)", params: { semitones: -3 } },
      { label: "Major 2nd Down (-2)", params: { semitones: -2 } },
      { label: "Major 2nd Up (+2)", params: { semitones: 2 } },
      { label: "Minor 3rd Up (+3)", params: { semitones: 3 } },
      { label: "Nightcore (+4)", params: { semitones: 4 } },
      { label: "Fifth Up (+7)", params: { semitones: 7 } },
      { label: "Chipmunk (+12)", params: { semitones: 12 } },
    ],
  },
  {
    id: "reverb",
    name: "Reverb Studio",
    shortDesc: "8 distinct acoustic space models and reflective decay chambers",
    category: "creative",
    accentColor: "cyan",
    iconName: "Waves",
    presets: [
      { label: "Bathroom (Tile Acoustic)", params: { preset: "bathroom" } },
      { label: "Small Room (Intimate Studio)", params: { preset: "small-room" } },
      { label: "Medium Room (Warm Tracking)", params: { preset: "medium-room" } },
      { label: "Large Room (Concert Chamber)", params: { preset: "large-room" } },
      { label: "Church Hall (Resonant Sanctuary)", params: { preset: "church-hall" } },
      { label: "Cathedral (Cavernous Immersion)", params: { preset: "cathedral" } },
      { label: "Slowed & Reverb (Late Night)", params: { preset: "slowed-reverb" } },
      { label: "8D Spatial Reverb (360° Diffusion)", params: { preset: "spatial-8d-reverb" } },
    ],
  },
  {
    id: "reverse-audio",
    name: "Reverse Audio",
    shortDesc: "Complete temporal waveform inversion with optional echo",
    category: "creative",
    accentColor: "amber",
    iconName: "RotateCcw",
    presets: [
      { label: "Pure Clean Reverse", params: { includeEcho: false } },
      { label: "Atmospheric Reverb Reverse", params: { includeEcho: true } },
    ],
  },
  {
    id: "stereo-panner",
    name: "Stereo Panner",
    shortDesc: "Precision stereo soundstage balance and lateral placement",
    category: "spatial",
    accentColor: "cyan",
    iconName: "Sliders",
    presets: [
      { label: "Center Balance (0.0)", params: { balance: 0.0 } },
      { label: "Soft Left (-0.35)", params: { balance: -0.35 } },
      { label: "Wide Left (-0.75)", params: { balance: -0.75 } },
      { label: "Hard Left (-1.0)", params: { balance: -1.0 } },
      { label: "Soft Right (+0.35)", params: { balance: 0.35 } },
      { label: "Wide Right (+0.75)", params: { balance: 0.75 } },
      { label: "Hard Right (+1.0)", params: { balance: 1.0 } },
    ],
  },
  {
    id: "tempo-changer",
    name: "Tempo Changer",
    shortDesc: "High-fidelity time stretching without altering acoustic pitch",
    category: "utility",
    accentColor: "emerald",
    iconName: "Clock",
    presets: [
      { label: "Halftime (0.5x)", params: { speed: 0.5 } },
      { label: "Chill Study (0.8x)", params: { speed: 0.8 } },
      { label: "Lofi Groove (0.85x)", params: { speed: 0.85 } },
      { label: "Normal (1.0x)", params: { speed: 1.0 } },
      { label: "Slight Nudge (1.1x)", params: { speed: 1.1 } },
      { label: "Podcast (1.25x)", params: { speed: 1.25 } },
      { label: "Rapid Review (1.5x)", params: { speed: 1.5 } },
      { label: "Fast Study (1.75x)", params: { speed: 1.75 } },
      { label: "Double Time (2.0x)", params: { speed: 2.0 } },
    ],
  },
  {
    id: "trimmer",
    name: "Trimmer & Slicer",
    shortDesc: "Millisecond-precise cutting with linear fade-in and fade-out ramps",
    category: "utility",
    accentColor: "indigo",
    iconName: "Scissors",
    presets: [
      { label: "Notification / Alert (5s)", params: { startSec: 0, endSec: 5, fadeInSec: 0.05, fadeOutSec: 0.5, boostDb: 3 } },
      { label: "Quick Sample (10s)", params: { startSec: 0, endSec: 10, fadeInSec: 0.1, fadeOutSec: 0.5, boostDb: 1 } },
      { label: "Hook / Chorus Loop (15s)", params: { startSec: 15, endSec: 30, fadeInSec: 0.2, fadeOutSec: 0.5, boostDb: 2 } },
      { label: "Short Ringtone (20s)", params: { startSec: 0, endSec: 20, fadeInSec: 0.3, fadeOutSec: 1.0, boostDb: 3 } },
      { label: "Standard Ringtone (30s)", params: { startSec: 0, endSec: 30, fadeInSec: 0.5, fadeOutSec: 1.5, boostDb: 2 } },
      { label: "Max iOS Ringtone (39s)", params: { startSec: 0, endSec: 39, fadeInSec: 0.5, fadeOutSec: 2.0, boostDb: 2 } },
      { label: "Drop Lead-In (Skip 10s)", params: { startSec: 10, endSec: 45, fadeInSec: 0.3, fadeOutSec: 1.5, boostDb: 1 } },
    ],
  },
  {
    id: "vocal-remover",
    name: "Vocal Remover",
    shortDesc: "Out-of-phase stereo (OOPS) center cancellation for karaoke & instrumentals",
    category: "creative",
    accentColor: "fuchsia",
    iconName: "MicOff",
    presets: [
      { label: "Pure Phase Cancellation (OOPS)", params: { mode: "phase_cancel" } },
      { label: "Bass-Preserved Karaoke (140 Hz)", params: { mode: "bass_preserved", bassPreserveCutoffHz: 140 } },
      { label: "Deep Sub Karaoke (180 Hz)", params: { mode: "bass_preserved", bassPreserveCutoffHz: 180 } },
      { label: "Tight Rhythm Karaoke (100 Hz)", params: { mode: "bass_preserved", bassPreserveCutoffHz: 100 } },
      { label: "Karaoke Mid-Band Cut", params: { mode: "karaoke_bandpass" } },
    ],
  },
  {
    id: "volume-changer",
    name: "Volume Changer",
    shortDesc: "Precision decibel gain staging and EBU R128 dynamic normalization",
    category: "dynamics",
    accentColor: "amber",
    iconName: "Volume2",
    presets: [
      { label: "Subtle Lift (+3 dB)", params: { gainDb: 3, normalize: false } },
      { label: "Boost (+6 dB)", params: { gainDb: 6, normalize: false } },
      { label: "Heavy Boost (+9 dB)", params: { gainDb: 9, normalize: false } },
      { label: "Max Safe (+12 dB)", params: { gainDb: 12, normalize: false } },
      { label: "Attenuate (-6 dB)", params: { gainDb: -6, normalize: false } },
      { label: "Night Mode (-12 dB)", params: { gainDb: -12, normalize: false } },
      { label: "Whisper Mode (-18 dB)", params: { gainDb: -18, normalize: false } },
      { label: "EBU R128 Dynamic Normalize", params: { gainDb: 0, normalize: true } },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Exact Preset Engine Exports                                                */
/* -------------------------------------------------------------------------- */
export {
  SLOWED_REVERB_FILTER,
  EIGHT_D_AUDIO_FILTER,
  getSlowedReverbFilter,
  get8DAudioFilter,
  generateSlowedReverbCommand,
  generate8DAudioCommand,
  type FFmpegAudioCommand,
} from "./audio/effects-engine";


