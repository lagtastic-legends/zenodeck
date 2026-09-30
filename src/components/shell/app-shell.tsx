"use client";

/**
 * AppShell — top-level composition: ambient background, top bar, and the
 * animated view switcher between the Dashboard and individual tool views.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Compass, Database, Download, Film, Layers, Loader2, Scissors, Smartphone, Sparkles, Video, Youtube } from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { AuthGateway } from "@/components/auth/auth-gateway";
import { AuthGuard } from "@/components/auth/auth-guard";
import { AuroraBackground } from "@/components/shell/aurora-background";
import { AppFooter } from "@/components/shell/footer";
import { TopBar } from "@/components/shell/top-bar";
import { StickyMobileCta } from "@/components/shell/sticky-mobile-cta";
import { FloatingToolbar } from "@/components/ui/floating-toolbar";
import AskOmni from "@/components/AskOmni";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ToolShell } from "@/components/tools/tool-shell";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useAiStore } from "@/store/useAiStore";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { BackConfirmDialog } from "@/components/navigation/back-confirm-dialog";
import { SaveResultModal } from "@/components/dialogs/save-result-modal";
import { PermissionGate } from "@/components/shell/permission-gate";
import { useAuth } from "@/lib/auth/auth-context";
import { DesktopSidebar } from "@/components/shell/desktop-sidebar";
import { DesktopInspector } from "@/components/shell/desktop-inspector";
import { WorkstationRibbon } from "@/components/shell/workstation-ribbon";
import { ToolErrorBoundary } from "@/components/shell/tool-error-boundary";

/* Dynamic code-split tool modules to control memory & isolate thread workloads */
const YouTubeDownloader = lazy(() => import("@/components/tools/youtube-downloader").then((m) => ({ default: m.YouTubeDownloader })));
const VideoEditor = lazy(() => import("@/components/tools/video-editor").then((m) => ({ default: m.VideoEditor })));
const MediaConverter = lazy(() => import("@/components/tools/media-converter").then((m) => ({ default: m.MediaConverter })));
const VideoCompressor = lazy(() => import("@/components/tools/video-compressor").then((m) => ({ default: m.VideoCompressor })));
const VideoMute = lazy(() => import("@/components/tools/video-mute").then((m) => ({ default: m.VideoMute })));
const GifMaker = lazy(() => import("@/components/tools/gif-maker").then((m) => ({ default: m.GifMaker })));
const AudioEditor = lazy(() => import("@/components/tools/audio-editor").then((m) => ({ default: m.AudioEditor })));
const SlowedReverb = lazy(() => import("@/components/tools/slowed-reverb").then((m) => ({ default: m.SlowedReverb })));
const BassBooster = lazy(() => import("@/components/tools/bass-booster").then((m) => ({ default: m.BassBooster })));
const Spatial8D = lazy(() => import("@/components/tools/spatial-8d").then((m) => ({ default: m.Spatial8D })));
const EqualizerTool = lazy(() => import("@/components/tools/equalizer-tool").then((m) => ({ default: m.EqualizerTool })));
const ReverseAudio = lazy(() => import("@/components/tools/reverse-audio").then((m) => ({ default: m.ReverseAudio })));
const StereoPanner = lazy(() => import("@/components/tools/stereo-panner").then((m) => ({ default: m.StereoPanner })));
const VolumeChanger = lazy(() => import("@/components/tools/volume-changer").then((m) => ({ default: m.VolumeChanger })));
const RingtoneMaker = lazy(() => import("@/components/tools/ringtone-maker").then((m) => ({ default: m.RingtoneMaker })));
const ImageToPdf = lazy(() => import("@/components/tools/image-to-pdf").then((m) => ({ default: m.ImageToPdf })));
const TextToPdf = lazy(() => import("@/components/tools/text-to-pdf").then((m) => ({ default: m.TextToPdf })));
const LockPdf = lazy(() => import("@/components/tools/lock-pdf").then((m) => ({ default: m.LockPdf })));
const ScanToPdf = lazy(() => import("@/components/tools/scan-to-pdf").then((m) => ({ default: m.ScanToPdf })));
const PaletteExtractor = lazy(() => import("@/components/tools/palette-extractor").then((m) => ({ default: m.PaletteExtractor })));
const AsciiGenerator = lazy(() => import("@/components/tools/ascii-generator").then((m) => ({ default: m.AsciiGenerator })));
const WatermarkRemover = lazy(() => import("@/components/tools/watermark-remover").then((m) => ({ default: m.WatermarkRemover })));
const VaultView = lazy(() => import("@/components/vault/vault-view").then((m) => ({ default: m.VaultView })));
const StudioRecorder = lazy(() => import("@/components/tools/studio-recorder").then((m) => ({ default: m.StudioRecorder })));
const QrStudio = lazy(() => import("@/components/tools/qr-studio").then((m) => ({ default: m.QrStudio })));
const UnifiedAudioStudio = lazy(() => import("@/components/audio/UnifiedAudioStudio").then((m) => ({ default: m.UnifiedAudioStudio })));

const AudioDspTool = () => <UnifiedAudioStudio initialToolId="spatial-8d" />;
const VocalRemoverTool = () => <UnifiedAudioStudio initialToolId="vocal-remover" />;
const ReverbTool = () => <UnifiedAudioStudio initialToolId="reverb" />;
const AutoPannerTool = () => <UnifiedAudioStudio initialToolId="auto-panner" />;
const NoiseReducerTool = () => <UnifiedAudioStudio initialToolId="noise-reducer" />;
const PitchShifterTool = () => <UnifiedAudioStudio initialToolId="pitch-shifter" />;
const TempoChangerTool = () => <UnifiedAudioStudio initialToolId="tempo-changer" />;
const Spatial8DStudioTool = () => <UnifiedAudioStudio initialToolId="spatial-8d" />;
const BassBoosterStudioTool = () => <UnifiedAudioStudio initialToolId="bass-booster" />;
const EqualizerStudioTool = () => <UnifiedAudioStudio initialToolId="equalizer" />;
const ReverseAudioStudioTool = () => <UnifiedAudioStudio initialToolId="reverse-audio" />;
const StereoPannerStudioTool = () => <UnifiedAudioStudio initialToolId="stereo-panner" />;
const VolumeChangerStudioTool = () => <UnifiedAudioStudio initialToolId="volume-changer" />;
const TrimmerStudioTool = () => <UnifiedAudioStudio initialToolId="trimmer" />;

function ToolSkeleton() {
  return (
    <div className="panel-hud relative flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-primary/20 bg-card/40 p-8 text-center shadow-elevation2">
      <div className="relative grid size-12 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-xs font-bold tracking-[0.2em] text-foreground">
          MOUNTING MODULE WORKSPACE…
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          100% On-Device · Allocating isolated sandbox memory
        </p>
      </div>
      <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-border/60">
        <div className="h-full w-2/3 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary via-plasma to-neon" />
      </div>
    </div>
  );
}

/** tool id → module implementation (grows every phase) */
const TOOL_COMPONENTS: Record<string, React.ComponentType> = {
  "youtube-downloader": YouTubeDownloader,
  "video-editor": VideoEditor,
  "video-converter": MediaConverter,
  "video-compressor": VideoCompressor,
  "video-mute": VideoMute,
  "gif-maker": GifMaker,
  "audio-editor": AudioEditor,
  "slowed-reverb": SlowedReverb,
  "bass-booster": BassBoosterStudioTool,
  "spatial-8d": Spatial8DStudioTool,
  "equalizer": EqualizerStudioTool,
  "reverse-audio": ReverseAudioStudioTool,
  "stereo-panner": StereoPannerStudioTool,
  "volume-changer": VolumeChangerStudioTool,
  "trimmer": TrimmerStudioTool,
  "ringtone-maker": RingtoneMaker,
  "image-to-pdf": ImageToPdf,
  "text-to-pdf": TextToPdf,
  "lock-pdf": LockPdf,
  "scan-to-pdf": ScanToPdf,
  "palette-extractor": PaletteExtractor,
  "ascii-generator": AsciiGenerator,
  "watermark-remover": WatermarkRemover,
  vault: VaultView,
  "studio-recorder": StudioRecorder,
  "qr-studio": QrStudio,
  "auth-gateway": AuthGateway,
  "audio-dsp": AudioDspTool,
  "vocal-remover": VocalRemoverTool,
  "reverb": ReverbTool,
  "auto-panner": AutoPannerTool,
  "noise-reducer": NoiseReducerTool,
  "pitch-shifter": PitchShifterTool,
  "tempo-changer": TempoChangerTool,
};

function ToolView({ toolId }: { toolId: string }) {
  const resetNav = useNavStore((s) => s.reset);

  if (toolId === "youtube-downloader" && !Capacitor.isNativePlatform()) {
    return (
      <div className="mx-auto w-full max-w-xl panel-hud flex flex-col items-center gap-4 rounded-2xl p-8 sm:p-10 text-center shadow-elevation2 border border-primary/30 mt-6">
        <div className="relative grid size-16 place-items-center rounded-2xl border border-red-500/40 bg-red-500/10 text-red-500 shadow-glow">
          <Youtube className="size-8" />
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            4K
          </span>
        </div>
        <div className="space-y-1.5">
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
            Native Android Exclusive
          </h2>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed max-w-md">
            To bypass cloud datacenter IP blocks and browser streaming throttling, the high-speed YouTube 4K Turbo Downloader runs natively in the Zenodeck Android app.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-3 w-full sm:w-auto">
          <a
            href="/zenodeck.apk"
            download="zenodeck.apk"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/20 px-6 py-3 font-display text-xs font-bold uppercase tracking-wider text-primary hover:bg-primary/30 active:scale-95 transition-all shadow-glow"
          >
            <Download className="size-4" />
            <span>Download Zenodeck APK</span>
          </a>
          <button
            onClick={resetNav}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-border/70 bg-card/50 px-5 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:border-primary/40 hover:text-foreground active:scale-95 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const Tool = TOOL_COMPONENTS[toolId];
  if (!Tool) {
    return (
      <div className="panel-hud flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
        <Compass className="size-8 text-muted-foreground" />
        <p className="font-display text-sm font-bold text-foreground">
          MODULE NOT YET DEPLOYED
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          This module ships in a later phase of the build sequence.
        </p>
        <button
          onClick={resetNav}
          className="mt-2 min-h-11 rounded-xl border border-border/70 bg-card/50 px-5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          back
        </button>
      </div>
    );
  }
  return (
    <ToolShell toolId={toolId}>
      <Suspense fallback={<ToolSkeleton />}>
        <Tool key={toolId} />
      </Suspense>
    </ToolShell>
  );
}

export function AppShell() {
  useEffect(() => {
    let capSub: Promise<{ remove: () => Promise<void> }> | null = null;
    if (Capacitor.isNativePlatform()) {
      capSub = CapacitorApp.addListener("backButton", () => {
        void useNavStore.getState().handleBack();
      });
    }

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      void useNavStore.getState().handleBack().then(() => {
        const activeView = useNavStore.getState().view;
        if (typeof window !== "undefined") {
          const expectedHash = activeView === "dashboard" ? "" : `#${activeView}`;
          if (window.location.hash !== expectedHash) {
            try {
              window.history.pushState({ view: activeView }, "", window.location.pathname + expectedHash);
            } catch {
              // ignore
            }
          }
        }
      });
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      if (capSub) {
        capSub.then((s) => s.remove()).catch(() => {});
      }
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  /* Global Single-Stream Audio Coordinator: ensures never more than one audio/video element plays concurrently */
  useEffect(() => {
    const handlePlay = (e: Event) => {
      const target = e.target as HTMLMediaElement;
      if (!target || (target.tagName !== "AUDIO" && target.tagName !== "VIDEO")) return;
      document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((media) => {
        if (media !== target && !media.paused) {
          try {
            media.pause();
          } catch {}
        }
      });
    };

    document.addEventListener("play", handlePlay, true);
    return () => {
      document.removeEventListener("play", handlePlay, true);
    };
  }, []);

  const { view, navigate, reset } = useNavStore();
  const { isOpen: isAiOpen, toggleOpen: toggleAi } = useAiStore();
  const { mode, user } = useAuth();
  const isGuest =
    typeof window !== "undefined" &&
    (localStorage.getItem("omni_guest_session") === "true" ||
      sessionStorage.getItem("omni_guest_session") === "true" ||
      user?.isGuest === true);
  const isLoginScreen = (mode === "configured" && !user && !isGuest) || view === "auth-gateway";

  useEffect(() => {
    (window as any).__omni_navigate = navigate;
    (window as any).__omni_nav_store = useNavStore;
  }, [navigate]);

  useEffect(() => {
    if (isAiOpen) {
      return useNavStore.getState().registerOverlay("ai-chat", () => {
        useAiStore.getState().setIsOpen(false);
        return true;
      });
    }
  }, [isAiOpen]);

  const floatingActions = [
    {
      id: "ai",
      label: "Ask Zeno AI",
      icon: Sparkles,
      accentClass: "text-neon border-neon/50 bg-neon/15 hover:bg-neon/25 shadow-[0_0_12px_rgba(0,240,255,0.3)]",
      onClick: () => toggleAi(),
    },
    { id: "matrix", label: "Tool Matrix", icon: Layers, onClick: () => reset() },
    { id: "editor", label: "The Edit Bay", icon: Film, onClick: () => navigate("video-editor") },
    { id: "converter", label: "Media Studio", icon: Scissors, onClick: () => navigate("video-converter") },
    { id: "vault", label: "File Vault", icon: Database, onClick: () => navigate("vault") },
    { id: "recorder", label: "Studio Recorder", icon: Video, onClick: () => navigate("studio-recorder") },
  ];

  return (
    <div className="relative flex min-h-[100dvh] flex-col lg:h-screen lg:overflow-hidden">
      <AuroraBackground />
      <TopBar />
      <AskOmni />

      <div className="flex flex-1 w-full min-h-0 lg:overflow-hidden">
        <DesktopSidebar />

        <div className="flex flex-1 flex-col min-w-0 min-h-0 lg:h-full lg:overflow-y-auto scrollbar-thin scrollbar-thumb-border">
          <WorkstationRibbon />

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 py-4 sm:px-6 sm:py-8 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] lg:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 12, scale: 0.994 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.996 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                style={{ transform: "translate3d(0, 0, 0)", backfaceVisibility: "hidden" }}
                className="flex-1 will-change-[transform,opacity]"
              >
                {/* The Auth Gateway stays reachable above the security gate —
                 * it hosts the setup instructions (open mode) and profile
                 * management (signed in). Every other surface is guarded. */}
                {view === "auth-gateway" ? (
                  <ToolShell toolId="auth-gateway">
                    <AuthGateway />
                  </ToolShell>
                ) : (
                  <AuthGuard>
                    {view === "dashboard" ? (
                      <DashboardView />
                    ) : (
                      <ToolErrorBoundary toolId={view}>
                        <ToolView toolId={view} />
                      </ToolErrorBoundary>
                    )}
                  </AuthGuard>
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Desktop Footer inside middle scroll container */}
          <div className="hidden lg:block">
            <AppFooter />
          </div>
        </div>

        <DesktopInspector />
      </div>

      {!isAiOpen && !isLoginScreen && <FloatingToolbar actions={floatingActions} />}
      {!isLoginScreen && <StickyMobileCta />}
      <BackConfirmDialog />
      <SaveResultModal />
      {!isLoginScreen && <PermissionGate />}

      {/* Mobile Footer outside workstation columns */}
      {!isLoginScreen && (
        <div className="lg:hidden">
          <AppFooter />
        </div>
      )}
    </div>
  );
}

