"use client";

/**
 * ZenoDeck Download History Vault Deck (src/components/tools/youtube-vault-view.tsx)
 * =================================================================================
 * Client-side vault displaying downloaded media items across sessions with
 * quick auditioning and management.
 */

import { useState, useMemo } from "react";
import {
  History,
  Search,
  Trash2,
  Play,
  Film,
  Music,
  Subtitles,
  Calendar,
  HardDrive,
  ExternalLink,
} from "lucide-react";
import { useHistoryStore, type DownloadHistoryItem } from "@/lib/youtube/history-store";
import { usePlayerStore } from "@/lib/youtube/player-store";
import { formatBytes } from "@/lib/youtube/innertube";
import { useHaptics } from "@/hooks/use-haptics";
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

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function YouTubeVaultView() {
  const { items, removeItem, clearHistory } = useHistoryStore();
  const { playTrack } = usePlayerStore();
  const haptics = useHaptics();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "video" | "audio" | "subtitles">("all");

  const filteredItems = useMemo(() => {
    let result = items;

    if (filterType === "video") {
      result = result.filter(
        (i) => !i.isAudioOnly && !["srt", "vtt", "txt"].includes(i.format.toLowerCase())
      );
    } else if (filterType === "audio") {
      result = result.filter((i) => i.isAudioOnly);
    } else if (filterType === "subtitles") {
      result = result.filter((i) =>
        ["srt", "vtt", "txt"].includes(i.format.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.author.toLowerCase().includes(q) ||
          i.qualityBadge.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, filterType, searchQuery]);

  const handlePlayAudio = (item: DownloadHistoryItem) => {
    if (!item.audioStreamUrl) return;
    void haptics.light();
    playTrack({
      id: item.id,
      title: item.title,
      artist: item.author,
      audioUrl: item.audioStreamUrl,
      thumbnailUrl: item.thumbnailUrl,
    });
  };

  const handleClear = () => {
    if (items.length === 0) return;
    clearHistory();
    void haptics.medium();
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Search, Category Filters, Clear Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vault downloads..."
            className="w-full rounded-xl border border-border/80 bg-background/80 py-2 pl-9 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-amber-500 focus:outline-hidden"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-card/60 p-1 rounded-xl border border-border/60 self-start sm:self-auto">
          {(["all", "video", "audio", "subtitles"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setFilterType(type);
                void haptics.light();
              }}
              className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase transition-all cursor-pointer ${
                filterType === type
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Clear All Dialog */}
        {items.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 px-3 py-2 font-mono text-xs text-destructive-foreground transition-all cursor-pointer shrink-0"
                title="Clear all vault entries"
              >
                <Trash2 className="size-3.5 text-destructive" />
                <span className="text-destructive font-medium">Clear Vault</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Download History Vault?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all {items.length} downloaded media record{items.length === 1 ? "" : "s"} from your offline session vault. Files already saved directly to your device storage will not be affected.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep History</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClear}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear History
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="rounded-2xl border border-primary/20 bg-card/50 p-8 text-center space-y-3 shadow-elevation1">
          <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <History className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="font-display text-sm font-bold text-foreground">
              {items.length === 0 ? "Download Vault is Empty" : "No Matching Downloads"}
            </h3>
            <p className="font-mono text-xs text-muted-foreground">
              {items.length === 0
                ? "Downloaded videos, audio files, and subtitle transcripts will be saved here automatically across sessions."
                : "Try a different search query or category filter."}
            </p>
          </div>
        </div>
      )}

      {/* Vault Items List */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60 hover:border-amber-500/40 transition-all shadow-xs"
            >
              {/* Thumbnail / Media Icon */}
              <div className="relative size-14 rounded-lg overflow-hidden bg-black border border-border/60 shrink-0">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-muted-foreground">
                    {item.isAudioOnly ? (
                      <Music className="size-5 text-purple-400" />
                    ) : ["srt", "vtt", "txt"].includes(item.format.toLowerCase()) ? (
                      <Subtitles className="size-5 text-cyan-400" />
                    ) : (
                      <Film className="size-5 text-red-400" />
                    )}
                  </div>
                )}
                {item.durationFormatted && (
                  <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded-md bg-black/80 font-mono text-[9px] text-white">
                    {item.durationFormatted}
                  </span>
                )}
              </div>

              {/* Title & Info */}
              <div className="min-w-0 flex-1 space-y-1">
                <h4
                  className="font-display text-xs font-bold text-foreground truncate"
                  title={item.title}
                >
                  {item.title}
                </h4>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[140px]">{item.author}</span>
                  <span>•</span>
                  <span className="text-foreground/90 font-semibold">{formatBytes(item.fileSizeBytes)}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(item.downloadedAt)}</span>
                </div>
              </div>

              {/* Badges & Actions */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {item.platform && (
                  <span className="px-1.5 py-0.5 rounded-md font-mono text-[8px] font-bold uppercase tracking-wider bg-card/80 border border-border/80 text-muted-foreground">
                    {item.platform}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-muted border border-border/70 text-foreground uppercase">
                  {item.qualityBadge}
                </span>

                {/* Play Audio Button (if audioStreamUrl exists) */}
                {item.audioStreamUrl && (
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(item)}
                    className="size-8 flex items-center justify-center rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-all cursor-pointer shadow-xs"
                    title="Audition in Mini Player"
                  >
                    <Play className="size-3.5 fill-current ml-0.5" />
                  </button>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => {
                    removeItem(item.id);
                    void haptics.light();
                  }}
                  className="size-8 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all cursor-pointer"
                  title="Remove from vault"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
