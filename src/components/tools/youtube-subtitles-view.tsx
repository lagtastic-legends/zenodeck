"use client";

/**
 * ZenoDeck Subtitles & Captions Deck (src/components/tools/youtube-subtitles-view.tsx)
 * ==================================================================================
 * Interactive subtitle track manager with 1-click SRT, VTT, and TXT exports.
 */

import { useState, useMemo } from "react";
import {
  Subtitles,
  Download,
  FileText,
  FileCode,
  Eye,
  Clipboard,
  Check,
  Search,
  Sparkles,
  AlertCircle,
  Loader2,
  Languages,
} from "lucide-react";
import { type YouTubeSubtitleTrack } from "@/lib/youtube/subtitles";
import { type YouTubeVideoInfo } from "@/lib/youtube/innertube";
import { useHaptics } from "@/hooks/use-haptics";
import { useUIAudio } from "@/hooks/useUIAudio";

interface YouTubeSubtitlesViewProps {
  videoInfo: YouTubeVideoInfo | null;
  onDownloadSubtitle: (track: YouTubeSubtitleTrack, format: "srt" | "vtt" | "txt") => Promise<void>;
  onPreviewSubtitle: (track: YouTubeSubtitleTrack) => Promise<void>;
  isDownloadingSubtitle: boolean;
  onLoadSample: () => void;
}

export function YouTubeSubtitlesView({
  videoInfo,
  onDownloadSubtitle,
  onPreviewSubtitle,
  isDownloadingSubtitle,
  onLoadSample,
}: YouTubeSubtitlesViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedTrackLang, setCopiedTrackLang] = useState<string | null>(null);
  const haptics = useHaptics();
  const { playSuccess } = useUIAudio();

  const tracks = useMemo(() => {
    return videoInfo?.subtitles || [];
  }, [videoInfo]);

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase().trim();
    return tracks.filter(
      (t) =>
        t.languageName.toLowerCase().includes(q) ||
        t.languageCode.toLowerCase().includes(q)
    );
  }, [tracks, searchQuery]);

  const handleCopy = async (track: YouTubeSubtitleTrack) => {
    try {
      void haptics.light();
      // Delegate to preview or fetch text
      await onPreviewSubtitle(track);
      setCopiedTrackLang(track.languageCode);
      setTimeout(() => setCopiedTrackLang(null), 2500);
      playSuccess();
    } catch {}
  };

  if (!videoInfo) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card/50 p-6 sm:p-8 text-center space-y-4 shadow-elevation1">
        <div className="size-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
          <Subtitles className="size-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="font-display text-sm font-bold text-foreground">
            No Video Loaded
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            Enter a YouTube video URL in the Downloader tab or load our 4K demo video to extract multi-language captions.
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadSample}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold text-primary hover:bg-primary/20 transition-all cursor-pointer"
        >
          <Sparkles className="size-3.5" />
          <span>Load 4K Sample Video</span>
        </button>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-3 shadow-elevation1">
        <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="size-5" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="font-display text-sm font-bold text-amber-200">
            No Captions Available for this Video
          </h3>
          <p className="font-mono text-xs text-amber-300/80">
            This video does not have closed captions or auto-generated transcripts attached.
          </p>
        </div>
        <button
          type="button"
          onClick={onLoadSample}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-card/60 px-3 py-1.5 font-mono text-xs text-amber-200 hover:text-amber-100 transition-all cursor-pointer"
        >
          <span>Try 4K Sample with 6 Languages</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Mini Banner */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/40">
        {videoInfo.thumbnailUrl && (
          <img
            src={videoInfo.thumbnailUrl}
            alt={videoInfo.title}
            className="size-12 rounded-lg object-cover border border-border/60 shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-xs font-bold text-foreground truncate">
            {videoInfo.title}
          </h4>
          <p className="font-mono text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Languages className="size-3 text-red-400" />
            <span>{tracks.length} caption track{tracks.length !== 1 ? "s" : ""} available</span>
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative">
        <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter languages (e.g. English, Spanish, de)..."
          className="w-full rounded-xl border border-border/80 bg-background/80 py-2 pl-9 pr-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-red-500 focus:outline-hidden"
        />
      </div>

      {/* Subtitles Track List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredTracks.map((track) => (
          <div
            key={track.languageCode + (track.vssId || "")}
            className="flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-card/60 hover:border-primary/40 transition-all space-y-3 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <span className="font-display text-xs font-bold text-foreground block truncate">
                  {track.languageName}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground uppercase">
                  Code: {track.languageCode}
                </span>
              </div>

              <span
                className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold shrink-0 ${
                  track.isAutoGenerated
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {track.isAutoGenerated ? "Auto ASR" : "Official"}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
              <button
                type="button"
                onClick={() => void onDownloadSubtitle(track, "srt")}
                disabled={isDownloadingSubtitle}
                className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 font-mono text-[10px] font-bold text-emerald-300 transition-all cursor-pointer"
                title="Download SubRip .SRT format"
              >
                <FileCode className="size-3" />
                <span>.SRT</span>
              </button>

              <button
                type="button"
                onClick={() => void onDownloadSubtitle(track, "vtt")}
                disabled={isDownloadingSubtitle}
                className="flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 font-mono text-[10px] font-bold text-cyan-300 transition-all cursor-pointer"
                title="Download WebVTT .VTT format"
              >
                <Subtitles className="size-3" />
                <span>.VTT</span>
              </button>

              <button
                type="button"
                onClick={() => void onDownloadSubtitle(track, "txt")}
                disabled={isDownloadingSubtitle}
                className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/70 px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title="Download Clean Text Transcript"
              >
                <FileText className="size-3" />
                <span>.TXT</span>
              </button>

              <button
                type="button"
                onClick={() => void onPreviewSubtitle(track)}
                disabled={isDownloadingSubtitle}
                className="flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 font-mono text-[10px] font-bold text-purple-300 transition-all cursor-pointer ml-auto"
                title="Preview Transcript Lines"
              >
                <Eye className="size-3" />
                <span>Preview</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
