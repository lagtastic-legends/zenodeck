"use client";

import React, { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  FolderCheck,
  FileAudio,
  FileVideo,
  FileImage,
  FileText,
  Files,
  Share2,
  Check,
  X,
  HardDrive,
} from "lucide-react";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";
import { formatBytes } from "@/lib/format";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

function getFileCategory(filename: string): "audio" | "video" | "image" | "pdf" | "file" {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["mp3", "wav", "aac", "m4a", "flac", "ogg", "opus", "aiff"].includes(ext)) return "audio";
  if (["mp4", "webm", "mkv", "mov", "avi", "flv"].includes(ext)) return "video";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext)) return "image";
  if (["pdf"].includes(ext)) return "pdf";
  return "file";
}

const CATEGORY_CONFIG = {
  audio: {
    Icon: FileAudio,
    color: "text-cyan-400 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    badge: "AUDIO",
  },
  video: {
    Icon: FileVideo,
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    badge: "VIDEO",
  },
  image: {
    Icon: FileImage,
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "IMAGE",
  },
  pdf: {
    Icon: FileText,
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "DOCUMENT",
  },
  file: {
    Icon: Files,
    color: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-border/50",
    badge: "FILE",
  },
};

export function SaveResultModal() {
  const {
    isOpen,
    status,
    filename,
    directory,
    uri,
    fileSize,
    blob,
    errorMessage,
    close,
  } = useSaveDialogStore();

  const [mounted, setMounted] = useState(false);
  const [isSharing, startShareTransition] = useTransition();
  const [shareSuccess, setShareSuccess] = useState(false);
  const haptics = useHaptics();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      (window as any).__omni_save_store = useSaveDialogStore;
      (window as any).__omni_show_save_success = (filename: string, opts?: any) => {
        useSaveDialogStore.getState().showSuccess({
          filename,
          directory: opts?.directory || "Documents",
          fileSize: opts?.fileSize || 13084221,
          ...opts,
        });
      };
      (window as any).__omni_show_save_error = (filename: string, errorMessage?: string) => {
        useSaveDialogStore.getState().showError({
          filename,
          errorMessage,
        });
      };
    }
  }, []);

  // Lock body scroll when dialog is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      haptics.notification(status === "success" ? "success" : "warning");
    } else {
      document.body.style.overflow = "";
      setShareSuccess(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, status, haptics]);

  // Register with Android hardware back button and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const unregisterBack = useNavStore.getState().registerOverlay("save-result-modal", () => {
      close();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      unregisterBack();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, close]);

  if (!mounted) return null;

  const category = getFileCategory(filename);
  const catConfig = CATEGORY_CONFIG[category];
  const isSuccess = status === "success";

  const handleShare = async () => {
    haptics.impact("light");
    startShareTransition(async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Native Capacitor share
          await Share.share({
            title: filename,
            text: `Sharing ${filename} from ZenoDeck`,
            url: uri,
            dialogTitle: `Share ${filename}`,
          });
          setShareSuccess(true);
        } else if (typeof navigator !== "undefined" && navigator.share) {
          // Web Share API
          if (blob && navigator.canShare?.({ files: [new File([blob], filename, { type: blob.type })] })) {
            await navigator.share({
              files: [new File([blob], filename, { type: blob.type })],
              title: filename,
            });
          } else {
            await navigator.share({
              title: filename,
              text: `Processed with ZenoDeck: ${filename}`,
              url: window.location.href,
            });
          }
          setShareSuccess(true);
        } else {
          // Fallback: copy file name or download
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }, 1000);
          }
          setShareSuccess(true);
        }
      } catch {
        // User cancelled share dialog
      }
    });
  };

  const handleDismiss = () => {
    haptics.impact("medium");
    close();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-dialog-title"
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pointer-events-auto"
        >
          {/* Glassmorphism Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-background/80 dark:bg-black/85 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[calc(100dvh-2.5rem)] overflow-y-auto rounded-2xl border ${
              isSuccess
                ? "border-emerald-500/40 dark:border-emerald-500/30 shadow-[0_12px_45px_rgba(0,0,0,0.6),0_0_35px_rgba(16,185,129,0.18)]"
                : "border-rose-500/40 dark:border-rose-500/30 shadow-[0_12px_45px_rgba(0,0,0,0.6),0_0_35px_rgba(244,63,94,0.18)]"
            } bg-card/95 dark:bg-zinc-950/95 text-foreground backdrop-blur-2xl`}
          >
            {/* Ambient Laser Edge Highlight */}
            <div
              className={`h-1 w-full bg-gradient-to-r from-transparent ${
                isSuccess ? "via-emerald-400 dark:via-pulse" : "via-rose-500"
              } to-transparent opacity-90`}
            />

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              aria-label="Close dialog"
              className="absolute right-3.5 top-4 rounded-xl border border-border/60 bg-card/60 p-1.5 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-95 focus:outline-none"
            >
              <X className="size-4" />
            </button>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Status Header */}
              <div className="flex items-center gap-3.5">
                <div
                  className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl border ${
                    isSuccess
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                      : "border-rose-500/40 bg-rose-500/15 text-rose-500 dark:text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
                  }`}
                >
                  {isSuccess ? (
                    <FolderCheck className="size-6 animate-pulse" />
                  ) : (
                    <AlertTriangle className="size-6 animate-bounce" />
                  )}
                  {/* Outer Pulsing Ring */}
                  <span
                    className={`absolute -inset-1 rounded-2xl border ${
                      isSuccess ? "border-emerald-500/20" : "border-rose-500/20"
                    } animate-ping pointer-events-none opacity-40`}
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest uppercase ${
                        isSuccess
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      <span className="size-1.5 rounded-full bg-current animate-pulse" />
                      {isSuccess ? "SAVED TO DEVICE" : "PERMISSION REQUIRED"}
                    </span>
                  </div>
                  <h3
                    id="save-dialog-title"
                    className="font-display text-sm sm:text-base font-bold tracking-wider text-foreground uppercase"
                  >
                    {isSuccess ? "File Saved to Storage" : "Storage Access Required"}
                  </h3>
                </div>
              </div>

              {/* Inset File Detail Card */}
              {isSuccess ? (
                <div className="rounded-xl border border-border/70 bg-secondary/40 dark:bg-card/40 p-3.5 space-y-2.5 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${catConfig.border} ${catConfig.bg} ${catConfig.color}`}
                    >
                      <catConfig.Icon className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <p
                        title={filename}
                        className="font-mono text-xs font-semibold text-foreground break-all line-clamp-2 select-all leading-snug"
                      >
                        {filename}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground font-mono">
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <HardDrive className="size-3" />
                          {directory || "Documents"}
                        </span>
                        {fileSize && fileSize > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatBytes(fileSize)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[10px] font-mono text-muted-foreground">
                    <span>Target Folder:</span>
                    <span className="truncate max-w-[210px] text-foreground font-medium">
                      📁 /{directory || "Documents"}/{filename}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 space-y-2 text-xs font-mono text-rose-600 dark:text-rose-200/90 leading-relaxed">
                  <p>{errorMessage || "Device storage permission was denied."}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Storage permission is required to save processed media. Please enable file permissions in device settings.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {isSuccess && (
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/70 dark:bg-card/60 px-3 font-display text-xs font-bold tracking-wider text-foreground transition-all hover:bg-secondary hover:border-pulse/40 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Share2 className="size-4 text-pulse" />
                    <span>{shareSuccess ? "SHARED" : "SHARE FILE"}</span>
                  </button>
                )}

                <button
                  onClick={handleDismiss}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-display text-xs font-bold tracking-widest uppercase transition-all active:scale-95 cursor-pointer ${
                    isSuccess
                      ? "bg-pulse text-zinc-950 font-extrabold hover:bg-pulse/90 shadow-[0_0_20px_rgba(16,185,129,0.3)] col-span-1"
                      : "bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)] col-span-2"
                  }`}
                >
                  <Check className="size-4" strokeWidth={3} />
                  <span>{isSuccess ? "DONE" : "ACKNOWLEDGE"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
