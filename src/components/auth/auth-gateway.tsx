"use client";

/**
 * AUTH GATEWAY — Identity & Account Management Surface.
 *
 * Configured:
 *  - Active Google profile card & sign-out
 *  - Return to Dashboard CTA
 *  - Multi-Account switcher: switch between accounts or add new Gmail accounts
 *  - Privacy & client-side WASM guarantees
 *  - Responsive across all phone form factors (slabs, flips, foldables, tablets)
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Fingerprint,
  LayoutDashboard,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Sparkles,
  Download,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { UserAvatar } from "@/components/auth/user-avatar";
import { useNavStore } from "@/lib/navigation/nav-store";
import { UnifiedLoginCard } from "@/components/auth/unified-login-card";
import { useUpdateStore } from "@/lib/update-store";
import { UpdateModal } from "@/components/dialogs/update-modal";
import { APP_VERSION } from "@/config/version";

export function AuthGateway() {
  const {
    mode,
    user,
    savedAccounts,
    busy,
    isNative,
    signInWithGoogleEmail,
    switchAccount,
    removeSavedAccount,
    signOut,
  } = useAuth();

  const navigate = useNavStore((s) => s.navigate);

  const {
    autoUpdateEnabled,
    toggleAutoUpdate,
    updateInfo,
    isChecking: isCheckingUpdate,
    checkUpdates,
    removeUpdate,
  } = useUpdateStore();

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const configured = mode === "configured";

  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setEmailError("Please enter a valid email address (e.g. name@gmail.com).");
      return;
    }
    signInWithGoogleEmail(cleanEmail, newName.trim() || undefined);
    setNewEmail("");
    setNewName("");
    setShowAddAccount(false);
  };

  const otherAccounts = savedAccounts.filter(
    (a) => a.uid !== user?.uid && a.email?.toLowerCase() !== user?.email?.toLowerCase()
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 max-w-5xl mx-auto">
      {/* ------------------------------------------------------ Session / Identity Column */}
      <div className="space-y-4 sm:space-y-5">
        {mode === "probing" ? (
          <div className="panel-hud flex items-center justify-center py-16 gap-2.5 font-mono text-xs text-muted-foreground rounded-2xl border border-border/80 bg-card/90">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span>Verifying identity session…</span>
          </div>
        ) : !user ? (
          /* Render Unified Login Card when not signed in */
          <UnifiedLoginCard />
        ) : (
          /* Authenticated Identity Center */
          <div className="panel-hud scanlines space-y-4 sm:space-y-5 rounded-2xl p-4 sm:p-6 border border-border/80 bg-card/90">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 glow-box-violet">
                  <Fingerprint className="size-5 sm:size-6 text-primary" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="font-display text-base sm:text-lg font-bold tracking-wide text-foreground">
                    Identity Center
                  </h2>
                  <p
                    className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
                    suppressHydrationWarning
                  >
                    {isNative ? "Native Android" : "Google Authentication"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("dashboard")}
                className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 font-display text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer shrink-0"
              >
                <LayoutDashboard className="size-3.5" />
                <span className="hidden xs:inline">Dashboard</span>
              </button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Active Profile Card */}
              <div className="flex items-center gap-3.5 rounded-xl border border-border/70 bg-background/50 p-4 shadow-sm">
                <UserAvatar user={user} size="lg" showGoogleBadge={true} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm sm:text-base font-bold text-foreground">
                    {user.displayName ?? "Google User"}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {user.email ?? "No Email"}
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
                    <ShieldCheck className="size-3" />
                    <span>{user.isGuest ? "Guest Sandbox" : `Active · ${user.providerId}`}</span>
                  </p>
                </div>
              </div>

              {/* Other Saved Accounts on this Device */}
              {otherAccounts.length > 0 && (
                <div className="space-y-2 rounded-xl border border-border/60 bg-background/30 p-3">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-1">
                    <span>Switch Account</span>
                    <span className="rounded-full bg-secondary/80 px-1.5 py-0.2 text-[9px] font-bold text-foreground">
                      {otherAccounts.length} saved
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto overscroll-contain pr-0.5 scrollbar-thin">
                    {otherAccounts.map((acc) => (
                      <div
                        key={acc.uid}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card/60 hover:bg-card border border-border/40 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => switchAccount(acc)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <UserAvatar user={acc} size="sm" showGoogleBadge={true} />
                          <div className="min-w-0">
                            <p className="truncate font-display text-xs font-semibold text-foreground">
                              {acc.displayName || "Google Account"}
                            </p>
                            <p className="truncate font-mono text-[10px] text-muted-foreground">
                              {acc.email}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => switchAccount(acc)}
                            className="flex min-h-[32px] items-center gap-1 px-2.5 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground font-mono text-[10px] font-bold transition-all cursor-pointer"
                          >
                            <span>Switch</span>
                            <ArrowRight className="size-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSavedAccount(acc.uid)}
                            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Remove account from device"
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

              {/* Add / Connect Another Account */}
              <div className="w-full">
                {!showAddAccount ? (
                  <button
                    type="button"
                    onClick={() => setShowAddAccount(true)}
                    className="flex min-h-[44px] items-center justify-center gap-2 w-full rounded-xl border border-dashed border-border/80 bg-background/30 px-4 py-2.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <Plus className="size-3.5 text-primary" />
                    <span>Connect Another Google Account</span>
                  </button>
                ) : (
                  <form
                    onSubmit={handleAddAccountSubmit}
                    className="space-y-2.5 rounded-xl border border-primary/40 bg-card p-3.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-semibold text-foreground">
                      <span>Add Google Account</span>
                      <button
                        type="button"
                        onClick={() => setShowAddAccount(false)}
                        className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer p-1"
                      >
                        Cancel
                      </button>
                    </div>

                    <input
                      type="email"
                      required
                      inputMode="email"
                      autoComplete="email"
                      spellCheck={false}
                      placeholder="Gmail address (e.g. name@gmail.com)"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-border/70 bg-background px-3 py-2 font-mono text-base sm:text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
                    />

                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Display Name (optional)"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-border/70 bg-background px-3 py-2 font-sans text-base sm:text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden"
                    />

                    {emailError && (
                      <p className="text-[11px] font-mono text-red-400" role="alert">
                        {emailError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110 transition-all cursor-pointer"
                    >
                      <Plus className="size-3" />
                      <span>Connect Account</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Action Buttons: Return to Dashboard & Sign Out */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => navigate("dashboard")}
                  className="flex-1 flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-tactile hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <LayoutDashboard className="size-4" />
                  <span>Open Toolkit Dashboard</span>
                </button>

                <button
                  onClick={() => void signOut()}
                  disabled={busy}
                  type="button"
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border/70 bg-background/50 px-4 font-mono text-xs text-muted-foreground hover:border-red-400/40 hover:text-red-300 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <LogOut className="size-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Security Posture Panel */}
        <div className="panel-hud space-y-3 rounded-xl p-4 border border-border/70 bg-card/60">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-neon/90">
            Security & Cryptographic Boundary
          </p>
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Firebase Auth</span>
              <span className={configured ? "text-emerald-400 font-semibold" : "text-amber-300"}>
                {configured ? "Active (omni-tool-7ba2d)" : "Offline Mode"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Accounts on Device</span>
              <span className="text-primary font-semibold">{savedAccounts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Media Processing</span>
              <span className="text-emerald-400">100% On-Device WebAssembly</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Local Vault Storage</span>
              <span className="text-emerald-400">IndexedDB · AES-GCM (Zero Egress)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------ System Infrastructure Column */}
      <div className="space-y-4 sm:space-y-5">
        {/* ------------------------------------------------------ Auto-Update Control Section */}
        <div className="panel-hud scanlines space-y-4 rounded-2xl p-4 sm:p-5 border border-border/80 bg-card/90">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10">
                <RefreshCw
                  className={`size-5 text-primary ${autoUpdateEnabled ? "animate-spin" : ""}`}
                  style={{ animationDuration: "8s" }}
                />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold tracking-wide text-foreground">
                  OTA Firmware & Updates
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Over-The-Air Distribution
                </p>
              </div>
            </div>

            {/* ON / OFF Toggle Switch */}
            <button
              type="button"
              onClick={toggleAutoUpdate}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                autoUpdateEnabled
                  ? "border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.2)]"
                  : "border border-border/80 bg-secondary/50 text-muted-foreground"
              }`}
              title={
                autoUpdateEnabled
                  ? "Auto-Update is ON. Click to disable."
                  : "Auto-Update is OFF. Click to enable."
              }
            >
              <span
                className={`size-2 rounded-full ${
                  autoUpdateEnabled ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
                }`}
              />
              <span>{autoUpdateEnabled ? "ON" : "OFF"}</span>
            </button>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/40 p-3.5 space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between py-0.5 border-b border-border/50">
              <span className="text-muted-foreground">Installed Version</span>
              <span className="text-foreground font-semibold">v{APP_VERSION}</span>
            </div>
            <div className="flex items-center justify-between py-0.5 border-b border-border/50">
              <span className="text-muted-foreground">Update Engine</span>
              <span className={autoUpdateEnabled ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                {autoUpdateEnabled ? "Active (Background OTA)" : "Manual Check Only"}
              </span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-muted-foreground">Channel</span>
              <span className="text-foreground">Official GitHub Production</span>
            </div>
          </div>

          {/* Pending update banner or Check for updates button */}
          {updateInfo?.updateAvailable ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  New Release v{updateInfo.latestVersion} Ready
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {updateInfo.apkSize ? `${(updateInfo.apkSize / (1024 * 1024)).toFixed(1)} MB` : "APK"}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="flex-1 flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-primary py-2 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground hover:brightness-110 active:scale-98 transition-all cursor-pointer shadow-md"
                >
                  <Download className="size-3.5" />
                  <span>View & Install Update</span>
                </button>
                <button
                  type="button"
                  onClick={removeUpdate}
                  className="group flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-border/80 bg-background/80 px-3.5 py-2 font-mono text-xs font-semibold text-muted-foreground hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 active:scale-98 transition-all cursor-pointer"
                  title="Remove and dismiss update notification"
                >
                  <div className="grid size-4 place-items-center rounded-full bg-red-500/15 border border-red-500/30 text-red-400 transition-transform group-hover:scale-110">
                    <Trash2 className="size-2.5" />
                  </div>
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="font-mono text-[11px] text-muted-foreground">
                Keep ZenoDeck updated for security and performance patches.
              </p>
              <button
                type="button"
                onClick={() => void checkUpdates(true)}
                disabled={isCheckingUpdate}
                className="flex items-center gap-1.5 shrink-0 rounded-lg border border-border/80 bg-background/50 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                <span>{isCheckingUpdate ? "Checking…" : "Check Updates"}</span>
              </button>
            </div>
          )}
        </div>

        <div className="panel-hud scanlines space-y-4 sm:space-y-5 rounded-2xl p-4 sm:p-6 border border-border/80 bg-card/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-11 sm:size-12 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 glow-box-violet">
                <ShieldCheck className="size-5 sm:size-6 text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-display text-base sm:text-lg font-bold tracking-wide text-foreground">
                  System Architecture
                </h2>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Client-Side Engineering
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/40 p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Deployment Host</span>
              <span className="text-foreground font-semibold">omni-tool-two.vercel.app</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Native Android App</span>
              <span className="text-foreground">com.omnitool.app (v3.3.0)</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Authentication Protocol</span>
              <span className="text-foreground">OAuth 2.0 / Google Identity</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-muted-foreground">Account Persistence</span>
              <span className="text-foreground">Multi-Account Local Storage</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground">Data Privacy Standard</span>
              <span className="text-emerald-400 font-semibold">Zero-Egress WASM Sandbox</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/30 p-3.5 space-y-2">
            <p className="font-mono text-xs font-bold text-foreground">Why zero cloud uploads?</p>
            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Unlike traditional video converters and document editors that upload your private files
              to remote servers, ZenoDeck compiles FFmpeg and image/PDF manipulation libraries directly
              to WebAssembly running in your browser thread pool.
            </p>
          </div>
        </div>
      </div>

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateInfo={updateInfo}
        onRefresh={() => {
          void checkUpdates(true);
        }}
      />
    </div>
  );
}
