/**
 * OMNI TOOL — audio filter-graph builders.
 *
 * Pure functions that emit FFmpeg `-af` chains for the Audio Engineering
 * Suite. Every builder returns an array of filter segments which the tools
 * join with "," and pass to ffmpeg as a single -af argument.
 *
 * All builders validated against the shipped wasm core (libavfilter).
 */

export type AudioFormat = "mp3" | "wav" | "flac" | "ogg" | "m4a";

/* ------------------------------------------------------------------ */
/* Output encoders                                                     */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Slowed + Reverb                                                     */
/* ------------------------------------------------------------------ */

export interface SlowedParams {
  /** 0.5 – 0.95 playback speed factor. */
  factor: number;
  /** 0 – 1 reverb intensity. */
  reverb: number;
  /** Input sample rate (detected via ffprobe at run time). */
  sampleRate: number;
}

export function slowedFilters({ factor, reverb, sampleRate }: SlowedParams): string[] {
  const chain: string[] = [
    // Classic vinyl-style slow: drop the interpreted rate, then resample —
    // lowers BOTH tempo and pitch, exactly like the 33rpm aesthetic.
    `asetrate=${Math.round(sampleRate * factor)}`,
    `aresample=${sampleRate}`,
  ];
  if (reverb >= 0.05) {
    chain.push(echoForIntensity(reverb));
  }
  return chain;
}

function echoForIntensity(reverb: number): string {
  if (reverb < 0.35) {
    return "aecho=0.85:0.7:16|24:0.22|0.16,highpass=f=50,treble=g=-2:f=6500";
  }
  if (reverb < 0.7) {
    return "aecho=0.82:0.75:18|26|34|42:0.28|0.22|0.16|0.12,highpass=f=50,treble=g=-3:f=5500";
  }
  return "aecho=0.80:0.8:20|28|36|48:0.34|0.26|0.20|0.14,highpass=f=50,treble=g=-3:f=5000";
}

/* ------------------------------------------------------------------ */
/* Bass Booster                                                        */
/* ------------------------------------------------------------------ */

export interface BassParams {
  /** 1 – 10 intensity. */
  intensity: number;
  /** Cutoff in Hz. */
  cutoff: number;
  /** +3 dB treble shelf to keep top-end clarity. */
  clarity: boolean;
}

export function bassFilters({ intensity, cutoff, clarity }: BassParams): string[] {
  // Map intensity 1–10 to a clean musical gain curve (+1.5 dB to +15.0 dB)
  const clampedIntensity = Math.max(1, Math.min(10, intensity));
  const gain = clampedIntensity * 1.5;
  const targetCutoff = Math.max(40, Math.min(200, cutoff || 90));

  const chain: string[] = [
    // 1. Subsonic Rumble Cut: Eliminates inaudible sub-28Hz energy that causes
    // violent clipping, pumping, and digital tearing without musical value.
    "highpass=f=28:p=2",

    // 2. Precision Butterworth Low-Shelf Filter (Q=0.707): Smooth, natural low-end
    // enhancement without resonant ringing or phase distortion.
    `bass=g=${gain.toFixed(1)}:f=${targetCutoff}:t=q:w=0.707`,
  ];

  // 3. Dynamic Vocal & Treble Presence Shelf: Prevents muddy muffled sound by
  // providing proportional high-end shimmer (+1.5 to +3.5 dB).
  if (clarity) {
    const trebleGain = Math.min(3.5, 1.5 + gain * 0.12).toFixed(1);
    chain.push(`treble=g=${trebleGain}:f=6500:t=s`);
  }

  // 4. Automatic Headroom Compensation: Scales down pre-gain proportionally
  // so the boosted low-end energy does not blast past the 0 dBFS clipping ceiling.
  const headroomDb = (gain * 0.55).toFixed(1);
  chain.push(`volume=-${headroomDb}dB`);

  // 5. Broadcast Lookahead Peak Limiter: Features 7ms lookahead attack, musical 100ms release,
  // and -0.18 dBFS true peak ceiling. Eliminates auto-sub-band modulation tearing so vocals
  // and sub-bass remain pristine and transparent.
  chain.push("alimiter=level_in=1:level_out=0.98:limit=0.98:attack=7:release=100");

  return chain;
}

/* ------------------------------------------------------------------ */
/* 3D / 8D Audio                                                       */
/* ------------------------------------------------------------------ */

export interface SpatialParams {
  /** Full rotation cycle length in seconds (4 – 16). */
  cycleSec: number;
  /** 0.3 – 1 swing intensity. */
  intensity: number;
}

export function spatialFilters({ cycleSec, intensity }: SpatialParams): string[] {
  const hz = (1 / Math.max(cycleSec, 1)).toFixed(4);
  return [
    "aformat=channel_layouts=stereo",
    "extrastereo=m=1.35",
    `apulsator=hz=${hz}:amount=${intensity.toFixed(2)}:mode=sine:width=1`,
    "aecho=0.88:0.75:18|28:0.2|0.14",
    "alimiter=limit=0.98",
  ];
}

/* ------------------------------------------------------------------ */
/* Equalizer                                                           */
/* ------------------------------------------------------------------ */

export const EQ_BANDS = [60, 150, 400, 1000, 2400, 15000] as const;
export type EqGains = number[]; // one per band, -12..+12 dB

export const EQ_PRESETS: { name: string; gains: EqGains }[] = [
  { name: "Flat", gains: [0, 0, 0, 0, 0, 0] },
  { name: "Bass Boost", gains: [8, 6, 3, 0, 0, 0] },
  { name: "Treble Boost", gains: [0, 0, 0, 2, 5, 7] },
  { name: "Vocal", gains: [-2, 0, 4, 4, 3, 0] },
  { name: "Rock", gains: [5, 3, -1, -2, 3, 6] },
  { name: "Electronic", gains: [6, 4, 0, -2, 2, 5] },
  { name: "Acoustic Warmth", gains: [3, 2, 1, 0, 2, 3] },
  { name: "Podcast / Speech", gains: [-6, 2, 4, 3, -2, -4] },
  { name: "Hip-Hop / 808", gains: [9, 7, 1, -1, 1, 4] },
  { name: "Loudness Smile", gains: [6, 3, -2, -1, 3, 5] },
];

export function eqFilters(gains: EqGains): string[] {
  const bands = EQ_BANDS.map((f, i) =>
    gains[i] === 0
      ? null
      : `equalizer=f=${f}:t=q:w=1:g=${gains[i]?.toFixed(1)}`,
  ).filter((s): s is string => s !== null);

  if (bands.length > 0 && gains.some((g) => g > 0)) {
    bands.push("alimiter=limit=0.98");
  }
  return bands;
}

/* ------------------------------------------------------------------ */
/* Reverse                                                             */
/* ------------------------------------------------------------------ */

export function reverseFilters(includeEcho?: boolean): string[] {
  const chain = ["areverse"];
  if (includeEcho) {
    chain.push(
      "aecho=0.82:0.75:18|26|34|42:0.28|0.22|0.16|0.12",
      "highpass=f=50",
      "treble=g=-3:f=5500",
      "alimiter=limit=0.98",
    );
  }
  return chain;
}

/* ------------------------------------------------------------------ */
/* Stereo Panner                                                       */
/* ------------------------------------------------------------------ */

export interface PanParams {
  /** -1 full left … +1 full right. */
  balance: number;
}

export function panFilters({ balance }: PanParams): string[] {
  return [
    "aformat=channel_layouts=stereo",
    `stereotools=balance_out=${balance.toFixed(2)}`,
  ];
}

/* ------------------------------------------------------------------ */
/* Volume                                                              */
/* ------------------------------------------------------------------ */

export interface VolumeParams {
  /** Gain in dB (-30 … +20). Ignored when normalize is on. */
  db: number;
  /** Loudness normalization (dynaudnorm single-pass). */
  normalize: boolean;
}

export function volumeFilters({ db, normalize }: VolumeParams): string[] {
  if (normalize) return ["dynaudnorm=f=250:g=15:p=0.9"];
  if (db > 0) return [`volume=${db}dB`, "alimiter=limit=0.98"];
  return [`volume=${db}dB`];
}

/* ------------------------------------------------------------------ */
/* Ringtone / trim + fades                                             */
/* ------------------------------------------------------------------ */

export interface TrimFadeParams {
  startSec: number;
  endSec: number;
  fadeInSec: number;
  fadeOutSec: number;
  /** Optional gain in dB applied after fades. 0 = skip. */
  boostDb?: number;
}

export function trimFadeFilters({
  startSec,
  endSec,
  fadeInSec,
  fadeOutSec,
  boostDb = 0,
}: TrimFadeParams): string[] {
  const length = Math.max(endSec - startSec, 0.1);
  const chain = [
    `atrim=start=${startSec.toFixed(2)}:end=${endSec.toFixed(2)}`,
    "asetpts=PTS-STARTPTS",
  ];
  if (fadeInSec > 0.01) {
    chain.push(`afade=t=in:st=0:d=${fadeInSec.toFixed(2)}`);
  }
  if (fadeOutSec > 0.01) {
    const st = Math.max(length - fadeOutSec, 0).toFixed(2);
    chain.push(`afade=t=out:st=${st}:d=${fadeOutSec.toFixed(2)}`);
  }
  if (boostDb !== 0) {
    chain.push(`volume=${boostDb}dB`);
    if (boostDb > 0) {
      chain.push("alimiter=limit=0.98");
    }
  }
  return chain;
}

/* ------------------------------------------------------------------ */
/* MP3 Audio Editor — combined deck                                    */
/* ------------------------------------------------------------------ */

export interface EditorParams {
  startSec: number;
  endSec: number;
  /** Source duration in seconds (probed). */
  durationSec: number;
  trimEnabled: boolean;
  /** 0.5 – 2.0 (atempo, pitch-preserving). */
  speed: number;
  reverse: boolean;
  volumeDb: number;
  normalize: boolean;
  fadeInSec: number;
  fadeOutSec: number;
}

export function editorFilters(p: EditorParams): { filters: string[]; finalLengthSec: number } {
  const trimStart = p.trimEnabled ? p.startSec : 0;
  const trimEnd = p.trimEnabled ? p.endSec : p.durationSec;
  const trimLength = Math.max(trimEnd - trimStart, 0.1);

  const filters: string[] = [];
  if (p.trimEnabled) {
    filters.push(
      `atrim=start=${trimStart.toFixed(2)}:end=${trimEnd.toFixed(2)}`,
      "asetpts=PTS-STARTPTS",
    );
  }
  if (p.reverse) filters.push("areverse");
  if (p.speed !== 1) filters.push(`atempo=${p.speed.toFixed(3)}`);
  if (p.normalize) filters.push("dynaudnorm=f=250:g=15:p=0.9");
  else if (p.volumeDb !== 0) {
    filters.push(`volume=${p.volumeDb}dB`);
    if (p.volumeDb > 0) {
      filters.push("alimiter=limit=0.98");
    }
  }

  const finalLength = trimLength / (p.speed !== 1 ? p.speed : 1);
  if (p.fadeInSec > 0.01) {
    filters.push(`afade=t=in:st=0:d=${Math.min(p.fadeInSec, finalLength).toFixed(2)}`);
  }
  if (p.fadeOutSec > 0.01) {
    const st = Math.max(finalLength - p.fadeOutSec, 0).toFixed(2);
    filters.push(`afade=t=out:st=${st}:d=${p.fadeOutSec.toFixed(2)}`);
  }

  return { filters, finalLengthSec: finalLength };
}

/* ------------------------------------------------------------------ */
/* Exact Preset Engine Exports                                        */
/* ------------------------------------------------------------------ */
export {
  SLOWED_REVERB_FILTER,
  EIGHT_D_AUDIO_FILTER,
  getSlowedReverbFilter,
  get8DAudioFilter,
  generateSlowedReverbCommand,
  generate8DAudioCommand,
  type FFmpegAudioCommand,
} from "./effects-engine";


