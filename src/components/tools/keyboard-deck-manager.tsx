"use client";

import { motion, AnimatePresence } from "framer-motion";
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
  Sliders,
  Search,
  X,
  Volume2,
  VolumeX,
  Star,
  AudioWaveform,
  Subtitles,
  Repeat,
  Send,
  Link2,
  Copy,
  Info,
  Smile,
  Layers,
  Play,
  Pause,
  SlidersHorizontal,
} from "lucide-react";
import { PresetSelectorModal, type PresetItem } from "@/components/ui/preset-selector-modal";
import { useEffect, useState, useCallback, useId, useRef } from "react";
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
  setKeyboardTheme,
  getKeyboardTheme,
  type DeckGifItem,
  type KeyboardStatus,
  type KeyboardTheme,
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
import {
  ZenoTapKeyboardSimulator,
  type ZenoTapInjectedItem,
} from "@/components/zenotap/ZenoTapKeyboardSimulator";
import { formatBytes } from "@/lib/format";
import { useHaptics } from "@/hooks/use-haptics";
import { useSensoryFeedback } from "@/hooks/useSensoryFeedback";
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

export interface CyberReactionItem {
  id: string;
  title: string;
  category: "cyber" | "gaming" | "ai" | "memes" | "vaporwave";
  fps: string;
  duration: string;
  size: string;
  format: string;
  hasAudio: boolean;
  image: string;
  caption: string;
}

export const CYBER_REACTIONS: CyberReactionItem[] = [
  {
    id: "glitch-overload",
    title: "Glitch Overload 60FPS",
    category: "cyber",
    fps: "60 FPS",
    duration: "1.8s",
    size: "3.2MB",
    format: "WEBP 60FPS",
    hasAudio: true,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBiWJ6JTSO-mhxtoMtkxtjBoedy2EyThFvuBsEptkqmchF-0MDjCbpROUE2aKnlgJuRaZovwfhoFBlkQdKL8bIzOpbAEm2ge3waAgCqrN0yM5Cx1wj3nnj5xewN8cDkPBugqAlLBzpPbSe8IY-YgQiQ5aBEJgp1EYESQP0lagavgIH9tYO6dc9TN4p2uICASzZOJbpWX52HyZGO--1Gi2Se2bWmQ-mdWkdlE7-qcIuV_KTNMYLPbkit4g",
    caption: "When the code compiles on first try...",
  },
  {
    id: "neon-speed-run",
    title: "Neon Speed Run",
    category: "gaming",
    fps: "60 FPS",
    duration: "2.1s",
    size: "2.8MB",
    format: "WEBP 60FPS",
    hasAudio: false,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBfYboh5WNMg5a9scI0za3QWvkT08isNQQR9d60vtOpX1VllIr-xdG5GwEeN1neszPt3MT7fQJxmmBg02QN4sT1Xi9V2HeQCmkU__kx4tkSTNF84JLXElSk6SM52-R0lKfS9X7jy-lYeumCvYGurbs71MB4lpR_LYjieDv0BNys02utAPvjSTY-4Y4WfA0KwQ3HzCobtNQyGCkrd75WOS6jNED6fX1EMKl-r_g9971G0I3_7u5odEFo8g",
    caption: "Maximum overdrive engaged",
  },
  {
    id: "mech-emergency-lock",
    title: "Mech Emergency Lock",
    category: "cyber",
    fps: "HQ WEBM",
    duration: "0.9s",
    size: "1.4MB",
    format: "HQ WEBM",
    hasAudio: true,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBb98_6qxsFMvTu1D_R9Zd8ZODznF1_Pe0xeIU8rGACSOpNs4Z8sjATjNGBxmTkfHnViTV13k0-Qd6CQHPNBvUaLmA0YIcP5eQguaspZHqLCdOOJ1BoB1jlIEt1kqQT7xnMb6TXhZGzCyJnWkz-q1kfa8v8-mmXIPmgTa0BKOHaDZfZvGZMp7kyhlSnugxVOYZnSUrlAw273ZWexu35sZN3BMc6hmRFwCxLGxdxcEjgbTvUQ4oQAd-IcQ",
    caption: "CRITICAL ALERT: Target locked",
  },
  {
    id: "terminal-flow-state",
    title: "Terminal Flow State",
    category: "ai",
    fps: "1080p",
    duration: "3.4s",
    size: "4.1MB",
    format: "1080p 60FPS",
    hasAudio: false,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCVtN7jHKCMz04uIQVDGcLJFUkn7xp8zunVZFA8ZTn3mdMM4-tR3D27ev2euNQ8rM0BiVLz8rAmaqVfoMApRAZUlyXwzyFF3vyyq6uoslgYAZN9ERKGgDkSEOuOs0W62Z5slJiRtfzq6a_f7iEz4ZpaPWvWkkZ950SfRBY5JgEwnWnudPB8EEWsboboSqoIZpIN8WUUbArRzjIXPhKocE01gh7KMr9pRmrBOr1NhQCxK-rJA_OsM1jeKw",
    caption: "Entering deep terminal flow...",
  },
  {
    id: "vapor-wave-motion",
    title: "Vapor Wave Motion",
    category: "vaporwave",
    fps: "48 FPS",
    duration: "1.5s",
    size: "2.1MB",
    format: "48 FPS",
    hasAudio: true,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC53G9LsjTgUu3fQxa5mehJdphyg648a7VIucxCniNfGEYmaUFJmxG8s7Pc8psq6bCWt7x-FN3wst75GX2wLhyZvB6_5P7U_rZeHqi9-CfYFkpELIFf2ezLrenFCFr-tDAcP8VdQfkUU_xMvR0_8D7u96hSn7hhNDlEU9TsN6nkg3p6c84X0T6hlwEuQ-8hqvUTqkQDPN_NuNv5TO1nbrYBF_sskH4qSvzXO0VlMvODWYSDPO0Kafn0XQ",
    caption: "A e s t h e t i c  w a v e s",
  },
];

interface SortableDeckItemProps {
  item: DeckGifItem;
  resolveImageSrc: (path: string) => string;
  onDelete: (filename: string) => void;
  onTogglePin: (filename: string) => void;
  onSelect: (item: DeckGifItem) => void;
  isSelected?: boolean;
}

function SortableDeckItem({
  item,
  resolveImageSrc,
  onDelete,
  onTogglePin,
  onSelect,
  isSelected = false,
}: SortableDeckItemProps) {
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
      onClick={() => onSelect(item)}
      className={`group relative overflow-hidden rounded-xl border p-2.5 transition-all shadow-md cursor-pointer ${
        isSelected
          ? "border-[#7dd3fc] bg-[#141c2e]/90 shadow-[0_0_20px_rgba(125,211,252,0.25)] ring-1 ring-[#7dd3fc]"
          : "border-sky-400/20 bg-[#141c2e]/70 backdrop-blur-md hover:border-sky-400/50 hover:bg-[#1a2438]/80 hover:-translate-y-0.5"
      }`}
    >
      {/* Top Action Bar: Drag Grip, Pin Button, Delete Button */}
      <div
        className="flex items-center justify-between mb-1.5 px-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          {...attributes}
          {...listeners}
          type="button"
          aria-label="Drag to reorder"
          className="text-muted-foreground/60 hover:text-[#7dd3fc] cursor-grab active:cursor-grabbing p-0.5 transition-colors"
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
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/60 relative flex items-center justify-center border border-sky-400/20">
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

      {/* Bottom Metadata & Telemetry */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-1">
          <span
            className="truncate font-mono text-[11px] font-medium text-[#e0e8f0]"
            title={item.filename}
          >
            {item.filename.replace(/^pinned_/, "").replace(/\.gif$/i, "").replace(/_/g, " ")}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {formatBytes(item.size)}
          </span>
        </div>

        {/* RAM Telemetry Badge (<15KB WebP Companion) */}
        <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/70">
          <span className="text-[#7dd3fc]/80 flex items-center gap-1">
            <span className="size-1 rounded-full bg-[#7dd3fc]" />
            &lt;15KB WebP
          </span>
          <Zap className="size-2.5 text-[#7dd3fc] opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}

const VAULT_DECK_PRESETS: PresetItem[] = [
  {
    id: "discord-sticker",
    name: "Discord Animated Sticker",
    description: "Ultra-fast WebP sticker (<500KB) tailored for Discord message reactions.",
    category: "social",
    engineTier: "Tier 1: FastCopy",
    chips: ["320x320", "WebP", "30 fps", "<500 KB"],
    params: { format: "webp", width: 320, height: 320, fps: 30 },
  },
  {
    id: "telegram-reaction",
    name: "Telegram Reaction GIF",
    description: "Compact 256x256 GIF with optimized color palette for instant mobile injection.",
    category: "social",
    engineTier: "Tier 2: Media3 HW",
    chips: ["256x256", "GIF", "128 Colors", "<1.0 MB"],
    params: { format: "gif", width: 256, height: 256, colors: 128 },
  },
  {
    id: "whatsapp-sticker",
    name: "WhatsApp Sticker Profile",
    description: "Strict 512x512 WebP sticker format complying with official WhatsApp specifications.",
    category: "social",
    engineTier: "Tier 1: FastCopy",
    chips: ["512x512", "WebP", "Transparent", "<100 KB"],
    params: { format: "webp", width: 512, height: 512, transparent: true },
  },
  {
    id: "high-fps-cyber",
    name: "Cyberpunk 60FPS Glacier Loop",
    description: "High-definition 60FPS looped reaction tuned for modern OLED smartphone displays.",
    category: "studio",
    engineTier: "Tier 4: Wasm MT",
    chips: ["480x480", "GIF High-DPI", "60 fps", "Glacier Glass"],
    params: { format: "gif", width: 480, height: 480, fps: 60 },
  },
];

export function KeyboardDeckManager() {
  const haptics = useHaptics();
  const sensory = useSensoryFeedback();
  const [gifs, setGifs] = useState<DeckGifItem[]>([]);
  const [status, setStatus] = useState<KeyboardStatus>({ enabled: false, selected: false });
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("discord-sticker");

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

  // Active Media Inspector Popover State (Stitch Hero Feature)
  const [activeInspectItem, setActiveInspectItem] = useState<CyberReactionItem>(CYBER_REACTIONS[0]);
  const [activeInspectCaption, setActiveInspectCaption] = useState<string>(CYBER_REACTIONS[0].caption);
  const [activeInspectSpeed, setActiveInspectSpeed] = useState<number>(1.0);
  const [activeInspectScrubber, setActiveInspectScrubber] = useState<number>(66);
  const [isEditingCaption, setIsEditingCaption] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [isStarred, setIsStarred] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFilterPill, setSelectedFilterPill] = useState<string>("all");

  // Bridge to ZenoTapKeyboardSimulator
  const [injectedItem, setInjectedItem] = useState<ZenoTapInjectedItem | null>(null);
  const [currentTheme, setCurrentTheme] = useState<KeyboardTheme>("glacier");

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
      const [deckItems, imeStatus, savedTheme] = await Promise.all([
        getKeyboardDeckGifs(),
        getKeyboardStatus(),
        getKeyboardTheme(),
      ]);
      setGifs(deckItems);
      setStatus(imeStatus);
      setCurrentTheme(savedTheme);
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

  // Convert DeckGifItem to CyberReactionItem format for inspector preview
  const selectVaultItemForInspection = (vaultItem: DeckGifItem) => {
    sensory.triggerTap();
    const isSticker = vaultItem.filename.includes("sticker");
    const cleanTitle = vaultItem.filename
      .replace(/^pinned_/, "")
      .replace(/\.(gif|webp)$/i, "")
      .replace(/_/g, " ");

    const adapted: CyberReactionItem = {
      id: vaultItem.filename,
      title: cleanTitle,
      category: isSticker ? "memes" : "cyber",
      fps: vaultItem.filename.endsWith(".webp") ? "WEBP 60FPS" : "GIF 60FPS",
      duration: "1.8s",
      size: formatBytes(vaultItem.size),
      format: isSticker ? "WEBP STICKER" : "HQ GIF",
      hasAudio: false,
      image: resolveImageSrc(vaultItem.path) || CYBER_REACTIONS[0].image,
      caption: `React: ${cleanTitle}`,
    };
    setActiveInspectItem(adapted);
    setActiveInspectCaption(adapted.caption);
    setIsInspectorOpen(true);
  };

  // Primary Action: Commit to Chat [DIRECT INJECT]
  const handleCommitToChat = async () => {
    setIsCommitting(true);
    sensory.triggerSuccess();
    void haptics.success();

    // Transmit to Chat Sandbox
    setInjectedItem({
      filename: activeInspectItem.title,
      caption: activeInspectCaption || activeInspectItem.title,
      speed: activeInspectSpeed,
      url: activeInspectItem.image,
      timestamp: Date.now(),
    });

    // Copy to clipboard fallback if browser supports it
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(activeInspectItem.image);
      } catch {
        /* ignore */
      }
    }

    setTimeout(() => {
      setIsCommitting(false);
      toast.success(`Injected "${activeInspectItem.title}" via CommitContent v2!`);
    }, 1200);
  };

  // Filter items based on pill and search query
  const filteredCyberReactions = CYBER_REACTIONS.filter((item) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.caption.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedFilterPill === "all") return true;
    if (selectedFilterPill === "cyber") return item.category === "cyber";
    if (selectedFilterPill === "gaming") return item.category === "gaming";
    if (selectedFilterPill === "ai") return item.category === "ai";
    if (selectedFilterPill === "memes") return item.category === "memes";
    if (selectedFilterPill === "vaporwave") return item.category === "vaporwave";
    return true;
  });

  const filteredVaultGifs = gifs.filter((item) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedFilterPill === "stickers") return item.filename.includes("sticker");
    if (selectedFilterPill === "pinned") return item.filename.startsWith("pinned_");
    return true;
  });

  const FILTER_PILLS = [
    { id: "all", label: "All Decks" },
    { id: "cyber", label: "Cyber Reactions (Slot 1)", dotColor: "#c8a0f0" },
    { id: "gaming", label: "Gaming Clutches (Slot 2)", dotColor: "#88b4cc" },
    { id: "ai", label: "AI Gens" },
    { id: "memes", label: "Memes" },
    { id: "vaporwave", label: "Vaporwave" },
    { id: "stickers", label: "Stickers" },
    { id: "pinned", label: "Pinned" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl min-w-0 overflow-x-hidden box-border space-y-5 p-3 sm:p-6 bg-[#0a0e1a] text-[#e0e8f0] selection:bg-[#7dd3fc]/20 selection:text-[#7dd3fc]">
      {/* 1. Glacier Glassmorphism Header Bar */}
      <div className="rounded-2xl border border-sky-400/20 bg-[#0f1524]/75 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_1px_16px_rgba(125,211,252,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-[#7dd3fc] shadow-[0_0_20px_rgba(125,211,252,0.2)]">
            <Keyboard className="size-5" />
          </div>
          <div>
            <h1 className="font-headline text-base font-semibold tracking-tight text-[#e0e8f0] flex items-center gap-2">
              ZenoTap Studio &amp; Keyboard Deck
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7dd3fc]/15 text-[#7dd3fc] border border-[#7dd3fc]/30 font-bold">
                Glacier v3.16.0
              </span>
            </h1>
            <p className="text-xs text-[#a0b4c4]">
              Frozen Light glassmorphic IME with instant CommitContent v2 direct chat injection.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* SFX Sound Toggle Button */}
          <button
            type="button"
            onClick={() => {
              sensory.triggerToggle(!sensory.isMuted);
              sensory.setMuted(!sensory.isMuted);
              toast.info(sensory.isMuted ? "Mechanical SFX Unmuted" : "Mechanical SFX Muted");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              !sensory.isMuted
                ? "bg-[#7dd3fc]/15 text-[#7dd3fc] border-[#7dd3fc]/40 shadow-[0_0_12px_rgba(125,211,252,0.2)]"
                : "bg-[#141c2e] text-[#a0b4c4] border-sky-400/20 hover:text-[#e0e8f0]"
            }`}
            title="Toggle Sensory SFX"
          >
            {!sensory.isMuted ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            <span>SFX: {!sensory.isMuted ? "ON" : "OFF"}</span>
          </button>

          {/* Refresh Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => void loadDeck()}
            className="flex items-center gap-1.5 rounded-xl border border-sky-400/20 bg-[#141c2e] px-3 py-1.5 text-xs font-semibold text-[#a0b4c4] hover:text-[#7dd3fc] hover:border-sky-400/40 transition-colors cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </motion.button>
        </div>
      </div>

      {/* 2. Frosted Search & Filter Controls (Stitch Lines 16-32) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 bg-[#141c2e]/70 backdrop-blur-xl border border-sky-400/20 px-3.5 py-2.5 rounded-2xl shadow-lg">
          <Search className="size-4 text-[#7dd3fc] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cyber reactions, memes, vault clips..."
            className="bg-transparent flex-1 text-sm font-medium text-[#e0e8f0] focus:outline-none placeholder:text-[#a0b4c4]/50"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="size-7 flex items-center justify-center rounded-lg bg-[#1a2438]/60 text-[#a0b4c4] hover:text-[#7dd3fc] transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
          <div className="w-px h-5 bg-[#1a2438]" />

          {/* Preset Shortcuts */}
          <button
            type="button"
            onClick={() => {
              void haptics.light();
              sensory.triggerTap();
              setShowPresetModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#c8a0f0]/15 text-[#c8a0f0] border border-[#c8a0f0]/30 text-xs font-semibold hover:bg-[#c8a0f0]/25 transition-all cursor-pointer"
          >
            <Sliders className="size-3.5" />
            <span className="hidden sm:inline">Presets</span>
          </button>
        </div>

        {/* 3. Insertion API Status Banner (Stitch Lines 33-48) */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#111828]/90 border border-sky-400/15 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex size-2">
              <span className="animate-ping absolute inline-flex size-full rounded-full bg-[#7dd3fc] opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-[#7dd3fc]" />
            </div>
            <p className="text-[11px] font-medium text-[#e0e8f0] truncate">
              <span className="text-[#7dd3fc] font-semibold">Target: Discord • WhatsApp • Telegram</span> • CommitContent v2 Supported
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#1a3a4e]/60 border border-sky-400/20 text-[10px] font-medium text-[#c0d8e8] shrink-0">
            <ShieldCheck className="size-3 text-[#88b4cc]" />
            <span>Auto-Copy Ready</span>
          </div>
        </div>
      </div>

      {/* 4. Filter Pills (Stitch Lines 50-72) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-3 px-3 sm:-mx-6 sm:px-6">
        {FILTER_PILLS.map((pill) => {
          const isActive = selectedFilterPill === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                sensory.triggerTap({ hapticOnly: true });
                setSelectedFilterPill(pill.id);
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-[#7dd3fc] text-[#001f2e] font-semibold shadow-md shadow-[#7dd3fc]/25 scale-102"
                  : "bg-[#141c2e]/70 border border-sky-400/15 text-[#e0e8f0] hover:bg-[#1a2438] hover:border-sky-400/30"
              }`}
            >
              {pill.dotColor && (
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: pill.dotColor }}
                />
              )}
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. Active Media Inspector Popover Card (Hero Stitch Component - Lines 73-155) */}
      <AnimatePresence>
        {isInspectorOpen && activeInspectItem && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative overflow-hidden rounded-2xl bg-[#141c2e]/85 backdrop-blur-2xl border border-sky-400/25 shadow-2xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-[0_0_30px_rgba(125,211,252,0.06)]"
          >
            {/* Ambient Glitch Backdrop Glow (Stitch Lines 75-77) */}
            <div className="absolute -right-10 -top-10 size-44 rounded-full bg-[#7dd3fc]/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 size-44 rounded-full bg-[#c8a0f0]/10 blur-3xl pointer-events-none" />

            {/* Inspector Header Meta (Stitch Lines 79-93) */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-[#7dd3fc] animate-pulse" />
                <span className="text-xs font-headline font-semibold text-[#e0e8f0] tracking-wide">
                  {activeInspectItem.title}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#3d2060]/70 text-[#e8d0ff] border border-[#c8a0f0]/30 font-mono">
                  {activeInspectItem.duration} loop
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsStarred(!isStarred);
                    sensory.triggerTap();
                    toast.success(isStarred ? "Removed from favorites" : "Saved to favorite slot ⭐");
                  }}
                  className={`size-7 flex items-center justify-center rounded-lg bg-[#1a2438]/70 transition-colors cursor-pointer ${
                    isStarred ? "text-[#c8a0f0]" : "text-[#a0b4c4] hover:text-[#e0e8f0]"
                  }`}
                  title="Save to slot"
                >
                  <Star className="size-4" fill={isStarred ? "currentColor" : "none"} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsInspectorOpen(false)}
                  className="size-7 flex items-center justify-center rounded-lg bg-[#1a2438]/70 text-[#a0b4c4] hover:text-[#e0e8f0] transition-colors cursor-pointer"
                  title="Close inspector"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Live Preview Display Canvas (Stitch Lines 94-121) */}
            <div className="relative w-full h-52 sm:h-60 rounded-xl overflow-hidden bg-[#0a0e1a] flex items-center justify-center group shadow-inner border border-sky-400/20">
              <img
                src={activeInspectItem.image}
                alt={activeInspectItem.title}
                className="size-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e1a]/90 via-transparent to-[#0a0e1a]/20 pointer-events-none" />

              {/* Format Overlay Badges */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-[#0f1524]/80 backdrop-blur-md text-[10px] font-mono text-[#e0e8f0] tracking-wider border border-sky-400/20">
                  {activeInspectItem.format}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#0f1524]/80 backdrop-blur-md text-[10px] font-mono text-[#7dd3fc] font-semibold border border-sky-400/20">
                  {activeInspectItem.size}
                </span>
              </div>

              {/* Synced Audio Badge */}
              <div className="absolute top-2.5 right-2.5">
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#0f1524]/80 backdrop-blur-md text-[10px] font-medium text-[#c8a0f0] border border-[#c8a0f0]/30 hover:bg-[#0f1524] transition-colors"
                >
                  <AudioWaveform className="size-3.5" />
                  <span>{activeInspectItem.hasAudio ? "Synced" : "Audio Ready"}</span>
                </button>
              </div>

              {/* Interactive Playback Scrubber & Progress (Stitch Lines 109-120) */}
              <div className="absolute bottom-2.5 inset-x-3 flex flex-col gap-1.5 z-10">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#a0b4c4]">
                  <span className="text-[#7dd3fc] font-medium">
                    {((activeInspectScrubber / 100) * parseFloat(activeInspectItem.duration)).toFixed(1)}s
                  </span>
                  <span>{activeInspectItem.duration}</span>
                </div>
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percent = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
                    setActiveInspectScrubber(percent);
                    sensory.triggerTap({ hapticOnly: true });
                  }}
                  className="w-full h-2 bg-[#1a2438]/80 rounded-full overflow-hidden flex cursor-pointer relative"
                >
                  <div
                    style={{ width: `${activeInspectScrubber}%` }}
                    className="h-full bg-gradient-to-r from-[#88b4cc] to-[#7dd3fc] rounded-full relative transition-all"
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-white shadow-md shadow-[#7dd3fc]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Inspector Customization Controls (Stitch Lines 122-154) */}
            <div className="flex flex-col gap-2.5 z-10">
              {/* Auto Caption Input Box */}
              <div className="flex items-center gap-2 bg-[#111828]/80 border border-sky-400/20 backdrop-blur-sm px-3 py-1.5 rounded-xl">
                <Subtitles className="size-4 text-[#c8a0f0] shrink-0" />
                <input
                  type="text"
                  value={activeInspectCaption}
                  onChange={(e) => setActiveInspectCaption(e.target.value)}
                  placeholder="Caption this reaction..."
                  className="bg-transparent flex-1 text-xs text-[#e0e8f0] focus:outline-none placeholder:text-[#a0b4c4]/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    sensory.triggerTap();
                    toast.success("Reaction caption updated!");
                  }}
                  className="text-[10px] uppercase font-bold text-[#7dd3fc] tracking-wider px-2 py-0.5 rounded bg-[#7dd3fc]/10 hover:bg-[#7dd3fc]/20 border border-[#7dd3fc]/30 cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {/* Speed Selector & Loop Adjustment */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center bg-[#111828]/80 border border-sky-400/20 rounded-xl p-1 gap-1">
                  {[0.5, 1.0, 2.0].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        sensory.triggerTap({ hapticOnly: true });
                        setActiveInspectSpeed(spd);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                        activeInspectSpeed === spd
                          ? "bg-[#7dd3fc] text-[#001f2e] shadow-sm font-bold"
                          : "text-[#a0b4c4] hover:text-[#e0e8f0]"
                      }`}
                    >
                      {spd.toFixed(1)}x
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111828]/80 border border-sky-400/20 text-[11px] text-[#e0e8f0] font-medium flex-1 justify-center">
                  <Repeat className="size-3.5 text-[#88b4cc]" />
                  <span className="text-[#a0b4c4]">Loop Range:</span>
                  <span className="text-[#7dd3fc] font-mono font-semibold">Full Cycle</span>
                </div>
              </div>

              {/* Primary Action: Commit to Chat Button (Stitch Lines 144-153) */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleCommitToChat()}
                  disabled={isCommitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#7dd3fc] hover:bg-[#7dd3fc]/90 text-[#001f2e] font-semibold text-xs py-2.5 rounded-xl shadow-lg shadow-[#7dd3fc]/25 transition-all transform active:scale-[0.98] cursor-pointer"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      <span>Commit to Chat</span>
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-[#001f2e]/15 text-[9px] font-bold tracking-wider">
                        DIRECT INJECT
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    sensory.triggerTap();
                    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(activeInspectItem.image);
                      toast.success("Media link copied to clipboard!");
                    }
                  }}
                  className="size-10 flex items-center justify-center rounded-xl bg-[#1a2438]/80 hover:bg-[#1a2438] text-[#a0b4c4] hover:text-[#7dd3fc] border border-sky-400/20 transition-colors cursor-pointer"
                  title="Export Raw Link"
                >
                  <Link2 className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Bottom Feedback Toast (Stitch Lines 156-162) */}
      <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-[#111828]/80 border border-sky-400/15 backdrop-blur-md">
        <Info className="size-4 text-[#7dd3fc] shrink-0" />
        <p className="text-[11px] text-[#a0b4c4] leading-tight">
          Rich media ready for insertion • Press{" "}
          <span className="text-[#7dd3fc] font-medium">Commit to Chat</span> or click any card below to preview.
        </p>
      </div>

      {/* 7. Embedded 1:1 Live Keyboard Preview & Chat Injection Sandbox */}
      <ZenoTapKeyboardSimulator
        vaultItems={gifs}
        injectedItem={injectedItem}
        onSelectInspectItem={selectVaultItemForInspection}
      />

      {/* 8. 3-Step Connection & IME Setup Banner */}
      <div className="rounded-2xl border border-sky-400/20 bg-[#141c2e]/60 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-sky-400/10 border border-sky-400/30 flex items-center justify-center text-[#7dd3fc]">
              <Zap className="size-5" />
            </div>
            <div>
              <h2 className="font-headline text-sm font-bold text-[#e0e8f0] flex items-center gap-2">
                Android IME Setup &amp; Status
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ready
                </span>
              </h2>
              <p className="text-xs text-[#a0b4c4]">
                3-step status check for direct media insertion across WhatsApp, Discord, Messages &amp; Telegram.
              </p>
            </div>
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
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a0b4c4]">
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
            <p className="text-xs text-[#a0b4c4] mb-3">
              {status.enabled
                ? "ZenoTap input method is active in Android system."
                : "Enable ZenoTap in Android On-Screen Keyboard settings."}
            </p>
            <button
              type="button"
              onClick={() => void openKeyboardSettings()}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                status.enabled
                  ? "bg-[#1a2438] text-[#e0e8f0] hover:bg-[#202c42] border border-sky-400/20"
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
                : "bg-[#0e4d6e]/20 border-sky-400/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a0b4c4]">
                Step 2: Active IME
              </span>
              {status.selected ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  Active Default
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#7dd3fc]">
                  <Keyboard className="size-3.5" />
                  Select Deck
                </span>
              )}
            </div>
            <p className="text-xs text-[#a0b4c4] mb-3">
              {status.selected
                ? "ZenoTap is currently chosen as the active input method."
                : "Switch input method picker to ZenoTap when typing."}
            </p>
            <button
              type="button"
              onClick={() => void openKeyboardPicker()}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                status.selected
                  ? "bg-[#1a2438] text-[#e0e8f0] hover:bg-[#202c42] border border-sky-400/20"
                  : "bg-[#7dd3fc] hover:bg-[#7dd3fc]/90 text-[#001f2e] shadow-md shadow-sky-400/20"
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
                : "bg-[#0e4d6e]/20 border-sky-400/30"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a0b4c4]">
                Step 3: Vault Deck
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                {gifs.length} Items
              </span>
            </div>
            <p className="text-xs text-[#a0b4c4] mb-3">
              {gifs.length > 0
                ? "Media is synced to internal keyboard filesDir sandbox."
                : "No media in deck. Upload or sync cloud GIFs."}
            </p>
            <button
              type="button"
              onClick={() => void handleSyncCloud()}
              disabled={isSyncing}
              className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-[#7dd3fc]/20 hover:bg-[#7dd3fc]/30 text-[#7dd3fc] border border-[#7dd3fc]/40 transition-colors cursor-pointer"
            >
              <CloudDownload className={`size-3.5 ${isSyncing ? "animate-bounce" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Cloud Deck"}
            </button>
          </div>
        </div>
      </div>

      {/* 9. Cloud Sync & Device Pairing Section */}
      <div className="rounded-2xl border border-sky-400/20 bg-[#141c2e]/60 p-5 space-y-3.5 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="size-4 text-[#7dd3fc]" />
            <span className="font-mono text-xs uppercase tracking-wider text-[#a0b4c4]">
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
                    className="size-7 grid place-items-center rounded-lg border border-sky-400/20 bg-[#141c2e] text-[#a0b4c4] hover:border-destructive/40 hover:text-destructive active:scale-95 transition-all cursor-pointer"
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
            <span className="font-mono text-[11px] text-[#a0b4c4]">Not paired to cloud</span>
          )}
        </div>

        {syncToken ? (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-sky-400/15">
            <div className="text-[11px] text-[#a0b4c4]">
              Last synced: <strong className="text-[#e0e8f0]">{formatRelativeTime(lastSyncedTime)}</strong>
            </div>
            <button
              onClick={handleToggleAutoSync}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                autoSync
                  ? "bg-[#7dd3fc]/15 border-[#7dd3fc]/30 text-[#7dd3fc]"
                  : "bg-[#111828] border-sky-400/20 text-[#a0b4c4]"
              }`}
            >
              <Zap className={`size-3 ${autoSync ? "text-[#7dd3fc]" : "text-[#a0b4c4]"}`} />
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
                  className="flex items-center gap-2 rounded-xl bg-[#7dd3fc] px-4 py-2 font-display text-xs font-bold text-[#001f2e] shadow hover:bg-[#7dd3fc]/90 transition-colors"
                >
                  <Camera className="size-4" />
                  SCAN QR TO PAIR
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPairDialog(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-sky-400/25 bg-[#141c2e] px-3.5 py-2 font-display text-xs font-semibold text-[#e0e8f0] hover:border-sky-400/50 transition-colors"
                >
                  <LinkIcon className="size-3.5 text-[#7dd3fc]" />
                  Enter 6-Digit PIN
                </motion.button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0a0e1a]/80 border border-sky-400/25 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#a0b4c4] font-medium">Enter 6-digit PIN from desktop ZenoDeck:</p>
                  <button
                    type="button"
                    onClick={() => setShowPairDialog(false)}
                    className="text-xs text-[#a0b4c4] hover:text-[#e0e8f0]"
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
                    className="rounded-xl bg-[#7dd3fc] px-4 py-2.5 font-display text-xs font-bold text-[#001f2e] disabled:opacity-50 h-12 w-full sm:w-auto cursor-pointer"
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

      {/* 10. Trending Cyber Feed (Stitch Lines 163-235) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-[#a0b4c4] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-[#7dd3fc]" />
            Trending Cyber Feed
          </span>
          <span
            onClick={() => {
              sensory.triggerTap();
              toast.info("Feed re-indexed with latest Glacier loops");
            }}
            className="text-[11px] text-[#7dd3fc] hover:underline cursor-pointer"
          >
            Re-index Feed
          </span>
        </div>

        {/* 2-Column Responsive Card Grid (Stitch Lines 170-235) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {filteredCyberReactions.map((card) => {
            const isSelected = activeInspectItem.id === card.id;
            return (
              <div
                key={card.id}
                onClick={() => {
                  sensory.triggerTap();
                  setActiveInspectItem(card);
                  setActiveInspectCaption(card.caption);
                  setIsInspectorOpen(true);
                }}
                className={`group relative rounded-xl overflow-hidden backdrop-blur-md shadow-md cursor-pointer transition-all hover:-translate-y-0.5 border ${
                  isSelected
                    ? "border-[#7dd3fc] bg-[#141c2e]/90 shadow-[0_0_20px_rgba(125,211,252,0.25)] ring-1 ring-[#7dd3fc]"
                    : "border-sky-400/20 bg-[#141c2e]/70 hover:border-sky-400/50 hover:bg-[#1a2438]/80"
                }`}
              >
                <div className="relative h-28 w-full bg-[#0a0e1a]">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="size-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-[#0a0e1a]/80 backdrop-blur-sm text-[9px] font-mono text-[#7dd3fc] font-bold border border-sky-400/30">
                    {card.fps}
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-[#0f1524]/90 text-[9px] font-mono text-[#e0e8f0] border border-sky-400/20">
                    {card.duration}
                  </div>
                </div>
                <div className="p-2 flex items-center justify-between bg-[#141c2e]/90 border-t border-sky-400/15">
                  <span className="text-[11px] font-medium text-[#e0e8f0] truncate">
                    {card.title}
                  </span>
                  <Zap className="size-3.5 text-[#a0b4c4] group-hover:text-[#7dd3fc] transition-colors shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 11. Drag-and-Drop Sortable Vault Media Deck */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-headline text-sm font-bold tracking-wide text-[#e0e8f0] flex items-center gap-2">
              Custom Keyboard Vault Deck ({gifs.length})
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20 font-bold">
                Drag to Reorder
              </span>
            </h3>
            <p className="text-xs text-[#a0b4c4]">
              Directly loaded inside Android IME. Pin favorites to freeze them at the front of the keyboard drawer.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-400/10 px-3 py-2 text-xs font-semibold text-[#7dd3fc] hover:bg-sky-400/20 transition-colors">
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
        </div>

        {gifs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-sky-400/25 p-12 text-center bg-[#141c2e]/40">
            <Keyboard className="size-10 text-[#a0b4c4]/40 mb-3" />
            <h4 className="font-headline text-sm font-bold text-[#e0e8f0]">Vault Deck is Empty</h4>
            <p className="mt-1 max-w-sm text-xs text-[#a0b4c4]">
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
          <SortableContext items={filteredVaultGifs.map((g) => g.filename)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {filteredVaultGifs.map((item) => (
                <SortableDeckItem
                  key={item.filename}
                  item={item}
                  resolveImageSrc={resolveImageSrc}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  onSelect={selectVaultItemForInspection}
                  isSelected={activeInspectItem.id === item.filename}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* 12. In-Keyboard Navigation Strip / Dock (Stitch Lines 237-264) */}
      <div className="sticky bottom-0 z-20 -mx-3 sm:-mx-6 px-4 py-2.5 bg-[#0f1524]/90 backdrop-blur-2xl border-t border-sky-400/20 shadow-[0_-8px_20px_rgba(10,14,26,0.6)]">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              sensory.triggerTap();
              toast.info("ABC mode active in keyboard");
            }}
            className="px-3.5 py-1.5 rounded-xl bg-[#1a2438]/70 hover:bg-[#1a2438] text-xs font-bold text-[#e0e8f0] tracking-wider transition-colors border border-sky-400/20 cursor-pointer"
          >
            ABC
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                sensory.triggerTap();
                setSelectedFilterPill("memes");
              }}
              className="p-2 rounded-xl text-[#a0b4c4] hover:text-[#7dd3fc] hover:bg-[#1a2438]/50 transition-colors cursor-pointer"
              title="Emojis & Memes"
            >
              <Smile className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                sensory.triggerTap();
                setSelectedFilterPill("all");
              }}
              className="p-2 rounded-xl text-[#7dd3fc] bg-[#7dd3fc]/10 shadow-[0_0_12px_rgba(125,211,252,0.15)] border border-[#7dd3fc]/30 cursor-pointer"
              title="GIFs"
            >
              <Film className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                sensory.triggerTap();
                setSelectedFilterPill("stickers");
              }}
              className="p-2 rounded-xl text-[#a0b4c4] hover:text-[#7dd3fc] hover:bg-[#1a2438]/50 transition-colors cursor-pointer"
              title="Stickers"
            >
              <Layers className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => {
                sensory.triggerTap();
                toast.info("Clipboard history loaded");
              }}
              className="p-2 rounded-xl text-[#a0b4c4] hover:text-[#7dd3fc] hover:bg-[#1a2438]/50 transition-colors cursor-pointer"
              title="Clipboard History"
            >
              <ClipboardPaste className="size-5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                sensory.triggerTap();
                toast.info("Backspace key pressed");
              }}
              className="p-2 rounded-xl text-[#a0b4c4] hover:text-[#c8a0f0] hover:bg-[#1a2438]/50 transition-colors cursor-pointer"
              title="Backspace"
            >
              <Trash2 className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <PresetSelectorModal
        isOpen={showPresetModal}
        onClose={() => setShowPresetModal(false)}
        toolId="zenotap-vault"
        toolTitle="ZenoTap Vault Presets"
        builtinPresets={VAULT_DECK_PRESETS}
        activePresetId={selectedPresetId}
        onSelectPreset={(preset) => {
          setSelectedPresetId(preset.id);
          toast.success(`Active vault preset: ${preset.name}`);
        }}
      />
    </div>
  );
}
