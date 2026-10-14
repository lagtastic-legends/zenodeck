"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Keyboard,
  Zap,
  Cpu,
  Headphones,
  Sparkles,
  ArrowRight,
  X,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { APP_VERSION } from "@/config/version";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useUpdateStore } from "@/lib/update-store";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";

const LAST_SEEN_KEY = "zenodeck_last_seen_version";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  badge: string;
  description: string;
  accentClass: string;
  badgeClass: string;
}

function FeatureCard({
  icon,
  title,
  badge,
  description,
  accentClass,
  badgeClass,
}: FeatureCardProps) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 transition-all hover:border-primary/40 hover:bg-card/80 hover:shadow-lg">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className={`grid size-9 place-items-center rounded-xl ${accentClass}`}>
            {icon}
          </div>
          <span
            className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}
          >
            {badge}
          </span>
        </div>
        <div>
          <h4 className="font-display text-sm font-bold text-foreground tracking-wide">
            {title}
          </h4>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const navigate = useNavStore((s) => s.navigate);
  const isStoreOpen = useUpdateStore((s) => s.isWhatsNewOpen);
  const setStoreOpen = useUpdateStore((s) => s.setWhatsNewOpen);
  const { triggerSuccess } = useSensoryFeedback();

  // Automatic boot check: version diff trigger
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedVersion = localStorage.getItem(LAST_SEEN_KEY);
    if (!storedVersion || storedVersion !== APP_VERSION) {
      setPreviousVersion(storedVersion || "3.14.1");
      const settleTimer = setTimeout(() => {
        setIsOpen(true);
        try {
          triggerSuccess();
        } catch {}
      }, 750);
      return () => clearTimeout(settleTimer);
    }
  }, [triggerSuccess]);

  // Synchronize with external store trigger
  useEffect(() => {
    if (isStoreOpen) {
      const storedVersion = typeof window !== "undefined" ? localStorage.getItem(LAST_SEEN_KEY) : null;
      setPreviousVersion(storedVersion || "3.14.1");
      setIsOpen(true);
      try {
        triggerSuccess();
      } catch {}
    }
  }, [isStoreOpen, triggerSuccess]);

  // Global event listener for manual replay trigger
  useEffect(() => {
    const handleOpenEvent = () => {
      const storedVersion = typeof window !== "undefined" ? localStorage.getItem(LAST_SEEN_KEY) : null;
      setPreviousVersion(storedVersion || "3.14.1");
      setIsOpen(true);
      try {
        triggerSuccess();
      } catch {}
    };
    window.addEventListener("zenodeck:open-whats-new", handleOpenEvent);
    return () => window.removeEventListener("zenodeck:open-whats-new", handleOpenEvent);
  }, [triggerSuccess]);

  const handleDismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_SEEN_KEY, APP_VERSION);
    }
    setIsOpen(false);
    setStoreOpen(false);
  }, [setStoreOpen]);

  const handleOpenStudio = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LAST_SEEN_KEY, APP_VERSION);
    }
    setIsOpen(false);
    setStoreOpen(false);
    navigate("keyboard-deck-manager");
  }, [navigate, setStoreOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-primary/30 bg-card/90 p-5 sm:p-7 shadow-[0_24px_72px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
          >
            {/* Header Ambient Glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-72 rounded-full bg-primary/20 blur-3xl" />

            {/* Top Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Close modal"
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Header */}
            <div className="space-y-2 text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                <Sparkles className="size-3 text-emerald-400" />
                <span>
                  {previousVersion && previousVersion !== APP_VERSION
                    ? `Upgraded: v${previousVersion} → v${APP_VERSION}`
                    : `What's New in v${APP_VERSION}`}
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                ZenoDeck & ZenoTap v{APP_VERSION}
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                Flagship hardware deck ergonomics, ultra-slimmed APK architecture, and zero-RAM native 4K muxing.
              </p>
            </div>

            {/* 2x2 Bento Feature Grid */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <FeatureCard
                icon={<Keyboard className="size-5 text-violet-400" />}
                title="ZenoTap 3D Keycaps & Trackpad"
                badge="Native IME"
                description="12dp horizontal thumb-scrubbing spacebar trackpad, tactile 3D hardware keycaps, and synchronized Obsidian/Terracotta themes."
                accentClass="bg-violet-500/15 text-violet-400 border border-violet-500/30"
                badgeClass="bg-violet-500/15 text-violet-300 border border-violet-500/30"
              />

              <FeatureCard
                icon={<Zap className="size-5 text-amber-400" />}
                title="81.8% Smaller APK (11.98 MB)"
                badge="Ultra-Slim"
                description="ProGuard/R8 shrinking and dynamic OPFS WASM caching reducing the APK footprint under 12 MB with zero binary bloat."
                accentClass="bg-amber-500/15 text-amber-400 border border-amber-500/30"
                badgeClass="bg-amber-500/15 text-amber-300 border border-amber-500/30"
              />

              <FeatureCard
                icon={<Cpu className="size-5 text-cyan-400" />}
                title="Headless Media3 & IME RAM Safety"
                badge="<30MB RAM"
                description="Standalone Kotlin coroutines operating headlessly on Dispatchers.IO with smart clipboard actions for WhatsApp and Discord."
                accentClass="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                badgeClass="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
              />

              <FeatureCard
                icon={<Headphones className="size-5 text-emerald-400" />}
                title="Compressed 8D Audio & Container Guard"
                badge="DSP Suite"
                description="Studio binaural 8D spatial audio rendering with container header guards isolating MP3, M4A, and Opus formats."
                accentClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                badgeClass="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={handleOpenStudio}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-primary hover:bg-primary/20 hover:border-primary/60 transition-all cursor-pointer"
              >
                <Sliders className="size-3.5" />
                <span>Open ZenoTap Studio</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-neon px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md hover:opacity-95 hover:shadow-lg transition-all cursor-pointer"
              >
                <CheckCircle2 className="size-4" />
                <span>Awesome, Let's Go</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
