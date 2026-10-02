"use client";

/**
 * ZenoDeck — AudioEffectsPanel (Dark Mode)
 * =========================================
 * Production-ready audio processing suite for ZenoDeck powered by @ffmpeg/ffmpeg (WASM).
 *
 * Implements:
 * 1. "Apply Slowed & Reverb": Lower speed & pitch to 85% with 1000ms deep room reverb.
 * 2. "Convert to 8D Audio": 0.08 Hz binaural orbital LFO panning with spatial distance reverb.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Waves,
  Orbit,
  UploadCloud,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Sparkles,
  Loader2,
  Volume2,
  Disc3,
} from "lucide-react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import {
  generateSlowedReverbCommand,
  generate8DAudioCommand,
  SLOWED_REVERB_FILTER,
  EIGHT_D_AUDIO_FILTER,
} from "@/lib/audio/effects-engine";
import { nativeSave } from "@/lib/native-save";
import { baseName, extOf } from "@/lib/media/ffmpeg-jobs";

export type EffectMode = "slowed-reverb" | "8d-audio";

export interface ProcessedAudioResult {
  blob: Blob;
  url: string;
  name: string;
  size: number;
  effect: EffectMode;
  commandString: string;
}

export interface AudioEffectsPanelProps {
  initialFile?: File | null;
  onProcessed?: (result: ProcessedAudioResult) => void;
  className?: string;
}

export function AudioEffectsPanel({
  initialFile = null,
  onProcessed,
  className = "",
}: AudioEffectsPanelProps) {
  const { engine, state: engineState, boot } = useFFmpegEngine();

  // State
  const [file, setFile] = useState<File | null>(initialFile);
  const [isDragging, setIsDragging] = useState(false);
  const [activeEffect, setActiveEffect] = useState<EffectMode | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessedAudioResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeEngineRef = useRef<any>(engine);
  const createdUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    activeEngineRef.current = engine;
  }, [engine]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
      createdUrlsRef.current = [];
    };
  }, []);

  // Update initial file if changed externally
  useEffect(() => {
    if (initialFile) {
      setFile(initialFile);
      setResult(null);
      setError(null);
    }
  }, [initialFile]);

  // File selection handlers
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("audio/")) {
      setFile(droppedFile);
      setResult(null);
      setError(null);
    } else if (droppedFile) {
      setError("Please drop a valid audio file (MP3, WAV, M4A, FLAC, OGG).");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
    }
  }, []);

  // Synthetic sample audio generator (for instant zero-input testing)
  const handleUseSampleAudio = useCallback(async () => {
    try {
      setStatusText("Generating synth audio sample...");
      const sampleRate = 44100;
      const durationSec = 3.5;
      const numFrames = sampleRate * durationSec;
      const audioBuffer = new Float32Array(numFrames);

      // Compose a warm harmonic chord sequence (A minor chord: 220Hz, 261.6Hz, 329.6Hz)
      for (let i = 0; i < numFrames; i++) {
        const t = i / sampleRate;
        const envelope = Math.sin((Math.PI * t) / durationSec);
        const wave =
          0.5 * Math.sin(2 * Math.PI * 220 * t) +
          0.3 * Math.sin(2 * Math.PI * 261.63 * t) +
          0.3 * Math.sin(2 * Math.PI * 329.63 * t);
        audioBuffer[i] = wave * envelope * 0.4;
      }

      // Encode as uncompressed 16-bit PCM WAV
      const wavBytes = encodeWavPCM(audioBuffer, sampleRate);
      const sampleFile = new File([wavBytes as unknown as BlobPart], "zenodeck-ambient-sample.wav", {
        type: "audio/wav",
      });


      setFile(sampleFile);
      setResult(null);
      setError(null);
      setStatusText("");
    } catch (err: any) {
      setError(err?.message || "Failed to generate sample audio.");
    }
  }, []);

  // Core Processing Routine
  const processEffect = useCallback(
    async (effect: EffectMode) => {
      if (!file || isProcessing) return;

      setIsProcessing(true);
      setActiveEffect(effect);
      setProgress(5);
      setError(null);
      setStatusText("Booting WebAssembly Audio Engine...");

      let activeEngine = activeEngineRef.current;
      if (!activeEngine || engineState !== "ready") {
        try {
          activeEngine = await boot();
          activeEngineRef.current = activeEngine;
        } catch (bootErr: any) {
          setError(bootErr?.message || "Failed to initialize WebAssembly engine.");
          setIsProcessing(false);
          setActiveEffect(null);
          return;
        }
      }

      if (!activeEngine) {
        setError("FFmpeg WASM engine is not available.");
        setIsProcessing(false);
        setActiveEffect(null);
        return;
      }

      const runId = Math.random().toString(36).slice(2, 9);
      const inputExt = extOf(file.name) || "mp3";
      const inputPath = `in_${runId}.${inputExt}`;
      const outputPath = `out_${runId}.mp3`;

      try {
        // 1. Stage input into Virtual Memory FileSystem
        setStatusText("Transferring Audio Stream to Virtual Memory...");
        setProgress(15);
        const inputData = new Uint8Array(await file.arrayBuffer());
        await activeEngine.writeFile(inputPath, inputData);

        // 2. Select appropriate FFmpeg command generator
        setStatusText(
          effect === "slowed-reverb"
            ? "Applying Slowed & Reverb Filter Graph..."
            : "Synthesizing 8D Binaural Spatial Pan..."
        );
        setProgress(25);

        const command =
          effect === "slowed-reverb"
            ? generateSlowedReverbCommand(inputPath, outputPath)
            : generate8DAudioCommand(inputPath, outputPath);

        // 3. Attach Progress Telemetry
        const onProgress = ({ progress: p }: { progress: number }) => {
          if (p >= 0 && p <= 1) {
            setProgress(Math.round(25 + p * 65));
          }
        };

        activeEngine.on("progress", onProgress);

        try {
          const exitCode = await activeEngine.exec(command);
          if (exitCode !== 0) {
            throw new Error(`FFmpeg processing failed with exit code ${exitCode}.`);
          }
        } finally {
          activeEngine.off("progress", onProgress);
        }

        // 4. Retrieve processed buffer from Virtual Memory
        setStatusText("Finalizing Audio Master...");
        setProgress(95);

        const outData = (await activeEngine.readFile(outputPath)) as Uint8Array;
        const outBlob = new Blob([outData as unknown as BlobPart], { type: "audio/mpeg" });
        const outUrl = URL.createObjectURL(outBlob);
        createdUrlsRef.current.push(outUrl);

        const outName = `${baseName(file.name)}-${
          effect === "slowed-reverb" ? "slowed-reverb" : "8d-spatial"
        }.mp3`;

        const newResult: ProcessedAudioResult = {
          blob: outBlob,
          url: outUrl,
          name: outName,
          size: outBlob.size,
          effect,
          commandString: command.commandString,
        };

        setResult(newResult);
        setProgress(100);
        setStatusText("Complete!");
        onProcessed?.(newResult);
      } catch (procErr: any) {
        console.error("[AudioEffectsPanel] Error processing audio:", procErr);
        setError(procErr?.message || "Audio processing failed unexpectedly.");
      } finally {
        setIsProcessing(false);
        setActiveEffect(null);

        // Guarantee virtual FS memory cleanup
        try {
          await activeEngine.deleteFile(inputPath);
        } catch {}
        try {
          await activeEngine.deleteFile(outputPath);
        } catch {}
      }
    },
    [file, isProcessing, engineState, boot, onProcessed]
  );

  const handleDownload = useCallback(() => {
    if (!result) return;
    void nativeSave(result.blob, result.name);
  }, [result]);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div
      className={`w-full max-w-3xl mx-auto rounded-3xl bg-neutral-950/80 border border-neutral-800/80 p-6 md:p-8 backdrop-blur-2xl shadow-2xl text-neutral-100 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/60">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Disc3 className="w-5 h-5 animate-spin-slow" />
            </span>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
              Advanced Audio Effects Suite
            </h2>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Studio-grade Slowed & Reverb and 8D Audio spatialization powered by on-device WebAssembly.
          </p>
        </div>

        {/* Engine status indicator */}
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 self-start sm:self-auto">
          <span
            className={`w-2 h-2 rounded-full ${
              engineState === "ready"
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                : engineState === "loading"
                ? "bg-amber-400 animate-pulse"
                : "bg-neutral-500"
            }`}
          />
          <span className="text-neutral-300 font-mono">
            {engineState === "ready"
              ? "WASM Core Active"
              : engineState === "loading"
              ? "WASM Booting..."
              : "WASM Idle"}
          </span>
        </div>

      </div>

      {/* File Upload / Selection Area */}
      <div className="mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {!file ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              isDragging
                ? "border-violet-500 bg-violet-500/10 scale-[0.99]"
                : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/60"
            }`}
          >
            <div className="mx-auto w-12 h-12 rounded-2xl bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center text-neutral-400 mb-3 shadow-inner">
              <UploadCloud className="w-6 h-6 text-violet-400" />
            </div>
            <h3 className="font-semibold text-neutral-200 text-base">
              Drop your audio file here, or{" "}
              <span className="text-violet-400 underline decoration-violet-500/40 underline-offset-4">
                browse
              </span>
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Supports MP3, WAV, M4A, FLAC, OGG (Zero cloud uploads · 100% private)
            </p>

            <div className="mt-4 pt-4 border-t border-neutral-800/60 inline-flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleUseSampleAudio();
                }}
                className="text-xs font-medium text-neutral-400 hover:text-violet-300 px-3 py-1.5 rounded-lg bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/40 transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Try with Synth Audio Sample
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-neutral-200 text-sm truncate">{file.name}</p>
                <p className="text-xs text-neutral-500">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB · {extOf(file.name).toUpperCase()}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleReset}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-200 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700/80 border border-neutral-700 transition-colors self-end sm:self-auto shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Choose Another
            </button>
          </div>
        )}
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {/* Button 1: Apply Slowed & Reverb */}
        <motion.button
          type="button"
          whileHover={{ scale: file && !isProcessing ? 1.015 : 1 }}
          whileTap={{ scale: file && !isProcessing ? 0.985 : 1 }}
          disabled={!file || isProcessing}
          onClick={() => void processEffect("slowed-reverb")}
          className={`relative overflow-hidden rounded-2xl p-5 text-left border transition-all duration-200 group ${
            activeEffect === "slowed-reverb"
              ? "border-violet-500 bg-violet-950/30 ring-2 ring-violet-500/30"
              : "border-neutral-800 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 hover:border-violet-500/50 hover:bg-neutral-900"
          } ${!file || isProcessing ? "opacity-60 cursor-not-allowed" : "cursor-pointer shadow-lg"}`}
        >
          <div className="flex items-start justify-between">
            <span className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-105 transition-transform">
              <Waves className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono">
              85% Speed · Hall Echo
            </span>
          </div>

          <div className="mt-4">
            <h4 className="font-bold text-base text-neutral-100 flex items-center gap-2">
              Apply Slowed & Reverb
              {activeEffect === "slowed-reverb" && isProcessing && (
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
              )}
            </h4>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Lowers pitch & tempo to 85% with 1000ms room reverb simulating late-night aesthetics.
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-800/60 font-mono text-[10px] text-neutral-500 truncate">
            {SLOWED_REVERB_FILTER}
          </div>
        </motion.button>

        {/* Button 2: Convert to 8D Audio */}
        <motion.button
          type="button"
          whileHover={{ scale: file && !isProcessing ? 1.015 : 1 }}
          whileTap={{ scale: file && !isProcessing ? 0.985 : 1 }}
          disabled={!file || isProcessing}
          onClick={() => void processEffect("8d-audio")}
          className={`relative overflow-hidden rounded-2xl p-5 text-left border transition-all duration-200 group ${
            activeEffect === "8d-audio"
              ? "border-cyan-500 bg-cyan-950/30 ring-2 ring-cyan-500/30"
              : "border-neutral-800 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 hover:border-cyan-500/50 hover:bg-neutral-900"
          } ${!file || isProcessing ? "opacity-60 cursor-not-allowed" : "cursor-pointer shadow-lg"}`}
        >
          <div className="flex items-start justify-between">
            <span className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-105 transition-transform">
              <Orbit className="w-5 h-5" />
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
              0.08 Hz Sine LFO
            </span>
          </div>

          <div className="mt-4">
            <h4 className="font-bold text-base text-neutral-100 flex items-center gap-2">
              Convert to 8D Audio
              {activeEffect === "8d-audio" && isProcessing && (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              )}
            </h4>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Binaural orbital circular pan (12.5s cycle) with 85% depth and cavernous spatial distance.
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-neutral-800/60 font-mono text-[10px] text-neutral-500 truncate">
            {EIGHT_D_AUDIO_FILTER}
          </div>
        </motion.button>
      </div>

      {/* Progress & Processing Telemetry */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 shadow-inner"
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-neutral-300 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                {statusText || "Processing audio with WebAssembly..."}
              </span>
              <span className="font-mono font-bold text-violet-400">{progress}%</span>
            </div>

            {/* Framer Motion Progress Bar */}
            <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden p-0.5">
              <motion.div
                className={`h-full rounded-full ${
                  activeEffect === "slowed-reverb"
                    ? "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"
                    : "bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: "easeOut", duration: 0.2 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Banner */}
      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-950/30 p-4 flex items-start gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Processed Result View */}
      <AnimatePresence>
        {result && !isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-semibold text-neutral-100 text-sm">
                    {result.effect === "slowed-reverb"
                      ? "Slowed & Reverb Master Ready"
                      : "8D Spatial Audio Master Ready"}
                  </h4>
                  <p className="text-xs text-neutral-400">
                    {result.name} · {(result.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Save / Download
                </button>
              </div>
            </div>

            {/* Interactive Audio Player Preview */}
            <div className="mt-4 pt-4 border-t border-neutral-800/80">
              <div className="flex items-center gap-2 mb-2 text-xs font-medium text-neutral-400">
                <Volume2 className="w-3.5 h-3.5 text-neutral-300" />
                Audio Preview
              </div>
              <audio
                controls
                src={result.url}
                className="w-full h-10 rounded-lg accent-emerald-500 bg-neutral-900"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Encodes Float32 mono audio samples into a standard 16-bit PCM WAV Blob.
 */
function encodeWavPCM(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, 1, true);
  /* channel count (mono = 1) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * 1 * 2) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (1 * 2) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Uint8Array(buffer);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
export default AudioEffectsPanel;
