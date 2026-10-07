"use client";

import { motion } from "framer-motion";
import { Download, LogOut, ShieldAlert, ShieldCheck, RefreshCw, Keyboard } from "lucide-react";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useAuth } from "@/lib/auth/auth-context";
import { SearchPalette } from "@/components/shell/search-palette";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { AudioToggle } from "@/components/shell/audio-toggle";
import { UserAvatar } from "@/components/auth/user-avatar";
import { useNavStore } from "@/lib/navigation/nav-store";
import { usePwaStore } from "@/lib/pwa/pwa-store";
import { checkForUpdates, type AppUpdateInfo } from "@/lib/updater";
import { useUpdateStore } from "@/lib/update-store";
import { UpdateModal } from "@/components/dialogs/update-modal";
import { ZenoTapDeckManager } from "@/components/zenotap/zenotap-deck-manager";
import { useState, useEffect } from "react";
import type { EngineState } from "@/types/omni";

const STATE_META: Record<
  EngineState,
  { label: string; dotClass: string; textClass: string }
> = {
  idle: {
    label: "ENGINE STANDBY",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
  },
  loading: {
    label: "ENGINE BOOTING",
    dotClass: "bg-amber-400",
    textClass: "text-amber-300",
  },
  ready: {
    label: "ENGINE ONLINE",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-300",
  },
  error: {
    label: "ENGINE FAULT",
    dotClass: "bg-red-400",
    textClass: "text-red-300",
  },
};

export function TopBar() {
  const { state } = useFFmpegEngine();
  const { mode, user, signOut, isNative } = useAuth();
  const navigate = useNavStore((s) => s.navigate);
  const setDownloadModalOpen = usePwaStore((s) => s.setDownloadModalOpen);
  const meta = STATE_META[state];
  const autoUpdateEnabled = useUpdateStore((s) => s.autoUpdateEnabled);
  const storeUpdateInfo = useUpdateStore((s) => s.updateInfo);
  const setStoreUpdateInfo = useUpdateStore((s) => s.setUpdateInfo);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeckManagerOpen, setIsDeckManagerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
    if (autoUpdateEnabled) {
      void checkForUpdates(false).then((info) => {
        if (active) setStoreUpdateInfo(info);
      });
    }

    const onDismissed = () => {
      if (active) setStoreUpdateInfo(null);
    };
    window.addEventListener("zenodeck:update-dismissed", onDismissed);
    return () => {
      active = false;
      window.removeEventListener("zenodeck:update-dismissed", onDismissed);
    };
  }, [autoUpdateEnabled, setStoreUpdateInfo]);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl shrink-0 pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-1.5 sm:gap-3 px-2 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="relative grid size-8 sm:size-10 place-items-center rounded-xl border border-primary/40 overflow-hidden glow-box-violet shrink-0"
            >
              <img src="/logo.jpg" alt="ZenoDeck" className="w-full h-full object-cover" />
            </motion.div>
          <div className="flex flex-col leading-none truncate">
            <span className="font-display text-xs sm:text-sm font-bold tracking-[0.2em] sm:tracking-[0.32em] text-foreground">
              ZENODECK
            </span>
            <span className="mt-0.5 hidden font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
              client-side media suite
            </span>
          </div>
        </div>

        {/* Status cluster */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* auth state chip */}
          {mode === "unconfigured" ? (
            <div
              className="hidden items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1.5 md:flex"
              title="Firebase credentials not detected — the security gate is disengaged"
            >
              <ShieldAlert className="size-3 text-amber-300" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300">
                open mode
              </span>
            </div>
          ) : null}

          <div
            className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 p-1.5 sm:px-3 sm:py-1.5"
            role="status"
            aria-live="polite"
            title={`Engine Status: ${meta.label}`}
          >
            <motion.span
              animate={
                state === "loading" ? { scale: [1, 1.45, 1], opacity: [1, 0.6, 1] } : {}
              }
              transition={
                state === "loading"
                  ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
                  : undefined
              }
              className={`size-1.5 rounded-full ${meta.dotClass} ${
                state === "ready"
                  ? "shadow-[0_0_10px_oklch(0.75_0.18_162/0.9)]"
                  : ""
              }`}
            />
            <span
              className={`hidden sm:inline font-mono text-[10px] font-medium uppercase tracking-[0.18em] ${meta.textClass}`}
            >
              {meta.label}
            </span>
          </div>

          <ThemeToggle />
          <div className="hidden min-[420px]:block">
            <AudioToggle />
          </div>
          <SearchPalette />

          {/* Auto-Update Quick Access / Status Toggle Button (Replacing old AI button) */}
          {storeUpdateInfo?.updateAvailable ? (
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1 text-emerald-300 hover:bg-emerald-500/25 transition-all font-mono text-[10px] uppercase tracking-wider cursor-pointer shadow-[0_0_8px_rgba(52,211,153,0.25)]"
              title={`New version v${storeUpdateInfo.latestVersion} available! Click to install or remove.`}
            >
              <span className="flex size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden xs:inline">Update</span>
              <span>v{storeUpdateInfo.latestVersion}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2 sm:px-2.5 py-1 text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all cursor-pointer font-mono text-[10px]"
              title={`Auto-Update: ${autoUpdateEnabled ? "ON" : "OFF"} — Click to configure or check for updates`}
              aria-label={`Auto-Update: ${autoUpdateEnabled ? "ON" : "OFF"}`}
            >
              <RefreshCw
                className={`size-3 text-primary ${autoUpdateEnabled ? "animate-spin" : ""}`}
                style={{ animationDuration: "8s" }}
              />
              <span className="hidden xs:inline uppercase tracking-wider font-semibold text-[9px]">
                UPDATES
              </span>
              <span
                className={`size-1.5 rounded-full ${
                  autoUpdateEnabled
                    ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                    : "bg-muted-foreground/60"
                }`}
              />
            </button>
          )}

          {!isNative ? (
            <button
              type="button"
              onClick={() => setDownloadModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-primary hover:bg-primary/20 hover:border-primary/60 transition-all font-mono text-[10px] uppercase tracking-wider cursor-pointer"
              title="Download Android APK or Install Web App"
            >
              <Download className="size-3 shrink-0" />
              <span className="hidden xs:inline sm:inline">Get App</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("omni:show-permissions"));
                }
              }}
              className="grid size-8 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground cursor-pointer"
              title="Manage Device Permissions"
              aria-label="Manage Device Permissions"
            >
              <ShieldCheck className="size-3.5 text-primary/80" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDeckManagerOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/60 transition-all font-mono text-[10px] uppercase tracking-wider cursor-pointer"
            title="Manage ZenoTap Keyboard Deck & Device Pairing"
          >
            <Keyboard className="size-3 shrink-0 text-indigo-400" />
            <span className="hidden xs:inline sm:inline">ZenoTap</span>
          </button>

          {mounted && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate("auth-gateway")}
                className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 pl-1 pr-2.5 py-1 shadow-xs hover:border-primary/50 hover:bg-card transition-all cursor-pointer"
                title={`Account: ${user.email ?? user.displayName} — click to manage or switch accounts`}
              >
                <UserAvatar user={user} size="sm" showGoogleBadge={true} />
                <span className="hidden xs:inline sm:inline max-w-20 sm:max-w-28 truncate font-medium text-xs text-foreground">
                  {(user.displayName ?? user.email ?? "user").split(" ")[0]}
                </span>
              </button>
              <button
                onClick={() => void signOut()}
                aria-label="Sign out"
                title="Sign out"
                className="grid size-7 sm:size-8 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-300 cursor-pointer"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          ) : mounted ? (
            <button
              type="button"
              onClick={() => navigate("auth-gateway")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary font-display text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
            >
              <span>Sign In</span>
            </button>
          ) : (
            <div className="h-8 w-20 rounded-full border border-border/40 bg-card/30" />
          )}
        </div>
      </div>

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={storeUpdateInfo}
        onRefresh={() => {
          void checkForUpdates(true).then(setStoreUpdateInfo);
        }}
      />

      <ZenoTapDeckManager
        open={isDeckManagerOpen}
        onOpenChange={setIsDeckManagerOpen}
      />
    </motion.header>
  );
}

