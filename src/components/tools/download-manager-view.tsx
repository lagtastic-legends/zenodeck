"use client";

/**
 * ZenoDeck Download Manager & Background Queue Deck (src/components/tools/download-manager-view.tsx)
 * ==================================================================================================
 * Interactive dashboard providing real-time telemetry, Pause/Resume, priority reordering,
 * and lifecycle tracking for active, queued, and completed media streams.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Zap,
  Pause,
  Play,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Trash2,
  HardDrive,
  FileVideo,
  Music,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  useDownloadQueueStore,
  type QueueDownloadItem,
} from "@/lib/media/download-queue-store";
import { downloadQueueService } from "@/lib/media/download-queue-runner";
import { formatBytes } from "@/lib/youtube/innertube";
import { usePlayerStore } from "@/lib/youtube/player-store";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { useHaptics } from "@/hooks/use-haptics";

export interface DownloadManagerViewProps {
  onNavigateToDownloader?: () => void;
}

export function DownloadManagerView({ onNavigateToDownloader }: DownloadManagerViewProps = {}) {
  const haptics = useHaptics();
  const { playTrack } = usePlayerStore();
  const saveDialog = useSaveDialogStore();

  const {
    items,
    isGlobalPaused,
    pauseItem,
    resumeItem,
    pauseAll,
    resumeAll,
    dequeue,
    retryItem,
    clearCompleted,
    moveUp,
    moveDown,
  } = useDownloadQueueStore();

  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed" | "failed">("all");

  const activeTask = items.find((i) => i.status === "downloading");
  const queuedTasks = items.filter((i) => i.status === "queued" || i.status === "paused");
  const completedTasks = items.filter((i) => i.status === "completed");
  const failedTasks = items.filter((i) => i.status === "failed" || i.status === "cancelled");

  // Telemetry Aggregates
  const totalDownloadedBytes = items.reduce(
    (sum, item) => sum + (item.fileSizeBytes || item.progress.downloadedBytes || 0),
    0
  );
  const currentSpeedMbps = activeTask?.progress.speedMbps || 0;

  const handlePauseActive = (id: string) => {
    void haptics.light();
    downloadQueueService.pauseActiveTask();
    pauseItem(id);
  };

  const handleResumeActive = (id: string) => {
    void haptics.light();
    downloadQueueService.resumeActiveTask();
    resumeItem(id);
  };

  const handleCancelActive = (id: string) => {
    void haptics.medium();
    downloadQueueService.cancelActiveTask();
    dequeue(id);
  };

  const handleSaveCompleted = async (item: QueueDownloadItem) => {
    if (!item.resultUrl) return;
    void haptics.medium();

    try {
      const response = await fetch(item.resultUrl);
      const blob = await response.blob();
      saveDialog.showSuccess({
        filename: item.localFileName || `${item.title}.${item.format}`,
        blob,
        fileSize: blob.size,
      });
    } catch (e) {
      console.error("Failed to load blob for export:", e);
    }
  };

  const handleAuditionAudio = (item: QueueDownloadItem) => {
    if (!item.resultUrl) return;
    void haptics.light();
    playTrack({
      id: item.id,
      title: item.title,
      artist: item.author,
      audioUrl: item.resultUrl,
      thumbnailUrl: item.thumbnailUrl,
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Telemetry HUD */}
      <div className="p-3.5 sm:p-4 rounded-2xl border border-[#A79277]/30 bg-gradient-to-br from-[#102C26]/70 via-[#090D0C]/90 to-[#102C26]/40 backdrop-blur-md shadow-elevation1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Metrics */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-[#102C26] border border-[#F7E7CE]/40 flex items-center justify-center text-[#F7E7CE] shadow-xs">
                <Layers className="size-4" />
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#A79277] uppercase tracking-wider block">
                  Queue Status
                </span>
                <span className="font-display text-sm font-bold text-[#F7E7CE]">
                  {activeTask ? "Downloading" : queuedTasks.length > 0 ? "Queued" : "Idle"} ·{" "}
                  <strong className="text-white">{queuedTasks.length + (activeTask ? 1 : 0)} Active</strong>
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-[#A79277]/20 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-[#102C26] border border-[#F7E7CE]/40 flex items-center justify-center text-[#F7E7CE] shadow-xs">
                <Zap className="size-4 text-emerald-400" />
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#A79277] uppercase tracking-wider block">
                  Transfer Speed
                </span>
                <span className="font-mono text-sm font-bold text-emerald-300">
                  {currentSpeedMbps > 0 ? `${currentSpeedMbps.toFixed(1)} MB/s` : "0.0 MB/s"}
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-[#A79277]/20 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-[#102C26] border border-[#F7E7CE]/40 flex items-center justify-center text-[#F7E7CE] shadow-xs">
                <HardDrive className="size-4 text-amber-300" />
              </div>
              <div>
                <span className="font-mono text-[10px] text-[#A79277] uppercase tracking-wider block">
                  Downloaded
                </span>
                <span className="font-mono text-sm font-bold text-[#F7E7CE]">
                  {formatBytes(totalDownloadedBytes)}
                </span>
              </div>
            </div>
          </div>

          {/* Global Actions */}
          <div className="flex items-center gap-1.5 ml-auto">
            {isGlobalPaused ? (
              <button
                type="button"
                onClick={() => {
                  void haptics.medium();
                  resumeAll();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold hover:bg-emerald-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Play className="size-3.5 fill-current" />
                <span>Resume All</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void haptics.medium();
                  pauseAll();
                }}
                disabled={!activeTask && queuedTasks.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 text-amber-300 font-mono text-xs font-semibold hover:bg-amber-500/30 disabled:opacity-40 disabled:hover:bg-amber-500/20 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Pause className="size-3.5" />
                <span>Pause All</span>
              </button>
            )}

            {completedTasks.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  void haptics.light();
                  clearCompleted();
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#A79277]/40 bg-[#090D0C]/80 text-[#A79277] hover:text-[#F7E7CE] hover:border-[#F7E7CE]/40 font-mono text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Trash2 className="size-3.5" />
                <span>Clear Finished</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Active Download Card (If Currently Streaming) */}
      {activeTask && (
        <div className="p-4 rounded-2xl border-2 border-[#F7E7CE] bg-[#102C26]/90 shadow-xl shadow-emerald-950/40 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Thumbnail */}
            <div className="relative size-16 sm:size-20 rounded-xl overflow-hidden bg-black shrink-0 border border-[#F7E7CE]/40 shadow-xs">
              {activeTask.thumbnailUrl ? (
                <img
                  src={activeTask.thumbnailUrl}
                  alt={activeTask.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#A79277]">
                  {activeTask.isAudioOnly ? <Music className="size-6" /> : <FileVideo className="size-6" />}
                </div>
              )}
              <span className="absolute bottom-1 right-1 font-mono text-[9px] px-1 py-0.2 rounded bg-black/80 font-bold text-[#F7E7CE]">
                {activeTask.qualityOption.badge || activeTask.qualityOption.label}
              </span>
            </div>

            {/* Info & Progress */}
            <div className="flex-1 min-w-0 w-full space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ⚡ Active Download
                    </span>
                    <span className="font-mono text-xs text-[#A79277] truncate">
                      {activeTask.author}
                    </span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-[#F7E7CE] truncate mt-0.5">
                    {activeTask.title}
                  </h4>
                </div>

                {/* Task Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handlePauseActive(activeTask.id)}
                    className="p-1.5 rounded-lg border border-[#F7E7CE]/40 bg-[#090D0C]/80 text-[#F7E7CE] hover:bg-[#102C26] transition-all cursor-pointer"
                    title="Pause Download"
                  >
                    <Pause className="size-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCancelActive(activeTask.id)}
                    className="p-1.5 rounded-lg border border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all cursor-pointer"
                    title="Cancel Download"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full h-2 rounded-full bg-[#090D0C] overflow-hidden border border-[#A79277]/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-500 via-[#F7E7CE] to-emerald-400"
                    initial={{ width: "0%" }}
                    animate={{ width: `${activeTask.progress.percent || 0}%` }}
                    transition={{ ease: "easeInOut", duration: 0.2 }}
                  />
                </div>

                {/* Subtext info */}
                <div className="flex items-center justify-between font-mono text-[11px] text-[#A79277]">
                  <span>
                    {formatBytes(activeTask.progress.downloadedBytes)} /{" "}
                    {formatBytes(activeTask.progress.totalBytes || activeTask.qualityOption.approxSizeBytes || 0)} (
                    <strong className="text-[#F7E7CE]">{activeTask.progress.percent.toFixed(1)}%</strong>)
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="text-emerald-300 font-bold">
                      {activeTask.progress.speedMbps > 0 ? `${activeTask.progress.speedMbps.toFixed(1)} MB/s` : "Staged"}
                    </span>
                    {activeTask.progress.etaSeconds > 0 && (
                      <span className="text-[#F7E7CE]">ETA {activeTask.progress.etaSeconds}s</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filter Tabs for Queue View */}
      <div className="flex items-center justify-between gap-2 border-b border-[#A79277]/30 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-[#102C26] text-[#F7E7CE] border border-[#F7E7CE]/40"
                : "text-[#A79277] hover:text-[#F7E7CE]"
            }`}
          >
            All Items ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "active"
                ? "bg-[#102C26] text-[#F7E7CE] border border-[#F7E7CE]/40"
                : "text-[#A79277] hover:text-[#F7E7CE]"
            }`}
          >
            In Queue ({queuedTasks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "completed"
                ? "bg-[#102C26] text-[#F7E7CE] border border-[#F7E7CE]/40"
                : "text-[#A79277] hover:text-[#F7E7CE]"
            }`}
          >
            Finished ({completedTasks.length})
          </button>

          {failedTasks.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("failed")}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "failed"
                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : "text-red-400 hover:text-red-300"
              }`}
            >
              Failed ({failedTasks.length})
            </button>
          )}
        </div>
      </div>

      {/* 4. Queue List Deck */}
      {items.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-[#A79277]/30 bg-[#090D0C]/60 text-center space-y-2">
          <div className="size-12 rounded-full bg-[#102C26] border border-[#F7E7CE]/30 flex items-center justify-center text-[#F7E7CE] mx-auto">
            <Download className="size-6 text-[#F7E7CE]" />
          </div>
          <h4 className="font-display text-sm font-bold text-[#F7E7CE]">
            Download Queue is Idle
          </h4>
          <p className="font-mono text-xs text-[#A79277] max-w-sm mx-auto">
            Search videos or paste links and tap <strong className="text-[#F7E7CE]">Add to Queue</strong> to process multiple downloads sequentially in the background.
          </p>
          {onNavigateToDownloader && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onNavigateToDownloader}
                className="px-4 py-2 rounded-xl bg-[#102C26] hover:bg-[#102C26]/80 border border-[#F7E7CE]/40 text-[#F7E7CE] font-mono text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                Go to Downloader
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {items
            .filter((item) => {
              if (activeTab === "active") return item.status === "queued" || item.status === "paused" || item.status === "downloading";
              if (activeTab === "completed") return item.status === "completed";
              if (activeTab === "failed") return item.status === "failed" || item.status === "cancelled";
              return true;
            })
            .map((item, idx) => {
              const isCurrentActive = item.status === "downloading";
              const isPaused = item.status === "paused";
              const isCompleted = item.status === "completed";
              const isFailed = item.status === "failed" || item.status === "cancelled";

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isCurrentActive
                      ? "border-[#F7E7CE]/60 bg-[#102C26]/60 shadow-md"
                      : isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : isFailed
                      ? "border-red-500/30 bg-red-500/5"
                      : "border-[#A79277]/25 bg-[#090D0C]/80 hover:border-[#A79277]/50"
                  }`}
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative size-12 rounded-lg overflow-hidden bg-black shrink-0 border border-[#A79277]/30">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#A79277]">
                          {item.isAudioOnly ? <Music className="size-5" /> : <FileVideo className="size-5" />}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCompleted ? (
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="size-2.5" /> Finished
                          </span>
                        ) : isCurrentActive ? (
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                            <Zap className="size-2.5" /> {item.progress.percent.toFixed(0)}%
                          </span>
                        ) : isPaused ? (
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Pause className="size-2.5" /> Paused
                          </span>
                        ) : isFailed ? (
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                            <AlertCircle className="size-2.5" /> Error
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-[#102C26] text-[#F7E7CE] border border-[#F7E7CE]/30 flex items-center gap-1">
                            <Clock className="size-2.5" /> Queued #{idx + 1}
                          </span>
                        )}

                        <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-black/60 text-[#F7E7CE] border border-[#A79277]/30 font-bold uppercase">
                          {item.qualityOption.badge || item.qualityOption.label}
                        </span>

                        <span className="font-mono text-[10px] text-[#A79277] truncate">
                          {item.author}
                        </span>
                      </div>

                      <h4 className="font-display text-xs font-bold text-[#F7E7CE] truncate">
                        {item.title}
                      </h4>

                      {isFailed && (
                        <p className="font-mono text-[10px] text-red-300 truncate">
                          {item.error || "Download failed. Please retry."}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Priority Steppers (Only for Waiting items) */}
                    {item.status === "queued" && (
                      <>
                        <button
                          type="button"
                          onClick={() => moveUp(item.id)}
                          className="p-1 rounded text-[#A79277] hover:text-[#F7E7CE] hover:bg-[#102C26] transition-all cursor-pointer"
                          title="Move Up"
                        >
                          <ArrowUp className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveDown(item.id)}
                          className="p-1 rounded text-[#A79277] hover:text-[#F7E7CE] hover:bg-[#102C26] transition-all cursor-pointer"
                          title="Move Down"
                        >
                          <ArrowDown className="size-3.5" />
                        </button>
                      </>
                    )}

                    {/* Pause / Resume for Queued/Paused */}
                    {item.status === "paused" && (
                      <button
                        type="button"
                        onClick={() => handleResumeActive(item.id)}
                        className="p-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all cursor-pointer"
                        title="Resume Download"
                      >
                        <Play className="size-3.5 fill-current" />
                      </button>
                    )}

                    {item.status === "queued" && (
                      <button
                        type="button"
                        onClick={() => handlePauseActive(item.id)}
                        className="p-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all cursor-pointer"
                        title="Pause Item"
                      >
                        <Pause className="size-3.5" />
                      </button>
                    )}

                    {/* Retry for Failed */}
                    {isFailed && (
                      <button
                        type="button"
                        onClick={() => {
                          void haptics.light();
                          retryItem(item.id);
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30 font-mono text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <RotateCcw className="size-3" />
                        <span>Retry</span>
                      </button>
                    )}

                    {/* Save / Export for Completed */}
                    {isCompleted && (
                      <>
                        {item.isAudioOnly && item.resultUrl && (
                          <button
                            type="button"
                            onClick={() => handleAuditionAudio(item)}
                            className="p-1.5 rounded-lg border border-[#F7E7CE]/40 bg-[#102C26] text-[#F7E7CE] hover:bg-[#102C26]/80 transition-all cursor-pointer"
                            title="Audition Audio"
                          >
                            <Play className="size-3.5 fill-current" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSaveCompleted(item)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-mono text-[10px] font-bold transition-all cursor-pointer"
                          title="Save to Device"
                        >
                          <Download className="size-3" />
                          <span>Export</span>
                        </button>
                      </>
                    )}

                    {/* Delete / Remove */}
                    <button
                      type="button"
                      onClick={() => {
                        void haptics.light();
                        if (isCurrentActive) {
                          handleCancelActive(item.id);
                        } else {
                          dequeue(item.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-[#A79277] hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      title="Remove from Queue"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
