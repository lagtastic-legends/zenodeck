"use client";

import React, { useEffect } from "react";
import { AlertCircle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ZenoDeck Root Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-8 text-center text-foreground selection:bg-primary selection:text-primary-foreground">
      <div className="panel-hud relative w-full max-w-lg rounded-2xl border border-rose-500/40 bg-card/90 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-rose-500/50 bg-rose-500/15 text-rose-400 mb-5 shadow-[0_0_24px_rgba(244,63,94,0.3)]">
          <ShieldAlert className="size-7" />
        </div>

        <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-rose-300">
          Workstation Recovery System
        </h1>

        <p className="mt-2 font-mono text-xs sm:text-sm text-muted-foreground leading-relaxed">
          ZenoDeck encountered an unhandled system anomaly. Your on-device data and vault files remain safe.
        </p>

        {error?.message && (
          <div className="mt-4 rounded-xl border border-border/70 bg-background/80 p-3 text-left font-mono text-xs text-rose-200/90 break-all max-h-28 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary to-plasma px-5 py-3 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className="size-4" />
            <span>Reboot Workstation</span>
          </button>

          <button
            type="button"
            onClick={() => {
              // Hard reset to matrix hub on critical error
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination
              window.location.href = "/";
            }}
            className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-5 py-3 font-mono text-xs text-foreground hover:border-primary/50 active:scale-95 transition-all cursor-pointer"
          >
            <Home className="size-4" />
            <span>Return to Matrix</span>
          </button>
        </div>
      </div>
    </div>
  );
}
