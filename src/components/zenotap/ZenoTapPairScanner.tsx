"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Capacitor } from "@capacitor/core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, CameraOff, Sparkles, X, ShieldAlert } from "lucide-react";
import { ensureCameraPermission, openAppSettings } from "@/lib/permissions";
import { extractPairCode } from "@/lib/zenotap/client-sdk";

export interface ZenoTapPairScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (code: string) => void;
}

export function ZenoTapPairScanner({
  open,
  onOpenChange,
  onScanSuccess,
}: ZenoTapPairScannerProps) {
  const [cameraState, setCameraState] = useState<
    "idle" | "starting" | "live" | "denied" | "error"
  >("idle");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const viewfinderId = "zenotap-qr-scanner-viewfinder";
  const hasHandledSuccess = useRef(false);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        /* ignore if already stopped */
      }
      try {
        scanner.clear();
      } catch {
        /* ignore if element unmounted */
      }
    }
    scannerRef.current = null;
    setCameraState("idle");
  }, []);

  const handleDecoded = useCallback(
    async (decodedText: string) => {
      if (hasHandledSuccess.current) return;

      const code = extractPairCode(decodedText);
      if (!code) {
        toast.error("Scanned QR is not a valid ZenoTap pairing code");
        return;
      }

      hasHandledSuccess.current = true;
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }

      toast.success(`Pair code detected: ${code}`);
      await stopCamera();
      onScanSuccess(code);
      onOpenChange(false);
    },
    [onScanSuccess, onOpenChange, stopCamera]
  );

  const startCamera = useCallback(async () => {
    hasHandledSuccess.current = false;
    setCameraState("starting");

    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        setCameraState("denied");
        return;
      }

      await stopCamera();
      const scanner = new Html5Qrcode(viewfinderId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          void handleDecoded(decodedText);
        },
        () => {
          /* frame decode miss, keep scanning */
        }
      );

      setCameraState("live");
    } catch (err) {
      console.error("Camera scanner startup failed:", err);
      await stopCamera();
      setCameraState(err instanceof Error && err.name === "NotAllowedError" ? "denied" : "error");
    }
  }, [handleDecoded, stopCamera]);

  useEffect(() => {
    if (open) {
      // Small delay to ensure the modal DOM element is mounted
      const timer = setTimeout(() => {
        void startCamera();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      void stopCamera();
    }
  }, [open, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border border-border/80 shadow-2xl p-6">
        <DialogHeader className="text-left space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Scan ZenoTap QR Code</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Point your phone camera at the QR code displayed on your desktop ZenoDeck.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative my-2 w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden border-2 border-border/60 bg-black/60 shadow-inner flex items-center justify-center">
          {/* html5-qrcode mounts inside this container */}
          <div id={viewfinderId} className="w-full h-full" />

          {/* Laser scanning beam overlay when live */}
          {cameraState === "live" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
              <div className="w-full h-full border-2 border-dashed border-primary/40 rounded-xl" />
            </div>
          )}

          {/* Loading state */}
          {cameraState === "starting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white gap-2 p-4 text-center">
              <Sparkles className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-medium">Opening camera viewfinder...</span>
            </div>
          )}

          {/* Permission denied state */}
          {cameraState === "denied" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 text-foreground gap-3 p-4 text-center">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
              <p className="text-xs font-semibold">Camera Access Blocked</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Please allow camera access in your browser or device settings to scan pairing QR codes.
              </p>
              {Capacitor.isNativePlatform() && (
                <Button size="sm" variant="outline" className="text-xs" onClick={() => void openAppSettings()}>
                  Open App Settings
                </Button>
              )}
            </div>
          )}

          {/* General error state */}
          {cameraState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 text-foreground gap-2 p-4 text-center">
              <CameraOff className="w-8 h-8 text-destructive" />
              <p className="text-xs font-semibold">Camera Unavailable</p>
              <p className="text-[11px] text-muted-foreground">
                Could not start camera. You can still pair using the 6-digit code.
              </p>
              <Button size="sm" variant="secondary" className="text-xs mt-1" onClick={() => void startCamera()}>
                Try Again
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Enter PIN Manually
          </Button>

          {cameraState === "live" && (
            <span className="text-[11px] text-primary flex items-center gap-1 font-mono">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping inline-block" />
              Scanning...
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
