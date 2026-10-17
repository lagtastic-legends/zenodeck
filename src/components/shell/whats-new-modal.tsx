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
          icon={<Zap className="size-4.5 text-violet-400" />}
          title="Downloader Engine Hardening"
          badge="Engine v1.0.3"
          description="Non-destructive range query slicing preserves YouTube HMAC signatures byte-for-byte, permanently resolving 5% analysis stalls."
          accentClass="bg-violet-500/15 text-violet-400 border border-violet-500/30"
          badgeClass="bg-violet-500/15 text-violet-300 border border-violet-500/30"
        />

        <FeatureCard
          icon={<Cpu className="size-4.5 text-cyan-400" />}
          title="CDN Edge Failover & IPv4 Priority"
          badge="Resilience"
          description="Automated multi-candidate edge failover (mn & fallback_host) with prioritized IPv4 sockets, eliminating mobile network timeouts."
          accentClass="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
          badgeClass="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
        />

        <FeatureCard
          icon={<Sliders className="size-4.5 text-amber-400" />}
          title="Dynamic Content-Range Streaming"
          badge="Zero-Latency"
          description="Eliminated blocking pre-probes; streams immediately on request #1 and parses total size dynamically from Content-Range headers."
          accentClass="bg-amber-500/15 text-amber-400 border border-amber-500/30"
          badgeClass="bg-amber-500/15 text-amber-300 border border-amber-500/30"
        />

        <FeatureCard
          icon={<CheckCircle2 className="size-4.5 text-emerald-400" />}
          title="Scoped Storage Crash Guard"
          badge="Android 11+"
          description="Seamless fallback to app-specific external storage directories, guaranteeing zero permission crashes on strictly scoped storage."
          accentClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          badgeClass="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
        />
      </div>
    </ZenoModal>
  );
}
