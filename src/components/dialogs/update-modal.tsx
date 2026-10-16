"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Trash2,
  ArrowRight,
  FileText,
  Radio,
  Clock,
  Check,
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
import { ZenoModal } from "@/components/ui/zeno-modal";

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
    setStatusMessage("Update notification dismissed.");
    if (onRefresh) onRefresh();
    setTimeout(() => {
      onClose();
    }, 280);
  };

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
    setStatusMessage("Establishing secure connection to update repository…");

    try {
      const result = await installNativeApkUpdate(updateInfo.apkUrl, (progress) => {
        setDownloadProgress(progress);
        setStatusMessage(`Downloading OTA release package (${progress}%)…`);
      });

      if (!result.success && result.status === "PERMISSION_REQUIRED") {
        setStatusMessage("Permission required: Enable 'Install Unknown Apps' in Settings to complete update.");
      } else if (result.success && result.status === "INSTALLER_LAUNCHED") {
        setStatusMessage("Package verified. Launching Android Package Installer…");
        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (result.success) {
        setStatusMessage("OTA package download initiated.");
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

  const footer = (
    <div className="flex flex-col sm:flex-row gap-2.5 w-full">
      {updateInfo?.updateAvailable ? (
        <>
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary to-neon/90 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer glow-box-violet"
          >
            {isInstalling ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                <span>Deploying Update…</span>
              </>
            ) : (
              <>
                <Download className="size-4" />
                <span>{isNative ? "Install OTA Update Now" : "Download Official APK"}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleRemoveUpdate}
            disabled={isInstalling}
            className="group flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border/80 bg-background/80 px-3.5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-border active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shrink-0"
            title="Dismiss update notification for now"
          >
            <Clock className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span>Remind Later</span>
          </button>

          {updateInfo.releaseUrl ? (
            <a
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-background/60 px-3.5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/50 active:scale-[0.98] transition-all shrink-0"
              title="View GitHub release details and checksums"
            >
              <ExternalLink className="size-3.5" />
              <span>GitHub</span>
            </a>
          ) : null}
        </>
      ) : (
        <div className="flex items-center justify-between w-full gap-2">
          <button
            onClick={() => runCheck(true)}
            disabled={isChecking}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-4 py-2 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50 active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`size-3.5 text-primary ${isChecking ? "animate-spin" : ""}`} />
            <span>Check for Updates</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void haptics.light();
              onClose();
            }}
            disabled={isChecking}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-border/80 bg-background/80 px-4 py-2 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border active:scale-98 transition-all cursor-pointer shadow-xs"
          >
            <Check className="size-3.5 text-emerald-400" />
            <span>Close</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <ZenoModal
      isOpen={isOpen}
      onClose={onClose}
      title="ZenoDeck Software Updates"
      subtitle={`Build v${updateInfo?.currentVersion || APP_VERSION} · Official Release Channel`}
      icon={<Sparkles className="size-5 text-primary" />}
      badge={updateInfo?.updateAvailable ? "Update Available" : "All Systems Updated"}
      badgeTone={updateInfo?.updateAvailable ? "emerald" : "violet"}
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {isChecking ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 rounded-2xl border border-border/60 bg-background/40">
            <RefreshCw className="size-8 text-primary animate-spin" />
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                Checking for New Releases…
              </p>
              <p className="font-mono text-[11px] text-muted-foreground mt-1">
                Connecting to GitHub Releases repository
              </p>
            </div>
          </div>
        ) : updateInfo?.updateAvailable ? (
          <>
            {/* Update Available Hero Banner */}
            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-4 shadow-inner space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-muted-foreground">v{updateInfo.currentVersion || APP_VERSION}</span>
                    <ArrowRight className="size-3 text-emerald-400" />
                    <span className="font-extrabold text-sm sm:text-base text-emerald-300">
                      v{updateInfo.latestVersion}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  {updateInfo.apkSize ? (
                    <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                      {(updateInfo.apkSize / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  ) : null}
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-primary font-bold">
                    OTA Ready
                  </span>
                </div>
              </div>

              <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                A verified newer version of ZenoDeck is available for installation with universal device compatibility and subsystem hardening.
              </p>
            </div>

            {/* Release Highlights & Changelog */}
            {updateInfo.releaseNotes ? (
              <div className="rounded-2xl border border-border/80 bg-background/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-border/50 pb-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-foreground font-semibold">
                    <FileText className="size-3 text-primary" />
                    Changelog & Release Notes
                  </span>
                  <span className="text-[9px] text-muted-foreground">GitHub Verified</span>
                </div>
                <div className="font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto overscroll-contain pr-1 scrollbar-thin">
                  {updateInfo.releaseNotes.slice(0, 650)}
                  {updateInfo.releaseNotes.length > 650 ? "…" : ""}
                </div>
              </div>
            ) : null}

            {/* Animated Progress Bar when Installing */}
            {isInstalling && downloadProgress !== null ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 shadow-inner"
              >
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-foreground font-semibold flex items-center gap-1.5">
                    <RefreshCw className="size-3.5 animate-spin text-primary" />
                    {statusMessage}
                  </span>
                  <span className="text-primary font-bold">{downloadProgress}%</span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/80">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-neon to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(0,240,255,0.5)]"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </motion.div>
            ) : null}

            {/* Error Banner */}
            {errorMessage ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-red-300"
              >
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-400" />
                <p className="font-mono text-xs leading-relaxed">{errorMessage}</p>
              </motion.div>
            ) : null}

            {/* Available APK Architecture Chips */}
            <div className="rounded-xl border border-border/70 bg-card/40 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="uppercase text-muted-foreground font-semibold">
                  Target Android Architectures (12.0 MB · API 24+)
                </span>
                <span className="text-emerald-400 font-bold">R8 Shrunk</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[9px] text-primary font-semibold" title="Universal: All Android devices">
                  Universal (Default)
                </span>
                <span className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 font-mono text-[9px] text-foreground" title="ARM64: Modern 64-bit phones (Snapdragon, Tensor)">
                  arm64-v8a
                </span>
                <span className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 font-mono text-[9px] text-foreground" title="ARMv7: Legacy 32-bit devices">
                  armeabi-v7a
                </span>
                <span className="rounded-md border border-border/60 bg-background/60 px-2 py-0.5 font-mono text-[9px] text-foreground" title="x86_64: Tablets, Chromebooks, Emulators">
                  x86_64
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Already Up to Date */
          <div className="rounded-2xl border border-border/70 bg-gradient-to-b from-background/70 to-card/50 p-6 text-center space-y-3.5 shadow-inner">
            <div className="relative mx-auto size-14 place-items-center grid">
              <span className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" />
              <div className="relative grid size-12 place-items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.25)]">
                <ShieldCheck className="size-6" />
              </div>
            </div>
            <div>
              <h4 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-foreground">
                All Systems Up to Date
              </h4>
              <p className="mt-1 font-mono text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                ZenoDeck is running the latest official release (<span className="text-foreground font-bold">v{updateInfo?.currentVersion || APP_VERSION}</span>). Universal responsive layouts, WASM multimedia engines, and audio DSP are fully operational.
              </p>
            </div>
          </div>
        )}

        {/* Auto-Update Engine Control Bar */}
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 p-3 sm:p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-xl border border-primary/30 bg-primary/10 shrink-0">
              <Radio className={`size-4 text-primary ${autoUpdateEnabled ? "animate-pulse" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-display text-xs font-semibold text-foreground">
                Automatic OTA Engine
              </p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {autoUpdateEnabled ? "Background checks & OTA release alerts active" : "Manual update verification only"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void haptics.light();
              toggleAutoUpdate();
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              autoUpdateEnabled
                ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
                : "border border-border/80 bg-secondary/50 text-muted-foreground hover:border-primary/40"
            }`}
            title={autoUpdateEnabled ? "Click to disable automatic OTA checks" : "Click to enable automatic OTA checks"}
          >
            <span className={`size-1.5 rounded-full ${autoUpdateEnabled ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"}`} />
            <span>{autoUpdateEnabled ? "ACTIVE" : "OFF"}</span>
          </button>
        </div>
      </div>
    </ZenoModal>
  );
}
