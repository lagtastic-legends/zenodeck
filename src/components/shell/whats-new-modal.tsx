"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Keyboard,
  Zap,
  Cpu,
  Headphones,
  CheckCircle2,
  Sliders,
  Scissors,
  Film,
  ShieldCheck,
  Music,
  Globe,
  Download,
} from "lucide-react";
import { APP_VERSION } from "@/config/version";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useUpdateStore } from "@/lib/update-store";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
import { ZenoModal } from "@/components/ui/zeno-modal";

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
    <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-card/80">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className={`grid size-8 place-items-center rounded-xl ${accentClass}`}>
            {icon}
          </div>
          <span
            className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}
          >
            {badge}
          </span>
        </div>
        <div>
          <h4 className="font-display text-xs sm:text-sm font-bold text-foreground tracking-wide">
            {title}
          </h4>
          <p className="mt-1 font-mono text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
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
      setPreviousVersion(storedVersion || "0.9.0");
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
      setPreviousVersion(storedVersion || "0.9.0");
      setIsOpen(true);
      try {
        triggerSuccess();
      } catch {}
    }
  }, [isStoreOpen, triggerSuccess]);

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
    navigate("keyboard-deck");
  }, [navigate, setStoreOpen]);

  return (
    <ZenoModal
      isOpen={isOpen}
      onClose={handleDismiss}
      overlayId="whats-new-modal"
      title={`ZenoDeck & ZenoTap v${APP_VERSION}`}
      subtitle={
        previousVersion && previousVersion !== APP_VERSION
          ? `Upgraded from v${previousVersion} · Verified Local Engine`
          : "Official GA Release · Universal Media Downloader & Hardware Ergonomics"
      }
      badge="WHAT'S NEW"
      badgeTone="emerald"
      size="lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 w-full">
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
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
        <FeatureCard
          icon={<Globe className="size-4.5 text-[#7dd3fc]" />}
          title="In-App Mini Browser & Omnibox"
          badge="Full Web Nav 🌐"
          description="Complete web browsing experience with back, forward, reload, and home controls, omnibox input with auto-prefixing, DuckDuckGo search fallback, and smooth live page loading progress."
          accentClass="bg-sky-500/15 text-[#7dd3fc] border border-sky-400/30"
          badgeClass="bg-sky-500/15 text-[#7dd3fc] border border-sky-400/30"
        />

        <FeatureCard
          icon={<Download className="size-4.5 text-amber-400" />}
          title="VidMate-Style Floating Download FAB"
          badge="Auto-Pulsing ⚡"
          description="High-visibility bottom-right floating action button that detects video and audio media on the current page, expanding with a glowing cyber pulse and badge when media streams are ready."
          accentClass="bg-amber-500/15 text-amber-400 border border-amber-500/30"
          badgeClass="bg-amber-500/15 text-amber-300 border border-amber-500/30"
        />

        <FeatureCard
          icon={<Zap className="size-4.5 text-emerald-400" />}
          title="1-Tap Format & Quality Sheet"
          badge="360p to 4K 60FPS 🎬"
          description="Tapping the floating FAB instantly triggers VidmateQualitySheet, displaying 2-column grids for Direct Audio (MP3 320k / M4A) and Video Resolutions (4K 60FPS down to 360p) with exact file sizes."
          accentClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          badgeClass="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        />

        <FeatureCard
          icon={<Film className="size-4.5 text-[#c8a0f0]" />}
          title="Quick Site Portal Deck"
          badge="8 Top Hubs 🚀"
          description="Curated glassmorphic home deck featuring 1-tap bookmarks for YouTube, TikTok, Instagram, Facebook, X/Twitter, Reddit, Vimeo, and SoundCloud with native cookie & CORS bypass on mobile."
          accentClass="bg-purple-500/15 text-[#c8a0f0] border border-purple-400/30"
          badgeClass="bg-purple-500/15 text-[#c8a0f0] border border-purple-400/30"
        />
      </div>
    </ZenoModal>
  );
}
