"use client";

/**
 * PermissionGate — Android runtime permission manager & rationale dialog.
 * Powered by ZenoModal with responsive bottom sheet, OS state synchronization,
 * and 1-tap direct permission requests.
 */

import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, Mic, Bell, HardDrive, Shield, Settings2, Image, Music, Trash2, Check } from "lucide-react";
import { ZenoModal } from "@/components/ui/zeno-modal";
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
  const [cachePurged, setCachePurged] = useState(false);
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

  const handlePurgeCache = () => {
    void haptics.medium();
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        setCachePurged(true);
        setTimeout(() => setCachePurged(false), 2500);
      }
    } catch (e) {
      console.warn("Could not purge session cache:", e);
    }
  };

  const dismiss = () => {
    void haptics.light();
    setVisible(false);
  };

  const hasDenied = categories.some((c) => c.status === "denied");
  const allGranted = categories.every((c) => c.status === "granted");

  if (!mounted) {
    return null;
  }

  return (
    <ZenoModal
      isOpen={visible}
      onClose={dismiss}
      overlayId="permission-gate"
      title="Device Access & Permissions"
      subtitle="100% On-Device Sandbox · Zero Cloud Telemetry"
      badge={allGranted ? "ALL ACTIVE" : hasDenied ? "ACTION NEEDED" : "PERMISSION GATE"}
      badgeTone={allGranted ? "emerald" : hasDenied ? "rose" : "violet"}
      size="md"
      footer={
        <div className="flex w-full items-center gap-2.5">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 min-h-11 rounded-xl border border-border/80 bg-card/60 px-4 font-mono text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            Close
          </button>
          {!allGranted && (
            <button
              type="button"
              onClick={() => void requestAll()}
              disabled={requesting}
              className="flex-[2] min-h-11 rounded-xl bg-gradient-to-r from-primary to-plasma px-4 font-display text-xs font-bold uppercase tracking-wider text-white shadow-glow transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {requesting ? "Requesting…" : "Grant All Permissions"}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Permission Categories List */}
        <div className="space-y-2.5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`flex items-start gap-3 rounded-2xl border p-3 transition-colors ${
                cat.status === "granted"
                  ? "border-emerald-500/30 bg-emerald-500/10"
                  : cat.status === "denied"
                    ? "border-rose-500/30 bg-rose-500/10"
                    : "border-border/60 bg-card/40"
              }`}
            >
              <div className="mt-0.5 shrink-0">{cat.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xs font-bold tracking-wide text-foreground">
                    {cat.title}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {cat.status !== "granted" && (
                      <button
                        type="button"
                        onClick={() => void requestSingle(cat.id)}
                        disabled={requesting}
                        className="font-mono text-[9px] uppercase font-bold px-2 py-0.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Grant
                      </button>
                    )}
                    <span
                      className={`font-mono text-[9px] uppercase font-semibold px-2 py-0.5 rounded-lg ${
                        cat.status === "granted"
                          ? "text-emerald-400 bg-emerald-500/20"
                          : cat.status === "denied"
                            ? "text-rose-400 bg-rose-500/20"
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
                <p className="font-mono text-[11px] leading-relaxed text-muted-foreground mt-1">
                  {cat.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Denied Warning Rationale & Open Settings */}
        {hasDenied && (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 flex items-center justify-between gap-2">
            <p className="font-mono text-[11px] leading-relaxed text-amber-200">
              Certain permissions were blocked by system settings. Open device settings to enable them.
            </p>
            {Capacitor.isNativePlatform() && (
              <button
                type="button"
                onClick={() => void openAppSettings()}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/25 px-2.5 py-1.5 font-mono text-[10px] uppercase font-bold text-amber-200 hover:bg-amber-500/40 cursor-pointer"
              >
                <Settings2 className="size-3.5" />
                <span>Settings</span>
              </button>
            )}
          </div>
        )}

        {/* Quick Maintenance / Cache Purge Bar */}
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-secondary/30 px-3.5 py-2.5 text-xs font-mono">
          <div>
            <p className="font-bold text-foreground text-[11px]">Session Cache & Sandboxes</p>
            <p className="text-[10px] text-muted-foreground">Purge temporary chunks and transient render buffers</p>
          </div>
          <button
            type="button"
            onClick={handlePurgeCache}
            className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/80 hover:bg-secondary px-2.5 py-1.5 text-[10px] font-bold text-foreground transition-colors cursor-pointer shrink-0"
          >
            {cachePurged ? <Check className="size-3.5 text-emerald-400" /> : <Trash2 className="size-3.5 text-muted-foreground" />}
            <span>{cachePurged ? "PURGED" : "PURGE CACHE"}</span>
          </button>
        </div>
      </div>
    </ZenoModal>
  );
}
