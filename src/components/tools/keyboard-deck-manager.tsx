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
  GripVertical,
  Pin,
  PinOff,
  Film,
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, useCallback, useId } from "react";
import { Capacitor } from "@capacitor/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { ZenoTapKeyboardSimulator } from "@/components/zenotap/ZenoTapKeyboardSimulator";
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

interface SortableDeckItemProps {
  item: DeckGifItem;
  resolveImageSrc: (path: string) => string;
  onDelete: (filename: string) => void;
  onTogglePin: (filename: string) => void;
}

function SortableDeckItem({ item, resolveImageSrc, onDelete, onTogglePin }: SortableDeckItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.filename,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  const isPinned = item.filename.startsWith("pinned_");
  const isSticker = item.filename.includes("sticker");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/40 p-2.5 transition-all hover:border-primary/50 hover:bg-card/80 shadow-sm"
    >
      {/* Top Action Bar: Drag Grip, Pin Button, Delete Button */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Drag to reorder"
          className="text-muted-foreground/60 hover:text-foreground cursor-grab active:cursor-grabbing p-0.5"
        >
          <GripVertical className="size-3.5" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onTogglePin(item.filename)}
            className={`p-1 rounded-md transition-colors cursor-pointer text-xs ${
              isPinned
                ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                : "text-muted-foreground/60 hover:text-foreground"
            }`}
            title={isPinned ? "Unpin item" : "Pin to top"}
            aria-label={isPinned ? "Unpin item" : "Pin to top"}
          >
            <Pin className="size-3" />
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label={`Delete ${item.filename} from deck`}
                title="Delete from deck"
                className="p-1 rounded-md text-muted-foreground/60 hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer"
              >
                <Trash2 className="size-3" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from Keyboard Deck?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove &ldquo;{item.filename}&rdquo; from your keyboard storage?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(item.filename)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove Media
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Media Thumbnail Container with Format Badge */}
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/50 relative flex items-center justify-center border border-border/30">
        <img
          src={resolveImageSrc(item.path)}
          alt={item.filename}
          className="size-full object-contain"
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
        />

        {/* Micro Format Badge */}
        <span
          className={`absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase backdrop-blur-md shadow-sm border ${
            isSticker
              ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/40"
              : "bg-sky-950/80 text-sky-300 border-sky-500/40"
          }`}
        >
          {isSticker ? "Sticker" : "GIF"}
        </span>

        {isPinned && (
          <span className="absolute top-1.5 left-1.5 size-4 rounded-full bg-amber-500 text-black flex items-center justify-center text-[9px] font-bold shadow">
            📌
          </span>
        )}
      </div>

      {/* Bottom Metadata & RAM Protection Telemetry */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-mono text-[11px] font-medium text-foreground" title={item.filename}>
            {item.filename.replace(/^pinned_/, "").replace(/\.gif$/i, "").replace(/_/g, " ")}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {formatBytes(item.size)}
          </span>
        </div>

        {/* RAM Telemetry Badge (<15KB WebP Companion) */}
        <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/70">
          <span className="text-emerald-400/80 flex items-center gap-1">
            <span className="size-1 rounded-full bg-emerald-400" />
            &lt;15KB WebP
          </span>
          <span>&lt;30MB RSS</span>
        </div>
      </div>
    </div>
  );
}

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

  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    if (getStoredSyncToken()) return;
    try {
      const text = await navigator.clipboard.readText();
      const code = extractPairCode(text);
      if (code && code.length === 6) {
        setClipboardCode(code);
      }
    } catch {
      /* ignore */
    }
  }, []);

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
      toast.success("Media removed from keyboard");
      void haptics.success();
    } else {
      toast.error("Failed to delete media");
    }
  };

  const handleTogglePin = (filename: string) => {
    void haptics.impact();
    setGifs((prev) => {
      const isPinned = filename.startsWith("pinned_");
      const target = prev.find((g) => g.filename === filename);
      if (!target) return prev;

      const newFilename = isPinned ? filename.replace(/^pinned_/, "") : `pinned_${filename}`;
      const updatedItem: DeckGifItem = { ...target, filename: newFilename };
      const rest = prev.filter((g) => g.filename !== filename);

      toast.success(isPinned ? "Unpinned from top" : "Pinned to top of deck 📌");
      return isPinned ? [...rest, updatedItem] : [updatedItem, ...rest];
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      void haptics.impact();
      setGifs((items) => {
        const oldIndex = items.findIndex((i) => i.filename === active.id);
        const newIndex = items.findIndex((i) => i.filename === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      toast.success("Vault deck order updated");
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
      toast.success(`Added ${files.length} item(s) to keyboard deck`);
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
        toast.success(`Cloud sync complete! Downloaded ${result.downloaded} new item(s).`, {
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
    <div className="mx-auto w-full max-w-5xl min-w-0 overflow-x-hidden box-border space-y-6 p-3 sm:p-6">
      {/* 3-Step Interactive Onboarding Connection Banner */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-card/80 via-card/50 to-cyan-950/20 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                ZenoTap Setup &amp; Live Studio
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  v3.15.0 Flagship
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                3-step status check for direct media insertion across WhatsApp, Discord, Messages &amp; Telegram.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => void loadDeck()}
              className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </motion.button>
          </div>
        </div>

        {/* 3 Interactive Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Step 1: IME Enabled in Settings */}
          <div
            className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
              status.enabled
                ? "bg-emerald-950/20 border-emerald-500/30"
                : "bg-amber-950/20 border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Step 1: Settings
              </span>
              {status.enabled ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  Enabled
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                  <AlertCircle className="size-3.5" />
                  Pending
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {status.enabled
                ? "ZenoTap input method is active in Android system."
                : "Enable ZenoTap in Android On-Screen Keyboard settings."}
            </p>
            <button
              type="button"
              onClick={() => void openKeyboardSettings()}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                status.enabled
                  ? "bg-secondary text-foreground hover:bg-secondary/80"
                  : "bg-amber-500 hover:bg-amber-400 text-black shadow"
              }`}
            >
              <Settings className="size-3.5" />
              {status.enabled ? "Keyboard Settings" : "Enable Keyboard (1-Tap)"}
              <ExternalLink className="size-3" />
            </button>
          </div>

          {/* Step 2: Selected Default IME */}
          <div
            className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
              status.selected
                ? "bg-emerald-950/20 border-emerald-500/30"
                : "bg-indigo-950/20 border-indigo-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Step 2: Active IME
              </span>
              {status.selected ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  Active Default
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-400">
                  <Keyboard className="size-3.5" />
                  Select Deck
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {status.selected
                ? "ZenoTap is currently chosen as the active input method."
                : "Switch input method picker to ZenoTap when typing."}
            </p>
            <button
              type="button"
              onClick={() => void openKeyboardPicker()}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                status.selected
                  ? "bg-secondary text-foreground hover:bg-secondary/80"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow"
              }`}
            >
              <Keyboard className="size-3.5" />
              {status.selected ? "Switch Keyboard" : "Select ZenoTap (1-Tap)"}
            </button>
          </div>

          {/* Step 3: Vault Synced */}
          <div
            className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
              gifs.length > 0
                ? "bg-emerald-950/20 border-emerald-500/30"
                : "bg-sky-950/20 border-sky-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Step 3: Vault Deck
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                {gifs.length} Items
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {gifs.length > 0
                ? "Media is synced to internal keyboard filesDir sandbox."
                : "No media in deck. Upload or sync cloud GIFs."}
            </p>
            <button
              type="button"
              onClick={() => void handleSyncCloud()}
              disabled={isSyncing}
              className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors cursor-pointer"
            >
              <CloudDownload className={`size-3.5 ${isSyncing ? "animate-bounce" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Cloud Deck"}
            </button>
          </div>
        </div>
      </div>

      {/* Embedded 1:1 Live Keyboard Preview & Chat Injection Sandbox */}
      <ZenoTapKeyboardSimulator vaultItems={gifs} />

      {/* Cloud Sync & Device Pairing Section */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-5 space-y-3.5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="size-4 text-primary" />
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Encrypted Cloud Deck Sync
            </span>
          </div>

          {syncToken ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="size-3" />
                Linked: {pairedDeviceName || "Android Keyboard"}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    className="size-7 grid place-items-center rounded-lg border border-border/70 bg-card text-muted-foreground hover:border-destructive/40 hover:text-destructive active:scale-95 transition-all cursor-pointer"
                    title="Unlink device"
                    aria-label="Unlink device"
                  >
                    <Unlink className="size-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unlink Keyboard Device?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect this device from your cloud sync token. You can re-link at any time.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Linked</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUnlink}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Unlink
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <span className="font-mono text-[11px] text-muted-foreground">Not paired to cloud</span>
          )}
        </div>

        {syncToken ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
            <div className="text-[11px] text-muted-foreground">
              Last synced: <strong className="text-foreground">{formatRelativeTime(lastSyncedTime)}</strong>
            </div>
            <button
              onClick={handleToggleAutoSync}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                autoSync
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/40 border-border/60 text-muted-foreground"
              }`}
            >
              <Zap className={`size-3 ${autoSync ? "text-primary" : "text-muted-foreground"}`} />
              Auto-Sync: {autoSync ? "ON" : "OFF"}
            </button>
          </div>
        ) : (
          <div className="pt-2">
            {!showPairDialog ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-display text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                >
                  <Camera className="size-4" />
                  SCAN QR TO PAIR
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPairDialog(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3.5 py-2 font-display text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LinkIcon className="size-3.5" />
                  Enter 6-Digit PIN
                </motion.button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-background/60 border border-border/70 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Enter 6-digit PIN from desktop ZenoDeck:</p>
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
                    className="rounded-xl bg-primary px-4 py-2.5 font-display text-xs font-bold text-primary-foreground disabled:opacity-50 h-12 w-full sm:w-auto cursor-pointer"
                  >
                    {isPairing ? "Linking..." : "Connect"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ZenoTapPairScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onScanSuccess={(code) => void handlePairWithCode(code)}
      />

      {/* Drag-and-Drop Sortable Vault Media Deck */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-sm font-bold tracking-wide text-foreground flex items-center gap-2">
              Keyboard Vault Deck ({gifs.length})
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Drag to Reorder
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Directly loaded inside Android IME. Pin favorites to freeze them at the front of the keyboard drawer.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors self-start sm:self-auto">
            <Upload className="size-3.5" />
            <span>{isUploading ? "Uploading..." : "Add Media Files"}</span>
            <input
              type="file"
              accept="image/gif,image/webp"
              multiple
              onChange={(e) => void handleFileUpload(e)}
              className="hidden"
            />
          </label>
        </div>

        {gifs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 p-12 text-center bg-card/20">
            <Keyboard className="size-10 text-muted-foreground/40 mb-3" />
            <h4 className="font-display text-sm font-bold text-foreground">Vault Deck is Empty</h4>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              Add GIFs or Stickers using the button above, or click Sync Cloud Deck to load your reactions.
            </p>
          </div>
        )}

        {/* DnD Context with Sortable Grid */}
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={gifs.map((g) => g.filename)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {gifs.map((item) => (
                <SortableDeckItem
                  key={item.filename}
                  item={item}
                  resolveImageSrc={resolveImageSrc}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
