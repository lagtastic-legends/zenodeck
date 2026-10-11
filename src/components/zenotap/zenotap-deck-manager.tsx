"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
  zenoTapClient,
  getStoredSyncToken,
  type CloudDeckItem,
  type PairCodeResponse,
} from "@/lib/zenotap/client-sdk";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  UploadCloud,
  Trash2,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  Film,
  KeyRound,
  CloudDownload,
  Link as LinkIcon,
  Copy,
  Check,
  QrCode,
} from "lucide-react";
import QRCode from "qrcode";
import { PinCodeInput } from "./PinCodeInput";

interface ZenoTapDeckManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ZenoTapDeckManager({ open, onOpenChange }: ZenoTapDeckManagerProps) {
  const [deck, setDeck] = useState<CloudDeckItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pairData, setPairData] = useState<PairCodeResponse | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairSecondsLeft, setPairSecondsLeft] = useState(0);
  const [showEnterCode, setShowEnterCode] = useState(false);
  const [enterCodeInput, setEnterCodeInput] = useState("");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [pairedDeviceSuccess, setPairedDeviceSuccess] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const items = await zenoTapClient.fetchCloudDeck();
      setDeck(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load cloud deck";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load cloud deck when modal opens
  useEffect(() => {
    if (open) {
      void loadDeck();
    }
  }, [open, loadDeck]);

  // Countdown timer, QR generation, & auto-polling for pairing confirmation
  useEffect(() => {
    if (!pairData) {
      setQrCodeDataUrl(null);
      return;
    }

    // 1. Generate QR Code containing deep link
    const origin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "https://omni-tool-two.vercel.app";
    const magicUrl = `${origin}/?pair=${pairData.pairCode}`;

    void QRCode.toDataURL(magicUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => setQrCodeDataUrl(dataUrl))
      .catch((err) => console.error("QR Code generation error:", err));

    // 2. Countdown timer
    const countdownInterval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((pairData.expiresAt - Date.now()) / 1000));
      setPairSecondsLeft(remaining);
      if (remaining <= 0) {
        setPairData(null);
      }
    }, 1000);

    // 3. Real-time auto-polling for mobile confirmation
    const targetId = pairData.linkId || pairData.pairCode;
    const pollInterval = setInterval(async () => {
      try {
        const status = await zenoTapClient.checkPairCodeStatus(targetId);
        if (status.confirmed) {
          clearInterval(pollInterval);
          clearInterval(countdownInterval);
          setPairData(null);
          setPairedDeviceSuccess(status.deviceName || "Mobile Keyboard");
          toast.success(`🎉 Linked to ${status.deviceName || "device"}!`);
        }
      } catch {
        /* poll silently */
      }
    }, 2000);

    return () => {
      clearInterval(countdownInterval);
      clearInterval(pollInterval);
    };
  }, [pairData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".gif") && file.type !== "image/gif") {
      toast.error("Only animated GIF files are supported.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("GIF must be under 10MB in size.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Securing upload ticket & validating GIF...");

    try {
      const item = await zenoTapClient.uploadGifToDeck(file, file.name);
      toast.success("GIF added to ZenoTap deck!", { id: toastId });
      setDeck((prev) => [item, ...prev]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg, { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (item: CloudDeckItem) => {
    try {
      const ok = await zenoTapClient.deleteCloudGif(item.id);
      if (ok) {
        setDeck((prev) => prev.filter((d) => d.id !== item.id));
        toast.success("GIF removed from deck");
      }
    } catch {
      toast.error("Failed to delete GIF");
    }
  };

  const handleGeneratePairCode = async () => {
    setPairingLoading(true);
    setPairedDeviceSuccess(null);
    try {
      const res = await zenoTapClient.createDevicePairCode();
      setPairData(res);
      setPairSecondsLeft(res.expiresInSeconds);
      setShowEnterCode(false);
      toast.success("Pairing code & QR generated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate pair code";
      toast.error(msg);
    } finally {
      setPairingLoading(false);
    }
  };

  const handleConfirmPairCode = async (codeOverride?: string) => {
    const code = (codeOverride || enterCodeInput).replace(/\s+/g, "").trim();
    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setPairingLoading(true);
    const toastId = toast.loading("Linking device...");
    try {
      const res = await zenoTapClient.confirmPairCode(code);
      toast.success(res.message || "Device linked successfully!", { id: toastId });
      setShowEnterCode(false);
      setEnterCodeInput("");
      setPairedDeviceSuccess(res.deviceName || "Connected Keyboard");
      void handleSyncToLocal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Pairing failed";
      toast.error(msg, { id: toastId });
    } finally {
      setPairingLoading(false);
    }
  };

  const handleSyncToLocal = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Syncing GIFs into keyboard deck...");
    try {
      const res = await zenoTapClient.syncCloudDeckToLocal();
      if (res.errors > 0) {
        toast.warning(
          `Sync completed: ${res.downloaded} new, ${res.skipped} up to date (${res.errors} errors)`,
          { id: toastId }
        );
      } else if (res.downloaded > 0) {
        toast.success(`Downloaded ${res.downloaded} GIF(s) to keyboard storage!`, { id: toastId });
      } else {
        toast.success(`Keyboard storage is up to date (${res.total} items).`, { id: toastId });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      toast.error(msg, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground font-display">
                ZenoTap Cloud Deck & Keyboard Sync
              </DialogTitle>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono text-[10px]">
              <ShieldCheck className="w-3 h-3 mr-1" />
              HMAC Guard Active
            </Badge>
          </div>
          <DialogDescription className="text-muted-foreground text-xs sm:text-sm">
            Manage your personal GIF reaction deck and link your mobile ZenoTap keyboard using encrypted sync tokens.
          </DialogDescription>
        </DialogHeader>

        {/* Device Pairing Card */}
        <div className="p-4 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-sm text-foreground">Link Mobile Keyboard</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowEnterCode(!showEnterCode);
                  setPairData(null);
                  setPairedDeviceSuccess(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <LinkIcon className="w-3.5 h-3.5 mr-1" />
                {showEnterCode ? "Show QR Generator" : "Enter Code"}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={pairingLoading}
                onClick={handleGeneratePairCode}
                className="text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
              >
                <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                {pairData ? "Regenerate QR & Code" : "Generate Pairing Code & QR"}
              </Button>
            </div>
          </div>

          {/* Success Banner */}
          {pairedDeviceSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400">Successfully Linked!</p>
                  <p className="text-xs text-muted-foreground">Connected to {pairedDeviceSuccess}. Ready to sync.</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPairedDeviceSuccess(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </Button>
            </div>
          )}

          {showEnterCode ? (
            <div className="p-4 rounded-xl bg-background/60 border border-border/70 space-y-3">
              <p className="text-xs text-muted-foreground font-medium">Enter 6-digit code shown on another device:</p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <PinCodeInput
                  value={enterCodeInput}
                  onChange={setEnterCodeInput}
                  onComplete={(code) => void handleConfirmPairCode(code)}
                  disabled={pairingLoading}
                  autoFocus
                />
                <Button
                  onClick={() => void handleConfirmPairCode(enterCodeInput)}
                  disabled={pairingLoading || enterCodeInput.length !== 6}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold h-11 px-5"
                >
                  Connect Device
                </Button>
              </div>
            </div>
          ) : pairData ? (
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex flex-col md:flex-row items-center gap-5">
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-background/80 border border-border/70 text-center shrink-0">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="ZenoTap Pairing QR Code"
                    className="w-36 h-36 rounded-lg bg-white p-1.5 shadow-sm"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-lg bg-muted flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-muted-foreground animate-pulse" />
                  </div>
                )}
                <p className="text-[11px] font-medium text-muted-foreground mt-2 flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-indigo-400" />
                  Point phone camera to pair
                </p>
              </div>

              {/* Code Details & Polling */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Or enter manual 6-digit code:</p>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-indigo-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Listening for scan...
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-3xl font-mono font-bold tracking-widest text-indigo-400 bg-background/60 px-4 py-1.5 rounded-lg border border-indigo-500/30">
                    {pairData.pairCode.slice(0, 3)} {pairData.pairCode.slice(3)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-10 text-xs border-indigo-500/30 hover:bg-indigo-500/10"
                    onClick={() => {
                      void navigator.clipboard.writeText(pairData.pairCode);
                      setCopiedCode(true);
                      toast.success("Pairing code copied!");
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedCode ? "Copied" : "Copy Code"}
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    Expires in <span className="font-semibold text-foreground">{pairSecondsLeft}s</span> (single-use)
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      const origin = typeof window !== "undefined" ? window.location.origin : "https://omni-tool-two.vercel.app";
                      void navigator.clipboard.writeText(`${origin}/?pair=${pairData.pairCode}`);
                      setCopiedLink(true);
                      toast.success("Magic pairing link copied!");
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400 mr-1" /> : <LinkIcon className="w-3 h-3 mr-1" />}
                    {copiedLink ? "Link Copied" : "Copy Magic Link"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Pair your device to automatically sync GIFs created in ZenoDeck straight into your WhatsApp & Messages keyboard keys.
            </p>
          )}
        </div>

        {/* Upload & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-200">Your Cloud GIFs</h3>
            <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 text-xs">
              {deck.length} items
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncToLocal}
              disabled={isSyncing}
              className="text-xs border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10"
            >
              <CloudDownload className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? "animate-bounce" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync to Keyboard"}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={loadDeck}
              disabled={loading}
              className="text-neutral-400 hover:text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/gif"
              className="hidden"
            />

            <Button
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
              {uploading ? "Securing & Uploading..." : "Upload GIF to Deck"}
            </Button>
          </div>
        </div>

        {/* GIF Grid */}
        {deck.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
            <Film className="w-10 h-10 text-neutral-600 mb-2" />
            <p className="text-sm font-medium text-neutral-300">No GIFs in your cloud deck yet</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              Upload animated GIFs or generate them using ZenoDeck Studio tools. They will sync automatically to your mobile keyboard.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 border-neutral-700 text-xs text-neutral-300"
            >
              Choose GIF File
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-1">
            {deck.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-lg border border-neutral-800 bg-neutral-900 overflow-hidden hover:border-neutral-700 transition"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-neutral-950 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.originalName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                {/* Footer Metadata */}
                <div className="p-2 flex items-center justify-between bg-neutral-900/90 text-[11px] text-neutral-400">
                  <span className="truncate max-w-[100px]" title={item.originalName}>
                    {item.originalName}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          title="Delete from deck"
                          aria-label={`Delete ${item.originalName} from cloud deck`}
                          className="p-1 text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove GIF from Cloud Deck?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &ldquo;{item.originalName}&rdquo; from your personal cloud storage?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => void handleDelete(item)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete GIF
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
