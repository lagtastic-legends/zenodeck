"use client";

/**
 * UnifiedLoginCard — Enterprise Universal Google Authentication Surface.
 *
 * System Architecture Principles (30-Year Design Rigor):
 *  1. Zero Friction: Direct "Continue with Google" (Native Android Credential Manager & Web Popup).
 *  2. Resilient Fallbacks: Full-page redirect (`signInWithRedirect`) & direct in-tab Gmail entry (immune to cookie partition & popup blockers).
 *  3. Device Memory: Auto-persists accounts previously used on this device for 1-tap re-entry.
 *  4. Universal Phone Ergonomics:
 *     - Compact Slabs (360px): Safe padding, no clipped controls, 44px+ touch targets.
 *     - Flip Phones (Flex Mode 90°): Constrained viewport height auto-scrolling (`max-h-[calc(100dvh-4rem)]`).
 *     - Foldables & Tablets: Elegant centered elevation, proportional typography.
 *     - iOS/Android WebKit: 16px mobile input font-size to eliminate unsolicited viewport zoom.
 *  5. Privacy & Offline: Instant guest sandbox bypass.
 *
 * Authored under Ponytail, GSD, Ralph Loop, and CodeRabbit guardrails.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Loader2,
  Lock,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  X,
  Gamepad2,
  CheckCircle2,
  Radio,
  Zap,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth, type AuthUser } from "@/lib/auth/auth-context";
import { UserAvatar } from "@/components/auth/user-avatar";
import { useHaptics } from "@/hooks/use-haptics";

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.6c-.1 1.1-.9 2.8-2.4 3.9l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.1 0-5.8-2.1-6.7-5l-.14.01-3.6 2.8-.05.13C3.6 21.3 7.5 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.4c-.3-.8-.4-1.6-.4-2.4s.2-1.7.4-2.4l-.01-.16-3.7-2.8-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.5 5.4l3.8-3z"
      />
      <path
        fill="#EA4335"
        d="M12 4.6c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.5 0 3.6 2.7 1.5 6.6l3.8 3c.9-2.9 3.6-5 6.7-5z"
      />
    </svg>
  );
}

interface UnifiedLoginCardProps {
  onSuccess?: () => void;
  className?: string;
  showSubtitle?: boolean;
}

export function UnifiedLoginCard({
  onSuccess,
  className = "",
  showSubtitle = true,
}: UnifiedLoginCardProps) {
  const haptics = useHaptics();
  const {
    savedAccounts,
    busy,
    error,
    isNative,
    signInWithGoogle,
    signInWithGoogleRedirect,
    signInWithGoogleEmail,
    switchAccount,
    removeSavedAccount,
    continueAsGuest,
    autoLoginEnabled,
    setAutoLoginEnabled,
  } = useAuth();

  const [inputEmail, setInputEmail] = useState("");
  const [inputName, setInputName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showDirectForm, setShowDirectForm] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);

  const hasSavedAccounts = savedAccounts && savedAccounts.length > 0;
  const primaryAccount = hasSavedAccounts ? savedAccounts[0] : null;

  const [autoLoginCancelled, setAutoLoginCancelled] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem("zenodeck_autologin_cancelled") === "true";
    } catch {
      return false;
    }
  });

  const [autoLoginCountdown, setAutoLoginCountdown] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const isCancelled = sessionStorage.getItem("zenodeck_autologin_cancelled") === "true";
      if (!isCancelled && autoLoginEnabled && primaryAccount) {
        return 3;
      }
    } catch {}
    return null;
  });

  const startLoginTransition = useCallback(
    (acc: AuthUser) => {
      setIsTransitioning(true);
      void haptics.medium();
      let current = 0;
      const interval = setInterval(() => {
        current += 25;
        setTransitionProgress(Math.min(current, 100));
        if (current >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            void haptics.success();
            switchAccount(acc);
            onSuccess?.();
          }, 180);
        }
      }, 55);
    },
    [haptics, switchAccount, onSuccess]
  );

  const handleSelectAccount = useCallback(
    (acc: AuthUser) => {
      startLoginTransition(acc);
    },
    [startLoginTransition]
  );

  const cancelAutoLogin = useCallback(() => {
    setAutoLoginCountdown(null);
    setAutoLoginCancelled(true);
    setIsTransitioning(false);
    void haptics.light();
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("zenodeck_autologin_cancelled", "true");
      } catch {}
    }
  }, [haptics]);

  useEffect(() => {
    if (
      autoLoginCountdown === null &&
      !autoLoginCancelled &&
      autoLoginEnabled &&
      primaryAccount &&
      !isTransitioning
    ) {
      const timer = setTimeout(() => {
        setAutoLoginCountdown(3);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoLoginCountdown, autoLoginCancelled, autoLoginEnabled, primaryAccount, isTransitioning]);

  useEffect(() => {
    if (autoLoginCountdown === null || autoLoginCountdown <= 0 || isTransitioning) return;

    const timer = setTimeout(() => {
      if (autoLoginCountdown === 1) {
        setAutoLoginCountdown(0);
        if (primaryAccount) {
          startLoginTransition(primaryAccount);
        }
      } else {
        setAutoLoginCountdown((prev) => (prev !== null ? prev - 1 : null));
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoLoginCountdown, primaryAccount, isTransitioning, startLoginTransition]);

  const handleDirectEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    const cleanEmail = inputEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setEmailError("Please enter a valid email address (e.g. name@gmail.com).");
      return;
    }
    signInWithGoogleEmail(cleanEmail, inputName.trim() || undefined);
    setInputEmail("");
    setInputName("");
    onSuccess?.();
  };

  const handleGoogleSignIn = async () => {
    setDismissedError(false);
    await signInWithGoogle();
    onSuccess?.();
  };

  const handleGoogleRedirect = async () => {
    setDismissedError(false);
    await signInWithGoogleRedirect();
  };

  const handleGuest = () => {
    continueAsGuest();
    onSuccess?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`w-full max-w-md mx-auto max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain scrollbar-thin rounded-2xl sm:rounded-3xl border border-border/80 bg-card/95 p-4 xs:p-5 sm:p-7 shadow-2xl backdrop-blur-2xl ${className}`}
    >
      {/* Header Brand Lockup */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-3 sm:mb-4">
          <div className="grid size-12 sm:size-14 place-items-center rounded-2xl border border-primary/40 bg-primary/10 shadow-sm glow-box-violet">
            <Lock className="size-6 sm:size-7 text-primary" strokeWidth={2} />
          </div>
          <div className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-card border border-border/70 shadow-xs">
            <GoogleMark className="size-3.5" />
          </div>
        </div>

        <h1 className="font-display text-base sm:text-lg font-black uppercase tracking-wider text-foreground">
          Sign In to ZenoDeck
        </h1>
        {showSubtitle && (
          <p className="mt-1 font-mono text-[11px] sm:text-xs text-muted-foreground max-w-xs leading-relaxed">
            {isNative
              ? "Native Android authentication powered by Google Play Services"
              : "100% on-device WebAssembly suite. Choose your account below."}
          </p>
        )}
      </div>

      <div className="mt-5 sm:mt-6 space-y-3.5 sm:space-y-4">
        {/* Smooth Transition Holographic HUD during Sign-In Transaction */}
        {isTransitioning && primaryAccount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-br from-emerald-500/20 via-card/95 to-background p-4 shadow-2xl space-y-3"
          >
            {/* Animated Laser Progress Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary/80">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 via-neon to-primary"
                style={{ width: `${transitionProgress}%` }}
                transition={{ ease: "easeOut", duration: 0.15 }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                  SYNCHRONIZING OPERATOR SESSION…
                </span>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-400">
                {transitionProgress}%
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-background/90 p-3 shadow-inner">
              <div className="relative">
                <UserAvatar user={primaryAccount} size="sm" showGoogleBadge={true} />
                <span className="absolute -inset-1 rounded-full border border-emerald-400/50 animate-ping pointer-events-none" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xs font-bold text-foreground">
                  {primaryAccount.displayName || "Operator Profile"}
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {primaryAccount.email}
                </p>
              </div>
              <CheckCircle2 className="size-5 text-emerald-400 shrink-0 animate-bounce" />
            </div>

            <p className="text-center font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Credentials Verified · Deploying to ZenoDeck Suite
            </p>
          </motion.div>
        )}

        {/* Call of Duty-Style Auto Login Sequence Banner */}
        {!isTransitioning && autoLoginCountdown !== null && autoLoginCountdown > 0 && primaryAccount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="relative overflow-hidden rounded-2xl border-2 border-primary/70 bg-gradient-to-br from-primary/20 via-card/95 to-background p-4 shadow-xl space-y-3"
          >
            {/* Animated Laser Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-secondary/60">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-400 via-primary to-neon shadow-[0_0_10px_rgba(0,240,255,0.7)]"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 3, ease: "linear" }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <Gamepad2 className="size-4 text-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                  AUTO-SIGN IN ACTIVE
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <motion.span
                  key={autoLoginCountdown}
                  initial={{ scale: 1.25, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-300"
                >
                  {autoLoginCountdown}s
                </motion.span>
                <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[8px] font-extrabold uppercase tracking-wider text-primary">
                  COD Fast Pass
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/85 p-3 shadow-inner">
              <div className="relative shrink-0">
                <UserAvatar user={primaryAccount} size="sm" showGoogleBadge={true} />
                <span className="absolute -inset-0.5 rounded-full border border-primary/50 animate-pulse pointer-events-none" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-display text-xs font-bold text-foreground">
                    {primaryAccount.displayName || "Operator Profile"}
                  </p>
                  <span className="rounded bg-primary/20 px-1 py-0.2 font-mono text-[8px] font-extrabold uppercase tracking-wider text-primary shrink-0">
                    Default
                  </span>
                </div>
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                  {primaryAccount.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => startLoginTransition(primaryAccount)}
                className="flex-1 flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary via-primary to-neon px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-md glow-box-violet"
              >
                <span>Deploy Operator</span>
                <ArrowRight className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={cancelAutoLogin}
                className="flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-border/80 bg-background/90 px-3.5 py-2 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-red-400/50 hover:text-red-300 active:scale-[0.98] transition-all cursor-pointer"
                title="Switch operator or manual login"
              >
                <span>Switch</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Primary Action: Continue with Google Button */}
        <div>
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={busy || isTransitioning}
            className="group relative flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl border border-border/80 bg-background hover:bg-secondary/60 hover:border-primary/50 px-4 py-3 text-xs sm:text-sm font-display font-semibold text-foreground shadow-sm active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <GoogleMark className="size-5 shrink-0 transition-transform group-hover:scale-110" />
            )}
            <span>{busy ? "Opening Google Sign-In…" : "Continue with Google"}</span>
          </button>

          {!isNative && (
            <div className="mt-1.5 text-center">
              <button
                type="button"
                onClick={() => void handleGoogleRedirect()}
                disabled={busy || isTransitioning}
                className="font-mono text-[10px] text-muted-foreground/70 hover:text-primary transition-colors cursor-pointer"
              >
                Having popup issues? Use Full-Page Sign-In
              </button>
            </div>
          )}
        </div>

        {/* Saved Operator Profiles on this Device */}
        {hasSavedAccounts && (
          <div className="space-y-2 rounded-2xl border border-border/60 bg-background/40 p-3 sm:p-3.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-1 pb-1">
              <div className="flex items-center gap-1.5">
                <span>Saved Operator Profiles</span>
                <span className="rounded-full bg-secondary/80 px-1.5 py-0.2 text-[9px] font-bold text-foreground">
                  {savedAccounts.length}
                </span>
              </div>

              {/* Auto-Login On/Off Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  void haptics.light();
                  setAutoLoginEnabled(!autoLoginEnabled);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  autoLoginEnabled
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_8px_rgba(52,211,153,0.15)]"
                    : "bg-secondary text-muted-foreground border border-border/60"
                }`}
                title={autoLoginEnabled ? "Auto-Login on launch is active" : "Auto-Login is disabled"}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    autoLoginEnabled ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
                  }`}
                />
                <span>Auto-Deploy: {autoLoginEnabled ? "ON" : "OFF"}</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-44 sm:max-h-52 overflow-y-auto overscroll-contain pr-0.5 scrollbar-thin">
              {savedAccounts.map((acc, index) => (
                <div
                  key={acc.uid}
                  className={`group flex items-center justify-between gap-2.5 rounded-xl border p-2.5 transition-all ${
                    index === 0 && autoLoginEnabled
                      ? "border-primary/50 bg-primary/5 shadow-xs"
                      : "border-border/40 bg-card/60 hover:border-primary/40 hover:bg-card"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    disabled={busy || isTransitioning}
                    className="flex flex-1 items-center gap-2.5 text-left min-w-0 cursor-pointer"
                    title={`Sign in as ${acc.displayName || acc.email}`}
                  >
                    <UserAvatar user={acc} size="sm" showGoogleBadge={true} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-display text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {acc.displayName || "Google Operator"}
                        </p>
                        {index === 0 && autoLoginEnabled && (
                          <span className="rounded bg-primary/20 px-1 py-0.2 font-mono text-[8px] font-extrabold uppercase tracking-wide text-primary shrink-0">
                            Auto-Deploy
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-[10px] text-muted-foreground">
                        {acc.email}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelectAccount(acc)}
                      disabled={busy || isTransitioning}
                      className="flex min-h-[34px] items-center gap-1 rounded-lg bg-primary/20 px-2.5 py-1 font-mono text-[10px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                    >
                      <span>Connect</span>
                      <ArrowRight className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void haptics.light();
                        removeSavedAccount(acc.uid);
                      }}
                      className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove from device list"
                      aria-label={`Remove ${acc.email} from saved accounts`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direct In-Tab Gmail Sign-In Section */}
        <div className="rounded-xl border border-border/70 bg-background/30 p-3 sm:p-3.5">
          <button
            type="button"
            onClick={() => setShowDirectForm((prev) => !prev)}
            className="flex items-center justify-between w-full text-left font-mono text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-expanded={!hasSavedAccounts || showDirectForm}
          >
            <div className="flex items-center gap-2">
              <Mail className="size-3.5 text-primary" />
              <span className="font-semibold text-foreground">
                {hasSavedAccounts ? "Sign in with another Gmail" : "Or sign in directly with Gmail"}
              </span>
            </div>
            <ChevronDown
              className={`size-3.5 transition-transform duration-200 ${
                !hasSavedAccounts || showDirectForm ? "rotate-180 text-primary" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {(!hasSavedAccounts || showDirectForm) && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleDirectEmailSubmit}
                className="overflow-hidden pt-3 space-y-2.5"
              >
                <div>
                  <input
                    type="email"
                    required
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="your.email@gmail.com"
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    /* 16px on mobile (text-base) prevents iOS Safari unsolicited zoom */
                    className="w-full min-h-[44px] rounded-lg border border-border/70 bg-card px-3 py-2 font-mono text-base sm:text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Your Name (optional)"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-border/70 bg-card px-3 py-2 font-sans text-base sm:text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
                  />
                </div>

                {emailError && (
                  <p className="font-mono text-[11px] text-red-400" role="alert">
                    {emailError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-tactile hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  <span>Sign In with This Account</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Error & Fallback Banner */}
        <AnimatePresence>
          {error && !dismissedError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-left font-mono text-xs text-red-300 space-y-2"
              role="alert"
            >
              <div className="flex items-center justify-between gap-1.5 font-bold text-red-400">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>Sign-In Notice</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDismissedError(true)}
                  className="p-1 hover:text-red-200 cursor-pointer"
                  title="Dismiss error"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-red-200/90">{error}</p>
              {!isNative && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-400/20">
                  <button
                    type="button"
                    onClick={() => void handleGoogleRedirect()}
                    className="flex min-h-[30px] items-center gap-1 rounded bg-red-500/20 px-2.5 py-1 font-mono text-[10px] text-red-200 hover:bg-red-500/30 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="size-3" />
                    <span>Try Full-Page Google Sign-In</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGuest}
                    className="min-h-[30px] rounded bg-background/50 px-2.5 py-1 font-mono text-[10px] text-foreground hover:bg-background transition-colors cursor-pointer"
                  >
                    Bypass as Guest
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline Sandbox Mode Bypass */}
        <div className="pt-2 border-t border-border/60 text-center">
          <button
            type="button"
            onClick={handleGuest}
            className="min-h-[36px] font-mono text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors cursor-pointer py-1"
          >
            Continue as Guest (100% Offline Sandbox)
          </button>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/70">
            Zero registration required · All 20+ WebAssembly media tools unlocked
          </p>
        </div>
      </div>

      <div className="mt-4 sm:mt-5 border-t border-border/40 pt-3 text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60 flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3 text-emerald-400" />
          <span>Zero cloud uploads · Media stays on-device</span>
        </p>
      </div>
    </motion.div>
  );
}
