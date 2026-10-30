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
          icon={<Sliders className="size-4.5 text-[#7dd3fc]" />}
          title="20-Module Unified Audio Studio"
          badge="Complete Suite 🎛️"
          description="Every audio tool—including Audio Cutter, MP3 Editor, Ringtone Maker, and FX Rack—now runs through UnifiedAudioStudio with full live waveform scrubbing, Web Audio preview, and instant Save Result dialog handoff."
          accentClass="bg-sky-500/15 text-[#7dd3fc] border border-sky-400/30"
          badgeClass="bg-sky-500/15 text-[#7dd3fc] border border-sky-400/30"
        />

        <FeatureCard
          icon={<Scissors className="size-4.5 text-[#c8a0f0]" />}
          title="Pro Precision Cutter Deck"
          badge="Keep & Cut ✂️"
          description="Interactive cutter with dual modes: 'Keep Selection' (Trim) and 'Cut Out Middle' (Splice Removal), featuring ±0.1s micro-nudging, zero-crossing snap, region looping, and live audible fades."
          accentClass="bg-purple-500/15 text-[#c8a0f0] border border-purple-400/30"
          badgeClass="bg-purple-500/15 text-[#c8a0f0] border border-purple-400/30"
        />

        <FeatureCard
          icon={<Zap className="size-4.5 text-emerald-400" />}
          title="Real-Time Granular Pitch Shifter"
          badge="Live Audio ⚡"
          description="Hardware-grade Hann-windowed dual-delay pitch shifter altering musical pitch (-12 to +12 semitones) in real time during audition without changing tempo or playback rate."
          accentClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          badgeClass="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        />

        <FeatureCard
          icon={<Headphones className="size-4.5 text-[#88b4cc]" />}
          title="IR Convolver & Crossover Stems"
          badge="Studio DSP 🏛️"
          description="Algorithmic Impulse Response Convolver reverb, 2-band 135Hz crossover vocal cancellation preserving kick/sub-bass, and full 10-band ISO graphic equalizer with true brickwall peak limiting."
          accentClass="bg-cyan-500/15 text-[#88b4cc] border border-cyan-400/30"
          badgeClass="bg-cyan-500/15 text-[#88b4cc] border border-cyan-400/30"
        />
      </div>
    </ZenoModal>
  );
}
