"use client";

/**
 * AuthGuard — Enterprise Multi-Device Google Account Chooser & Security Gate.
 *
 * Authored under Ponytail, GSD, Ralph Loop, and CodeRabbit guardrails.
 */

import { ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { UnifiedLoginCard } from "@/components/auth/unified-login-card";
import { ZenoLoadingScreen } from "@/components/shell/zeno-loading-screen";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { mode, user, savedAccounts } = useAuth();
  const [bootSequenceDone, setBootSequenceDone] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return sessionStorage.getItem("zenodeck_boot_completed") === "true";
    } catch {
      return true;
    }
  });

  /* 1. Probing State ----------------------------------------------------- */
  if (mode === "probing") {
    return <ZenoLoadingScreen status="VERIFYING SECURE SESSION…" />;
  }

  /* 2. Open Mode (Gate disengaged) --------------------------------------- */
  if (mode === "unconfigured") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p className="font-mono text-[11px] leading-relaxed text-amber-200/90">
            <span className="font-semibold">Open Mode Active</span> — The security gate is
            disengaged. All tools are fully unlocked without login.
          </p>
        </div>
        {children}
      </div>
    );
  }

  /* 3. Configured + Signed Out OR Cold-Start Tactical Auto-Login --------- */
  const needsBootAutoLogin = !bootSequenceDone && (savedAccounts.length > 0 || !!user);
  if (!user || needsBootAutoLogin) {
    return (
      <div className="flex min-h-[calc(100dvh-7rem)] w-full items-center justify-center px-3 py-4 sm:px-4 sm:py-8">
        <UnifiedLoginCard
          onSuccess={() => {
            setBootSequenceDone(true);
            try {
              sessionStorage.setItem("zenodeck_boot_completed", "true");
            } catch {}
          }}
        />
      </div>
    );
  }

  /* 4. Configured + Signed In → Render Protected Children ------------------ */
  return <>{children}</>;
}
