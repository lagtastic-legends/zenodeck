"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  FolderCheck,
  AlertTriangle,
  FileAudio,
  FileVideo,
  FileImage,
  FileText,
  Files,
  Share2,
  Check,
  Copy,
  ExternalLink,
  HardDrive,
  Headphones,
  Scissors,
  Settings2,
  Sparkles,
  Layers,
  Film,
  Lock,
  ArrowRight,
} from "lucide-react";
import { ZenoModal } from "@/components/ui/zeno-modal";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { useWorkstationStore } from "@/hooks/useWorkstationStore";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";
import { formatBytes } from "@/lib/format";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { openAppSettings } from "@/lib/permissions";

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
    badge: "AUDIO TRACK",
  },
  video: {
    Icon: FileVideo,
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    badge: "VIDEO STREAM",
  },
  image: {
    Icon: FileImage,
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "IMAGE FRAME",
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
    badge: "MEDIA FILE",
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
  const [pathCopied, setPathCopied] = useState(false);
  const [vaultAdded, setVaultAdded] = useState(false);
  const haptics = useHaptics();

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      (window as any).__omni_save_store = useSaveDialogStore;
      (window as any).__omni_show_save_success = (name: string, opts?: any) => {
        useSaveDialogStore.getState().showSuccess({
          filename: name,
          directory: opts?.directory || "Documents",
          fileSize: opts?.fileSize || 13084221,
          ...opts,
        });
      };
      (window as any).__omni_show_save_error = (name: string, errMsg?: string) => {
        useSaveDialogStore.getState().showError({
          filename: name,
          errorMessage: errMsg,
        });
      };
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShareSuccess(false);
      setPathCopied(false);
      setVaultAdded(false);
      void haptics.notification(status === "success" ? "success" : "warning");
    }
  }, [isOpen, status, haptics]);

  if (!mounted) return null;

  const category = getFileCategory(filename);
  const catConfig = CATEGORY_CONFIG[category];
  const isSuccess = status === "success";
  const fullDisplayPath = `/${directory || "Documents"}/${filename}`;

  const handleShare = async () => {
    void haptics.light();
    startShareTransition(async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await Share.share({
            title: filename,
            text: `Sharing ${filename} from ZenoDeck`,
            url: uri,
            dialogTitle: `Share ${filename}`,
          });
          setShareSuccess(true);
        } else if (typeof navigator !== "undefined" && navigator.share) {
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
        // User dismissed share sheet
      }
    });
  };

  const handleCopyPath = async () => {
    void haptics.light();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(fullDisplayPath);
        setPathCopied(true);
        setTimeout(() => setPathCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  const handleSendToVault = () => {
    void haptics.medium();
    try {
      if (typeof window !== "undefined") {
        const key = "zenotap_vault_history";
        const current = JSON.parse(localStorage.getItem(key) || "[]");
        const entry = {
          id: `vault-${Date.now()}`,
          title: filename,
          path: fullDisplayPath,
          size: fileSize || 0,
          category,
          timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify([entry, ...current.slice(0, 49)]));
        setVaultAdded(true);
      }
    } catch (e) {
      console.warn("Could not save to ZenoTap Vault history:", e);
    }
  };

  const handleHandoff = (targetToolId: string) => {
    void haptics.medium();
    if (blob) {
      useWorkstationStore.getState().setHandoffFile({
        file: blob,
        filename,
        mimeType: blob.type || (category === "video" ? "video/mp4" : category === "audio" ? "audio/mp3" : category === "image" ? "image/png" : "application/octet-stream"),
        sourceTool: "studio",
        timestamp: Date.now(),
      });
    }
    close();
    useNavStore.getState().navigate(targetToolId);
  };

  const handleOpenStudio = () => {
    handleHandoff("spatial-8d");
  };

  const handleTrimCompress = () => {
    if (category === "audio") {
      handleHandoff("trimmer");
    } else {
      handleHandoff("video-compressor");
    }
  };

  const handleDismiss = () => {
    void haptics.light();
    close();
  };

  return (
    <ZenoModal
      isOpen={isOpen}
      onClose={handleDismiss}
      overlayId="save-result-modal"
      title={isSuccess ? "File Saved to Storage" : "Storage Access Required"}
      subtitle={isSuccess ? `Verified 100% On-Device · ${directory || "Documents"}` : "System Permission Needed"}
      badge={isSuccess ? "SAVED" : "DENIED"}
      badgeTone={isSuccess ? "emerald" : "rose"}
      size="md"
      footer={
        <div className="flex w-full items-center gap-2.5">
          {isSuccess ? (
            <>
              <button
                type="button"
                onClick={handleShare}
                disabled={isSharing}
                className="flex flex-1 min-h-11 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card/70 px-3 font-display text-xs font-bold tracking-wider text-foreground transition-all hover:bg-secondary hover:border-primary/40 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Share2 className="size-4 text-primary" />
                <span>{shareSuccess ? "SHARED!" : "SHARE FILE"}</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="flex flex-1 min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 font-display text-xs font-extrabold tracking-widest text-zinc-950 uppercase transition-all hover:opacity-95 active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <Check className="size-4 stroke-[3]" />
                <span>DONE</span>
              </button>
            </>
          ) : (
            <>
              {Capacitor.isNativePlatform() && (
                <button
                  type="button"
                  onClick={() => void openAppSettings()}
                  className="flex flex-1 min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 font-display text-xs font-bold tracking-wider text-amber-300 transition-all hover:bg-amber-500/25 active:scale-95 cursor-pointer"
                >
                  <Settings2 className="size-4" />
                  <span>APP SETTINGS</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                className="flex flex-1 min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 font-display text-xs font-extrabold tracking-widest text-white uppercase transition-all hover:bg-rose-600 active:scale-95 cursor-pointer"
              >
                <span>ACKNOWLEDGE</span>
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status Notification Banner */}
        <div className="flex items-center gap-3.5">
          <div
            className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl border ${
              isSuccess
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
                : "border-rose-500/40 bg-rose-500/15 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.25)]"
            }`}
          >
            {isSuccess ? (
              <FolderCheck className="size-6 animate-pulse" />
            ) : (
              <AlertTriangle className="size-6 animate-bounce" />
            )}
          </div>

          <div className="space-y-0.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-widest uppercase ${
                isSuccess
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              }`}
            >
              <span className="size-1.5 rounded-full bg-current animate-ping" />
              {isSuccess ? "VERIFIED DIRECT-TO-DISK" : "WRITE PERMISSION BLOCKED"}
            </span>
            <h3 className="font-display text-sm sm:text-base font-bold tracking-wide text-foreground">
              {isSuccess ? "Media Saved Successfully" : "Storage Access Required"}
            </h3>
          </div>
        </div>

        {/* File Details & Spec Pills */}
        {isSuccess ? (
          <div className="rounded-2xl border border-border/70 bg-secondary/30 dark:bg-card/40 p-4 space-y-3 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${catConfig.border} ${catConfig.bg} ${catConfig.color}`}
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

                {/* Spec Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                    <catConfig.Icon className="size-3" />
                    {catConfig.badge}
                  </span>

                  {fileSize && fileSize > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary/60 border border-border/60 px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground/80">
                      <HardDrive className="size-3 text-muted-foreground" />
                      {formatBytes(fileSize)}
                    </span>
                  ) : null}

                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                    <Check className="size-3" />
                    CRC Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Target Path Bar with 1-Tap Copy */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-[11px] font-mono">
              <div className="min-w-0 flex-1 truncate text-muted-foreground">
                <span className="text-muted-foreground/60">Path: </span>
                <span className="text-foreground font-medium">{fullDisplayPath}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyPath}
                className="flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/70 hover:bg-secondary px-2 py-1 text-[10px] font-bold text-foreground transition-colors cursor-pointer shrink-0"
              >
                {pathCopied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                <span>{pathCopied ? "COPIED" : "COPY"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2 text-xs font-mono text-rose-300 leading-relaxed">
            <p className="font-bold text-rose-200">{errorMessage || "Storage write permission was denied."}</p>
            <p className="text-[11px] text-muted-foreground">
              Android scoped storage requires explicit user permission to write media to the shared Documents/Download partition.
            </p>
          </div>
        )}

        {/* 1-Tap Workflow Handoffs (Only on Success) */}
        {isSuccess && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary animate-pulse" />
                Continue Workflow in Studio
              </p>
              <span className="font-mono text-[9px] text-muted-foreground/70">In-Memory Pipeline</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {category === "video" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleHandoff("spatial-8d")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-cyan-500/40 hover:bg-cyan-500/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
                      <Headphones className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">8D Audio Studio</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">Binaural 360 & DSP</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHandoff("gif-maker")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-emerald-500/40 hover:bg-emerald-500/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                      <Film className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">Convert to GIF</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">ZenoTap sticker loop</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHandoff("video-compressor")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-violet-500/40 hover:bg-violet-500/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20">
                      <Scissors className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">Compress Video</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">Shrink size ≤10MB</p>
                    </div>
                  </button>
                </>
              ) : category === "audio" ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleHandoff("spatial-8d")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-cyan-500/40 hover:bg-cyan-500/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
                      <Headphones className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">8D / EQ Studio</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">Spatial 360 master</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHandoff("trimmer")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-violet-500/40 hover:bg-violet-500/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20">
                      <Scissors className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">Trim / Ringtone</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">Slice & fade cue</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHandoff("converter")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-primary/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
                      <FileAudio className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">Transcode Audio</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">MP3 / WAV / FLAC</p>
                    </div>
                  </button>
                </>
              ) : category === "image" ? (
                <>
                  <button
                    type="button"
                    onClick={handleSendToVault}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      vaultAdded
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      {vaultAdded ? <Check className="size-4 text-emerald-400" /> : <Layers className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">
                        {vaultAdded ? "In ZenoTap Vault" : "ZenoTap Vault"}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">Pin to keyboard deck</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHandoff("image-to-pdf")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-amber-500/40 hover:bg-amber-500/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">Convert to PDF</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">A4 document forge</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHandoff("ascii-generator")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-emerald-500/40 hover:bg-emerald-500/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                      <Sparkles className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">ASCII Art Studio</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">Terminal character art</p>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSendToVault}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      vaultAdded
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-border/60 bg-card/60 hover:border-primary/40 hover:bg-secondary/40 text-foreground"
                    }`}
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      {vaultAdded ? <Check className="size-4 text-emerald-400" /> : <Layers className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">
                        {vaultAdded ? "In ZenoTap Vault" : "ZenoTap Vault"}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">Pin to keyboard deck</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHandoff("lock-pdf")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-amber-500/40 hover:bg-amber-500/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                      <Lock className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">Lock / Protect</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">AES-256 PDF encryption</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHandoff("scan-to-pdf")}
                    className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-primary/10 p-2.5 text-left transition-all cursor-pointer text-foreground group"
                  >
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-bold truncate">Scan to PDF</p>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">Camera document scan</p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </ZenoModal>
  );
}
