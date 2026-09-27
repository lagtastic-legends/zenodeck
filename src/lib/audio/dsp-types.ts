/**
 * ZenoDeck Audio DSP Studio - Type Definitions & Presets
 * ======================================================
 * Standards-compliant ISO 10-band equalizer definitions, Dynamic Bass Boost,
 * Real-Time 8D Spatial Audio, and Center Vocal Matrix types.
 */

/**
 * Standard ISO 266 center frequencies for 10-band octave graphic equalizers.
 */
export const ISO_10_BAND_FREQUENCIES = [
  32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
] as const;

export type IsoFrequency = (typeof ISO_10_BAND_FREQUENCIES)[number];

export type EqGainsArray = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/**
 * Center channel vocal processing modes:
 * - "off": Natural unaltered stereo mix.
 * - "isolate": Acapella mode - extracts center vocal formants (250Hz - 3.5kHz).
 * - "remove": Karaoke mode - phase-cancels centered vocals while preserving rhythm sub-bass.
 */
export type VocalMode = "off" | "isolate" | "remove";

/**
 * Configuration for Dynamic Bass Boost with soft-clipping limiter.
 */
export interface BassBoostConfig {
  enabled: boolean;
  /** Boost gain in dB (0.0 dB to 18.0 dB). Default: 6.0 dB. */
  gainDb: number;
  /** Low-shelf cutoff frequency in Hz (60 Hz to 120 Hz). Default: 80 Hz. */
  cutoffHz: number;
}

/**
 * Configuration for Real-Time 8D Spatial Audio orbital panning.
 */
export interface Spatial8DConfig {
  enabled: boolean;
  /** LFO rotation frequency in Hz (0.1 Hz to 1.0 Hz). Default: 0.2 Hz. */
  speedHz: number;
  /** Orbital panning intensity / width (0.0 to 1.0). Default: 0.8. */
  intensity: number;
}

/**
 * Complete DSP Preset specification.
 */
export interface DSPPreset {
  id: string;
  name: string;
  description: string;
  eqGains: EqGainsArray;
  bassBoost: BassBoostConfig;
  spatial8D: Spatial8DConfig;
  vocalMode: VocalMode;
}

/**
 * Configuration passed to offline mastering / export engines.
 */
export interface AudioMasteringConfig {
  eqGains: number[];
  bassBoost: BassBoostConfig;
  spatial8D: Spatial8DConfig;
  vocalMode: VocalMode;
  outputFormat: "mp3" | "wav";
  bitrateKbps: 128 | 192 | 256 | 320;
}

/**
 * Core state representation of the DSP audio graph.
 */
export interface DSPState {
  isBypassed: boolean;
  eqGains: EqGainsArray;
  bassBoost: BassBoostConfig;
  spatial8D: Spatial8DConfig;
  vocalMode: VocalMode;
  activePresetId: string | null;
}

/**
 * Equalizer gain boundaries.
 */
export const MIN_EQ_GAIN_DB = -12;
export const MAX_EQ_GAIN_DB = 12;

export const DEFAULT_EQ_GAINS: EqGainsArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const DEFAULT_BASS_BOOST: BassBoostConfig = {
  enabled: false,
  gainDb: 6,
  cutoffHz: 80,
};

export const DEFAULT_SPATIAL_8D: Spatial8DConfig = {
  enabled: false,
  speedHz: 0.2,
  intensity: 0.8,
};

export const DEFAULT_DSP_STATE: DSPState = {
  isBypassed: false,
  eqGains: [...DEFAULT_EQ_GAINS],
  bassBoost: { ...DEFAULT_BASS_BOOST },
  spatial8D: { ...DEFAULT_SPATIAL_8D },
  vocalMode: "off",
  activePresetId: "flat",
};

/**
 * 10 Curated DSP Presets with exact sonic profiles.
 */
export const DSP_PRESETS: readonly DSPPreset[] = [
  {
    id: "flat",
    name: "Flat",
    description: "Uncolored studio reference monitoring.",
    eqGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bassBoost: { enabled: false, gainDb: 0, cutoffHz: 80 },
    spatial8D: { enabled: false, speedHz: 0.125, intensity: 0.8 },
    vocalMode: "off",
  },
  {
    id: "bass-boost",
    name: "Bass Boost",
    description: "Deep sub-bass extension with soft-clip compression.",
    eqGains: [8, 7, 5, 2, 0, 0, 0, 0, 1, 2],
    bassBoost: { enabled: true, gainDb: 6, cutoffHz: 80 },
    spatial8D: { enabled: false, speedHz: 0.125, intensity: 0.8 },
    vocalMode: "off",
  },
  {
    id: "vocal-boost",
    name: "Vocal Boost",
    description: "Dialogue and vocal forwardness with low-end rumble cut.",
    eqGains: [-2, -2, -1, 0, 3, 5, 4, 2, 0, -1],
    bassBoost: { enabled: false, gainDb: 0, cutoffHz: 80 },
    spatial8D: { enabled: false, speedHz: 0.125, intensity: 0.8 },
    vocalMode: "off",
  },
  {
    id: "club-edm",
    name: "Club / EDM",
    description: "High-energy V-curve smile; aggressive kicks and crispy hats.",
    eqGains: [6, 5, 3, 0, -1, 2, 3, 4, 5, 5],
    bassBoost: { enabled: true, gainDb: 8, cutoffHz: 75 },
    spatial8D: { enabled: false, speedHz: 0.125, intensity: 0.8 },
    vocalMode: "off",
  },
  {
    id: "rock",
    name: "Rock",
    description: "Mid-forward drive; electric guitar bite and punchy snare.",
    eqGains: [4, 3, 2, 0, -1, 1, 3, 4, 3, 3],
    bassBoost: { enabled: false, gainDb: 0, cutoffHz: 80 },
    spatial8D: { enabled: false, speedHz: 0.125, intensity: 0.8 },
    vocalMode: "off",
  },
  {
    id: "pop",
    name: "Pop",
    description: "Modern radio contour; warm low-mid body and shimmering highs.",
    eqGains: [-1, 1, 2, 3, 2, 1, 2, 3, 3, 2],
    bassBoost: { enabled: false, gainDb: 0, cutoffHz: 80 },
    spatial8D: { enabled: false, speedHz: 0.125, intensity: 0.8 },
    vocalMode: "off",
  },
  {
    id: "classical",
    name: "Classical",
    description: "Natural concert hall air, warm acoustic strings and brass.",
    eqGains: [3, 2, 2, 1, 0, 0, 1, 2, 3, 4],
    bassBoost: { enabled: false, gainDb: 0, cutoffHz: 80 },
    spatial8D: { enabled: false, speedHz: 0.125, intensity: 0.8 },
    vocalMode: "off",
  },
  {
    id: "8d-spatial",
    name: "8D Spatial Immersion",
    description: "360° circular binaural panning with Haas spatial widening.",
    eqGains: [2, 2, 1, 0, 0, 1, 2, 3, 3, 3],
    bassBoost: { enabled: true, gainDb: 3.5, cutoffHz: 90 },
    spatial8D: { enabled: true, speedHz: 0.25, intensity: 0.85 },
    vocalMode: "off",
  },
  {
    id: "acapella",
    name: "Acapella (Vocal Solo)",
    description: "Center-channel vocal extraction; steep bandpass filtering.",
    eqGains: [-10, -8, -4, 2, 6, 7, 5, 2, -2, -6],
    bassBoost: { enabled: false, gainDb: 0, cutoffHz: 80 },
    spatial8D: { enabled: false, speedHz: 0.125, intensity: 0.8 },
    vocalMode: "isolate",
  },
  {
    id: "karaoke",
    name: "Karaoke (Vocal Cut)",
    description: "Out-Of-Phase Stereo (OOPS) center vocal cancellation with rhythm bass preservation.",
    eqGains: [3, 2, 1, 0, -4, -6, -4, 0, 1, 2],
    bassBoost: { enabled: true, gainDb: 4, cutoffHz: 80 },
    spatial8D: { enabled: false, speedHz: 0.125, intensity: 0.8 },
    vocalMode: "remove",
  },
] as const;

/**
 * Fast lookup map for presets by ID.
 */
export const DSP_PRESET_MAP: Record<string, DSPPreset> = DSP_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  },
  {} as Record<string, DSPPreset>
);

/**
 * Retrieves a preset by ID or undefined if not found.
 */
export function getPresetById(id: string): DSPPreset | undefined {
  return DSP_PRESET_MAP[id];
}

/**
 * Clamps an equalizer gain value within [-12 dB, +12 dB].
 */
export function clampGain(gain: number): number {
  if (Number.isNaN(gain)) return 0;
  return Math.max(MIN_EQ_GAIN_DB, Math.min(MAX_EQ_GAIN_DB, gain));
}
