"use client";

import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Trash2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FileText,
  FileVideo,
  FileAudio,
  FileImage,
  Files,
  ExternalLink,
  Share2,
  HardDrive,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import { formatBytes } from "@/lib/format";
import { useHaptics } from "@/hooks/use-haptics";
import type { VaultItem, VaultKind } from "@/lib/vault/vault-db";
import { nativeSave } from "@/lib/native-save";
import { useNavStore } from "@/lib/navigation/nav-store";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

const KIND_ICON: Record<VaultKind, typeof FileVideo> = {
  video: FileVideo,
  audio: FileAudio,
  image: FileImage,
  pdf: FileText,
  file: Files,
};

const KIND_ACCENT: Record<VaultKind, { border: string; bg: string; text: string }> = {
  video: { border: "border-violet-500/40", bg: "bg-violet-500/10", text: "text-violet-400" },
  audio: { border: "border-cyan-500/40", bg: "bg-cyan-500/10", text: "text-cyan-400" },
  image: { border: "border-emerald-500/40", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  pdf: { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-400" },
  file: { border: "border-border/60", bg: "bg-muted/40", text: "text-muted-foreground" },
};

/** Phone-fitted custom audio player */
function MobileAudioPlayer({ src, title }: { src: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const haptics = useHaptics();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    haptics.selectionChanged();
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    haptics.light();
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    haptics.light();
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return "00:00";
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="w-full rounded-2xl border border-cyan-500/30 bg-card/90 p-4 sm:p-5 shadow-tactile flex flex-col items-center gap-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Visualizer animation orb */}
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={isPlaying ? { scale: [1, 1.08, 1], rotate: [0, 180, 360] } : { scale: 1, rotate: 0 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="size-20 sm:size-24 rounded-full border border-cyan-400/40 bg-gradient-to-tr from-cyan-500/20 via-primary/20 to-plasma/20 flex items-center justify-center shadow-[0_0_24px_rgba(6,182,212,0.25)]"
        >
          <FileAudio className="size-8 sm:size-10 text-cyan-400" />
        </motion.div>

        {/* Pulsing soundwave indicators */}
        <div className="absolute -bottom-1 flex items-end gap-1">
          {[40, 75, 100, 60, 90, 45, 80, 55, 30].map((h, i) => (
            <motion.span
              key={i}
              animate={isPlaying ? { height: [`${h * 0.3}%`, `${h}%`, `${h * 0.4}%`] } : { height: "4px" }}
              transition={{ repeat: Infinity, duration: 0.6 + (i % 3) * 0.2, ease: "easeInOut" }}
              className="w-1 rounded-full bg-cyan-400 shadow-[0_0_6px_var(--cyan-400)]"
              style={{ minHeight: "4px", maxHeight: "24px" }}
            />
          ))}
        </div>
      </div>

      {/* Scrubber & Timestamps */}
      <div className="w-full space-y-1.5 pt-1">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 rounded-lg bg-secondary/80 accent-cyan-400 cursor-pointer touch-none"
        />
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-between w-full px-2">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Unmute" : "Mute"}
          className="size-9 grid place-items-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
        >
          {isMuted ? <VolumeX className="size-4 text-destructive" /> : <Volume2 className="size-4" />}
        </button>

        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="size-13 sm:size-14 grid place-items-center rounded-full border border-cyan-400/50 bg-gradient-to-r from-cyan-500 to-primary text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition-all"
        >
          {isPlaying ? <Pause className="size-6 fill-current text-white" /> : <Play className="size-6 fill-current text-white ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={cyclePlaybackRate}
          className="h-9 px-2.5 rounded-xl border border-border/70 bg-card/60 font-mono text-[11px] font-bold text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          title="Playback speed"
        >
          {playbackRate}×
        </button>
      </div>
    </div>
  );
}

const emptySubscribe = () => () => {};

export const VaultPreviewModal = memo(function VaultPreviewModal({
  item,
  onClose,
  onDelete,
}: {
  item: VaultItem | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const haptics = useHaptics();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!item) {
      queueMicrotask(() => {
        setPreviewUrl(null);
        setIsConfirmingDelete(false);
      });
      return;
    }
    const url = URL.createObjectURL(item.blob);
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        setPreviewUrl(url);
        setImageZoom(1);
        setImageRotation(0);
        setIsConfirmingDelete(false);
      }
    });

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [item]);

  // Lock body scroll when open
  useEffect(() => {
    if (item) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [item]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Hardware/Android back button integration
  useEffect(() => {
    if (!item) return;
    return useNavStore.getState().registerOverlay("vault-preview", () => {
      onCloseRef.current();
      return true;
    });
  }, [item]);

  if (!mounted) return null;

  const Icon = item ? KIND_ICON[item.kind] : Files;
  const accent = item ? KIND_ACCENT[item.kind] : KIND_ACCENT.file;

  const handleDownload = () => {
    if (!item) return;
    haptics.medium();
    void nativeSave(item.blob, item.name);
  };

  const handleShare = async () => {
    if (!item || !previewUrl) return;
    haptics.light();
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: item.name,
          text: `Sharing ${item.name} from ZenoDeck Vault`,
          url: previewUrl,
          dialogTitle: `Share ${item.name}`,
        });
      } else if (navigator.share) {
        await navigator.share({
          title: item.name,
          text: `Sharing ${item.name} from ZenoDeck Vault`,
          url: window.location.href,
        });
      } else {
        handleDownload();
      }
    } catch {
      // User cancelled share dialog
    }
  };

  const handleDelete = () => {
    if (!item) return;
    haptics.warning();
    onDelete?.(item.id);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {item && previewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/85 backdrop-blur-md"
          />

          {/* Modal Container — Carefully tailored to fit ALL mobile phone viewports */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vault-preview-title"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="relative z-10 flex flex-col w-full max-w-lg md:max-w-2xl max-h-[86vh] sm:max-h-[85vh] rounded-2xl border border-border/80 bg-card/95 shadow-2xl overflow-hidden backdrop-blur-xl"
          >
            {/* Top ambient glow line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-3 sm:px-5 sm:py-3.5 bg-card/80 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <div className={`grid size-8 sm:size-9 shrink-0 place-items-center rounded-lg border ${accent.border} ${accent.bg}`}>
                  <Icon className={`size-4 sm:size-4.5 ${accent.text}`} strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block rounded px-1.5 py-0.2 font-mono text-[8px] sm:text-[9px] uppercase tracking-wider font-bold ${accent.border} ${accent.bg} ${accent.text}`}>
                      {item.kind}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground truncate hidden xs:inline">
                      {formatBytes(item.size)}
                    </span>
                  </div>
                  <h4 id="vault-preview-title" className="truncate font-mono text-xs sm:text-sm font-semibold text-foreground mt-0.5" title={item.name}>
                    {item.name}
                  </h4>
                </div>
              </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="size-8 sm:size-9 grid place-items-center rounded-xl border border-border/70 bg-card hover:bg-secondary active:scale-95 text-muted-foreground hover:text-foreground transition-all shrink-0"
          >
            <X className="size-4 sm:size-4.5" />
          </button>
        </div>

        {/* Media Body — Responsive & Scroll-Safe for any screen height */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col items-center justify-center min-h-0 bg-background/50">
          {item.kind === "video" && (
            <div className="w-full flex flex-col items-center gap-3">
              <video
                src={previewUrl}
                controls
                playsInline
                autoPlay
                className="w-full max-h-[42vh] sm:max-h-[55vh] rounded-xl border border-border/60 bg-black object-contain shadow-tactile"
              />
            </div>
          )}

          {item.kind === "audio" && (
            <div className="w-full max-w-md my-auto py-2">
              <MobileAudioPlayer src={previewUrl} title={item.name} />
            </div>
          )}

          {item.kind === "image" && (
            <div className="w-full flex flex-col items-center gap-3">
              <div className="relative w-full max-h-[42vh] sm:max-h-[55vh] overflow-hidden rounded-xl border border-border/60 bg-black/60 grid place-items-center shadow-inner">
                <img
                  src={previewUrl}
                  alt={item.name}
                  style={{
                    transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                    transition: "transform 0.2s ease-out",
                  }}
                  className="max-h-[42vh] sm:max-h-[55vh] max-w-full object-contain select-none"
                />
              </div>

              {/* Zoom & Rotate Controls */}
              <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1 font-mono text-[10px] text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-1 hover:text-foreground"
                  title="Zoom in"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <span className="min-w-[32px] text-center font-bold text-foreground">
                  {Math.round(imageZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1 hover:text-foreground"
                  title="Zoom out"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="w-px h-3 bg-border/60" />
                <button
                  type="button"
                  onClick={() => setImageRotation((r) => (r + 90) % 360)}
                  className="p-1 hover:text-foreground"
                  title="Rotate 90°"
                >
                  <RotateCw className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageZoom(1);
                    setImageRotation(0);
                  }}
                  className="px-1 text-[9px] hover:text-foreground uppercase tracking-wider"
                >
                  reset
                </button>
              </div>
            </div>
          )}

          {item.kind === "pdf" && (
            <div className="w-full flex flex-col items-center gap-3">
              {/* Desktop/Tablet embedded iframe */}
              <iframe
                src={`${previewUrl}#toolbar=0`}
                title={item.name}
                className="hidden sm:block w-full h-[45vh] sm:h-[55vh] rounded-xl border border-border/60 bg-white shadow-tactile"
              />

              {/* Mobile-first PDF card for Android APK where iframe/object can be blocked */}
              <div className="sm:hidden w-full rounded-2xl border border-amber-500/30 bg-card/90 p-5 text-center space-y-4 shadow-tactile">
                <div className="mx-auto size-16 rounded-2xl border border-amber-500/40 bg-amber-500/10 grid place-items-center text-amber-400">
                  <FileText className="size-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-xs font-bold text-foreground truncate px-2">
                    {item.name}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {formatBytes(item.size)} · PDF Document
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground/80 leading-relaxed pt-1">
                    Ready for offline viewing and local extraction.
                  </p>
                </div>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-xl border border-amber-500/40 bg-amber-500/15 py-2.5 font-mono text-xs font-bold text-amber-300 hover:bg-amber-500/25 active:scale-95 transition-all"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Open in Mobile PDF Viewer</span>
                </a>
              </div>
            </div>
          )}

          {item.kind === "file" && (
            <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card/90 p-6 text-center space-y-3">
              <div className="mx-auto size-14 rounded-xl border border-border/70 bg-muted/30 grid place-items-center text-muted-foreground">
                <Files className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="font-mono text-xs font-bold text-foreground truncate">{item.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {formatBytes(item.size)} · {item.mime}
                </p>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground/80">
                Binary asset saved in local IndexedDB. Ready for direct export.
              </p>
            </div>
          )}
        </div>

        {/* Footer Action Bar — Touch-optimized for phones */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3.5 py-3 sm:px-5 sm:py-3.5 bg-card/80 shrink-0">
          {isConfirmingDelete ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full p-2.5 rounded-xl border border-destructive/40 bg-destructive/10 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 text-destructive">
                <Trash2 className="size-4 shrink-0" />
                <span className="font-mono text-xs font-semibold">
                  Delete permanently from Vault?
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3 py-1.5 rounded-lg border border-border/70 bg-card font-mono text-xs text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg border border-destructive/50 bg-destructive font-mono text-xs font-bold text-destructive-foreground hover:bg-destructive/90 active:scale-95 transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-primary/50 bg-primary px-3.5 py-2 sm:py-2.5 font-mono text-xs font-bold text-primary-foreground hover:bg-primary/90 active:scale-95 transition-all shadow-sm"
                >
                  <HardDrive className="size-3.5" />
                  <span>Save to Device</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-card/70 px-3 py-2 sm:py-2.5 font-mono text-xs text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  title="Share file"
                >
                  <Share2 className="size-3.5" />
                  <span className="hidden xs:inline">Share</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.selectionChanged();
                      setIsConfirmingDelete(true);
                    }}
                    className="size-9 grid place-items-center rounded-xl border border-border/70 bg-card/70 text-muted-foreground hover:border-destructive/40 hover:text-destructive active:scale-95 transition-all"
                    title="Delete file"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl border border-border/70 bg-card/70 font-mono text-xs text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>,
    document.body
  );
});
