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
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
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
import { formatBytes } from "@/lib/format";
import { useHaptics } from "@/hooks/use-haptics";

export function KeyboardDeckManager() {
  const haptics = useHaptics();
  const [gifs, setGifs] = useState<DeckGifItem[]>([]);
  const [status, setStatus] = useState<KeyboardStatus>({ enabled: false, selected: false });
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const [deckItems, imeStatus] = await Promise.all([
        getKeyboardDeckGifs(),
        getKeyboardStatus(),
      ]);
      setGifs(deckItems);
      setStatus(imeStatus);
    } catch (e) {
      console.error("Failed to load keyboard deck:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDeck();
  }, [loadDeck]);

  const handleDelete = async (filename: string) => {
    void haptics.impact();
    const success = await deleteGifFromKeyboardDeck(filename);
    if (success) {
      setGifs((prev) => prev.filter((g) => g.filename !== filename));
      void haptics.success();
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
      void haptics.success();
      await loadDeck();
    } catch (err) {
      console.error("Failed uploading GIFs to keyboard deck:", err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
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
            onClick={() => void loadDeck()}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </motion.button>
        </div>
      </div>

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
              Forge GIFs using the GIF Maker or upload an existing .gif file to populate your keyboard.
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
              <div className="aspect-square w-full overflow-hidden rounded-lg bg-black/40">
                <img
                  src={`capacitor://localhost/_capacitor_file_${item.path}`}
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

              <button
                onClick={() => void handleDelete(item.filename)}
                aria-label="Delete from keyboard deck"
                title="Delete from deck"
                className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg bg-black/70 text-muted-foreground opacity-0 backdrop-blur-sm transition-all hover:bg-red-500/80 hover:text-white group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
