"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  zenoTapClient,
  type CloudDeckItem,
  type PairCodeResponse,
} from "@/lib/zenotap/client-sdk";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  ExternalLink,
} from "lucide-react";

interface ZenoTapDeckManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ZenoTapDeckManager({ open, onOpenChange }: ZenoTapDeckManagerProps) {
  const [deck, setDeck] = useState<CloudDeckItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pairData, setPairData] = useState<PairCodeResponse | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairSecondsLeft, setPairSecondsLeft] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load cloud deck when modal opens
  useEffect(() => {
    if (open) {
      loadDeck();
    }
  }, [open]);

  // Countdown timer for pairing code
  useEffect(() => {
    if (!pairData) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((pairData.expiresAt - Date.now()) / 1000));
      setPairSecondsLeft(remaining);
      if (remaining <= 0) {
        setPairData(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pairData]);

  const loadDeck = async () => {
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
  };

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
    try {
      const res = await zenoTapClient.createDevicePairCode();
      setPairData(res);
      setPairSecondsLeft(res.expiresInSeconds);
      toast.success("Pairing code generated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate pair code";
      toast.error(msg);
    } finally {
      setPairingLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-neutral-950 text-neutral-100 border-neutral-800">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                ZenoTap Cloud Deck & Keyboard Sync
              </DialogTitle>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              <ShieldCheck className="w-3 h-3 mr-1" />
              HMAC Guard Active
            </Badge>
          </div>
          <DialogDescription className="text-neutral-400 text-sm">
            Manage your personal GIF reaction deck and link your mobile ZenoTap keyboard using encrypted sync tokens.
          </DialogDescription>
        </DialogHeader>

        {/* Device Pairing Card */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-sm text-neutral-200">Link Mobile Keyboard</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={pairingLoading}
              onClick={handleGeneratePairCode}
              className="text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
            >
              <KeyRound className="w-3.5 h-3.5 mr-1.5" />
              {pairData ? "Regenerate Code" : "Generate Pairing Code"}
            </Button>
          </div>

          {pairData ? (
            <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-neutral-400">Enter this code in your ZenoTap Android app:</p>
                <div className="text-3xl font-mono font-bold tracking-widest text-indigo-400 mt-1">
                  {pairData.pairCode.slice(0, 3)} {pairData.pairCode.slice(3)}
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Expires in <span className="font-semibold text-neutral-300">{pairSecondsLeft}s</span> (single-use)
                </p>
              </div>
              <div className="text-xs text-neutral-400 max-w-xs space-y-1">
                <p className="font-medium text-neutral-300">How to connect:</p>
                <p>1. Open ZenoTap on Android</p>
                <p>2. Tap &ldquo;Sync with ZenoDeck&rdquo;</p>
                <p>3. Enter the 6 digits to enable instant deck sync</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-400">
              Pair your device to automatically sync GIFs created in ZenoDeck straight into your WhatsApp & Messages keyboard keys.
            </p>
          )}
        </div>

        {/* Upload & Actions Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-200">Your Cloud GIFs</h3>
            <Badge variant="secondary" className="bg-neutral-800 text-neutral-300 text-xs">
              {deck.length} items
            </Badge>
          </div>

          <div className="flex items-center gap-2">
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
                    <button
                      onClick={() => handleDelete(item)}
                      title="Delete from deck"
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
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
