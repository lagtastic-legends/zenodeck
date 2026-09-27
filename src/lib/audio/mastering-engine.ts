/**
 * ZenoDeck Audio DSP Studio — FFmpeg WASM Mastering & Export Engine
 * =================================================================
 * Converts live Web Audio DSP state into FFmpeg `-af` filter chains
 * for offline high-fidelity audio rendering. Supports 10-band ISO EQ,
 * Dynamic Bass Boost, 8D Spatial, Vocal Matrix, and peak-limited output.
 */

import {
  AudioMasteringConfig,
  ISO_10_BAND_FREQUENCIES,
  clampGain,
} from "./dsp-types";
import type { FFmpeg } from "@ffmpeg/ffmpeg";

/**
 * Converts a full DSP configuration into an FFmpeg audio filter chain.
 * Only emits filters for active (non-zero / enabled) DSP stages.
 * Always appends a mastering peak limiter as the final stage.
 */
export function buildMasteringFilterChain(config: AudioMasteringConfig): string[] {
  const filters: string[] = [];

  // 1. Equalizer bands (only non-zero gains)
  const freqs = ISO_10_BAND_FREQUENCIES;
  config.eqGains.forEach((gain, idx) => {
    const clampedGain = clampGain(gain);
    if (clampedGain !== 0 && idx < freqs.length) {
      filters.push(`equalizer=f=${freqs[idx]}:width_type=o:width=1:g=${clampedGain}`);
    }
  });

  // 2. Bass Boost (low-shelf filter)
  if (config.bassBoost && config.bassBoost.enabled && config.bassBoost.gainDb > 0) {
    const g = Math.max(0, Math.min(18, config.bassBoost.gainDb));
    const f = Math.max(60, Math.min(120, config.bassBoost.cutoffHz || 80));
    filters.push(`bass=g=${g}:f=${f}`);
  }

  // 3. 8D Spatial Audio (orbital pulsator)
  if (config.spatial8D && config.spatial8D.enabled) {
    const hz = Math.max(0.1, Math.min(1.0, config.spatial8D.speedHz || 0.2));
    const amount = Math.max(0.1, Math.min(1.0, config.spatial8D.intensity || 0.85));
    filters.push(`apulsator=hz=${hz}:amount=${amount}:mode=sine`);
  }

  // 4. Vocal Mode (stereotools mid/side manipulation)
  if (config.vocalMode === "remove") {
    filters.push("stereotools=mlev=0");
  } else if (config.vocalMode === "isolate") {
    filters.push("stereotools=slev=0");
  }

  // 5. Mastering Peak Limiter (prevents digital clipping on render)
  filters.push("alimiter=limit=-0.1dB:level=true:attack=5:release=50");

  return filters;
}

/**
 * Returns FFmpeg output encoder arguments for the given format.
 */
export function getMasteringOutputArgs(
  format: "mp3" | "wav",
  bitrateKbps: number = 320
): string[] {
  if (format === "mp3") {
    return ["-c:a", "libmp3lame", "-b:a", `${bitrateKbps}k`, "-ar", "44100"];
  }
  return ["-c:a", "pcm_s16le", "-ar", "44100"];
}

/**
 * Runs the full mastering pipeline: builds filter chain, encodes, reads output.
 * Returns the rendered audio file bytes.
 */
export async function masterAudio(opts: {
  engine: FFmpeg;
  inputPath: string;
  config: AudioMasteringConfig;
  outputFilename: string;
}): Promise<Uint8Array> {
  const { engine, inputPath, config, outputFilename } = opts;

  const filters = buildMasteringFilterChain(config);
  const outputArgs = getMasteringOutputArgs(config.outputFormat, config.bitrateKbps);

  const execArgs = [
    "-i",
    inputPath,
    "-af",
    filters.join(","),
    ...outputArgs,
    outputFilename,
  ];

  await engine.exec(execArgs);

  const data = await engine.readFile(outputFilename);

  // Cleanup
  try {
    await engine.deleteFile(outputFilename);
  } catch {
    /* output file may not exist if exec failed */
  }

  return data as Uint8Array;
}
