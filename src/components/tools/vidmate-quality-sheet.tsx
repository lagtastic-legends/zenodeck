"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Film,
  Music,
  Download,
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  Radio,
  Layers,
} from "lucide-react";
import { ZenoModal } from "@/components/ui/zeno-modal";
import { useHaptics } from "@/hooks/use-haptics";
import { formatBytes, type YouTubeVideoInfo, type YouTubeQualityOption } from "@/lib/youtube/innertube";

export interface VidmateQualitySheetProps {
  isOpen: boolean;
  onClose: () => void;
  videoInfo: YouTubeVideoInfo | null;
  selectedQualityId: string;
  onSelectQuality: (qualityId: string) => void;
  onDownload: (qualityOption: YouTubeQualityOption) => void;
  onAddToQueue?: (qualityOption: YouTubeQualityOption) => void;
}

export function VidmateQualitySheet({
  isOpen,
  onClose,
  videoInfo,
  selectedQualityId,
  onSelectQuality,
  onDownload,
  onAddToQueue,
}: VidmateQualitySheetProps) {
  const haptics = useHaptics();

  if (!videoInfo) return null;

  // Separate qualities into Audio/Music and Video options
  const audioOptions = videoInfo.qualities.filter(
    (q) => q.isAudioOnly || q.id.startsWith("audio-") || q.id === "mp3" || q.id === "m4a"
  );
  const videoOptions = videoInfo.qualities.filter(
    (q) => !q.isAudioOnly && !q.id.startsWith("audio-") && q.id !== "mp3" && q.id !== "m4a"
  );

  const currentOption = videoInfo.qualities.find((q) => q.id === selectedQualityId) || videoOptions[0] || audioOptions[0];

  const handleSelect = (q: YouTubeQualityOption) => {
    haptics.selectionChanged();
    onSelectQuality(q.id);
  };

  const handleDownload = () => {
    if (currentOption) {
      void haptics.medium();
      onClose();
      onDownload(currentOption);
    }
  };

  const handleQueue = () => {
    if (currentOption && onAddToQueue) {
      void haptics.medium();
      onClose();
      onAddToQueue(currentOption);
    }
  };

  return (
    <ZenoModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-bold tracking-tight text-foreground">Select Format & Quality</span>
        </div>
      }
      subtitle="VidMate High-Speed Interleaved Engine"
      badge="v1.0.13"
      badgeTone="emerald"
      size="lg"
      maxWidthClassName="sm:max-w-xl"
      overlayId="vidmate-quality-sheet"
      footer={
        <div className="w-full pt-1 pb-1 flex flex-col sm:flex-row items-stretch gap-2">
          <button
            onClick={handleDownload}
            disabled={!currentOption}
            className="flex-1 py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-primary via-emerald-500 to-primary bg-[length:200%_auto] hover:bg-[position:right_center] transition-all duration-300 text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.98] flex items-center justify-center gap-2.5 border border-primary/30 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>
              DOWNLOAD NOW {currentOption?.approxSizeBytes ? `(${formatBytes(currentOption.approxSizeBytes)})` : ""}
            </span>
          </button>
          {onAddToQueue && (
            <button
              onClick={handleQueue}
              disabled={!currentOption}
              className="sm:w-auto py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide bg-secondary/80 hover:bg-secondary border border-border/80 text-foreground transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              title="Add this format to the background download queue"
            >
              <Layers className="w-4 h-4 text-primary" />
              <span>Queue</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Preview Header */}
        <div className="flex gap-3 p-2.5 rounded-xl bg-secondary/50 border border-border/60">
          <div className="relative w-28 h-18 rounded-lg overflow-hidden shrink-0 bg-muted/40 aspect-video">
            {videoInfo.thumbnailUrl ? (
              <img
                src={videoInfo.thumbnailUrl}
                alt={videoInfo.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Film className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-white backdrop-blur-xs flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {videoInfo.durationFormatted}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h4 className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
              {videoInfo.title}
            </h4>
            <p className="text-[11px] text-muted-foreground truncate mt-1">
              {videoInfo.author}
            </p>
          </div>
        </div>

        {/* 🎵 Music / Direct Audio Section */}
        {audioOptions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-0.5">
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Music & Audio (Direct Stream)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {audioOptions.map((opt) => {
                const isSelected = opt.id === selectedQualityId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500/60 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-500/40"
                        : "bg-card/60 hover:bg-secondary/60 border-border/50 text-muted-foreground"
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${isSelected ? "text-emerald-400" : "text-foreground"}`}>
                          {opt.badge || opt.label.split(" ")[0]}
                        </span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-secondary font-mono text-muted-foreground uppercase">
                          {opt.container}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                        {opt.approxSizeBytes ? formatBytes(opt.approxSizeBytes) : "Original Audio"}
                      </span>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40"
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-black" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 🎬 Video Resolutions Section */}
        {videoOptions.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-1.5 px-0.5">
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Video Resolutions (360p to 8K 60FPS)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {videoOptions.map((opt) => {
                const isSelected = opt.id === selectedQualityId;
                const is8K = opt.is8K || opt.badge.includes("8K");
                const is4K = !is8K && (opt.is4K || opt.badge.includes("4K"));
                const is60fps = opt.is60fps || opt.badge.includes("60");

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-primary/10 border-primary/60 shadow-sm shadow-primary/20 ring-1 ring-primary/40"
                        : "bg-card/60 hover:bg-secondary/60 border-border/50 text-muted-foreground"
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {opt.badge}
                        </span>
                        {is8K && (
                          <span className="text-[9px] px-1 py-0.2 rounded font-extrabold bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30">
                            8K FUHD
                          </span>
                        )}
                        {is4K && (
                          <span className="text-[9px] px-1 py-0.2 rounded font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            UHD
                          </span>
                        )}
                        {is60fps && !is8K && !is4K && (
                          <span className="text-[9px] px-1 py-0.2 rounded font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            60FPS
                          </span>
                        )}
                        <span className="text-[10px] px-1 py-0.2 rounded bg-secondary font-mono text-muted-foreground uppercase">
                          {opt.container}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate mt-0.5">
                        {opt.approxSizeBytes ? formatBytes(opt.approxSizeBytes) : "Standard"}
                      </span>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ZenoModal>
  );
}
