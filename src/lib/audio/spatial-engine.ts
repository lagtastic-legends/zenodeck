/**
 * ZenoDeck — Dual-Mode 8D Spatial Audio Engine
 *
 * Provides dual-engine execution:
 *  1. Live Preview Mode: Zero-latency interactive playback via AudioContext
 *  2. High-Speed Export Mode: Offline rendering via OfflineAudioContext at full CPU speed
 */

import { tagMp3Buffer, type ID3Metadata } from "@/lib/youtube/id3-tagger";
import { getOrInitTurboEngine } from "@/lib/youtube/turbo-downloader";
import { analyzeMediaTask } from "@/lib/media/engine-router";

export interface Spatial8DParams {
  speedHz: number;
  intensity: number;
  dopplerDepth: number;
  stereoWidth: number;
}

export const DEFAULT_8D_PARAMS: Spatial8DParams = {
  speedHz: 0.2,
  intensity: 0.85,
  dopplerDepth: 0.05,
  stereoWidth: 1.3,
};

export interface SpatialExportMetadata extends Partial<ID3Metadata> {
  quality?: "320k" | "256k" | "192k" | "128k";
  comment?: string;
}

export interface CompressedExportResult {
  blob: Blob;
  format: "wav" | "mp3" | "aac" | "opus";
  sizeBytes: number;
  metadataTagged: boolean;
}

export class SpatialAudioEngine {
  private static instance: SpatialAudioEngine | null = null;

  private liveAudioCtx: AudioContext | null = null;
  private liveSourceNode: AudioBufferSourceNode | null = null;
  private liveGainNode: GainNode | null = null;
  private livePannerNode: StereoPannerNode | null = null;
  private liveLfoInterval: number | null = null;
  private livePhase = 0;
  private isLivePlaying = false;

  public static getInstance(): SpatialAudioEngine {
    if (!SpatialAudioEngine.instance) {
      SpatialAudioEngine.instance = new SpatialAudioEngine();
    }
    return SpatialAudioEngine.instance;
  }

  /**
   * Initializes or returns the active Live AudioContext.
   */
  public getLiveContext(): AudioContext {
    if (!this.liveAudioCtx || this.liveAudioCtx.state === "closed") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.liveAudioCtx = new AudioCtxClass();
    }
    return this.liveAudioCtx;
  }

  /**
   * Starts live playback with real-time 8D orbital panning.
   */
  public async startLivePreview(
    audioBuffer: AudioBuffer,
    params: Spatial8DParams = DEFAULT_8D_PARAMS,
    onEnded?: () => void
  ): Promise<void> {
    this.stopLivePreview();

    const ctx = this.getLiveContext();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;

    const panner = ctx.createStereoPanner();
    const gain = ctx.createGain();
    gain.gain.value = 1.0;

    source.connect(panner);
    panner.connect(gain);
    gain.connect(ctx.destination);

    this.liveSourceNode = source;
    this.livePannerNode = panner;
    this.liveGainNode = gain;
    this.isLivePlaying = true;
    this.livePhase = 0;

    // Smooth real-time 60fps orbital LFO calculation
    const updateRateHz = 60;
    const phaseIncrement = (2 * Math.PI * params.speedHz) / updateRateHz;

    this.liveLfoInterval = window.setInterval(() => {
      if (!this.isLivePlaying || !this.livePannerNode) return;

      this.livePhase += phaseIncrement;
      if (this.livePhase >= 2 * Math.PI) {
        this.livePhase -= 2 * Math.PI;
      }

      const panValue = Math.sin(this.livePhase) * params.intensity;
      const now = ctx.currentTime;
      this.livePannerNode.pan.setTargetAtTime(
        Math.max(-1, Math.min(1, panValue)),
        now,
        0.016
      );
    }, 1000 / updateRateHz);

    source.onended = () => {
      this.stopLivePreview();
      onEnded?.();
    };

    source.start(0);
  }

  /**
   * Halts any active live preview and clears intervals.
   */
  public stopLivePreview(): void {
    if (this.liveLfoInterval !== null) {
      clearInterval(this.liveLfoInterval);
      this.liveLfoInterval = null;
    }

    if (this.liveSourceNode) {
      try {
        this.liveSourceNode.stop();
        this.liveSourceNode.disconnect();
      } catch {
        // Safe disconnect
      }
      this.liveSourceNode = null;
    }

    if (this.livePannerNode) {
      try {
        this.livePannerNode.disconnect();
      } catch {
        // Safe disconnect
      }
      this.livePannerNode = null;
    }

    this.isLivePlaying = false;
  }

  /**
   * HIGH-SPEED EXPORT MODE (OfflineAudioContext):
   * Renders full audio buffer with 8D spatial trajectory faster than real time at full CPU speed.
   */
  public async renderOffline8D(
    audioBuffer: AudioBuffer,
    params: Spatial8DParams = DEFAULT_8D_PARAMS,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    const channels = 2; // Always stereo output

    const offlineCtx = new OfflineAudioContext(channels, length, sampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // Try AudioWorklet first; fallback to node-graph automation
    let usedWorklet = false;
    try {
      if (offlineCtx.audioWorklet) {
        const workletCode = `
          class Spatial8DProcessor extends AudioWorkletProcessor {
            constructor() {
              super();
              this.phase = 0;
              this.bufferSize = 9600;
              this.bufL = new Float32Array(this.bufferSize);
              this.bufR = new Float32Array(this.bufferSize);
              this.wIdx = 0;
            }
            static get parameterDescriptors() {
              return [
                { name: 'speedHz', defaultValue: ${params.speedHz} },
                { name: 'intensity', defaultValue: ${params.intensity} },
                { name: 'dopplerDepth', defaultValue: ${params.dopplerDepth} },
                { name: 'stereoWidth', defaultValue: ${params.stereoWidth} }
              ];
            }
            process(inputs, outputs, parameters) {
              const input = inputs[0];
              const output = outputs[0];
              if (!input || !output || !input[0] || !output[0]) return true;
              const inL = input[0];
              const inR = input[1] || inL;
              const outL = output[0];
              const outR = output[1] || output[0];
              const speed = parameters.speedHz?.[0] ?? ${params.speedHz};
              const intensity = parameters.intensity?.[0] ?? ${params.intensity};
              const doppler = parameters.dopplerDepth?.[0] ?? ${params.dopplerDepth};
              const width = parameters.stereoWidth?.[0] ?? ${params.stereoWidth};
              const inc = (2 * Math.PI * speed) / sampleRate;

              for (let i = 0; i < inL.length; i++) {
                this.bufL[this.wIdx] = inL[i] || 0;
                this.bufR[this.wIdx] = inR[i] || inL[i] || 0;
                this.phase += inc;
                if (this.phase >= 2 * Math.PI) this.phase -= 2 * Math.PI;

                const azimuth = Math.sin(this.phase);
                const distance = Math.cos(this.phase);

                const panNorm = (azimuth * intensity + 1.0) * 0.5;
                const angle = panNorm * (Math.PI / 2);
                const gainL = Math.cos(angle);
                const gainR = Math.sin(angle);

                const delayMod = distance * doppler * 25;
                let rPos = this.wIdx - Math.max(1, 40 + delayMod);
                if (rPos < 0) rPos += this.bufferSize;
                const rIdx = Math.floor(rPos);
                const frac = rPos - rIdx;
                const nIdx = (rIdx + 1) % this.bufferSize;

                const sL = this.bufL[rIdx] * (1 - frac) + this.bufL[nIdx] * frac;
                const sR = this.bufR[rIdx] * (1 - frac) + this.bufR[nIdx] * frac;

                const mid = (sL + sR) * 0.5;
                const side = (sL - sR) * 0.5 * width;

                const rearDamp = distance < 0 ? 1.0 + distance * 0.25 * intensity : 1.0;
                outL[i] = (mid + side) * gainL * rearDamp;
                outR[i] = (mid - side) * gainR * rearDamp;

                this.wIdx = (this.wIdx + 1) % this.bufferSize;
              }
              return true;
            }
          }
          registerProcessor('spatial-8d-offline', Spatial8DProcessor);
        `;
        const blob = new Blob([workletCode], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        try {
          await offlineCtx.audioWorklet.addModule(blobUrl);
          const workletNode = new AudioWorkletNode(offlineCtx, "spatial-8d-offline");
          source.connect(workletNode);
          workletNode.connect(offlineCtx.destination);
          usedWorklet = true;
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      }
    } catch {
      usedWorklet = false;
    }

    // High-precision automated fallback if Worklet is unavailable
    if (!usedWorklet) {
      const panner = offlineCtx.createStereoPanner();
      const numSteps = Math.min(length, 10000);
      const stepInterval = length / numSteps / sampleRate;

      for (let s = 0; s < numSteps; s++) {
        const time = s * stepInterval;
        const phase = 2 * Math.PI * params.speedHz * time;
        const panVal = Math.sin(phase) * params.intensity;
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panVal)), time);
      }

      source.connect(panner);
      panner.connect(offlineCtx.destination);
    }

    source.start(0);

    // Track simulated progress during fast-path offline execution
    onProgress?.(15);
    const renderedBuffer = await offlineCtx.startRendering();
    onProgress?.(85);

    const wavBlob = audioBufferToWavBlob(renderedBuffer);
    onProgress?.(100);

    return wavBlob;
  }

  /**
   * COMPRESSED 8D AUDIO EXPORT (MP3 / AAC / OPUS / WAV + ID3 METADATA)
   * Converts the rendered OfflineAudioContext buffer into high-quality compressed audio,
   * injecting full ID3v2.3 tags and cover artwork for studio playback on portable devices.
   */
  public async exportCompressedSpatialAudio(
    rendered: AudioBuffer | Blob,
    format: "wav" | "mp3" | "aac" | "opus" = "mp3",
    metadata?: SpatialExportMetadata,
    options?: {
      ffmpegEngine?: any;
      bitrate?: string;
      onProgress?: (percent: number) => void;
    }
  ): Promise<CompressedExportResult> {
    return exportCompressedSpatialAudio(rendered, format, metadata, options);
  }
}

/**
 * Pipes a rendered AudioBuffer or WAV Blob through FFmpeg compression and ID3 tagging.
 */
export async function exportCompressedSpatialAudio(
  rendered: AudioBuffer | Blob,
  format: "wav" | "mp3" | "aac" | "opus" = "mp3",
  metadata?: SpatialExportMetadata,
  options?: {
    ffmpegEngine?: any;
    bitrate?: string;
    onProgress?: (percent: number) => void;
  }
): Promise<CompressedExportResult> {
  const onProgress = options?.onProgress || (() => {});
  onProgress(5);

  // 1. Prepare raw WAV Blob
  const wavBlob = rendered instanceof Blob ? rendered : audioBufferToWavBlob(rendered);

  // 2. Uncompressed WAV fast return
  if (format === "wav") {
    onProgress(100);
    return {
      blob: wavBlob,
      format: "wav",
      sizeBytes: wavBlob.size,
      metadataTagged: false,
    };
  }

  // 3. Compress using WebAssembly FFmpeg Engine
  try {
    onProgress(15);
    const wavBytes = new Uint8Array(await wavBlob.arrayBuffer());
    const engine = await getOrInitTurboEngine(options?.ffmpegEngine);

    if (!engine) {
      console.warn("FFmpeg engine not available for audio compression, returning uncompressed WAV");
      onProgress(100);
      return {
        blob: wavBlob,
        format: "wav",
        sizeBytes: wavBlob.size,
        metadataTagged: false,
      };
    }

    const inName = `spatial_in_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.wav`;
    const outExt = format === "aac" ? "m4a" : format;
    const outName = `spatial_out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${outExt}`;

    await engine.writeFile(inName, wavBytes);
    onProgress(35);

    const title = metadata?.title || "8D Spatial Audio";
    const artist = metadata?.artist || "ZenoDeck DSP Engine";
    const album = metadata?.album || "ZenoDeck 8D Master";
    const year = metadata?.year || new Date().getFullYear().toString();

    // Native container metadata args passed directly to FFmpeg muxer
    // This allows AAC/M4A to write native ilst atoms and Opus to write native Vorbis comments
    // without corrupting byte offset 0 (preserving ftyp and OggS headers for Android MediaExtractor)
    const nativeMetaArgs = [
      "-metadata",
      `title=${title}`,
      "-metadata",
      `artist=${artist}`,
      "-metadata",
      `album=${album}`,
      "-metadata",
      `date=${year}`,
    ];

    let ffmpegArgs: string[];
    if (format === "mp3") {
      const br = metadata?.quality || options?.bitrate || "320k";
      ffmpegArgs = [
        "-i",
        inName,
        "-vn",
        "-c:a",
        "libmp3lame",
        "-b:a",
        br,
        ...nativeMetaArgs,
        "-id3v2_version",
        "3",
        outName,
      ];
    } else if (format === "aac") {
      const br = metadata?.quality || options?.bitrate || "256k";
      ffmpegArgs = [
        "-i",
        inName,
        "-vn",
        "-c:a",
        "aac",
        "-b:a",
        br,
        ...nativeMetaArgs,
        outName,
      ];
    } else {
      // opus
      const br = metadata?.quality || options?.bitrate || "192k";
      ffmpegArgs = [
        "-i",
        inName,
        "-vn",
        "-c:a",
        "libopus",
        "-b:a",
        br,
        ...nativeMetaArgs,
        outName,
      ];
    }

    onProgress(50);
    await engine.exec(ffmpegArgs);
    onProgress(80);

    const outData = (await engine.readFile(outName)) as Uint8Array;

    try {
      await engine.deleteFile(inName);
      await engine.deleteFile(outName);
    } catch {}

    if (!outData || outData.length === 0) {
      throw new Error("FFmpeg produced empty audio file");
    }

    // 4. Inject ID3v2.3 tags and album artwork ONLY for MP3
    // (Raw binary ID3 prepending is strictly limited to MP3 to avoid corrupting ftyp/OggS container headers)
    if (format === "mp3") {
      onProgress(90);
      const id3Meta: ID3Metadata = {
        title,
        artist,
        album,
        year,
        thumbnailUrl: metadata?.thumbnailUrl,
        coverImageBuffer: metadata?.coverImageBuffer,
      };

      const taggedBytes = await tagMp3Buffer(outData, id3Meta);
      const finalBlob = new Blob([taggedBytes.buffer as ArrayBuffer], { type: "audio/mpeg" });
      onProgress(100);

      return {
        blob: finalBlob,
        format: "mp3",
        sizeBytes: finalBlob.size,
        metadataTagged: true,
      };
    }

    // 5. AAC / OPUS MIME mapping (Native container metadata atoms/comments embedded by muxer)
    const mimeType = format === "aac" ? "audio/mp4" : "audio/ogg; codecs=opus";
    const compressedBlob = new Blob([outData.buffer as ArrayBuffer], { type: mimeType });
    onProgress(100);

    return {
      blob: compressedBlob,
      format,
      sizeBytes: compressedBlob.size,
      metadataTagged: true,
    };
  } catch (err) {
    console.warn("Compressed audio export fallback to WAV due to error:", err);
    onProgress(100);
    return {
      blob: wavBlob,
      format: "wav",
      sizeBytes: wavBlob.size,
      metadataTagged: false,
    };
  }
}

/**
 * Encodes an AudioBuffer into a pristine 16-bit PCM Stereo WAV Blob.
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF Chunk Descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt Sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Sub-chunk 1 size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // Bits per sample

  // data Sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // Write interleaved PCM samples
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch]?.[i] ?? 0));
      // Convert float [-1.0, 1.0] to signed 16-bit int [-32768, 32767]
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
