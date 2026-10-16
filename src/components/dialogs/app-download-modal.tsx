"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  Smartphone,
  Globe,
  Apple,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePwaStore } from "@/lib/pwa/pwa-store";
import { useHaptics } from "@/hooks/use-haptics";
import { APP_VERSION } from "@/config/version";
import { UpdateModal } from "@/components/dialogs/update-modal";
import { ZenoModal } from "@/components/ui/zeno-modal";

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

  if (!mounted) return null;

  const handleInstallPwa = async () => {
    void haptics.light();
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  const handleClose = () => {
    void haptics.light();
    setDownloadModalOpen(false);
  };

  return (
    <>
      <ZenoModal
        isOpen={isDownloadModalOpen}
        onClose={handleClose}
        overlayId="app-download-modal"
        title="Get ZenoDeck"
        subtitle={`v${APP_VERSION} · Universal Cross-Platform Edition`}
        badge="OFFICIAL APK"
        badgeTone="emerald"
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
              <Cpu className="size-3.5 text-primary" />
              <span>100% on-device execution · Zero cloud tracking</span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border/80 bg-card/60 hover:bg-secondary font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-3.5">
          {/* 1. Android APK Section with Multi-Architecture Breakdown */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 transition-all hover:border-primary/50">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-foreground">
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
                onClick={() => void haptics.medium()}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-plasma px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white shadow-glow hover:opacity-95 active:scale-95 transition-all cursor-pointer"
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
                  void haptics.light();
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
            {showArchitectures && (
              <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Specific Processor Architecture Builds:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Universal */}
                  <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 flex flex-col justify-between gap-1.5">
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
                      href="/zenodeck.apk"
                      download="zenodeck.apk"
                      onClick={() => void haptics.light()}
                      className="flex items-center justify-center gap-1 rounded-lg border border-primary/40 bg-primary/10 py-1 text-[10px] font-mono font-bold text-primary hover:bg-primary/20 transition-all"
                    >
                      <Download className="size-3" />
                      <span>Download Universal</span>
                    </a>
                  </div>

                  {/* ARM64-v8a */}
                  <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 flex flex-col justify-between gap-1.5">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display text-[11px] font-bold text-foreground">
                          arm64-v8a APK
                        </span>
                        <span className="font-mono text-[9px] text-emerald-400 font-bold">11.98 MB</span>
                      </div>
                      <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
                        Modern 64-bit phones (Snapdragon, Tensor, Dimensity).
                      </p>
                    </div>
                    <a
                      href="/zenodeck-arm64-v8a.apk"
                      download="zenodeck-arm64-v8a.apk"
                      onClick={() => void haptics.light()}
                      className="flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-1 text-[10px] font-mono font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all"
                    >
                      <Download className="size-3" />
                      <span>Download ARM64</span>
                    </a>
                  </div>

                  {/* armeabi-v7a */}
                  <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 flex flex-col justify-between gap-1.5">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display text-[11px] font-bold text-foreground">
                          armeabi-v7a APK
                        </span>
                        <span className="font-mono text-[9px] text-amber-400 font-bold">11.96 MB</span>
                      </div>
                      <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
                        Legacy 32-bit Android phones and low-power devices.
                      </p>
                    </div>
                    <a
                      href="/zenodeck-armeabi-v7a.apk"
                      download="zenodeck-armeabi-v7a.apk"
                      onClick={() => void haptics.light()}
                      className="flex items-center justify-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 py-1 text-[10px] font-mono font-bold text-amber-400 hover:bg-amber-500/20 transition-all"
                    >
                      <Download className="size-3" />
                      <span>Download ARMv7</span>
                    </a>
                  </div>

                  {/* x86_64 */}
                  <div className="rounded-xl border border-border/60 bg-card/60 p-2.5 flex flex-col justify-between gap-1.5">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display text-[11px] font-bold text-foreground">
                          x86_64 APK
                        </span>
                        <span className="font-mono text-[9px] text-cyan-400 font-bold">12.00 MB</span>
                      </div>
                      <p className="font-mono text-[9px] text-muted-foreground mt-0.5 leading-tight">
                        Chromebooks, Intel/AMD Android tablets, emulators.
                      </p>
                    </div>
                    <a
                      href="/zenodeck-x86_64.apk"
                      download="zenodeck-x86_64.apk"
                      onClick={() => void haptics.light()}
                      className="flex items-center justify-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 py-1 text-[10px] font-mono font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all"
                    >
                      <Download className="size-3" />
                      <span>Download x86_64</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Progressive Web App (PWA) */}
          <div className="rounded-2xl border border-border/80 bg-background/50 p-4 transition-all hover:border-emerald-500/50">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-foreground">
                    Progressive Web App (PWA)
                  </span>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                    Zero Install
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground leading-relaxed">
                  Direct home screen installation via Chromium or Safari. ServiceWorker offline caching enabled.
                </p>
              </div>

              {isInstalled ? (
                <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 font-mono text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>Installed</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleInstallPwa()}
                  disabled={installing}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-card/60 px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wider text-foreground hover:bg-secondary active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Globe className="size-3.5 text-emerald-400" />
                  <span>{installing ? "Installing…" : "Add to Homescreen"}</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Check for Updates Action */}
          <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/40 p-3.5">
            <div className="flex items-center gap-2.5">
              <Sparkles className="size-4 text-primary" />
              <div>
                <p className="font-mono text-xs font-bold text-foreground">
                  ZenoDeck Software Release Channel
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  Check GitHub Releases for over-the-air updates
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                void haptics.light();
                setIsUpdateModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shrink-0"
            >
              <span>Check Updates</span>
            </button>
          </div>
        </div>
      </ZenoModal>

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
      />
    </>
  );
}
