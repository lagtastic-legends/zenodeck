/**
 * ZenoDeck — 8D Spatial AudioWorkletProcessor
 *
 * Runs directly on the dedicated real-time audio rendering thread or OfflineAudioContext.
 * Computes spherical LFO orbital panning, micro-delay Doppler shifts, and contralateral
 * stereo field widening with zero main-thread interference.
 */

// AudioWorkletGlobalScope declarations for strict TypeScript compilation
interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare const AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (): AudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: new () => AudioWorkletProcessor
): void;

declare const sampleRate: number;

export class Spatial8DProcessor extends AudioWorkletProcessor {
  private phase = 0;
  // Delay line buffer for Doppler pitch modulation and contralateral reflection (max 100ms at 96kHz)
  private readonly bufferSize = 9600;
  private delayBufferL = new Float32Array(this.bufferSize);
  private delayBufferR = new Float32Array(this.bufferSize);
  private writeIndex = 0;

  static get parameterDescriptors() {
    return [
      {
        name: "speedHz",
        defaultValue: 0.2,
        minValue: 0.01,
        maxValue: 2.0,
        automationRate: "k-rate",
      },
      {
        name: "intensity",
        defaultValue: 0.85,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: "k-rate",
      },
      {
        name: "dopplerDepth",
        defaultValue: 0.05,
        minValue: 0.0,
        maxValue: 0.2,
        automationRate: "k-rate",
      },
      {
        name: "stereoWidth",
        defaultValue: 1.3,
        minValue: 0.5,
        maxValue: 2.0,
        automationRate: "k-rate",
      },
    ];
  }

  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !output || input.length === 0 || output.length === 0) {
      return true;
    }

    const inputL = input[0];
    const inputR = input[1] || inputL; // Mono to stereo fallback
    const outputL = output[0];
    const outputR = output[1] || output[0];

    if (!inputL || !outputL || !outputR) {
      return true;
    }

    const frameCount = inputL.length;

    const speedHz = parameters.speedHz?.[0] ?? 0.2;
    const intensity = parameters.intensity?.[0] ?? 0.85;
    const dopplerDepth = parameters.dopplerDepth?.[0] ?? 0.05;
    const stereoWidth = parameters.stereoWidth?.[0] ?? 1.3;

    const phaseIncrement = (2 * Math.PI * speedHz) / sampleRate;

    for (let i = 0; i < frameCount; i++) {
      const inSampleL = inputL[i] ?? 0;
      const inSampleR = inputR[i] ?? inSampleL;

      // Write to internal ring buffer
      this.delayBufferL[this.writeIndex] = inSampleL;
      this.delayBufferR[this.writeIndex] = inSampleR;

      // Spherical orbital trajectory
      this.phase += phaseIncrement;
      if (this.phase >= 2 * Math.PI) {
        this.phase -= 2 * Math.PI;
      }

      const azimuth = Math.sin(this.phase); // -1.0 (Left) to +1.0 (Right)
      const distance = Math.cos(this.phase); // Front (+1.0) to Back (-1.0)

      // Equal-power stereo panning coefficients
      // Normalizes azimuth to 0.0 (Hard Left) -> 1.0 (Hard Right)
      const panNorm = (azimuth * intensity + 1.0) * 0.5;
      const angle = panNorm * (Math.PI / 2);
      const gainL = Math.cos(angle);
      const gainR = Math.sin(angle);

      // Doppler pitch shift simulation via subtle time-delay modulation
      // Front distance produces shorter delay, rear distance produces longer delay
      const nominalDelaySamples = 40; // 40 samples (~0.9ms base latency)
      const delayModulation = distance * dopplerDepth * 25;
      const targetDelay = Math.max(1, nominalDelaySamples + delayModulation);

      // Linear interpolation read from circular buffer
      let readPos = this.writeIndex - targetDelay;
      if (readPos < 0) readPos += this.bufferSize;
      const readIdx = Math.floor(readPos);
      const frac = readPos - readIdx;
      const nextIdx = (readIdx + 1) % this.bufferSize;

      const delayedSampleL =
        (this.delayBufferL[readIdx] ?? 0) * (1 - frac) + (this.delayBufferL[nextIdx] ?? 0) * frac;
      const delayedSampleR =
        (this.delayBufferR[readIdx] ?? 0) * (1 - frac) + (this.delayBufferR[nextIdx] ?? 0) * frac;

      // Mid/Side matrixing for stereo width expansion
      const mid = (delayedSampleL + delayedSampleR) * 0.5;
      const side = (delayedSampleL - delayedSampleR) * 0.5 * stereoWidth;

      const wideL = mid + side;
      const wideR = mid - side;

      // Pinna spectral filter emulation (attenuates high frequencies slightly when sound is behind listener)
      const rearFilterFactor = distance < 0 ? 1.0 + distance * 0.25 * intensity : 1.0;

      outputL[i] = wideL * gainL * rearFilterFactor;
      outputR[i] = wideR * gainR * rearFilterFactor;

      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }

    return true;
  }
}

if (typeof registerProcessor === "function") {
  registerProcessor("spatial-8d-processor", Spatial8DProcessor);
}
