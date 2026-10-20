"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Keyboard,
  Zap,
  Cpu,
  Headphones,
  CheckCircle2,
  Sliders,
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
          icon={<Zap className="size-4.5 text-[#7dd3fc]" />}
          title="Zero-Stall Turbo Downloader"
          badge="High-Speed CDN"
          description="InnerTube 20.10.4 pipeline with 2-second candidate edge node failover, persistent socket keep-alive, and anti-freeze progress formula."
          accentClass="bg-sky-500/15 text-[#7dd3fc] border border-sky-400/30"
          badgeClass="bg-sky-500/15 text-[#7dd3fc] border border-sky-400/30"
        />

        <FeatureCard
          icon={<Cpu className="size-4.5 text-[#c8a0f0]" />}
          title="4K 60fps & 12 Adaptive Tiers"
          badge="Full Fidelity"
          description="Complete 4K UHD, 2K QHD, 1080p60 down to 360p, 320k Studio MP3, and Native AAC without 360p downranking or quality loss."
          accentClass="bg-purple-500/15 text-[#c8a0f0] border border-purple-400/30"
          badgeClass="bg-purple-500/15 text-[#c8a0f0] border border-purple-400/30"
        />

        <FeatureCard
          icon={<CheckCircle2 className="size-4.5 text-emerald-400" />}
          title="Android MediaStore Auto-Index"
          badge="Scoped Storage"
          description="Downloads & muxed streams save directly to Movies/ZenoDeck & Music/ZenoDeck with immediate Google Photos, Gallery & VLC indexing."
          accentClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          badgeClass="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        />

        <FeatureCard
          icon={<Sliders className="size-4.5 text-[#88b4cc]" />}
          title="Glacier UI & ZenoTap Deck"
          badge="Stitch Design"
          description="Ethereal 'Frozen Light' glassmorphism with ice-blue radiant accents, CommitContent v2 direct chat inject, and reactive soundscapes."
          accentClass="bg-cyan-500/15 text-[#88b4cc] border border-cyan-400/30"
          badgeClass="bg-cyan-500/15 text-[#88b4cc] border border-cyan-400/30"
        />
      </div>
    </ZenoModal>
  );
}
