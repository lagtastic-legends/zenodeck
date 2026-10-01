"use client";

/**
 * STUDIO RECORDER — native-browser capture: microphone, webcam and screen.
 * MediaRecorder → WebM (opus / vp9+opus), with live level telemetry,
 * pause/resume, elapsed timer and vault-ready output.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  Monitor,
  Mic,
  Pause,
  Play,
  Square,
  Trash2,
  Smartphone,
  ArrowRight,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from '@capacitor/local-notifications';
import { OmniRecorder } from "@/lib/native-recorder";
import { ensureCameraPermission, ensureMicrophonePermission, openAppSettings } from "@/lib/permissions";
import { OutputCard } from "@/components/media/output-card";
import { useNavStore } from "@/lib/navigation/nav-store";
import fixWebmDuration from "fix-webm-duration";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { JobOutput } from "@/hooks/use-media-job";
import { formatDurationMs } from "@/lib/format";

type RecorderMode = "mic" | "webcam" | "screen";
type MediaState = "off" | "starting" | "live" | "denied";

const MODE_META: Record<
  RecorderMode,
  { label: string; icon: typeof Mic; mime: string[]; hint: string }
> = {
  mic: {
    label: "Microphone",
    icon: Mic,
    mime: ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"],
    hint: "voice memos, samples, meetings — audio only",
  },
  webcam: {
    label: "Web Camera",
    icon: Camera,
    mime: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"],
    hint: "camera + microphone picture-in-picture vlog takes",
  },
  screen: {
    label: "Screen",
    icon: Monitor,
    mime: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"],
    hint: "full screen, window or tab — you pick when it starts",
  },
};

function pickMime(candidates: string[]): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* keep probing */
    }
  }
  return undefined;
}

export function StudioRecorder() {
  const [mode, setMode] = useState<RecorderMode>(() => Capacitor.isNativePlatform() ? "screen" : "mic");
  const [mediaState, setMediaState] = useState<MediaState>("off");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [output, setOutput] = useState<JobOutput | null>(null);
  const [levels, setLevels] = useState<number[]>(() => new Array(28).fill(0.06));
  const [screenQuality, setScreenQuality] = useState<"720p" | "1080p" | "4k">("1080p");
  const [screenFps, setScreenFps] = useState<30 | 60>(30);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const checkIOS = typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    setIsIOS(checkIOS);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pausedAccumRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const pipWindowRef = useRef<any>(null);

  /* ------------------------------------------------------------------ */
  /* teardown helpers                                                     */
  /* ------------------------------------------------------------------ */
  const stopAnalysis = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    setLevels(new Array(28).fill(0.06));
  }, []);

  const teardownMedia = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
    stopAnalysis();
    setMediaState("off");
    setRecording(false);
    setPaused(false);
    setElapsedMs(0);
    startedAtRef.current = null;
    pausedAtRef.current = null;
    pausedAccumRef.current = 0;
  }, [stopAnalysis]);

  useEffect(() => () => teardownMedia(), [teardownMedia]);

  /* Step back: Stop live camera/mic preview without closing the tool */
  useEffect(() => {
    if (mediaState === "live" && !recording && !output) {
      return useNavStore.getState().registerStepHandler(() => {
        teardownMedia();
        return true;
      });
    }
  }, [mediaState, recording, output, teardownMedia]);

  /* Guard active recording take from accidental exit */
  useEffect(() => {
    if (recording) {
      return useNavStore.getState().registerDirtyGuard(() => ({
        hasUnsaved: true,
        message: "A studio recording is actively in progress. Going back will cancel and discard this take. Are you sure you want to go back?",
      }));
    }
  }, [recording]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = OmniRecorder.addListener("onRecordComplete", async (info) => {
      try {
        const res = await fetch(Capacitor.convertFileSrc(info.uri));
        const blob = await res.blob();
        const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
        const name = `omni-screen-${stamp}.mp4`;
        
        setOutput((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return {
            name,
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
            mime: "video/mp4",
          };
        });
      } catch (err) {
        console.error("Failed to process background record completion:", err);
      }
      setRecording(false);
      setPaused(false);
    });
    return () => {
      sub.then(handle => handle.remove()).catch(() => undefined);
    };
  }, []);

  /* elapsed timer while recording ------------------------------------- */
  useEffect(() => {
    if (!recording || paused) return;
    const t = setInterval(() => {
      if (startedAtRef.current !== null) {
        const now = performance.now();
        const pausedTotal = pausedAccumRef.current +
          (pausedAtRef.current !== null ? now - pausedAtRef.current : 0);
        const ms = now - startedAtRef.current - pausedTotal;
        setElapsedMs(ms);
        if (pipWindowRef.current) {
          const timeEl = pipWindowRef.current.document.getElementById('pip-time');
          if (timeEl) {
            const totalS = Math.floor(ms / 1000);
            const h = Math.floor(totalS / 3600);
            const m = Math.floor((totalS % 3600) / 60);
            const s = totalS % 60;
            timeEl.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          }
        }
      }
    }, 100);
    return () => clearInterval(t);
  }, [recording, paused]);

  /* live level meter (mic + webcam audio track) ------------------------ */
  const startAnalysis = useCallback((stream: MediaStream) => {
    const track = stream.getAudioTracks()[0];
    if (!track || typeof AudioContext === "undefined") return;
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(buffer);
        const bars = 28;
        const step = Math.floor(buffer.length / bars);
        const next: number[] = [];
        for (let i = 0; i < bars; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += buffer[i * step + j];
          next.push(Math.max(0.06, (sum / step / 255) * 1.4));
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* analysis optional */
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /* acquisition                                                          */
  /* ------------------------------------------------------------------ */
  const acquireStream = useCallback(async (m: RecorderMode): Promise<MediaStream> => {
    if (!navigator.mediaDevices) {
      throw new Error("MediaDevices API not available (requires HTTPS or localhost).");
    }
    if (m === "screen") {
      const md = navigator.mediaDevices as any;
      if (!md.getDisplayMedia) throw new Error("Screen capture unsupported in this browser.");
      return md.getDisplayMedia({
        video: {
          width: { ideal: screenQuality === "4k" ? 3840 : screenQuality === "720p" ? 1280 : 1920 },
          frameRate: { ideal: screenFps }
        },
        audio: true
      });
    }
    if (m === "mic") {
      return navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    }
    return navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: Capacitor.isNativePlatform() ? 1280 : 1920 },
        facingMode: cameraFacing,
      },
      audio: true,
    });
  }, [screenQuality, screenFps, cameraFacing]);

  const arm = async (m: RecorderMode) => {
    setMediaState("starting");
    setOutput(null);
    try {
      if (m === "screen" && Capacitor.isNativePlatform()) {
        setMediaState("live");
        return;
      }

      if (Capacitor.isNativePlatform()) {
        if (m === "webcam") {
          const cOk = await ensureCameraPermission();
          const mOk = await ensureMicrophonePermission();
          if (!cOk || !mOk) {
            setMediaState("denied");
            return;
          }
        } else if (m === "mic") {
          const mOk = await ensureMicrophonePermission();
          if (!mOk) {
            setMediaState("denied");
            return;
          }
        }
      }
      
      const stream = await acquireStream(m);
      streamRef.current = stream;
      if (videoRef.current && stream.getVideoTracks().length > 0) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      if (m !== "screen") startAnalysis(stream);
      setMediaState("live");
      
      if (m === "screen" && !Capacitor.isNativePlatform()) {
        // Auto-start recording!
        beginRecording();
      }

      /* auto-disarm when a screen share ends from the browser UI */
      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          if (recorderRef.current?.state === "recording") {
            finalizeRecording();
          } else {
            teardownMedia();
          }
        });
      });
    } catch (err) {
      setMediaState("denied");
      const name = err instanceof Error ? err.name : "";
      void name; // message rendered in UI below
    }
  };

  /* ------------------------------------------------------------------ */
  /* recorder control                                                     */
  /* ------------------------------------------------------------------ */
  const beginRecording = async () => {
    if (mode === "screen" && Capacitor.isNativePlatform()) {
      try {
        await OmniRecorder.startRecording({ 
          internalAudio: true, 
          microphone: false, 
          quality: screenQuality, 
          fps: screenFps 
        });
        startedAtRef.current = performance.now();
        pausedAccumRef.current = 0;
        pausedAtRef.current = null;
        setRecording(true);
        setPaused(false);
        setElapsedMs(0);
      } catch (err) {
        console.error("Native recording failed:", err);
        setMediaState("denied");
      }
      return;
    }

    const stream = streamRef.current;
    if (!stream) return;
    const mime = pickMime(MODE_META[mode].mime);
    const options: MediaRecorderOptions = {};
    if (mime) options.mimeType = mime;
    if (mode === "screen") {
      options.videoBitsPerSecond = screenQuality === "4k" ? 20_000_000 : screenQuality === "720p" ? 4_000_000 : 8_000_000;
      options.audioBitsPerSecond = 192_000;
    } else if (mode === "webcam") {
      options.videoBitsPerSecond = 5_000_000;
      options.audioBitsPerSecond = 160_000;
    } else {
      options.audioBitsPerSecond = 192_000;
    }
    let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (err) {
        console.warn('Failed with options, trying default:', err);
        recorder = new MediaRecorder(stream);
      }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const type = recorder.mimeType || mime || "video/webm";
      let blob = new Blob(chunksRef.current, { type });
      const isAudio = mode === "mic";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
      const name = `omni-${mode}-${stamp}.${ext}`;

      if (ext === "webm") {
        const now = performance.now();
        const pTotal = pausedAccumRef.current + (pausedAtRef.current !== null ? now - pausedAtRef.current : 0);
        const durationMs = startedAtRef.current !== null ? Math.floor(now - startedAtRef.current - pTotal) : 0;
        if (durationMs > 0) {
          try {
            blob = await fixWebmDuration(blob, durationMs, { logger: false });
          } catch (err) {
            console.error("Failed to fix webm duration:", err);
          }
        }
      }

      setOutput((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return {
          name,
          blob,
          url: URL.createObjectURL(blob),
          size: blob.size,
          mime: isAudio && type.startsWith("audio") ? type.split(";")[0] : type.split(";")[0],
        };
      });
    };
    recorder.start(400);
    recorderRef.current = recorder;
    startedAtRef.current = performance.now();
    pausedAccumRef.current = 0;
    pausedAtRef.current = null;
    setRecording(true);
    setPaused(false);
    setElapsedMs(0);

    
  };

  const finalizeRecording = async () => {
    if (mode === "screen" && Capacitor.isNativePlatform()) {
      try {
        const result = await OmniRecorder.stopRecording();
        const res = await fetch(Capacitor.convertFileSrc(result.uri));
        const blob = await res.blob();
        const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, "");
        const name = `omni-screen-${stamp}.mp4`;
        
        setOutput((prev) => {
          if (prev) URL.revokeObjectURL(prev.url);
          return {
            name,
            blob,
            url: URL.createObjectURL(blob),
            size: blob.size,
            mime: "video/mp4",
          };
        });
      } catch (err) {
        console.error("Native recording stop failed:", err);

      }
      setRecording(false);
      setPaused(false);
      return;
    }

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
    setPaused(false);
    
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
    }
  };

  const stopEverything = () => {
    if (recording) finalizeRecording();
    teardownMedia();
  };

  const togglePause = () => {
    const r = recorderRef.current;
    if (!r || r.state === "inactive") return;
    if (r.state === "recording") {
      r.pause();
      pausedAtRef.current = performance.now();
      setPaused(true);
      if (pipWindowRef.current) {
        const icon = pipWindowRef.current.document.getElementById('pip-pause-icon');
        const ind = pipWindowRef.current.document.getElementById('pip-rec-indicator');
        if (icon) icon.textContent = 'play_arrow';
        if (ind) {
          ind.classList.remove('pulse-dot');
          ind.style.opacity = '0.5';
        }
      }
    } else if (r.state === "paused") {
      if (pausedAtRef.current !== null) {
        pausedAccumRef.current += performance.now() - pausedAtRef.current;
        pausedAtRef.current = null;
      }
      r.resume();
      setPaused(false);
      if (pipWindowRef.current) {
        const icon = pipWindowRef.current.document.getElementById('pip-pause-icon');
        const ind = pipWindowRef.current.document.getElementById('pip-rec-indicator');
        if (icon) icon.textContent = 'pause';
        if (ind) {
          ind.classList.add('pulse-dot');
          ind.style.opacity = '1';
        }
      }
    }
  };

  const busyOrLive = mediaState === "live";
  const meta = MODE_META[mode];
  const Icon = meta.icon;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
      {/* ------------------------------------------------------- input column */}
      <div className="space-y-5">
        {/* mode tabs */}
        <div className={`grid ${Capacitor.isNativePlatform() ? "grid-cols-1" : "grid-cols-3"} gap-2`} role="tablist" aria-label="Recording source">
          {(Object.keys(MODE_META) as RecorderMode[])
            .filter((m) => Capacitor.isNativePlatform() ? m === "screen" : true)
            .map((m) => {
              const MIcon = MODE_META[m].icon;
              const active = mode === m;
              return (
              <button
                key={m}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  if (busyOrLive || recording) return;
                  setMode(m);
                  setMediaState("off");
                  setOutput(null);
                }}
                disabled={busyOrLive || recording}
                className={`relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 transition-all ${
                  active
                    ? "border-primary/50 bg-primary/10 text-primary glow-box-violet"
                    : "border-border/60 bg-card/40 text-muted-foreground hover:border-primary/30 disabled:opacity-50"
                }`}
              >
                <MIcon className="size-4" />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                  {MODE_META[m].label}
                </span>
              </button>
            );
          })}
        </div>

        {/* stage */}
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-neon/90">
              <Icon className="size-3.5" />
              {meta.label} stage
            </p>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
                mode === "screen" && isIOS && !Capacitor.isNativePlatform()
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : mediaState === "live"
                    ? "bg-pulse/10 text-pulse"
                    : mediaState === "denied"
                      ? "bg-red-500/10 text-red-300"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              {mode === "screen" && isIOS && !Capacitor.isNativePlatform()
                ? "iOS Guide"
                : mediaState === "live"
                  ? (recording ? (paused ? "paused" : "recording") : "armed")
                  : mediaState}
            </span>
          </div>

          <div className="relative overflow-hidden rounded-lg border border-border/50 bg-black">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`aspect-video w-full object-cover ${mode !== "mic" && mediaState === "live" && !(mode === "screen" && Capacitor.isNativePlatform()) ? "" : "hidden"}`}
              aria-label="Capture preview"
            />

            {(mode === "mic" || mediaState !== "live" || (mode === "screen" && (Capacitor.isNativePlatform() || isIOS))) && (
              <div className="grid aspect-video w-full place-items-center px-6 text-center">
                {mode === "screen" && isIOS && !Capacitor.isNativePlatform() ? (
                  <div className="space-y-2.5 max-w-sm px-2 py-3">
                    <div className="flex items-center justify-center gap-1.5 text-amber-400">
                      <Smartphone className="size-4" />
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider">
                        Apple iOS Sandbox Restriction
                      </span>
                    </div>
                    <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                      Apple blocks web browsers from capturing your screen for privacy and security. Use your iPhone&apos;s native screen recorder:
                    </p>
                    <div className="rounded-lg border border-border/70 bg-card/60 p-2.5 text-left font-mono text-[10px] space-y-1.5 text-slate-300">
                      <div className="flex items-start gap-2">
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 font-bold text-primary text-[9px]">1</span>
                        <span>Swipe down from <strong>top-right corner</strong> to open Control Center.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 font-bold text-primary text-[9px]">2</span>
                        <span>Tap the <strong>Screen Recording (●)</strong> button to start.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="rounded bg-primary/20 px-1.5 py-0.5 font-bold text-primary text-[9px]">3</span>
                        <span>Tap red status bar to stop. Video saves to <strong>Photos</strong>.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => useNavStore.getState().navigate("video-converter")}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-mono underline pt-0.5"
                    >
                      Open recording in Media Studio <ArrowRight className="size-3" />
                    </button>
                  </div>
                ) : mediaState === "denied" ? (
                  <div className="flex flex-col items-center gap-2.5 max-w-xs mx-auto text-center">
                    <p className="font-mono text-[11px] text-red-300 font-bold uppercase tracking-wider">
                      Capture Blocked
                    </p>
                    <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                      Permission was denied. Grant microphone and camera access to enable recording.
                    </p>
                    {Capacitor.isNativePlatform() && (
                      <button
                        type="button"
                        onClick={() => void openAppSettings()}
                        className="rounded-lg border border-primary/40 bg-primary/20 px-3 py-1 font-mono text-[10px] uppercase font-bold tracking-wider text-primary hover:bg-primary/30 cursor-pointer"
                      >
                        Open Settings
                      </button>
                    )}
                  </div>
                ) : mediaState === "starting" ? (
                  <p className="animate-pulse font-mono text-[11px] text-muted-foreground">
                    requesting {meta.label.toLowerCase()}…
                  </p>
                ) : mode === "screen" && Capacitor.isNativePlatform() && mediaState === "live" ? (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="space-y-2">
                      <Monitor className="mx-auto size-8 text-muted-foreground/50" />
                      <p className="font-mono text-[11px] text-muted-foreground">
                        native screen recording ready
                      </p>
                    </div>
                    {!recording && (
                      <div className="flex items-center gap-4">
                        <select 
                          value={screenQuality}
                          onChange={(e) => setScreenQuality(e.target.value as "720p" | "1080p" | "4k")}
                          className="bg-secondary/70 border border-border rounded-md text-[11px] font-mono p-1 text-foreground focus:outline-none"
                        >
                          <option value="720p">720p (HD)</option>
                          <option value="1080p">1080p (FHD)</option>
                          <option value="4k">4K (UHD)</option>
                        </select>
                        <select 
                          value={screenFps}
                          onChange={(e) => setScreenFps(Number(e.target.value) as 30 | 60)}
                          className="bg-secondary/70 border border-border rounded-md text-[11px] font-mono p-1 text-foreground focus:outline-none"
                        >
                          <option value={30}>30 FPS</option>
                          <option value={60}>60 FPS</option>
                        </select>
                      </div>
                    )}
                  </div>
                ) : mode === "mic" && mediaState === "live" ? (
                  <div className="flex h-24 w-full max-w-sm items-center justify-center gap-[3px]">
                    {levels.map((lv, i) => (
                      <motion.span
                        key={i}
                        className={`w-full rounded-sm ${
                          recording && !paused
                            ? "bg-gradient-to-t from-primary to-neon"
                            : "bg-gradient-to-t from-primary/30 to-neon/30"
                        }`}
                        style={{ height: `${Math.min(lv * 100, 100)}%` }}
                        animate={{ opacity: recording && !paused ? 1 : 0.7 }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="max-w-60 font-mono text-[10px] leading-relaxed text-muted-foreground">
                      {mode === "mic" ? "audio-only capture — arm the mic to see levels" : `${meta.hint} · arm to preview`}
                    </p>
                    {mode === "screen" && !Capacitor.isNativePlatform() && (
                      <div className="flex items-center justify-center gap-3">
                        <select 
                          value={screenQuality}
                          onChange={(e) => setScreenQuality(e.target.value as "720p" | "1080p" | "4k")}
                          className="bg-secondary/70 border border-border rounded-md text-[11px] font-mono p-1 text-foreground focus:outline-none"
                        >
                          <option value="720p">720p (HD)</option>
                          <option value="1080p">1080p (FHD)</option>
                          <option value="4k">4K (UHD)</option>
                        </select>
                        <select 
                          value={screenFps}
                          onChange={(e) => setScreenFps(Number(e.target.value) as 30 | 60)}
                          className="bg-secondary/70 border border-border rounded-md text-[11px] font-mono p-1 text-foreground focus:outline-none"
                        >
                          <option value={30}>30 FPS</option>
                          <option value={60}>60 FPS</option>
                        </select>
                      </div>
                    )}
                    {mode === "webcam" && Capacitor.isNativePlatform() && (
                      <button
                        type="button"
                        onClick={() => setCameraFacing((f) => (f === "user" ? "environment" : "user"))}
                        className="rounded-lg border border-border/60 bg-card/60 px-3 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Lens: {cameraFacing === "user" ? "Front (Selfie)" : "Rear (Back)"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* REC badge */}
            {recording && !paused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [1, 0.55, 1], scale: 1 }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.2em] text-white"
              >
                ● REC {formatDurationMs(elapsedMs)}
              </motion.div>
            )}
            {recording && paused && (
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.2em] text-black">
                ‖ PAUSED {formatDurationMs(elapsedMs)}
              </div>
            )}
          </div>

          <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
            {mode === "screen" && isIOS && !Capacitor.isNativePlatform()
              ? "Apple iOS restricts browser screen capture. Use iOS Control Center to record, then import into ZenoDeck."
              : `${meta.hint} · ${Capacitor.isNativePlatform() ? "native hardware acceleration" : "encodes locally in browser"}.`}
          </p>
        </div>

        {/* transport */}
        <div className="grid grid-cols-3 gap-2">
          {!busyOrLive ? (
            mode === "screen" && isIOS && !Capacitor.isNativePlatform() ? (
              <button
                type="button"
                onClick={() => useNavStore.getState().navigate("video-converter")}
                className="col-span-3 flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-transform hover:scale-[1.01] active:scale-95 glow-box-violet"
              >
                <ArrowRight className="size-4" />
                OPEN MEDIA STUDIO TO CONVERT RECORDING
              </button>
            ) : (
              <button
                onClick={() => void arm(mode)}
                className="col-span-3 flex min-h-12 items-center justify-center gap-2.5 rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 font-display text-xs font-bold tracking-[0.2em] text-white transition-transform hover:scale-[1.01] active:scale-95 glow-box-violet"
              >
                <Play className="size-4" />
                {mode === "screen" && !Capacitor.isNativePlatform() ? "SHARE & RECORD" : "ARM " + meta.label.toUpperCase()}
              </button>
            )
          ) : (
            <>
              {!recording ? (
                <button
                  onClick={beginRecording}
                  className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-400/50 bg-red-500/20 font-display text-xs font-bold tracking-[0.18em] text-red-200 transition-colors hover:bg-red-500/30"
                >
                  <span className="size-3 rounded-full bg-red-500" />
                  START RECORDING
                </button>
              ) : (
                <>
                  <button
                    onClick={finalizeRecording}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-pulse/50 bg-pulse/15 font-display text-[11px] font-bold tracking-[0.14em] text-pulse hover:bg-pulse/25"
                  >
                    <Square className="size-4" />
                    STOP
                  </button>
                  <button
                    onClick={togglePause}
                    aria-label={paused ? "Resume recording" : "Pause recording"}
                    className={`flex min-h-12 items-center justify-center rounded-xl border font-display text-[11px] font-bold tracking-[0.14em] transition-colors ${
                      paused
                        ? "border-pulse/50 bg-pulse/15 text-pulse hover:bg-pulse/25"
                        : "border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                    }`}
                  >
                    {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
                    {paused ? "RESUME" : "PAUSE"}
                  </button>
                </>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    aria-label="Discard capture"
                    className={`flex min-h-12 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-300 ${recording ? "col-span-1" : "col-span-1"}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Discard this capture?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The {meta.label.toLowerCase()} stream stops and any in-progress recording is thrown away.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep going</AlertDialogCancel>
                    <AlertDialogAction onClick={stopEverything}>Discard</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ output column */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {output ? (
            <motion.div key="out" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <OutputCard
                output={output}
                badge={mode === "mic" ? "audio captured" : mode === "webcam" ? "camera take" : "screen capture"}
                badgeTone={mode === "screen" ? "plasma" : "neon"}
                onClear={() => {
                  if (output) URL.revokeObjectURL(output.url);
                  setOutput(null);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border/60"
            >
              <p className="font-mono text-[11px] text-muted-foreground/70">
                {recording ? "recording… stop to preview" : "captures land here"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {recording && (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="mb-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>capture in progress</span>
              <span className="text-neon">{formatDurationMs(elapsedMs)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="animate-shimmer h-full w-full rounded-full bg-[linear-gradient(90deg,transparent,oklch(0.62_0.22_300/0.9),oklch(0.82_0.12_205/0.9),transparent)]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}








