"use client";

import { motion } from "framer-motion";
import {
  Keyboard,
  Settings,
  RefreshCw,
  Trash2,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cloud,
  CloudDownload,
  Link as LinkIcon,
  Unlink,
  Camera,
  ClipboardPaste,
  Sparkles,
  Check,
  Zap,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
  getKeyboardDeckGifs,
  deleteGifFromKeyboardDeck,
  saveGifToKeyboardDeck,
  getKeyboardStatus,
  openKeyboardSettings,
  openKeyboardPicker,
  type DeckGifItem,
  type KeyboardStatus,
} from "@/lib/zenodeck-bridge";
import {
  zenoTapClient,
  getStoredSyncToken,
  getStoredDeviceName,
  clearStoredSyncToken,
  getStoredAutoSync,
  setStoredAutoSync,
  getStoredLastSynced,
  extractPairCode,
} from "@/lib/zenotap/client-sdk";
import { PinCodeInput } from "@/components/zenotap/PinCodeInput";
import { ZenoTapPairScanner } from "@/components/zenotap/ZenoTapPairScanner";
import { formatBytes } from "@/lib/format";
import { useHaptics } from "@/hooks/use-haptics";
import { toast } from "sonner";
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

export function KeyboardDeckManager() {
  const haptics = useHaptics();
  const [gifs, setGifs] = useState<DeckGifItem[]>([]);
  const [status, setStatus] = useState<KeyboardStatus>({ enabled: false, selected: false });
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Cloud Pairing state
  const [syncToken, setSyncToken] = useState<string | null>(null);
  const [pairedDeviceName, setPairedDeviceName] = useState<string | null>(null);
  const [pairCodeInput, setPairCodeInput] = useState("");
  const [isPairing, setIsPairing] = useState(false);
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncedTime, setLastSyncedTime] = useState<number | null>(null);
  const [clipboardCode, setClipboardCode] = useState<string | null>(null);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const [deckItems, imeStatus] = await Promise.all([
        getKeyboardDeckGifs(),
        getKeyboardStatus(),
      ]);
      setGifs(deckItems);
      setStatus(imeStatus);
      setSyncToken(getStoredSyncToken());
      setPairedDeviceName(getStoredDeviceName());
      setAutoSync(getStoredAutoSync());
      setLastSyncedTime(getStoredLastSynced());
    } catch (e) {
      console.error("Failed to load keyboard deck:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkClipboard = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) return;
    if (getStoredSyncToken()) return; // Already paired
    try {
      const text = await navigator.clipboard.readText();
      const code = extractPairCode(text);
      if (code && code.length === 6) {
        setClipboardCode(code);
      }
    } catch {
      // Clipboard read permissions may be restricted; ignore silently
    }
  }, []);

  // Deep-link ?pair= query parameter check
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pairParam = params.get("pair");
    if (pairParam) {
      const extracted = extractPairCode(pairParam);
      if (extracted && !getStoredSyncToken()) {
        setPairCodeInput(extracted);
        setShowPairDialog(true);
        toast.info(`Pair code ${extracted} detected from link!`);
      }
    }
  }, []);

  // Clipboard & background auto-sync check on focus
  useEffect(() => {
    void checkClipboard();
    const handleFocus = () => {
      void checkClipboard();
      if (getStoredSyncToken() && getStoredAutoSync()) {
        void handleSyncCloud();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [checkClipboard]);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  const handleDelete = async (filename: string) => {
    void haptics.impact();
    const success = await deleteGifFromKeyboardDeck(filename);
    if (success) {
      setGifs((prev) => prev.filter((g) => g.filename !== filename));
      toast.success("GIF removed from keyboard");
      void haptics.success();
    } else {
      toast.error("Failed to delete GIF");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    void haptics.impact();
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === "image/gif" || file.name.endsWith(".gif")) {
          await saveGifToKeyboardDeck(file, file.name);
        }
      }
      toast.success(`Added ${files.length} GIF(s) to keyboard deck`);
      void haptics.success();
      await loadDeck();
    } catch (err) {
      console.error("Failed uploading GIFs to keyboard deck:", err);
      toast.error("Failed to add GIF to keyboard");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSyncCloud = async () => {
    setIsSyncing(true);
    void haptics.impact();
    const toastId = toast.loading("Syncing GIFs from ZenoTap Cloud Deck...");
    try {
      const result = await zenoTapClient.syncCloudDeckToLocal();
      setLastSyncedTime(getStoredLastSynced());
      if (result.errors > 0) {
        toast.warning(
          `Sync completed: ${result.downloaded} new, ${result.skipped} up to date (${result.errors} errors)`,
          { id: toastId }
        );
      } else if (result.downloaded > 0) {
        toast.success(`Cloud sync complete! Downloaded ${result.downloaded} new GIF(s).`, {
          id: toastId,
        });
      } else {
        toast.success(`Cloud deck is already up to date (${result.total} items).`, { id: toastId });
      }
      void haptics.success();
      await loadDeck();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync failed";
      toast.error(msg, { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePairWithCode = async (codeToPair: string) => {
    const code = codeToPair.replace(/\s+/g, "").trim();
    if (code.length !== 6) {
      toast.error("Please enter a valid 6-digit pairing code");
      return;
    }

    setIsPairing(true);
    const toastId = toast.loading("Linking device to ZenoTap cloud...");
    try {
      const deviceName = Capacitor.isNativePlatform() ? "Android Keyboard" : "ZenoDeck Companion";
      const res = await zenoTapClient.confirmPairCode(code, deviceName);
      setSyncToken(res.syncToken);
      setPairedDeviceName(res.deviceName);
      setPairCodeInput("");
      setShowPairDialog(false);
      setClipboardCode(null);
      toast.success(res.message || "Device paired successfully!", { id: toastId });
      void haptics.success();

      // Trigger automatic initial sync
      void handleSyncCloud();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pairing failed";
      toast.error(msg, { id: toastId });
    } finally {
      setIsPairing(false);
    }
  };

  const handleToggleAutoSync = () => {
    const nextVal = !autoSync;
    setAutoSync(nextVal);
    setStoredAutoSync(nextVal);
    toast.success(nextVal ? "Auto-sync enabled on app resume" : "Auto-sync paused");
  };

  const formatRelativeTime = (ts: number | null) => {
    if (!ts) return "Never";
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  const handleUnlink = () => {
    clearStoredSyncToken();
    setSyncToken(null);
    setPairedDeviceName(null);
    toast.info("Device unlinked from cloud deck");
    void haptics.impact();
  };

  const resolveImageSrc = (path: string) => {
    if (Capacitor.isNativePlatform()) {
      return Capacitor.convertFileSrc(path);
    }
    return path.startsWith("web://") ? "" : path;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Keyboard className="size-5 text-primary" />
            <h2 className="font-display text-base font-bold tracking-wide text-foreground">
              ZenoDeck Custom Keyboard
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Manage your custom AI media and GIFs for 1-tap injection into messaging apps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => void handleSyncCloud()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <CloudDownload className={`size-3.5 ${isSyncing ? "animate-bounce" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Cloud"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => void loadDeck()}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </motion.button>
        </div>
      </div>

      {/* Smart Clipboard Pair Detection */}
      {clipboardCode && !syncToken && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300"
        >
          <div className="flex items-center gap-2.5">
            <ClipboardPaste className="size-4 text-indigo-400 shrink-0" />
            <span className="text-xs">
              Pair code <strong className="font-mono text-indigo-200">{clipboardCode}</strong> detected in clipboard
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => void handlePairWithCode(clipboardCode)}
              disabled={isPairing}
              className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-colors"
            >
              Connect (1-Tap)
            </button>
            <button
              onClick={() => setClipboardCode(null)}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      )}

      {/* Cloud Sync & Device Pairing Card */}
      <div className="rounded-2xl border border-border/50 bg-card/40 p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="size-4 text-primary" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Cloud Deck Synchronization
            </span>
          </div>

          {syncToken ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="size-3" />
                Linked: {pairedDeviceName || "Android Keyboard"}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="size-7 grid place-items-center rounded-lg border border-border/70 bg-card text-muted-foreground hover:border-destructive/40 hover:text-destructive active:scale-95 transition-all"
                    title="Unlink device"
                    aria-label="Unlink device"
                  >
                    <Unlink className="size-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlink Mobile Keyboard?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect this device from your ZenoTap Cloud Deck sync token. You can re-link at any time by scanning a QR code or entering a new 6-digit PIN.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Linked</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUnlink}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Unlink Keyboard
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
              Not linked to cloud pairing code
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {syncToken
            ? "Your keyboard is securely linked to your ZenoTap Cloud Deck. GIFs created on desktop or web sync down directly into keyboard storage."
            : "Effortlessly connect to your desktop session: scan the desktop QR code with your camera or enter the 6-digit PIN."}
        </p>

        {syncToken ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span>Last synced: <strong className="text-foreground">{formatRelativeTime(lastSyncedTime)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAutoSync}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                  autoSync
                    ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
                    : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Zap className={`size-3 ${autoSync ? "text-primary" : "text-muted-foreground"}`} />
                Auto-Sync: {autoSync ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-2 space-y-3">
            {!showPairDialog ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 rounded-xl border border-primary/50 bg-primary px-4 py-2.5 font-display text-xs font-bold text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                  <Camera className="size-4" />
                  SCAN QR CODE TO PAIR
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPairDialog(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3.5 py-2.5 font-display text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
                >
                  <LinkIcon className="size-3.5" />
                  Enter 6-Digit PIN
                </motion.button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-background/60 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Enter 6-digit code shown on your desktop ZenoDeck:</p>
                  <button
                    type="button"
                    onClick={() => setShowPairDialog(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <PinCodeInput
                    value={pairCodeInput}
                    onChange={setPairCodeInput}
                    onComplete={(code) => void handlePairWithCode(code)}
                    disabled={isPairing}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handlePairWithCode(pairCodeInput)}
                    disabled={isPairing || pairCodeInput.length !== 6}
                    className="rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-bold text-primary-foreground disabled:opacity-50 h-12 w-full sm:w-auto"
                  >
                    {isPairing ? "Linking..." : "Connect"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      <ZenoTapPairScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScanSuccess={(code) => void handlePairWithCode(code)}
      />

      {/* System IME Setup Card */}
      <div className="rounded-2xl border border-border/50 bg-card/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Android System Integration
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {status.enabled ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                Enabled in OS
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <AlertCircle className="size-3.5" />
                Keyboard Disabled
              </span>
            )}
            {status.selected && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
                Active Default
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => void openKeyboardSettings()}
            className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3 font-display text-xs font-bold text-primary transition-colors hover:bg-primary/20"
          >
            <Settings className="size-4" />
            1. ENABLE IN SYSTEM SETTINGS
            <ExternalLink className="size-3" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => void openKeyboardPicker()}
            className="flex items-center justify-center gap-2 rounded-xl border border-muted-foreground/30 bg-muted/20 p-3 font-display text-xs font-bold text-foreground transition-colors hover:bg-muted/40"
          >
            <Keyboard className="size-4" />
            2. SWITCH INPUT METHOD
          </motion.button>
        </div>
      </div>

      {/* Media Deck Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-sm font-bold tracking-wide text-foreground">
              Pinned Media Deck ({gifs.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              These items are loaded directly inside the ZenoDeck Android keyboard.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-border/70 bg-card/60 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary/50">
            <Upload className="size-3.5 text-primary" />
            <span>{isUploading ? "Uploading..." : "Add GIF File"}</span>
            <input
              type="file"
              accept="image/gif"
              multiple
              onChange={(e) => void handleFileUpload(e)}
              className="hidden"
            />
          </label>
        </div>

        {gifs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 p-12 text-center">
            <Keyboard className="size-10 text-muted-foreground/40 mb-3" />
            <h4 className="font-display text-sm font-bold text-foreground">Your Deck is Empty</h4>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Forge GIFs using the GIF Maker, upload an existing .gif file, or sync from your cloud deck.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {gifs.map((item) => (
            <motion.div
              key={item.filename}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative overflow-hidden rounded-xl border border-border/50 bg-card/30 p-2 transition-all hover:border-primary/40 hover:bg-card/60"
            >
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/40 flex items-center justify-center">
                <img
                  src={resolveImageSrc(item.path)}
                  alt={item.filename}
                  className="size-full object-contain"
                  onError={(e) => {
                    // Fallback to placeholder if web scheme resolution differs
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between gap-1">
                <span className="truncate font-mono text-[11px] text-foreground" title={item.filename}>
                  {item.filename.replace(/\.gif$/i, "")}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {formatBytes(item.size)}
                </span>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    aria-label={`Delete ${item.filename} from keyboard deck`}
                    title="Delete from deck"
                    className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg bg-black/70 text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:bg-destructive hover:text-white group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove GIF from Keyboard Deck?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove &ldquo;{item.filename}&rdquo; from your keyboard storage?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleDelete(item.filename)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove GIF
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
