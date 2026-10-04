/**
 * ZenoDeck Audio DSP Studio - Web Audio API DSP Node Chain Engine
 * ==============================================================
 * Production-grade Web Audio API graph singleton managing:
 * - Persistent MediaElementAudioSourceNode caching per HTMLAudioElement (strictly avoiding InvalidStateError)
 * - 10-Band Graphic Equalizer cascade (ISO standard frequencies with 15ms de-zippering)
 * - Dynamic Bass Boost with low-shelf filter, soft-clipping dynamics compressor, and headroom compensation
 * - Real-Time 8D Spatial Audio (circular LFO orbital panner + pinna lowpass + Haas micro-reflection delay)
 * - Center Vocal Isolation (Acapella formant extraction) and Removal (Karaoke with sub-bass preservation)
 * - Zero-Glitch A/B Bypass with 20ms exponential crossfade
 * - Post-summing AnalyserNode for spectrum visualization
 * - Mobile and browser autoplay suspension resume handler
 */

import {
  ISO_10_BAND_FREQUENCIES,
  clampGain,
  BassBoostConfig,
  Spatial8DConfig,
  VocalMode,
  DEFAULT_BASS_BOOST,
  DEFAULT_SPATIAL_8D,
  DEFAULT_EQ_GAINS,
} from "./dsp-types";

export class AudioDspEngine {
  private static instance: AudioDspEngine | null = null;

  // Web Audio Context
  private audioCtx: AudioContext | null = null;

  // Media element binding
  private currentAudioEl: HTMLAudioElement | null = null;
  private currentSourceNode: MediaElementAudioSourceNode | null = null;
  private sourceNodeCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>();

  // A/B Bypass & Master Summing
  private dryGainNode: GainNode | null = null;
  private wetInputGainNode: GainNode | null = null;
  private wetOutputGainNode: GainNode | null = null;
  private masterSummingNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // 10-Band EQ filters
  private eqFilters: BiquadFilterNode[] = [];

  // Dynamic Bass Boost nodes
  private bassInputGain: GainNode | null = null;
  private bassLowshelfFilter: BiquadFilterNode | null = null;
  private bassLimiterNode: DynamicsCompressorNode | null = null;

  // 8D Spatial nodes & state
  private spatialBlockInput: GainNode | null = null;
  private pinnaFilter: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private spatialDirectGain: GainNode | null = null;
  private haasDelayNode: DelayNode | null = null;
  private haasDampFilter: BiquadFilterNode | null = null;
  private haasPannerNode: StereoPannerNode | null = null;
  private haasWetGain: GainNode | null = null;
  private spatialSummer: GainNode | null = null;
  private spatialConfig: Spatial8DConfig = { ...DEFAULT_SPATIAL_8D };
  private spatialLfoTimer: number | null = null;

  // Vocal Matrix nodes
  private vocalBlockInput: GainNode | null = null;
  private vocalBlockOutput: GainNode | null = null;
  private vocalNormalGain: GainNode | null = null;
  private vocalIsolateGateGain: GainNode | null = null;
  private vocalRemoveGateGain: GainNode | null = null;

  // State flags
  private isBypassedState: boolean = false;
  private activeVocalMode: VocalMode = "off";
  private activeBassConfig: BassBoostConfig = { ...DEFAULT_BASS_BOOST };
  private activeEqGains: number[] = [...DEFAULT_EQ_GAINS];

  /**
   * Singleton accessor.
   */
  public static getInstance(customContext?: AudioContext): AudioDspEngine {
    if (!AudioDspEngine.instance) {
      AudioDspEngine.instance = new AudioDspEngine(customContext);
    }
    return AudioDspEngine.instance;
  }

  /**
   * Resets singleton instance (useful for clean teardown in tests).
   */
  public static resetInstance(): void {
    if (AudioDspEngine.instance) {
      AudioDspEngine.instance.dispose();
      AudioDspEngine.instance = null;
    }
  }

  constructor(customContext?: AudioContext) {
    if (customContext) {
      this.audioCtx = customContext;
      this.initGraph();
    } else if (typeof window !== "undefined") {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.audioCtx = new AudioCtxClass();
          this.initGraph();
        } catch (err) {
          console.warn("[AudioDspEngine] AudioContext init deferred:", err);
        }
      }
    }
  }

  /**
   * Ensures the AudioContext and the entire DSP graph are created.
   */
  private ensureContext(): boolean {
    if (this.audioCtx) return true;
    if (typeof window === "undefined") return false;

    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxClass) return false;

    try {
      this.audioCtx = new AudioCtxClass();
      this.initGraph();
      return true;
    } catch (err) {
      console.warn("[AudioDspEngine] Unable to instantiate AudioContext:", err);
      return false;
    }
  }

  /**
   * Constructs the full Web Audio processing graph.
   */
  private initGraph(): void {
    const ctx = this.audioCtx;
    if (!ctx) return;

    // 1. Dry / Wet Routing & Master Summing
    this.dryGainNode = ctx.createGain();
    this.dryGainNode.gain.value = 0.0; // By default wet is active, dry is muted

    this.wetInputGainNode = ctx.createGain();
    this.wetInputGainNode.gain.value = 1.0;

    this.wetOutputGainNode = ctx.createGain();
    this.wetOutputGainNode.gain.value = 1.0;

    this.masterSummingNode = ctx.createGain();
    this.masterSummingNode.gain.value = 1.0;

    // 2. AnalyserNode
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 256; // 128 frequency bins
    this.analyserNode.smoothingTimeConstant = 0.8;

    // Connect summing -> analyser -> destination
    this.dryGainNode.connect(this.masterSummingNode);
    this.wetOutputGainNode.connect(this.masterSummingNode);
    this.masterSummingNode.connect(this.analyserNode);
    try {
      this.analyserNode.connect(ctx.destination);
    } catch {
      // destination connection fallback
    }

    // 3. Build Vocal Processing Subgraph
    this.initVocalGraph(ctx);

    // 4. Build 10-Band Graphic Equalizer Cascade
    this.initEqualizerGraph(ctx);

    // 5. Build Dynamic Bass Boost Block
    this.initBassBoostGraph(ctx);

    // 6. Build 8D Spatial Audio Block
    this.initSpatialGraph(ctx);

    // 7. Wire the main wet processing stages in series:
    // wetInput -> vocalBlock -> eqCascade -> bassBlock -> spatialBlock -> wetOutput
    if (this.wetInputGainNode && this.vocalBlockInput) {
      this.wetInputGainNode.connect(this.vocalBlockInput);
    }

    if (this.vocalBlockOutput && this.eqFilters.length > 0) {
      this.vocalBlockOutput.connect(this.eqFilters[0]);
    }

    if (this.eqFilters.length > 0 && this.bassInputGain) {
      this.eqFilters[this.eqFilters.length - 1].connect(this.bassInputGain);
    }

    if (this.bassLimiterNode && this.spatialBlockInput) {
      this.bassLimiterNode.connect(this.spatialBlockInput);
    }

    if (this.spatialSummer && this.wetOutputGainNode) {
      this.spatialSummer.connect(this.wetOutputGainNode);
    }
  }

  /**
   * Stage 1: Center Vocal Isolation and Phase-Cancellation Matrix
   */
  private initVocalGraph(ctx: AudioContext): void {
    this.vocalBlockInput = ctx.createGain();
    this.vocalBlockOutput = ctx.createGain();

    // Normal / Passthrough path (vocalMode = "off")
    this.vocalNormalGain = ctx.createGain();
    this.vocalNormalGain.gain.value = 1.0;
    this.vocalBlockInput.connect(this.vocalNormalGain);
    this.vocalNormalGain.connect(this.vocalBlockOutput);

    // Vocal Isolation path (vocalMode = "isolate")
    // Extracts center channel M = (L + R)/2 with vocal formant bandpass (220Hz - 3600Hz)
    const isolateSplitter = ctx.createChannelSplitter(2);
    const isolateCenterSum = ctx.createGain();
    isolateCenterSum.gain.value = 0.5;

    const isolateHp = ctx.createBiquadFilter();
    isolateHp.type = "highpass";
    isolateHp.frequency.value = 220;
    isolateHp.Q.value = 0.707;

    const isolateLp = ctx.createBiquadFilter();
    isolateLp.type = "lowpass";
    isolateLp.frequency.value = 3600;
    isolateLp.Q.value = 0.707;

    const isolatePresence = ctx.createBiquadFilter();
    isolatePresence.type = "peaking";
    isolatePresence.frequency.value = 1800;
    isolatePresence.Q.value = 1.0;
    isolatePresence.gain.value = 4.0;

    this.vocalIsolateGateGain = ctx.createGain();
    this.vocalIsolateGateGain.gain.value = 0.0;

    this.vocalBlockInput.connect(isolateSplitter);
    isolateSplitter.connect(isolateCenterSum, 0);
    isolateSplitter.connect(isolateCenterSum, 1);
    isolateCenterSum.connect(isolateHp);
    isolateHp.connect(isolateLp);
    isolateLp.connect(isolatePresence);
    isolatePresence.connect(this.vocalIsolateGateGain);
    this.vocalIsolateGateGain.connect(this.vocalBlockOutput);

    // Vocal Removal path (vocalMode = "remove")
    // Out-of-phase stereo cancellation above 140Hz with rhythm sub-bass preservation below 140Hz
    const removeSplitter = ctx.createChannelSplitter(2);

    // Bass preservation filters (< 140Hz)
    const bassLpL = ctx.createBiquadFilter();
    bassLpL.type = "lowpass";
    bassLpL.frequency.value = 140;

    const bassLpR = ctx.createBiquadFilter();
    bassLpR.type = "lowpass";
    bassLpR.frequency.value = 140;

    // Mid/high cancellation filters (> 140Hz)
    const midHighHpL = ctx.createBiquadFilter();
    midHighHpL.type = "highpass";
    midHighHpL.frequency.value = 140;

    const midHighHpR = ctx.createBiquadFilter();
    midHighHpR.type = "highpass";
    midHighHpR.frequency.value = 140;

    // Phase difference matrix:
    // Left diff = (L_high - R_high) * 0.707
    // Right diff = (R_high - L_high) * 0.707
    const diffPosL = ctx.createGain();
    diffPosL.gain.value = 0.707;
    const diffNegL = ctx.createGain();
    diffNegL.gain.value = -0.707;

    const diffPosR = ctx.createGain();
    diffPosR.gain.value = 0.707;
    const diffNegR = ctx.createGain();
    diffNegR.gain.value = -0.707;

    const removeMerger = ctx.createChannelMerger(2);

    this.vocalBlockInput.connect(removeSplitter);

    // Feed bass lowpass filters
    removeSplitter.connect(bassLpL, 0);
    removeSplitter.connect(bassLpR, 1);

    // Feed highpass filters
    removeSplitter.connect(midHighHpL, 0);
    removeSplitter.connect(midHighHpR, 1);

    // Construct Left channel: (L_high - R_high) + L_bass
    midHighHpL.connect(diffPosL);
    midHighHpR.connect(diffNegL);
    diffPosL.connect(removeMerger, 0, 0);
    diffNegL.connect(removeMerger, 0, 0);
    bassLpL.connect(removeMerger, 0, 0);

    // Construct Right channel: (R_high - L_high) + R_bass
    midHighHpR.connect(diffPosR);
    midHighHpL.connect(diffNegR);
    diffPosR.connect(removeMerger, 0, 1);
    diffNegR.connect(removeMerger, 0, 1);
    bassLpR.connect(removeMerger, 0, 1);

    this.vocalRemoveGateGain = ctx.createGain();
    this.vocalRemoveGateGain.gain.value = 0.0;

    removeMerger.connect(this.vocalRemoveGateGain);
    this.vocalRemoveGateGain.connect(this.vocalBlockOutput);
  }

  /**
   * Stage 2: 10-Band Graphic Equalizer Cascade
   */
  private initEqualizerGraph(ctx: AudioContext): void {
    this.eqFilters = [];

    for (let i = 0; i < ISO_10_BAND_FREQUENCIES.length; i++) {
      const freq = ISO_10_BAND_FREQUENCIES[i];
      const filter = ctx.createBiquadFilter();
      filter.frequency.value = freq;
      filter.gain.value = 0.0;

      if (i === 0) {
        // Band 0: 32Hz Lowshelf
        filter.type = "lowshelf";
      } else if (i === ISO_10_BAND_FREQUENCIES.length - 1) {
        // Band 9: 16kHz Highshelf
        filter.type = "highshelf";
      } else {
        // Bands 1-8: Peaking with Q=1.414 (1 octave bandwidth)
        filter.type = "peaking";
        filter.Q.value = 1.414;
      }

      this.eqFilters.push(filter);
    }

    // Cascade filters in series
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }
  }

  /**
   * Stage 3: Dynamic Bass Boost with Limiter
   */
  private initBassBoostGraph(ctx: AudioContext): void {
    this.bassInputGain = ctx.createGain();
    this.bassInputGain.gain.value = 1.0;

    this.bassLowshelfFilter = ctx.createBiquadFilter();
    this.bassLowshelfFilter.type = "lowshelf";
    this.bassLowshelfFilter.frequency.value = 80;
    this.bassLowshelfFilter.gain.value = 0.0;

    this.bassLimiterNode = ctx.createDynamicsCompressor();
    this.bassLimiterNode.threshold.value = -6.0; // -6 dBFS threshold
    this.bassLimiterNode.knee.value = 10.0; // 10 dB ultra-soft musical knee
    this.bassLimiterNode.ratio.value = 8.0; // 8:1 progressive limiting ratio
    this.bassLimiterNode.attack.value = 0.003; // 3ms ultra-fast transient catch
    this.bassLimiterNode.release.value = 0.06; // 60ms transparent release avoiding vocal pumping

    this.bassInputGain.connect(this.bassLowshelfFilter);
    this.bassLowshelfFilter.connect(this.bassLimiterNode);
  }

  /**
   * Stage 4: Real-Time 8D Spatial Audio
   */
  private initSpatialGraph(ctx: AudioContext): void {
    this.spatialBlockInput = ctx.createGain();
    this.spatialBlockInput.gain.value = 1.0;

    // Pinna / head-shadow lowpass filter (modulates 6.5kHz - 18kHz)
    this.pinnaFilter = ctx.createBiquadFilter();
    this.pinnaFilter.type = "lowpass";
    this.pinnaFilter.frequency.value = 18000;
    this.pinnaFilter.Q.value = 0.707;

    // Stereo Panner (azimuth rotation)
    if (typeof ctx.createStereoPanner === "function") {
      this.pannerNode = ctx.createStereoPanner();
      this.pannerNode.pan.value = 0.0;
    } else {
      // Passthrough fallback if StereoPanner is not supported
      this.pannerNode = null;
    }

    this.spatialDirectGain = ctx.createGain();
    this.spatialDirectGain.gain.value = 1.0;

    this.spatialSummer = ctx.createGain();
    this.spatialSummer.gain.value = 1.0;

    // Haas micro-reflection delay line (22ms out-of-head room dimension)
    this.haasDelayNode = ctx.createDelay(0.1);
    this.haasDelayNode.delayTime.value = 0.022; // 22ms

    this.haasDampFilter = ctx.createBiquadFilter();
    this.haasDampFilter.type = "lowpass";
    this.haasDampFilter.frequency.value = 4500;

    // Contralateral reflection panner for psychoacoustic room bounce
    if (typeof ctx.createStereoPanner === "function") {
      this.haasPannerNode = ctx.createStereoPanner();
      this.haasPannerNode.pan.value = 0.0;
    } else {
      this.haasPannerNode = null;
    }

    this.haasWetGain = ctx.createGain();
    this.haasWetGain.gain.value = 0.0; // Inactive until 8D enabled

    // Direct path wiring
    if (this.pannerNode) {
      this.spatialBlockInput.connect(this.pinnaFilter);
      this.pinnaFilter.connect(this.pannerNode);
      this.pannerNode.connect(this.spatialDirectGain);
      this.spatialDirectGain.connect(this.spatialSummer);
    } else {
      this.spatialBlockInput.connect(this.pinnaFilter);
      this.pinnaFilter.connect(this.spatialDirectGain);
      this.spatialDirectGain.connect(this.spatialSummer);
    }

    // Haas reflection wiring: Delay -> DampFilter -> Contralateral Panner -> WetGain -> Summer
    this.spatialBlockInput.connect(this.haasDelayNode);
    this.haasDelayNode.connect(this.haasDampFilter);
    if (this.haasPannerNode) {
      this.haasDampFilter.connect(this.haasPannerNode);
      this.haasPannerNode.connect(this.haasWetGain);
    } else {
      this.haasDampFilter.connect(this.haasWetGain);
    }
    this.haasWetGain.connect(this.spatialSummer);
  }

  /**
   * Smoothly ramps an AudioParam using setTargetAtTime to prevent zipper clicks.
   */
  private setParamTarget(param: AudioParam, target: number, timeConstant: number): void {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime || 0;
    if (typeof param.setTargetAtTime === "function") {
      try {
        param.setTargetAtTime(target, now, timeConstant);
      } catch {
        param.value = target;
      }
    } else {
      param.value = target;
    }
  }

  // =========================================================================
  // Public Interface Methods
  // =========================================================================

  /**
   * Attaches an HTMLAudioElement to the Web Audio DSP graph.
   * Strictly caches MediaElementAudioSourceNode per element to prevent InvalidStateError.
   */
  public attachElement(audioEl: HTMLAudioElement): void {
    if (!audioEl) return;
    this.ensureContext();
    if (!this.audioCtx) return;

    if (this.currentAudioEl === audioEl && this.currentSourceNode) {
      // Already attached to this exact element
      this.resumeContext();
      return;
    }

    // Disconnect previous element from graph inputs
    if (this.currentSourceNode) {
      try {
        if (this.dryGainNode) this.currentSourceNode.disconnect(this.dryGainNode);
        if (this.wetInputGainNode) this.currentSourceNode.disconnect(this.wetInputGainNode);
      } catch {
        // Disconnect gracefully
      }
    }

    // Retrieve or create cached source node
    let sourceNode = this.sourceNodeCache.get(audioEl);
    if (!sourceNode) {
      sourceNode = this.audioCtx.createMediaElementSource(audioEl);
      this.sourceNodeCache.set(audioEl, sourceNode);
    }

    // Connect source to both dry and wet paths
    if (this.dryGainNode) {
      sourceNode.connect(this.dryGainNode);
    }
    if (this.wetInputGainNode) {
      sourceNode.connect(this.wetInputGainNode);
    }

    this.currentAudioEl = audioEl;
    this.currentSourceNode = sourceNode;

    // Resume context if suspended
    this.resumeContext();
  }

  /**
   * Resumes AudioContext on user interaction to handle mobile/browser autoplay policy.
   */
  public async resumeContext(): Promise<void> {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      try {
        await this.audioCtx.resume();
      } catch (err) {
        console.warn("[AudioDspEngine] AudioContext resume failed:", err);
      }
    }
  }

  /**
   * Sets the gain for a specific EQ band index (0 to 9) with 15ms de-zippering.
   */
  public setBandGain(index: number, gainDb: number): void {
    if (index < 0 || index >= this.eqFilters.length) return;
    const clamped = clampGain(gainDb);
    this.activeEqGains[index] = clamped;

    const filter = this.eqFilters[index];
    if (filter) {
      this.setParamTarget(filter.gain, clamped, 0.015);
    }
  }

  /**
   * Sets all 10 EQ band gains simultaneously.
   */
  public setAllGains(gains: number[]): void {
    const len = Math.min(gains.length, this.eqFilters.length);
    for (let i = 0; i < len; i++) {
      this.setBandGain(i, gains[i]);
    }
  }

  /**
   * Updates Dynamic Bass Boost parameters:
   * - Cutoff frequency (60Hz - 120Hz)
   * - Boost gain (0dB - 18dB)
   * - Automatic headroom pre-attenuation: -(gain * 0.45) dB to prevent digital overs
   */
  public setBassBoost(config: BassBoostConfig): void {
    this.activeBassConfig = { ...config };
    if (!this.audioCtx) return;

    const enabled = config.enabled;
    const gainDb = enabled ? Math.max(0, Math.min(18, config.gainDb)) : 0.0;
    const cutoff = Math.max(40, Math.min(200, config.cutoffHz || 80));

    // Calculate dynamic headroom compensation
    const headroomDb = enabled ? -(gainDb * 0.45) : 0.0;
    const headroomLinear = Math.pow(10, headroomDb / 20);

    if (this.bassInputGain) {
      this.setParamTarget(this.bassInputGain.gain, headroomLinear, 0.015);
    }
    if (this.bassLowshelfFilter) {
      this.setParamTarget(this.bassLowshelfFilter.frequency, cutoff, 0.015);
      this.setParamTarget(this.bassLowshelfFilter.gain, gainDb, 0.015);
    }
  }

  /**
   * Updates Real-Time 8D Spatial Audio parameters and manages circular LFO rotation.
   */
  public setSpatial8D(config: Spatial8DConfig): void {
    this.spatialConfig = { ...config };
    if (!this.audioCtx) return;

    if (config.enabled) {
      // Activate Haas wet reflection proportional to intensity
      const haasLevel = 0.16 * Math.max(0.1, Math.min(1.0, config.intensity ?? 0.8));
      if (this.haasWetGain && this.haasWetGain.gain) {
        this.setParamTarget(this.haasWetGain.gain, haasLevel, 0.02);
      }
      this.startSpatialLfo();
      this.tickSpatialLfo();
    } else {
      // Smoothly return panner to center, direct gain to unity, pinna to wide open, reflection to center/zero
      this.stopSpatialLfo();
      if (this.pannerNode && this.pannerNode.pan) {
        this.setParamTarget(this.pannerNode.pan, 0.0, 0.02);
      }
      if (this.spatialDirectGain && this.spatialDirectGain.gain) {
        this.setParamTarget(this.spatialDirectGain.gain, 1.0, 0.02);
      }
      if (this.pinnaFilter && this.pinnaFilter.frequency) {
        this.setParamTarget(this.pinnaFilter.frequency, 20000, 0.02);
      }
      if (this.haasPannerNode && this.haasPannerNode.pan) {
        this.setParamTarget(this.haasPannerNode.pan, 0.0, 0.02);
      }
      if (this.haasWetGain && this.haasWetGain.gain) {
        this.setParamTarget(this.haasWetGain.gain, 0.0, 0.02);
      }
    }
  }

  /**
   * Ticks the 8D orbital LFO.
   * Public for deterministic testing and manual stepping.
   */
  public tickSpatialLfo(): void {
    if (!this.audioCtx || !this.spatialConfig.enabled) return;

    const t = this.audioCtx.currentTime || 0;
    const speed = Math.max(0.05, Math.min(2.0, this.spatialConfig.speedHz || 0.2));
    const intensity = Math.max(0.0, Math.min(1.0, this.spatialConfig.intensity ?? 0.8));
    const theta = 2 * Math.PI * speed * t;

    // 1. Azimuth panning X: sin(theta) * intensity (-1.0 to +1.0)
    const panX = Math.max(-1.0, Math.min(1.0, Math.sin(theta) * intensity));

    // 2. Depth Y: cos(theta) (-1.0 = directly behind listener, +1.0 = directly in front)
    const cosY = Math.cos(theta);

    // 3. Pinna absorption: modulates 6500 Hz behind to 18000 Hz in front
    // Frequency dip accounts for acoustic shadow cast by human ear pinnae
    const cutoffHz = Math.max(6000, Math.min(20000, 12250 + 5750 * cosY));

    // 4. Front/Back distance attenuation: direct path dips slightly when behind head
    // cosY = +1 (front) -> directGain = 1.0 (0 dB attenuation)
    // cosY = -1 (back)  -> directGain = 1.0 - 0.20 * intensity (~ -2 dB dip)
    const directGain = Math.max(0.7, Math.min(1.0, 1.0 - 0.10 * (1.0 - cosY) * intensity));

    // 5. Haas room reflection gain: subtly rises when sound source orbits behind head,
    // creating an acoustic sensation of ambient room reverberation in the rear hemisphere
    const baseHaas = 0.16 * intensity;
    const haasGain = Math.max(0.0, Math.min(0.35, baseHaas * (1.0 + 0.3 * (1.0 - cosY))));

    // 6. Contralateral reflection azimuth (early room bounce from opposing wall)
    const reflPanX = Math.max(-1.0, Math.min(1.0, -panX * 0.5));

    if (this.pannerNode && this.pannerNode.pan) {
      this.setParamTarget(this.pannerNode.pan, panX, 0.03);
    }
    if (this.spatialDirectGain && this.spatialDirectGain.gain) {
      this.setParamTarget(this.spatialDirectGain.gain, directGain, 0.03);
    }
    if (this.pinnaFilter && this.pinnaFilter.frequency) {
      this.setParamTarget(this.pinnaFilter.frequency, cutoffHz, 0.03);
    }
    if (this.haasWetGain && this.haasWetGain.gain) {
      this.setParamTarget(this.haasWetGain.gain, haasGain, 0.03);
    }
    if (this.haasPannerNode && this.haasPannerNode.pan) {
      this.setParamTarget(this.haasPannerNode.pan, reflPanX, 0.03);
    }
  }

  private startSpatialLfo(): void {
    if (this.spatialLfoTimer !== null || typeof window === "undefined") return;

    // Use requestAnimationFrame for 60/120Hz micro-smooth orbital motion without main-thread jitter
    if (typeof window.requestAnimationFrame === "function") {
      const loop = () => {
        if (!this.spatialConfig.enabled) {
          this.spatialLfoTimer = null;
          return;
        }
        this.tickSpatialLfo();
        this.spatialLfoTimer = window.requestAnimationFrame(loop);
      };
      this.spatialLfoTimer = window.requestAnimationFrame(loop);
    } else {
      this.spatialLfoTimer = window.setInterval(() => {
        this.tickSpatialLfo();
      }, 25);
    }
  }

  private stopSpatialLfo(): void {
    if (this.spatialLfoTimer !== null && typeof window !== "undefined") {
      if (typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(this.spatialLfoTimer);
      }
      window.clearInterval(this.spatialLfoTimer);
      this.spatialLfoTimer = null;
    }
  }

  /**
   * Switches Vocal Processing mode with smooth 20ms crossfading:
   * - "off": Natural passthrough
   * - "isolate": Center vocal solo (Acapella)
   * - "remove": Center vocal cut with sub-bass preservation (Karaoke)
   */
  public setVocalMode(mode: VocalMode): void {
    this.activeVocalMode = mode;
    if (!this.audioCtx) return;

    const normalTarget = mode === "off" ? 1.0 : 0.0;
    const isolateTarget = mode === "isolate" ? 1.0 : 0.0;
    const removeTarget = mode === "remove" ? 1.0 : 0.0;

    if (this.vocalNormalGain) {
      this.setParamTarget(this.vocalNormalGain.gain, normalTarget, 0.02);
    }
    if (this.vocalIsolateGateGain) {
      this.setParamTarget(this.vocalIsolateGateGain.gain, isolateTarget, 0.02);
    }
    if (this.vocalRemoveGateGain) {
      this.setParamTarget(this.vocalRemoveGateGain.gain, removeTarget, 0.02);
    }
  }

  /**
   * Toggles Zero-Glitch A/B Bypass without interrupting playback:
   * Uses dual dry/wet GainNodes with 20ms exponential crossfade.
   */
  public setBypass(isBypassed: boolean): void {
    this.isBypassedState = isBypassed;
    if (!this.audioCtx) return;

    const dryTarget = isBypassed ? 1.0 : 0.0;
    const wetTarget = isBypassed ? 0.0 : 1.0;

    if (this.dryGainNode) {
      this.setParamTarget(this.dryGainNode.gain, dryTarget, 0.02);
    }
    if (this.wetOutputGainNode) {
      this.setParamTarget(this.wetOutputGainNode.gain, wetTarget, 0.02);
    }
  }

  /**
   * Retrieves the post-summing AnalyserNode for spectrum visualization.
   */
  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Populates frequency data buffer from the spectrum AnalyserNode.
   */
  public getFrequencyData(array: Uint8Array): void {
    if (this.analyserNode && typeof this.analyserNode.getByteFrequencyData === "function") {
      this.analyserNode.getByteFrequencyData(array as unknown as Uint8Array<ArrayBuffer>);
    } else {
      array.fill(0);
    }
  }

  /**
   * Checks if an audio element is currently attached.
   */
  public isAttached(): boolean {
    return this.currentAudioEl !== null;
  }

  /**
   * Gets the currently attached HTMLAudioElement.
   */
  public getAttachedElement(): HTMLAudioElement | null {
    return this.currentAudioEl;
  }

  /**
   * Returns the underlying AudioContext.
   */
  public getContext(): AudioContext | null {
    return this.audioCtx;
  }

  /**
   * Gets current bypass state.
   */
  public isBypassed(): boolean {
    return this.isBypassedState;
  }

  /**
   * Gets current active vocal mode.
   */
  public getVocalMode(): VocalMode {
    return this.activeVocalMode;
  }

  /**
   * Gets current active bass config.
   */
  public getBassBoost(): BassBoostConfig {
    return { ...this.activeBassConfig };
  }

  /**
   * Gets current active spatial config.
   */
  public getSpatial8D(): Spatial8DConfig {
    return { ...this.spatialConfig };
  }

  /**
   * Diagnostic inspection for real-time spatial node parameters (for telemetry and testing).
   */
  public getSpatialDiagnostics(): {
    pan: number;
    directGain: number;
    pinnaCutoffHz: number;
    haasWetGain: number;
    haasReflectionPan: number;
  } {
    return {
      pan: this.pannerNode?.pan.value ?? 0,
      directGain: this.spatialDirectGain?.gain.value ?? 1,
      pinnaCutoffHz: this.pinnaFilter?.frequency.value ?? 20000,
      haasWetGain: this.haasWetGain?.gain.value ?? 0,
      haasReflectionPan: this.haasPannerNode?.pan.value ?? 0,
    };
  }

  /**
   * Gets snapshot of active EQ gains.
   */
  public getEqGains(): number[] {
    return [...this.activeEqGains];
  }

  /**
   * Tears down and cleans up resources.
   */
  public dispose(): void {
    this.stopSpatialLfo();

    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.disconnect();
      } catch {
        // Disconnect gracefully
      }
      this.currentSourceNode = null;
    }

    this.currentAudioEl = null;

    if (this.audioCtx && typeof this.audioCtx.close === "function") {
      try {
        this.audioCtx.close();
      } catch {
        // Close gracefully
      }
      this.audioCtx = null;
    }
  }
}
