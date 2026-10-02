/**
 * ZenoDeck — Advanced Audio DSP & Filter-Chain Engine
 * ====================================================
 * Specialized FFmpeg WebAssembly command builders for industry-standard
 * audio transformations: Slowed & Reverb, 8D Spatial Audio, and dynamic mastering.
 */

/**
 * Exact industry-standard Slowed & Reverb filter chain:
 * - asetrate=44100*0.85: Lowers both tempo and pitch to 85% (classic chopped/slowed aesthetic).
 * - aresample=44100: Resamples audio back to 44.1kHz standard DAC rate.
 * - aecho=0.8:0.9:1000:0.3: Deep room-scale reverb with 1000ms delay and 0.3 decay.
 */
export const SLOWED_REVERB_FILTER = "asetrate=44100*0.85,aresample=44100,aecho=0.8:0.9:1000:0.3";

export interface FFmpegAudioCommand extends Array<string> {
  /** The exact -af filter chain passed to FFmpeg */
  filterChain: string;
  /** Full executable CLI command string representation */
  commandString: string;
  /** Primary input file name */
  inputFile: string;
  /** Target output file name */
  outputFile: string;
}

/**
 * Returns the exact filter chain string for Slowed & Reverb.
 */
export function getSlowedReverbFilter(): string {
  return SLOWED_REVERB_FILTER;
}

/**
 * Generates the FFmpeg command argument array for the "Slowed & Reverb" engine.
 *
 * Utilizes the exact filter chain:
 * `asetrate=44100*0.85,aresample=44100,aecho=0.8:0.9:1000:0.3`
 *
 * @param inputFile Name of the input audio file in virtual MEMFS / WORKERFS
 * @param outputFile Name of the output audio file to write
 * @returns Executable argument array compatible with `@ffmpeg/ffmpeg` `ffmpeg.exec(...)`
 */
export function generateSlowedReverbCommand(
  inputFile: string,
  outputFile: string,
): FFmpegAudioCommand {
  if (!inputFile || typeof inputFile !== "string") {
    throw new Error("generateSlowedReverbCommand: inputFile must be a non-empty string");
  }
  if (!outputFile || typeof outputFile !== "string") {
    throw new Error("generateSlowedReverbCommand: outputFile must be a non-empty string");
  }

  const args = [
    "-i",
    inputFile,
    "-af",
    SLOWED_REVERB_FILTER,
    outputFile,
  ];

  const commandString = `ffmpeg -i "${inputFile}" -af "${SLOWED_REVERB_FILTER}" "${outputFile}"`;

  return Object.assign(args, {
    filterChain: SLOWED_REVERB_FILTER,
    commandString,
    inputFile,
    outputFile,
    toString: () => commandString,
  });
}

/**
 * Exact industry-standard 8D Audio spatial filter chain:
 * - apulsator=mode=sine:hz=0.08:amount=0.85: Pans audio left-to-right every 12.5 seconds (0.08 Hz) at 85% depth.
 * - aecho=0.8:0.9:1000:0.3: Deep room-scale reverb with 1000ms delay and 0.3 decay creating spatial distance.
 */
export const EIGHT_D_AUDIO_FILTER = "apulsator=mode=sine:hz=0.08:amount=0.85,aecho=0.8:0.9:1000:0.3";

/**
 * Returns the exact filter chain string for 8D Audio.
 */
export function get8DAudioFilter(): string {
  return EIGHT_D_AUDIO_FILTER;
}

/**
 * Generates the FFmpeg command argument array for the "8D Audio" Spatial Engine.
 *
 * Utilizes the exact filter chain:
 * `apulsator=mode=sine:hz=0.08:amount=0.85,aecho=0.8:0.9:1000:0.3`
 *
 * @param inputFile Name of the input audio file in virtual MEMFS / WORKERFS
 * @param outputFile Name of the output audio file to write
 * @returns Executable argument array compatible with `@ffmpeg/ffmpeg` `ffmpeg.exec(...)`
 */
export function generate8DAudioCommand(
  inputFile: string,
  outputFile: string,
): FFmpegAudioCommand {
  if (!inputFile || typeof inputFile !== "string") {
    throw new Error("generate8DAudioCommand: inputFile must be a non-empty string");
  }
  if (!outputFile || typeof outputFile !== "string") {
    throw new Error("generate8DAudioCommand: outputFile must be a non-empty string");
  }

  const args = [
    "-i",
    inputFile,
    "-af",
    EIGHT_D_AUDIO_FILTER,
    outputFile,
  ];

  const commandString = `ffmpeg -i "${inputFile}" -af "${EIGHT_D_AUDIO_FILTER}" "${outputFile}"`;

  return Object.assign(args, {
    filterChain: EIGHT_D_AUDIO_FILTER,
    commandString,
    inputFile,
    outputFile,
    toString: () => commandString,
  });
}


