"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  Video,
  Sliders,
  FileText,
  Database,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Activity,
  Maximize2,
  HardDrive,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";
import { useStdoutTelemetry } from "@/hooks/useStdoutTelemetry";
import { useWorkstationStore } from "@/hooks/useWorkstationStore";
import { useAiStore } from "@/store/useAiStore";
import { useUIAudio } from "@/hooks/useUIAudio";
import { Switch } from "@/components/ui/switch";

interface NavItem {
  id: string;
  label: string;
  category: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard Hub", category: "Core", shortcut: "1", icon: LayoutGrid },
  { id: "video-converter", label: "Video Engine", category: "Media", shortcut: "2", icon: Video, badge: "P2" },
  { id: "audio-dsp", label: "Audio Studio & 8D", category: "Sound", shortcut: "3", icon: Sliders, badge: "P3" },
  { id: "image-to-pdf", label: "PDF & Doc Suite", category: "Document", shortcut: "4", icon: FileText, badge: "P4" },
  { id: "vault", label: "Local Vault (IDB)", category: "Storage", shortcut: "5", icon: Database, badge: "P5" },
];

export function DesktopSidebar() {
  const { sidebarCollapsed, toggleSidebar, toggleInspector, toggleFocusMode } = useWorkstationStore();
  const view = useNavStore((s) => s.view);
  const navigate = useNavStore((s) => s.navigate);
  const { simdThreads, heapUsedMb, flushHeap } = useStdoutTelemetry();
  const { isOpen: isAiOpen, toggleOpen: toggleAi } = useAiStore();
  const { playHover, playClick, isAudioMuted, toggleAudioMuted, setAudioMuted } = useUIAudio();
  const haptics = useHaptics();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global Keyboard Navigation Shortcuts (1-5, [, ], F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "1") {
        e.preventDefault();
        playClick();
        haptics.light();
        navigate("dashboard");
      } else if (e.key === "2") {
        e.preventDefault();
        playClick();
        haptics.light();
        navigate("video-converter");
      } else if (e.key === "3") {
        e.preventDefault();
        playClick();
        haptics.light();
        navigate("audio-dsp");
      } else if (e.key === "4") {
        e.preventDefault();
        playClick();
        haptics.light();
        navigate("image-to-pdf");
      } else if (e.key === "5") {
        e.preventDefault();
        playClick();
        haptics.light();
        navigate("vault");
      } else if (e.key === "[") {
        e.preventDefault();
        playClick();
        haptics.light();
        toggleSidebar();
      } else if (e.key === "]") {
        e.preventDefault();
        playClick();
        haptics.light();
        toggleInspector();
      } else if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        playClick();
        haptics.light();
        toggleFocusMode();
      } else if (e.key.toLowerCase() === "o" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        playClick();
        haptics.light();
        toggleAi();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, toggleSidebar, toggleInspector, toggleFocusMode, toggleAi, haptics, playClick]);

  const handleNav = (id: string) => {
    playClick();
    haptics.light();
    navigate(id);
  };

  return (
    <aside
      className={`hidden lg:flex flex-col border-r border-border/80 bg-card/60 backdrop-blur-xl transition-all duration-300 ease-out select-none relative z-30 shrink-0 h-full overflow-hidden ${
        sidebarCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Sidebar Header & Toggle */}
      <div className="flex h-14 items-center justify-between border-b border-border/70 px-3">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary border border-primary/40 shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <div className="truncate font-mono">
              <span className="font-display text-xs font-black tracking-wider uppercase text-foreground">
                ZENODECK
              </span>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest truncate">
                WASM Core Engine
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            playClick();
            haptics.light();
            toggleSidebar();
          }}
          className={`flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground hover:border-primary/50 hover:text-foreground active:scale-95 transition-all ${
            sidebarCollapsed ? "mx-auto" : ""
          }`}
          title={sidebarCollapsed ? "Expand sidebar ([)" : "Collapse sidebar ([)"}
        >
          {sidebarCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>

      {/* Navigation Module Links */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {!sidebarCollapsed && (
          <div className="px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center justify-between">
            <span>PROCESS MODULES</span>
            <span className="text-[9px] text-muted-foreground/60">[1-5]</span>
          </div>
        )}

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            view === item.id ||
            (item.id === "video-converter" && (view.includes("video") || view.includes("gif"))) ||
            (item.id === "audio-dsp" &&
              (view.includes("audio") ||
                view.includes("reverb") ||
                view.includes("bass") ||
                view.includes("panner") ||
                view.includes("equalizer") ||
                view.includes("pitch") ||
                view.includes("tempo") ||
                view.includes("vocal") ||
                view.includes("spatial"))) ||
            (item.id === "image-to-pdf" && (view.includes("pdf") || view.includes("ascii") || view.includes("qr")));

          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => {
                setHoveredItem(item.id);
                playHover();
              }}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <button
                onClick={() => handleNav(item.id)}
                className={`group relative flex w-full items-center gap-3 rounded-tactile px-3 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? "text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
              >
                {/* Buttery smooth sliding active background pill */}
                {mounted && isActive && (
                  <motion.div
                    layoutId="active-sidebar-pill"
                    className="absolute inset-0 rounded-tactile bg-primary shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}

                <Icon className={`relative z-10 size-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-primary-foreground" : ""}`} />

                {!sidebarCollapsed && (
                  <div className="relative z-10 flex flex-1 items-center justify-between truncate">
                    <span className="truncate">{item.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span
                          className={`font-mono text-[9px] px-1.5 py-0.2 rounded border ${
                            isActive
                              ? "border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground"
                              : "border-border/60 bg-background/40 text-muted-foreground"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <span className="font-mono text-[9px] opacity-50">[{item.shortcut}]</span>
                    </div>
                  </div>
                )}
              </button>

              {/* HUD Floating Tooltip in Collapsed Mini-Dock Mode */}
              {sidebarCollapsed && hoveredItem === item.id && (
                <motion.div
                  initial={{ opacity: 0, x: -8, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none"
                >
                  <div className="panel-hud scanlines rounded-xl border border-primary/40 bg-card/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-xl min-w-[160px] font-mono">
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground mb-0.5">
                      <span className="uppercase tracking-widest text-primary font-bold">{item.category}</span>
                      <span className="rounded border border-border/70 bg-background/60 px-1 text-[9px]">[{item.shortcut}]</span>
                    </div>
                    <p className="font-bold text-foreground text-xs">{item.label}</p>
                    {item.badge && (
                      <span className="inline-block mt-1 text-[9px] px-1.5 py-0.2 rounded border border-border/60 bg-secondary/50 text-muted-foreground">
                        Phase {item.badge} Module
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Ask Zeno AI Quick Launcher */}
      <div className="p-2 border-t border-border/70">
        <button
          onClick={() => {
            playClick();
            haptics.light();
            toggleAi();
          }}
          className={`w-full group flex items-center gap-2 rounded-xl border p-2 text-xs font-mono transition-all select-none ${
            isAiOpen
              ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold"
              : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/60"
          } ${sidebarCollapsed ? "justify-center" : "justify-between"}`}
          title="Ask Zeno AI Co-Pilot ([O] key)"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="size-4 shrink-0 text-current animate-pulse" />
            {!sidebarCollapsed && (
              <span className="font-bold text-xs truncate">Ask Zeno AI</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-primary/20 border border-primary/30 uppercase">
                AI
              </span>
              <span className="text-[9px] opacity-60">[O]</span>
            </div>
          )}
        </button>
      </div>

      {/* Audio Feedback Control */}
      {!sidebarCollapsed ? (
        <div className="px-3 py-2 border-t border-border/70 text-xs font-mono bg-background/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            {isAudioMuted ? (
              <VolumeX className="size-3.5 text-muted-foreground/70 shrink-0" />
            ) : (
              <Volume2 className="size-3.5 text-primary shrink-0" />
            )}
            <span className="text-[11px] font-medium text-foreground">Audio Feedback</span>
          </div>
          <Switch
            checked={!isAudioMuted}
            onCheckedChange={(checked) => {
              haptics.light();
              setAudioMuted(!checked);
              if (checked) {
                setTimeout(() => playClick(), 40);
              }
            }}
            aria-label="Toggle UI audio feedback"
          />
        </div>
      ) : (
        <div className="p-2 border-t border-border/70 flex justify-center">
          <button
            onClick={() => {
              haptics.light();
              toggleAudioMuted();
              if (isAudioMuted) {
                setTimeout(() => playClick(), 40);
              }
            }}
            className={`flex size-8 items-center justify-center rounded-lg border transition-all ${
              !isAudioMuted
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border/60 bg-background/50 text-muted-foreground hover:text-foreground"
            }`}
            title={isAudioMuted ? "Enable Audio Feedback" : "Mute Audio Feedback"}
            aria-label={isAudioMuted ? "Enable Audio Feedback" : "Mute Audio Feedback"}
          >
            {isAudioMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          </button>
        </div>
      )}

      {/* Bottom Telemetry & Runtime Status */}
      <div className="border-t border-border/70 p-2.5 font-mono text-[10px] bg-background/30">
        {!sidebarCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="uppercase tracking-wide text-[9px]">WASM RUNTIME</span>
              <span className="flex items-center gap-1 text-chart-5 font-bold">
                <span className="size-1.5 rounded-full bg-chart-5 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="uppercase tracking-wide text-[9px]">PTHREAD POOL</span>
              <span suppressHydrationWarning className="font-bold text-foreground">{simdThreads}/8 Active</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/40">
              <span className="uppercase tracking-wide text-[9px]">HEAP BUFFER</span>
              <button
                suppressHydrationWarning
                onClick={() => {
                  playClick();
                  haptics.light();
                  flushHeap();
                }}
                className="font-bold text-primary hover:underline"
                title="Click to flush unused WebAssembly memory"
              >
                {heapUsedMb} MB (Flush)
              </button>
            </div>
            <div className="pt-1 text-[9px] text-muted-foreground/60 flex items-center gap-1">
              <Zap className="size-3 text-chart-5 shrink-0" />
              <span>Zero Remote Egress</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <div
              className="size-2 rounded-full bg-chart-5 animate-pulse"
              title="WASM Engine Online"
            />
            <span className="text-[9px] font-bold text-muted-foreground">
              {simdThreads}T
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
