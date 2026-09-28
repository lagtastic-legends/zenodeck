/**
 * ZenoDeck Media Engine — Performance Utilities
 * ===============================================
 * Thread-aware FFmpeg argument injection and stream-copy detection
 * for zero-encode audio extraction.
 */

/**
 * Returns the number of logical CPU cores available.
 * Falls back to 4 in SSR or when the API is unavailable.
 */
export function getCpuThreadCount(): number {
  if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  return 4; // conservative fallback
}

/**
 * Injects `-threads N` into an FFmpeg args array if not already present.
 * Placed immediately after the input specification for maximum effect.
 *
 * Thread count is clamped to [1, 16] to prevent oversubscription on
 * high-core-count desktops from saturating the WASM heap.
 */
export function injectThreads(args: string[]): string[] {
  // Don't double-inject
  if (args.includes("-threads")) return args;

  const cores = getCpuThreadCount();
  const threads = Math.min(16, Math.max(1, cores));

  // Insert after last -i argument for optimal placement
  const lastInputIdx = args.lastIndexOf("-i");
  if (lastInputIdx >= 0 && lastInputIdx + 1 < args.length) {
    const insertAt = lastInputIdx + 2; // after -i <file>
    return [
      ...args.slice(0, insertAt),
      "-threads",
      String(threads),
      ...args.slice(insertAt),
    ];
  }

  // Fallback: prepend threads
  return ["-threads", String(threads), ...args];
}

/**
 * Determines if a source audio container can be directly stream-copied
 * into the target format without re-encoding (zero-encode extraction).
 *
 * Stream copy is ~100x faster than transcoding because it skips
 * decode→DSP→encode entirely and just remuxes the raw bitstream.
 */
export function canStreamCopy(
  sourceContainer: string,
  targetFormat: string,
): boolean {
  const src = sourceContainer.toLowerCase();
  const tgt = targetFormat.toLowerCase();

  // AAC audio from MP4/M4A containers → M4A output: direct copy
  if ((src === "mp4" || src === "m4a") && tgt === "m4a") return true;

  // WebM/Opus → WebM: direct copy
  if ((src === "webm" || src === "ogg") && tgt === "webm") return true;

  // Same container passthrough
  if (src === tgt) return true;

  return false;
}

/**
 * Builds the optimal FFmpeg audio extraction command.
 * Uses stream copy when source and target codecs are compatible,
 * falls back to transcoding only when format conversion is required.
 */
export function buildAudioExtractionArgs(opts: {
  inputPath: string;
  outputPath: string;
  sourceContainer: string;
  targetFormat: string;
  bitrate?: number;
}): string[] {
  const { inputPath, outputPath, sourceContainer, targetFormat, bitrate } = opts;

  const base = ["-i", inputPath, "-vn"]; // -vn strips video

  if (canStreamCopy(sourceContainer, targetFormat)) {
    // Zero-encode: raw bitstream copy (~100x faster)
    return injectThreads([...base, "-c:a", "copy", outputPath]);
  }

  // Transcoding required — use appropriate encoder
  switch (targetFormat) {
    case "mp3":
      return injectThreads([
        ...base,
        "-c:a", "libmp3lame",
        "-b:a", `${bitrate || 320}k`,
        "-ar", "44100",
        "-af", "aresample=async=1000",
        outputPath,
      ]);
    case "wav":
      return injectThreads([
        ...base,
        "-c:a", "pcm_s16le",
        "-ar", "44100",
        outputPath,
      ]);
    case "m4a":
      return injectThreads([
        ...base,
        "-c:a", "aac",
        "-b:a", `${bitrate || 256}k`,
        "-ar", "44100",
        outputPath,
      ]);
    default:
      return injectThreads([...base, "-c:a", "copy", outputPath]);
  }
}
