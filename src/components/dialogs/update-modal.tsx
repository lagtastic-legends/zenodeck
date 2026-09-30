"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Sparkles,
  ShieldCheck,
  X,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useHaptics } from "@/hooks/use-haptics";
import {
  checkForUpdates,
  installNativeApkUpdate,
  dismissUpdateNotification,
  type AppUpdateInfo,
} from "@/lib/updater";
import { useUpdateStore } from "@/lib/update-store";
import { APP_VERSION } from "@/config/version";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo?: AppUpdateInfo | null;
  onRefresh?: () => void;
}

export function UpdateModal({
  isOpen,
  onClose,
  updateInfo: initialUpdateInfo,
  onRefresh,
}: UpdateModalProps) {
  const haptics = useHaptics();
  const autoUpdateEnabled = useUpdateStore((s) => s.autoUpdateEnabled);
  const toggleAutoUpdate = useUpdateStore((s) => s.toggleAutoUpdate);
  const removeUpdateStore = useUpdateStore((s) => s.removeUpdate);

  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(
    initialUpdateInfo || null
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runCheck = useCallback(
    async (force: boolean) => {
      setIsChecking(true);
      setErrorMessage(null);
      try {
        const info = await checkForUpdates(force);
        setUpdateInfo(info);
        if (onRefresh) onRefresh();
      } catch (e: any) {
        setErrorMessage(e?.message || "Failed to check for updates");
      } finally {
        setIsChecking(false);
      }
    },
    [onRefresh]
  );

  useEffect(() => {
    if (initialUpdateInfo) {
      const timer = setTimeout(() => {
        setUpdateInfo(initialUpdateInfo);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialUpdateInfo]);

  useEffect(() => {
    if (isOpen && !updateInfo && !isChecking) {
      const timer = setTimeout(() => {
        void runCheck(false);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, updateInfo, isChecking, runCheck]);

  const handleRemoveUpdate = () => {
    void haptics.medium();
    dismissUpdateNotification();
    removeUpdateStore();
    setUpdateInfo((prev) => (prev ? { ...prev, updateAvailable: false } : null));
    setStatusMessage("Update notification removed.");
    if (onRefresh) onRefresh();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  const isNative = Capacitor.isNativePlatform();

  const handleInstall = async () => {
    if (!updateInfo?.apkUrl) {
      if (updateInfo?.releaseUrl) {
        window.open(updateInfo.releaseUrl, "_blank");
      }
      return;
    }

    void haptics.medium();
    setIsInstalling(true);
    setErrorMessage(null);
    setDownloadProgress(0);
    setStatusMessage("Connecting to update server…");

    try {
      const result = await installNativeApkUpdate(updateInfo.apkUrl, (progress) => {
        setDownloadProgress(progress);
        setStatusMessage(`Downloading update bundle (${progress}%)…`);
      });

      if (!result.success && result.status === "PERMISSION_REQUIRED") {
        setStatusMessage("Please allow 'Install Unknown Apps' in Settings to continue update.");
      } else if (result.success && result.status === "INSTALLER_LAUNCHED") {
        setStatusMessage("Launching system installer…");
        setTimeout(() => {
          onClose();
        }, 1500);
      } else if (result.success) {
        setStatusMessage("Download started!");
      } else {
        throw new Error(result.message || "Installation could not be completed.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Update installation failed");
      void haptics.error();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isInstalling) {
              void haptics.light();
              onClose();
            }
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg rounded-2xl border border-primary/40 bg-card/95 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl max-h-[calc(100dvh-2.5rem)] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
                <Sparkles className="size-6 text-primary" />
              </div>
              <div>
                <h3 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-foreground">
                  ZenoDeck Update Center
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  Current Version: v{updateInfo?.currentVersion || "3.4.6"}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                void haptics.light();
                onClose();
              }}
              disabled={isInstalling}
              className="grid size-8 place-items-center rounded-lg border border-border/70 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="mt-5 space-y-4">
            {isChecking ? (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                <RefreshCw className="size-8 text-primary animate-spin" />
                <p className="font-mono text-xs text-muted-foreground">
                  Checking GitHub Releases for updates…
                </p>
              </div>
            ) : updateInfo?.updateAvailable ? (
              <>
                {/* Update Available Banner */}
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-display text-xs font-bold uppercase tracking-wide text-emerald-300">
                        New Version Ready: v{updateInfo.latestVersion}
                      </span>
                    </div>
                    {updateInfo.apkSize ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {(updateInfo.apkSize / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    A newer release of ZenoDeck is live on GitHub.
                  </p>
                </div>

                {/* Release Notes */}
                {updateInfo.releaseNotes ? (
                  <div className="rounded-xl border border-border/70 bg-background/50 p-3.5 max-h-48 overflow-y-auto space-y-2">
                    <span className="font-display text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                      Release Highlights
                    </span>
                    <div className="font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                      {updateInfo.releaseNotes.slice(0, 500)}
                      {updateInfo.releaseNotes.length > 500 ? "…" : ""}
                    </div>
                  </div>
                ) : null}

                {/* Progress bar if installing */}
                {isInstalling && downloadProgress !== null ? (
                  <div className="space-y-1.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-foreground">{statusMessage}</span>
                      <span className="text-primary font-bold">{downloadProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                      <div
                        className="h-full bg-primary transition-all duration-300 ease-out"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-300">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <p className="font-mono text-xs">{errorMessage}</p>
                  </div>
                ) : null}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isInstalling ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        <span>Updating…</span>
                      </>
                    ) : (
                      <>
                        <Download className="size-4" />
                        <span>{isNative ? "Install Update Now" : "Download Latest APK"}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveUpdate}
                    disabled={isInstalling}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20 hover:border-red-500/60 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    title="Remove and dismiss this update"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Remove</span>
                  </button>

                  <a
                    href={updateInfo.releaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-border/80 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                  >
                    <ExternalLink className="size-3.5" />
                    <span>GitHub</span>
                  </a>
                </div>
              </>
            ) : (
              /* Already Up to Date */
              <div className="rounded-xl border border-border/70 bg-background/50 p-6 text-center space-y-3">
                <div className="grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-400 mx-auto">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                    ZenoDeck is Up to Date
                  </h4>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    You are currently using version v{updateInfo?.currentVersion || APP_VERSION}. No newer updates found.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => runCheck(true)}
                    disabled={isChecking}
                    className="inline-flex items-center gap-2 rounded-lg border border-border/80 px-3.5 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <RefreshCw className={`size-3.5 ${isChecking ? "animate-spin" : ""}`} />
                    <span>Check Again</span>
                  </button>
                </div>
              </div>
            )}

            {/* Auto-Update Setting Bar */}
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/50 p-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-7 place-items-center rounded-lg border border-primary/30 bg-primary/10">
                  <RefreshCw className={`size-3.5 text-primary ${autoUpdateEnabled ? "animate-spin" : ""}`} style={{ animationDuration: "6s" }} />
                </div>
                <div>
                  <p className="font-display text-xs font-semibold text-foreground">
                    Auto-Update Engine
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {autoUpdateEnabled ? "Background checks & OTA alerts active" : "Manual update checks only"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  void haptics.light();
                  toggleAutoUpdate();
                }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  autoUpdateEnabled
                    ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                    : "border border-border/80 bg-secondary/50 text-muted-foreground"
                }`}
                title={autoUpdateEnabled ? "Click to turn Auto-Update OFF" : "Click to turn Auto-Update ON"}
              >
                <span className={`size-1.5 rounded-full ${autoUpdateEnabled ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
                <span>{autoUpdateEnabled ? "ON" : "OFF"}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
