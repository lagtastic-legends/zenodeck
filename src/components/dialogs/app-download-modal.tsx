"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Smartphone,
  Globe,
  Apple,
  CheckCircle2,
  X,
  ShieldCheck,
  Cpu,
  Layers,
  ExternalLink,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePwaStore } from "@/lib/pwa/pwa-store";
import { useHaptics } from "@/hooks/use-haptics";
import { APP_VERSION } from "@/config/version";
import { UpdateModal } from "@/components/dialogs/update-modal";

export function AppDownloadModal() {
  const { isDownloadModalOpen, setDownloadModalOpen, isInstallable, promptInstall, isInstalled } =
    usePwaStore();
  const haptics = useHaptics();
  const [mounted, setMounted] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [showArchitectures, setShowArchitectures] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle Escape key navigation and body scroll locking
  useEffect(() => {
    if (!isDownloadModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        haptics.light();
        setDownloadModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDownloadModalOpen, setDownloadModalOpen, haptics]);

  if (!mounted || !isDownloadModalOpen) return null;

  const handleInstallPwa = async () => {
    haptics.light();
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  const modalContent = (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            haptics.light();
            setDownloadModalOpen(false);
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-lg rounded-2xl border border-primary/40 bg-card/95 p-4 sm:p-6 shadow-2xl backdrop-blur-2xl max-h-[calc(100dvh-2.5rem)] overflow-y-auto overscroll-contain"
        >
          {/* Subtle Ambient Laser Edge Glow */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-sm glow-box-violet shrink-0">
                <Smartphone className="size-6" />
              </div>
              <div className="min-w-0">
                <h3
                  id="download-modal-title"
                  className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-foreground truncate"
                >
                  Get ZenoDeck
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  v{APP_VERSION} · Universal Cross-Platform Edition
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                haptics.light();
                setDownloadModalOpen(false);
              }}
              className="grid size-8 place-items-center rounded-xl border border-border/70 bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-foreground active:scale-95 transition-all cursor-pointer shrink-0"
              aria-label="Close download modal"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Options Grid */}
          <div className="mt-5 space-y-3.5">
            {/* 1. Android APK Section with Multi-Architecture Breakdown */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-primary/50">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                      Android Native APK (Universal)
                    </span>
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                      Signed v{APP_VERSION}
                    </span>
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                      11.99 MB
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                    Flagship R8-optimized release (11.99 MB). 100% on-device WebAssembly, zero cloud uploads, zero account requirements.
                  </p>
                </div>

                <a
                  href="/zenodeck.apk"
                  download="zenodeck.apk"
                  onClick={() => haptics.medium()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  <Download className="size-3.5" />
                  <span>Download</span>
                </a>
              </div>

              {/* Architecture Selector Bar */}
              <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5 font-mono text-[10px]">
                <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="size-3" /> Target SDK 36 (Android 7.0–15+)
                  </span>
                  <span>·</span>
                  <span>R8 Compressed (~11.99 MB)</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    haptics.light();
                    setShowArchitectures(!showArchitectures);
                  }}
                  className="flex items-center gap-1 text-primary hover:text-primary/80 font-bold transition-all cursor-pointer shrink-0"
                >
                  <span>{showArchitectures ? "Hide Architectures" : "All 4 Architectures"}</span>
                  {showArchitectures ? (
                    <ChevronUp className="size-3" />
                  ) : (
                    <ChevronDown className="size-3" />
                  )}
                </button>
              </div>

              {/* Expandable Architecture Matrix */}
              <AnimatePresence>
                {showArchitectures && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Specific Processor Architecture Builds:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Universal */}
                        <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 flex flex-col justify-between gap-1.5">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-display text-[11px] font-bold text-foreground">
                                Universal APK
                              </span>
                              <span className="font-mono text-[9px] text-primary font-bold">11.99 MB</span>
                            </div>
                            <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
                              All devices (ARM64, ARMv7, x86_64). API 24+.
                            </p>
                          </div>
                          <a
                            href={`https://github.com/lagtastic-legends/zenodeck/releases/download/v${APP_VERSION}/zenodeck.apk`}
                            download="zenodeck.apk"
                            onClick={() => haptics.light()}
                            className="inline-flex items-center justify-center gap-1 rounded bg-secondary/80 hover:bg-secondary px-2 py-1 font-mono text-[9px] font-semibold text-foreground transition-all"
                          >
                            <Download className="size-2.5" />
                            <span>zenodeck.apk</span>
                          </a>
                        </div>

                        {/* ARM64-v8a */}
                        <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 flex flex-col justify-between gap-1.5">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-display text-[11px] font-bold text-foreground">
                                ARM64-v8a
                              </span>
                              <span className="font-mono text-[9px] text-emerald-400 font-bold">11.99 MB</span>
                            </div>
                            <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
                              Modern 64-bit phones (Snapdragon, Tensor, Dimensity).
                            </p>
                          </div>
                          <a
                            href={`https://github.com/lagtastic-legends/zenodeck/releases/download/v${APP_VERSION}/zenodeck-v${APP_VERSION}-arm64-v8a.apk`}
                            download={`zenodeck-v${APP_VERSION}-arm64-v8a.apk`}
                            onClick={() => haptics.light()}
                            className="inline-flex items-center justify-center gap-1 rounded bg-secondary/80 hover:bg-secondary px-2 py-1 font-mono text-[9px] font-semibold text-foreground transition-all"
                          >
                            <Download className="size-2.5" />
                            <span>arm64-v8a.apk</span>
                          </a>
                        </div>

                        {/* ARMeabi-v7a */}
                        <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 flex flex-col justify-between gap-1.5">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-display text-[11px] font-bold text-foreground">
                                ARMeabi-v7a
                              </span>
                              <span className="font-mono text-[9px] text-amber-400 font-bold">11.99 MB</span>
                            </div>
                            <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
                              Legacy 32-bit Android phones and budget devices.
                            </p>
                          </div>
                          <a
                            href={`https://github.com/lagtastic-legends/zenodeck/releases/download/v${APP_VERSION}/zenodeck-v${APP_VERSION}-armeabi-v7a.apk`}
                            download={`zenodeck-v${APP_VERSION}-armeabi-v7a.apk`}
                            onClick={() => haptics.light()}
                            className="inline-flex items-center justify-center gap-1 rounded bg-secondary/80 hover:bg-secondary px-2 py-1 font-mono text-[9px] font-semibold text-foreground transition-all"
                          >
                            <Download className="size-2.5" />
                            <span>armeabi-v7a.apk</span>
                          </a>
                        </div>

                        {/* x86_64 */}
                        <div className="rounded-lg border border-border/60 bg-card/60 p-2.5 flex flex-col justify-between gap-1.5">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-display text-[11px] font-bold text-foreground">
                                x86_64
                              </span>
                              <span className="font-mono text-[9px] text-cyan-400 font-bold">11.99 MB</span>
                            </div>
                            <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
                              Chromebooks, Android Studio emulators, WSA.
                            </p>
                          </div>
                          <a
                            href={`https://github.com/lagtastic-legends/zenodeck/releases/download/v${APP_VERSION}/zenodeck-v${APP_VERSION}-x86_64.apk`}
                            download={`zenodeck-v${APP_VERSION}-x86_64.apk`}
                            onClick={() => haptics.light()}
                            className="inline-flex items-center justify-center gap-1 rounded bg-secondary/80 hover:bg-secondary px-2 py-1 font-mono text-[9px] font-semibold text-foreground transition-all"
                          >
                            <Download className="size-2.5" />
                            <span>x86_64.apk</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 2. Web App (PWA) Install */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-neon/50">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                      Web App & Desktop PWA
                    </span>
                    <span className="rounded-full border border-neon/40 bg-neon/10 px-2 py-0.5 font-mono text-[9px] font-bold text-neon">
                      Instant Install
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                    Install directly to home screen or desktop. Instant offline launch powered by Service Workers.
                  </p>
                </div>

                {isInstalled ? (
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-bold text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>Installed</span>
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={handleInstallPwa}
                    disabled={installing}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-neon/50 bg-neon/20 px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-neon hover:bg-neon/30 active:scale-95 transition-all"
                  >
                    <Layers className="size-3.5" />
                    <span>{installing ? "Installing…" : "Install"}</span>
                  </button>
                ) : (
                  <div className="flex shrink-0 items-center gap-1 text-[11px] font-mono text-muted-foreground">
                    <span>Use browser &quot;Install&quot;</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. iOS Configuration Profile */}
            <div className="rounded-xl border border-border/80 bg-background/50 p-4 transition-all hover:border-purple-500/50">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                      iOS Web Clip Profile
                    </span>
                    <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-purple-400">
                      iPhone & iPad
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                    Full-screen Apple Web Clip profile (.mobileconfig) for iPhone & iPad with native icon.
                  </p>
                </div>

                <a
                  href="/api/ios-profile"
                  download="zenodeck.mobileconfig"
                  onClick={() => haptics.light()}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-card/60 px-3.5 py-2 font-mono text-xs font-medium text-foreground hover:border-purple-400/50 hover:text-purple-300 active:scale-95 transition-all"
                >
                  <Apple className="size-3.5" />
                  <span>Get Profile</span>
                </a>
              </div>
            </div>
          </div>

          {/* Check for Updates Action */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 bg-card/40 p-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <span className="font-mono text-xs text-foreground">
                ZenoDeck Software Release Channel
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                haptics.light();
                setIsUpdateModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
            >
              <span>Check for Updates (OTA)</span>
            </button>
          </div>

          {/* Footer Security Guarantee */}
          <div className="mt-4 rounded-xl border border-border/60 bg-background/30 p-3 text-center">
            <p className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Cpu className="size-3.5 text-neon" />
              <span>100% on-device WebAssembly execution. Zero telemetry, zero cloud tracking.</span>
            </p>
          </div>
        </motion.div>
      </div>

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
      />
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
