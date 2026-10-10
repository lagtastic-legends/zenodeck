"use client";

/**
 * PermissionGate — Android runtime permission manager & rationale dialog.
 *
 * Authored under Ponytail, GSD, Ralph Loop, and CodeRabbit guardrails:
 * - NO invasive auto-popups on app launch (follows Google Play best practices).
 * - Permissions are requested in-context when features are used.
 * - This dialog acts as a transparent permission overview & resolution center
 *   with real-time OS state synchronization and direct "Open Settings" support.
 */

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Camera, Mic, Bell, HardDrive, Shield, X, Settings2, Image, Music } from "lucide-react";
import { useNavStore } from "@/lib/navigation/nav-store";
import { useHaptics } from "@/hooks/use-haptics";
import {
  checkAppPermissions,
  requestAllAppPermissions,
  ensureCameraPermission,
  ensureMicrophonePermission,
  ensureNotificationPermission,
  ensureStoragePermission,
  ensurePhotosPermission,
  ensureAudioPermission,
  openAppSettings,
  type PermissionStatusState,
} from "@/lib/permissions";

interface PermissionCategory {
  id: "camera" | "microphone" | "notifications" | "storage" | "photos" | "audio";
  icon: React.ReactNode;
  title: string;
  description: string;
  status: PermissionStatusState;
}

export function PermissionGate() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const haptics = useHaptics();

  const [categories, setCategories] = useState<PermissionCategory[]>([
    {
      id: "photos",
      icon: <Image className="size-4.5 text-pink-400" />,
      title: "Photos & Videos",
      description: "Pick and import photos and videos for editing, conversion, and compression",
      status: "prompt",
    },
    {
      id: "audio",
      icon: <Music className="size-4.5 text-indigo-400" />,
      title: "Music & Audios",
      description: "Pick and import songs and audio tracks for audio extraction and trimming",
      status: "prompt",
    },
    {
      id: "camera",
      icon: <Camera className="size-4.5 text-violet-400" />,
      title: "Camera Access",
      description: "Scan QR codes, capture PDF pages, and record studio webcam",
      status: "prompt",
    },
    {
      id: "microphone",
      icon: <Mic className="size-4.5 text-cyan-400" />,
      title: "Microphone",
      description: "Record voice, instruments, and live audio in Studio Recorder",
      status: "prompt",
    },
    {
      id: "notifications",
      icon: <Bell className="size-4.5 text-amber-400" />,
      title: "Background Alerts",
      description: "Notify you when video exports and batch rendering finish",
      status: "prompt",
    },
    {
      id: "storage",
      icon: <HardDrive className="size-4.5 text-emerald-400" />,
      title: "Private Local Storage",
      description: "100% on-device sandbox storage for generated files (zero cloud tracking)",
      status: "prompt",
    },
  ]);

  const refreshPermissions = useCallback(async () => {
    try {
      const live = await checkAppPermissions();
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          status: live[c.id],
        }))
      );
    } catch (err) {
      console.warn("Failed to check app permissions:", err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Expose global show trigger & event listener
  useEffect(() => {
    if (typeof window === "undefined") return;

    const showModal = () => {
      void refreshPermissions();
      setVisible(true);
    };

    (window as any).__omni_show_permissions = showModal;
    window.addEventListener("omni:show-permissions", showModal);

    return () => {
      window.removeEventListener("omni:show-permissions", showModal);
    };
  }, [refreshPermissions]);

  // Back button and Escape key close dialog if open
  useEffect(() => {
    if (!visible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const unregister = useNavStore.getState().registerOverlay("permission-gate", () => {
      dismiss();
      return true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      unregister();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  const requestSingle = async (id: PermissionCategory["id"]) => {
    void haptics.light();
    setRequesting(true);
    try {
      if (id === "camera") await ensureCameraPermission();
      else if (id === "microphone") await ensureMicrophonePermission();
      else if (id === "notifications") await ensureNotificationPermission();
      else if (id === "storage") await ensureStoragePermission();
      else if (id === "photos") await ensurePhotosPermission();
      else if (id === "audio") await ensureAudioPermission();
    } catch (err) {
      console.warn(`Failed requesting ${id} permission:`, err);
    } finally {
      await refreshPermissions();
      setRequesting(false);
    }
  };

  const requestAll = async () => {
    void haptics.medium();
    setRequesting(true);

    try {
      await requestAllAppPermissions();
    } catch (err) {
      console.warn("Error during batch permission request:", err);
    } finally {
      await refreshPermissions();
      setRequesting(false);
    }
  };

  const dismiss = () => {
    void haptics.light();
    setVisible(false);
  };

  const hasDenied = categories.some((c) => c.status === "denied");
  const allGranted = categories.every((c) => c.status === "granted");

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-permissions-title"
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 pointer-events-auto select-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismiss}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 360 }}
            className="relative w-full max-w-sm rounded-2xl border border-border/80 bg-card text-card-foreground p-5 sm:p-6 shadow-2xl focus:outline-none"
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 rounded-full p-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              aria-label="Close permissions dialog"
            >
              <X className="size-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20">
                <Shield className="size-5 text-primary" />
              </div>
              <div>
                <h2 id="app-permissions-title" className="font-display text-sm font-bold tracking-wide">
                  Device Access & Permissions
                </h2>
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.14em]">
                  100% On-Device Sandbox · Zero Cloud Telemetry
                </p>
              </div>
            </div>

            {/* Permission categories */}
            <div className="space-y-2.5 mb-5 max-h-[50vh] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-start gap-3 rounded-xl border p-2.5 transition-colors ${
                    cat.status === "granted"
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : cat.status === "denied"
                        ? "border-red-500/40 bg-red-500/10"
                        : "border-border/60 bg-card/40"
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{cat.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-[11px] font-bold tracking-wide">
                        {cat.title}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {cat.status !== "granted" && (
                          <button
                            type="button"
                            onClick={() => void requestSingle(cat.id)}
                            disabled={requesting}
                            className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Grant
                          </button>
                        )}
                        <span
                          className={`font-mono text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded ${
                            cat.status === "granted"
                              ? "text-emerald-400 bg-emerald-500/20"
                              : cat.status === "denied"
                                ? "text-red-400 bg-red-500/20"
                                : "text-muted-foreground bg-muted/40"
                          }`}
                        >
                          {cat.status === "granted"
                            ? "Active"
                            : cat.status === "denied"
                              ? "Denied"
                              : "Available"}
                        </span>
                      </div>
                    </div>
                    <p className="font-mono text-[10px] leading-relaxed text-muted-foreground mt-0.5">
                      {cat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Denied Warning Rationale & Open Settings */}
            {hasDenied && Capacitor.isNativePlatform() && (
              <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5 flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] leading-relaxed text-amber-200">
                  Certain permissions were denied by system settings. Open Settings to enable them.
                </p>
                <button
                  type="button"
                  onClick={() => void openAppSettings()}
                  className="shrink-0 flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-500/20 px-2 py-1 font-mono text-[9px] uppercase font-bold text-amber-200 hover:bg-amber-500/30 cursor-pointer"
                >
                  <Settings2 className="size-3" />
                  Settings
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={dismiss}
                className="flex-1 rounded-xl border border-border/60 bg-card/60 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted/40 cursor-pointer"
              >
                Close
              </button>
              {!allGranted && (
                <motion.button
                  onClick={() => void requestAll()}
                  disabled={requesting}
                  whileHover={requesting ? undefined : { scale: 1.02 }}
                  whileTap={requesting ? undefined : { scale: 0.97 }}
                  className="flex-[2] rounded-xl border border-primary/50 bg-gradient-to-r from-primary/90 to-plasma/80 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-opacity disabled:opacity-60 glow-box-violet cursor-pointer"
                >
                  {requesting ? "Requesting…" : "Grant Permissions"}
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
