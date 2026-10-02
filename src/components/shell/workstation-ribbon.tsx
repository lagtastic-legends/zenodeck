"use client";

import { motion } from "framer-motion";
import {
  Maximize2,
  Minimize2,
  Columns3,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Cpu,
  Layers,
  Sparkles,
  Sliders,
  ChevronRight,
  TerminalSquare,
  ShieldCheck,
} from "lucide-react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useWorkstationStore, type WorkstationLayoutMode } from "@/hooks/useWorkstationStore";
import { useStdoutTelemetry } from "@/hooks/useStdoutTelemetry";
import { useHaptics } from "@/hooks/use-haptics";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { AudioToggle } from "@/components/shell/audio-toggle";
import { useAiStore } from "@/store/useAiStore";

const VIEW_TITLES: Record<string, { label: string; tag: string }> = {
  dashboard: { label: "DASHBOARD HUB", tag: "CORE" },
  "youtube-downloader": { label: "YOUTUBE 4K TURBO", tag: "P2 MEDIA" },
  "video-converter": { label: "VIDEO ENGINE", tag: "P2 MEDIA" },
  "video-compressor": { label: "VIDEO COMPRESSOR", tag: "P2 MEDIA" },
  "video-mute": { label: "VIDEO MUTE", tag: "P2 MEDIA" },
  "gif-maker": { label: "GIF MAKER", tag: "P2 MEDIA" },
  "audio-dsp": { label: "UNIFIED AUDIO DSP", tag: "P3 SOUND" },
  "spatial-8d": { label: "8D BINAURAL RADAR", tag: "P3 SOUND" },
  "bass-booster": { label: "5-TIER BASS BOOSTER", tag: "P3 SOUND" },
  "vocal-remover": { label: "VOCAL REMOVER", tag: "P3 SOUND" },
  reverb: { label: "ACOUSTIC REVERB", tag: "P3 SOUND" },
  "auto-panner": { label: "AUTO PANNER", tag: "P3 SOUND" },
  equalizer: { label: "GRAPHIC EQUALIZER", tag: "P3 SOUND" },
  "noise-reducer": { label: "NOISE REDUCER", tag: "P3 SOUND" },
  "pitch-shifter": { label: "PITCH SHIFTER", tag: "P3 SOUND" },
  "tempo-changer": { label: "TEMPO CHANGER", tag: "P3 SOUND" },
  trimmer: { label: "AUDIO TRIMMER", tag: "P3 SOUND" },
  "reverse-audio": { label: "REVERSE AUDIO", tag: "P3 SOUND" },
  "stereo-panner": { label: "STEREO PANNER", tag: "P3 SOUND" },
  "volume-changer": { label: "VOLUME CHANGER", tag: "P3 SOUND" },
  "image-to-pdf": { label: "PDF & DOC SUITE", tag: "P4 DOC" },
  "text-to-pdf": { label: "TEXT TO PDF", tag: "P4 DOC" },
  "lock-pdf": { label: "LOCK PDF", tag: "P4 DOC" },
  vault: { label: "LOCAL VAULT IDB", tag: "P5 STORAGE" },
};

export function WorkstationRibbon() {
  const view = useNavStore((s) => s.view);
  const {
    sidebarCollapsed,
    inspectorCollapsed,
    layoutMode,
    setLayoutMode,
    toggleSidebar,
    toggleInspector,
    toggleFocusMode,
  } = useWorkstationStore();
  const { simdThreads } = useStdoutTelemetry();
  const { isOpen: isAiOpen, toggleOpen: toggleAi } = useAiStore();
  const haptics = useHaptics();

  const currentMeta = VIEW_TITLES[view] || {
    label: view.toUpperCase().replace(/-/g, " "),
    tag: "MODULE",
  };

  const handleMode = (mode: WorkstationLayoutMode) => {
    haptics.light();
    setLayoutMode(mode);
  };

  return (
    <div className="hidden lg:flex items-center justify-between gap-3 border-b border-border/70 bg-card/80 px-4 py-2 text-xs backdrop-blur-md select-none font-mono sticky top-0 z-20 shrink-0">
      {/* Left: Breadcrumbs & Module Stage Identification */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={() => {
            haptics.light();
            toggleSidebar();
          }}
          className="flex size-7 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
          title={sidebarCollapsed ? "Expand Sidebar ([)" : "Collapse Sidebar ([)"}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-3.5" />
          ) : (
            <PanelLeftClose className="size-3.5" />
          )}
        </button>

        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] truncate">
          <span className="font-bold tracking-wider uppercase opacity-70">WORKSTATION</span>
          <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
          <span className="rounded bg-secondary/80 border border-border/60 px-1.5 py-0.5 text-[9px] font-bold text-foreground shrink-0">
            {currentMeta.tag}
          </span>
          <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
          <span className="font-bold text-foreground truncate">{currentMeta.label}</span>
        </div>
      </div>

      {/* Right: Layout Presets, Engine Chip, Inspector Toggle & Theme */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Layout Preset Switcher */}
        <div className="flex items-center rounded-lg border border-border/70 bg-background/50 p-0.5">
          <button
            onClick={() => handleMode("standard")}
            className={`relative flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all ${
              layoutMode === "standard"
                ? "text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Standard 3-Column Workstation"
          >
            {layoutMode === "standard" && (
              <motion.div
                layoutId="workstation-layout-pill"
                className="absolute inset-0 rounded-md bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <Columns3 className="relative z-10 size-3" />
            <span className="relative z-10 hidden xl:inline">Standard</span>
          </button>

          <button
            onClick={() => handleMode("wide")}
            className={`relative flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all ${
              layoutMode === "wide"
                ? "text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Wide Stage Mode (Collapsed Sidebar)"
          >
            {layoutMode === "wide" && (
              <motion.div
                layoutId="workstation-layout-pill"
                className="absolute inset-0 rounded-md bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            <Maximize2 className="relative z-10 size-3" />
            <span className="relative z-10 hidden xl:inline">Wide</span>
          </button>

          <button
            onClick={() => {
              haptics.light();
              toggleFocusMode();
            }}
            className={`relative flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all ${
              layoutMode === "focus"
                ? "text-primary-foreground font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Focus / Zen Mode ([F] key)"
          >
            {layoutMode === "focus" && (
              <motion.div
                layoutId="workstation-layout-pill"
                className="absolute inset-0 rounded-md bg-primary shadow-sm"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            {layoutMode === "focus" ? (
              <Minimize2 className="relative z-10 size-3" />
            ) : (
              <Maximize2 className="relative z-10 size-3" />
            )}
            <span className="relative z-10">Focus [F]</span>
          </button>
        </div>

        {/* Hardware Status Tag */}
        <div className="hidden 2xl:flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/50 px-2 py-1 text-[10px] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-chart-5 animate-pulse" />
          <span>WASM ONLINE</span>
          <span className="text-border">·</span>
          <span>{simdThreads} THREADS</span>
        </div>

        {/* Toggle Right Inspector */}
        <button
          onClick={() => {
            haptics.light();
            toggleInspector();
          }}
          className="flex size-7 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
          title={inspectorCollapsed ? "Open Inspector (])" : "Close Inspector (])"}
        >
          {inspectorCollapsed ? (
            <PanelRightOpen className="size-3.5" />
          ) : (
            <PanelRightClose className="size-3.5" />
          )}
        </button>

        {/* Dual Theme Fast Switcher */}
        <ThemeToggle />
        <AudioToggle />

        {/* Quick Launch Ask Zeno AI */}
        <button
          onClick={() => {
            haptics.light();
            toggleAi();
          }}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-mono transition-all ${
            isAiOpen
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold"
              : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60"
          }`}
          title="Ask Zeno AI Co-Pilot"
        >
          <Sparkles className="size-3 text-current animate-pulse" />
          <span className="font-semibold">ZENO AI</span>
        </button>
      </div>
    </div>
  );
}
