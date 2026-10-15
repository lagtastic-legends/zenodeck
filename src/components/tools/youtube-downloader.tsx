"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Youtube,
  Download,
  Zap,
  Gauge,
  Film,
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Clipboard,
  ShieldCheck,
  Radio,
  X,
  ListPlus,
  CheckSquare,
  Square,
  Pause,
  PlayCircle,
  Layers,
  Subtitles,
  History,
  FileText,
  Trash2,
  Search,
  Eye,
  FileCode,
  Scissors,
  HardDrive,
  Headphones,
  Send,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { getClipboardText } from "@/lib/clipboard";
import {
  fetchAndFormatSubtitles,
  type YouTubeSubtitleTrack,
} from "@/lib/youtube/subtitles";
import { useHistoryStore } from "@/lib/youtube/history-store";
import { usePlayerStore } from "@/lib/youtube/player-store";
import { YouTubeMiniPlayer } from "./youtube-mini-player";
import { YouTubeSubtitlesView } from "./youtube-subtitles-view";
import { YouTubeVaultView } from "./youtube-vault-view";
import { useFFmpegEngine } from "@/lib/ffmpeg/use-ffmpeg";
import { useHaptics } from "@/hooks/use-haptics";
import { useUIAudio } from "@/hooks/useUIAudio";
import { nativeSave } from "@/lib/native-save";
import { useSaveDialogStore } from "@/hooks/useSaveDialogStore";
import { acquireWakeLock, releaseWakeLock } from "@/lib/wake-lock";
import {
  extractYouTubeId,
  formatBytes,
  formatDuration,
  getYouTubeApiUrl,
  resolveYouTubeVideo,
  type YouTubeQualityOption,
  type YouTubeVideoInfo,
} from "@/lib/youtube/innertube";
import {
  downloadYouTubeStream,
  createPauseController,
  type PauseController,
  type TurboProgress,
  type TurboDownloadResult,
} from "@/lib/youtube/turbo-downloader";

import {
  extractPlaylistId,
  resolveYouTubePlaylist,
  type YouTubePlaylistInfo,
  type YouTubePlaylistItem,
} from "@/lib/youtube/playlist";
import {
  BatchQueueController,
  type BatchItem,
  type QueueStats,
} from "@/lib/youtube/batch-queue";
import {
  detectPlatform,
  PLATFORM_CONFIGS,
  type DetectedPlatformResult,
} from "@/lib/media/detector";
import { resolveMediaUrl } from "@/lib/media/universal-resolver";
import { downloadUniversalMedia, fetchStreamWithProgress } from "@/lib/media/downloader";
import type {
  UniversalMediaInfo,
  UniversalQualityOption,
  PlatformType,
} from "@/lib/media/types";

export function YouTubeDownloader() {
  const { engine, state: engineState, boot } = useFFmpegEngine();
  const haptics = useHaptics();
  const { playSuccess, playError } = useUIAudio();

  const [inputUrl, setInputUrl] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformType>("youtube");
  const [universalMedia, setUniversalMedia] = useState<UniversalMediaInfo | null>(null);

  const [selectedQuality, setSelectedQuality] = useState<YouTubeQualityOption | null>(null);
  const [mediaTypeTab, setMediaTypeTab] = useState<"video" | "audio">("video");
  const [workersCount, setWorkersCount] = useState<number>(6);

  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<TurboProgress | null>(null);
  const [downloadResult, setDownloadResult] = useState<TurboDownloadResult | null>(null);

  // Time-Range Clipper & Pause/Resume State
  const [isClipEnabled, setIsClipEnabled] = useState(false);
  const [clipStartTime, setClipStartTime] = useState("00:00");
  const [clipEndTime, setClipEndTime] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const pauseControllerRef = useRef<PauseController | null>(null);

  const handleTogglePause = () => {
    if (!pauseControllerRef.current) return;
    if (isPaused) {
      pauseControllerRef.current.resume();
      setIsPaused(false);
      void haptics.light();
    } else {
      pauseControllerRef.current.pause();
      setIsPaused(true);
      void haptics.light();
    }
  };

  const handleSendToZenoTap = (type: "video" | "audio") => {
    if (!downloadResult) return;
    void haptics.success();
    window.dispatchEvent(
      new CustomEvent("zenodeck:open-deck-media", {
        detail: {
          type,
          url: downloadResult.url,
          filename: downloadResult.filename,
        },
      })
    );
  };

  const handleOpenIn8DStudio = () => {
    if (!downloadResult) return;
    void haptics.success();
    window.dispatchEvent(
      new CustomEvent("zenodeck:open-8d-audio", {
        detail: {
          url: downloadResult.url,
          filename: downloadResult.filename,
        },
      })
    );
  };

  // Playlist & Batch Queue State
  const [playlistInfo, setPlaylistInfo] = useState<YouTubePlaylistInfo | null>(null);
  const [isPlaylistMode, setIsPlaylistMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [batchQualityBadge, setBatchQualityBadge] = useState<string>("1080P");
  const [batchIsAudioOnly, setBatchIsAudioOnly] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchStats, setBatchStats] = useState<QueueStats | null>(null);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const batchControllerRef = useRef<BatchQueueController | null>(null);


  // View Navigation: "downloader" | "subtitles" | "vault"
  const [activeViewTab, setActiveViewTab] = useState<"downloader" | "subtitles" | "vault">("downloader");

  // Subtitle Engine State
  const [isDownloadingSubtitle, setIsDownloadingSubtitle] = useState(false);
  const [previewSubtitleText, setPreviewSubtitleText] = useState<string | null>(null);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState<YouTubeSubtitleTrack | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // History Vault & Player Store
  const historyStore = useHistoryStore();
  const playerStore = usePlayerStore();
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");
  const [vaultFilter, setVaultFilter] = useState<"all" | "video" | "audio" | "subtitles">("all");

  const abortControllerRef = useRef<AbortController | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const currentResultUrlRef = useRef<string | null>(null);

  const clearResult = useCallback(() => {
    if (currentResultUrlRef.current) {
      try {
        URL.revokeObjectURL(currentResultUrlRef.current);
      } catch {}
      currentResultUrlRef.current = null;
    }
    setDownloadResult(null);
    setProgress(null);
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (currentResultUrlRef.current) {
        try {
          URL.revokeObjectURL(currentResultUrlRef.current);
        } catch {}
        currentResultUrlRef.current = null;
      }
    };
  }, []);

  // Handle Escape key and body scroll locking for subtitle transcript preview modal
  useEffect(() => {
    if (!isPreviewOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPreviewOpen]);

  const videoQualities = videoInfo?.qualities.filter((q) => !q.isAudioOnly) || [];
  const audioQualities = videoInfo?.qualities.filter((q) => q.isAudioOnly) || [];
  const displayedQualities = mediaTypeTab === "video" ? videoQualities : audioQualities;

  const handleTabChange = (tab: "video" | "audio") => {
    setMediaTypeTab(tab);
    if (!videoInfo) return;
    if (tab === "video") {
      if (!selectedQuality || selectedQuality.isAudioOnly) {
        const v = videoInfo.qualities?.find((q) => !q.isAudioOnly);
        if (v) setSelectedQuality(v);
      }
    } else {
      if (!selectedQuality || !selectedQuality.isAudioOnly) {
        const a = videoInfo.qualities?.find((q) => q.isAudioOnly);
        if (a) setSelectedQuality(a);
      }
    }
    void haptics.light();
  };

  // Auto-boot FFmpeg engine when mounting this tool
  useEffect(() => {
    if (engineState === "idle") {
      void boot();
    }
  }, [engineState, boot]);

  // Handle URL Resolution
  const handleResolve = async (urlToResolve = inputUrl) => {
    const detected = detectPlatform(urlToResolve);
    const videoId = extractYouTubeId(urlToResolve);
    const playlistId = extractPlaylistId(urlToResolve);

    if (!detected && !videoId && !playlistId) {
      setResolveError("Please enter a valid video link from YouTube, TikTok, Instagram, Twitter / X, Reddit, Facebook, Vimeo, Twitch, or any supported social media.");
      void haptics.warning();
      return;
    }

    if (detected && detected.platform !== "youtube") {
      setActivePlatform(detected.platform);
      setResolveError(null);
      setIsResolving(true);
      setVideoInfo(null);
      setUniversalMedia(null);
      setPlaylistInfo(null);
      setIsPlaylistMode(false);
      clearResult();
      void haptics.light();

      try {
        const res = await resolveMediaUrl(urlToResolve);
        setUniversalMedia(res.mediaInfo);

        const mappedQualities: YouTubeQualityOption[] = res.mediaInfo.qualities.map((q, idx) => ({
          id: `qual_${idx}_${q.ext}`,
          label: q.label,
          resolutionLabel: q.resolution || (q.isAudioOnly ? "AUDIO" : "HD"),
          fps: 30,
          badge: q.resolution || (q.isAudioOnly ? "AUDIO" : "HD"),
          is4K: false,
          is60fps: false,
          isAudioOnly: !!q.isAudioOnly,
          container: (q.ext as "mp4" | "webm" | "mp3" | "m4a" | "wav") || "mp4",
          approxSizeBytes: q.fileSize || 0,
          audioBitrate: q.bitrate,
          videoFormat: q.isAudioOnly ? undefined : ({ url: q.downloadUrl } as any),
          audioFormat: q.isAudioOnly ? ({ url: q.downloadUrl } as any) : undefined,
        }));

        setVideoInfo({
          videoId: res.mediaInfo.id,
          title: res.mediaInfo.title,
          author: res.mediaInfo.author,
          thumbnailUrl: res.mediaInfo.thumbnailUrl,
          durationSeconds: res.mediaInfo.duration || 0,
          durationFormatted: formatDuration(res.mediaInfo.duration || 0),
          viewCount: res.mediaInfo.viewCount,
          qualities: mappedQualities,
        });

        const firstVideo = mappedQualities.find((q) => !q.isAudioOnly);
        const firstAudio = mappedQualities.find((q) => q.isAudioOnly);

        if (mediaTypeTab === "audio" && firstAudio) {
          setSelectedQuality(firstAudio);
        } else if (firstVideo) {
          setSelectedQuality(firstVideo);
        } else if (mappedQualities.length > 0) {
          setSelectedQuality(mappedQualities[0]);
        }

        void haptics.success();
        playSuccess();
      } catch (err: any) {
        console.error("Multi-platform media resolution error:", err);
        setResolveError(err.message || "Failed to resolve media from this link.");
        void haptics.error();
        playError();
      } finally {
        setIsResolving(false);
      }
      return;
    }

    setActivePlatform("youtube");
    setResolveError(null);
    setIsResolving(true);
    setVideoInfo(null);
    setUniversalMedia(null);
    clearResult();
    void haptics.light();

    // Check playlist concurrently if list parameter is present
    if (playlistId) {
      void resolveYouTubePlaylist(urlToResolve)
        .then((pInfo) => {
          setPlaylistInfo(pInfo);
          setSelectedVideoIds(new Set(pInfo.items.map((i) => i.videoId)));
          if (!videoId) {
            setIsPlaylistMode(true);
            setIsResolving(false);
          }
        })
        .catch((pErr) => {
          console.warn("Playlist detection resolution error:", pErr);
          if (!videoId) {
            setResolveError("Could not resolve YouTube playlist. Ensure the playlist is public or unlisted.");
            setIsResolving(false);
          }
        });
    } else {
      setPlaylistInfo(null);
      setIsPlaylistMode(false);
    }

    if (!videoId) {
      return;
    }

    try {
      let data: any = null;
      let lastErrorMessage = "";

      // 1. Native mobile resolution: If running in Capacitor (Android/iOS APK),
      // resolve DIRECTLY on the user's mobile device via native network stack (CapacitorHttp).
      // This bypasses browser CORS and cloud datacenter IP blocks completely!
      if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
        try {
          const directInfo = await resolveYouTubeVideo(videoId);
          if (directInfo && directInfo.videoId && Array.isArray(directInfo.qualities) && directInfo.qualities.length > 0) {
            data = directInfo;
          }
        } catch (nativeErr: any) {
          console.warn("Direct device resolution error:", nativeErr);
          lastErrorMessage = nativeErr?.message || "";
        }
      }

      // 2. Web browser: Query Next.js API route
      if (!data) {
        const apiUrl = getYouTubeApiUrl("/api/youtube/info");
        // Primary: GET with videoId query parameter
        let res = await fetch(`${apiUrl}?v=${encodeURIComponent(videoId)}`);
        data = await res.json().catch(() => ({}));

        // Fallback: If GET returns static status or lacks qualities, try POST
        if (!data || !data.videoId || !Array.isArray(data.qualities) || data.qualities.length === 0) {
          const postRes = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoId }),
          });
          if (postRes.ok) {
            const postData = await postRes.json().catch(() => ({}));
            if (postData && postData.videoId && Array.isArray(postData.qualities) && postData.qualities.length > 0) {
              data = postData;
            }
          }
        }
      }

      // 3. Fallback: Direct Client-Side Resolution (on-device or local desktop client)
      if (!data || !data.videoId || !Array.isArray(data.qualities) || data.qualities.length === 0) {
        try {
          const directInfo = await resolveYouTubeVideo(videoId);
          if (directInfo && directInfo.videoId && Array.isArray(directInfo.qualities) && directInfo.qualities.length > 0) {
            data = directInfo;
          }
        } catch (directErr: any) {
          if (!lastErrorMessage) lastErrorMessage = directErr?.message || "";
        }
      }

      if (!data || !data.videoId || !Array.isArray(data.qualities) || data.qualities.length === 0) {
        throw new Error(data?.error || lastErrorMessage || "Failed to resolve video details");
      }

      const info: YouTubeVideoInfo = data;
      setVideoInfo(info);

      // Default select the appropriate option based on active tab
      const firstVideo = info.qualities?.find((q) => !q.isAudioOnly);
      const firstAudio = info.qualities?.find((q) => q.isAudioOnly);

      if (mediaTypeTab === "audio" && firstAudio) {
        setSelectedQuality(firstAudio);
      } else if (firstVideo) {
        setSelectedQuality(firstVideo);
      } else if (info.qualities && info.qualities.length > 0) {
        setSelectedQuality(info.qualities[0]);
      }
      void haptics.success();
    } catch (err: any) {
      console.error("Resolve error:", err);
      setResolveError(err.message || "Failed to load YouTube video streams.");
      void haptics.error();
    } finally {
      setIsResolving(false);
    }
  };

  // Handle Paste
  const handlePaste = async () => {
    void haptics.light();
    try {
      const text = await getClipboardText();
      if (text && text.trim()) {
        setInputUrl(text.trim());
        void handleResolve(text.trim());
      }
    } catch (err) {
      console.warn("Clipboard paste error:", err);
    }
  };

  // Listen for native Android ACTION_SEND shared URL event and auto-resolve
  useEffect(() => {
    const processSharedUrl = (url: string) => {
      if (!url) return;
      const cleanUrl = url.trim();
      setInputUrl(cleanUrl);
      void handleResolve(cleanUrl);
    };

    if (typeof window !== "undefined") {
      const pendingUrl = (window as any).__zenodeck_pending_shared_url;
      if (pendingUrl) {
        (window as any).__zenodeck_pending_shared_url = null;
        processSharedUrl(pendingUrl);
      }

      const onSharedUrl = (e: any) => {
        const url = e?.detail?.url;
        if (url) {
          processSharedUrl(url);
        }
      };

      window.addEventListener("zenodeck:shared-url", onSharedUrl);
      return () => {
        window.removeEventListener("zenodeck:shared-url", onSharedUrl);
      };
    }
  }, []);

  // Handle Turbo Download
  const handleStartDownload = async () => {
    if (!videoInfo || !selectedQuality) return;

    if (activePlatform !== "youtube" && universalMedia) {
      const chosenUniversalOpt =
        universalMedia.qualities.find(
          (q) => q.label === selectedQuality.label && !!q.isAudioOnly === !!selectedQuality.isAudioOnly
        ) ||
        universalMedia.qualities.find((q) => q.label === selectedQuality.label) ||
        universalMedia.qualities[0];

      if (!chosenUniversalOpt) {
        setResolveError("Selected format option is invalid.");
        return;
      }

      setIsDownloading(true);
      clearResult();
      void haptics.medium();
      void acquireWakeLock();
      abortControllerRef.current = new AbortController();

      try {
        const result = await downloadUniversalMedia(universalMedia, chosenUniversalOpt, {
          ffmpegEngine: engine,
          clipRange: isClipEnabled && (clipStartTime || clipEndTime) ? { startTime: clipStartTime, endTime: clipEndTime } : undefined,
          onProgress: (p) => {
            setProgress({
              phase: p.phase as any,
              progress: p.percent,
              speedMbps: p.speedMBs || 0,
              downloadedBytes: p.transferredBytes || 0,
              totalBytes: p.totalBytes || 0,
              activeThreads: 1,
              etaSeconds: 0,
              statusMessage: p.message,
            });
          },
          abortSignal: abortControllerRef.current.signal,
        });

        currentResultUrlRef.current = result.url;
        setDownloadResult(result);
        void haptics.success();
        playSuccess();

        // Record to History Vault
        historyStore.addItem({
          videoId: universalMedia.id,
          title: universalMedia.title,
          author: universalMedia.author,
          thumbnailUrl: universalMedia.thumbnailUrl,
          durationFormatted: formatDuration(universalMedia.duration || 0),
          qualityBadge: chosenUniversalOpt.label,
          format: chosenUniversalOpt.ext,
          fileSizeBytes: result.fileSizeBytes,
          isAudioOnly: !!chosenUniversalOpt.isAudioOnly,
          audioStreamUrl: chosenUniversalOpt.isAudioOnly ? result.url : undefined,
          localFileName: result.filename,
          platform: activePlatform,
        });
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Universal download failed:", err);
          setResolveError(err.message || "Download failed. Please try again.");
          void haptics.error();
          playError();
        }
      } finally {
        void releaseWakeLock();
        setIsDownloading(false);
      }
      return;
    }


    const isDirectFastPath =
      (!selectedQuality.isAudioOnly && !selectedQuality.audioFormat && Boolean(selectedQuality.videoFormat)) ||
      (selectedQuality.isAudioOnly && selectedQuality.id === "audio-m4a" && selectedQuality.audioFormat?.container === "m4a");

    let activeEngine = engine;
    if (!isDirectFastPath && (!activeEngine || engineState !== "ready")) {
      try {
        const booted = await boot();
        if (booted) activeEngine = booted;
      } catch (bootErr) {
        console.warn("FFmpeg engine boot deferred:", bootErr);
      }
    }

    setIsDownloading(true);
    clearResult();
    void haptics.medium();
    void acquireWakeLock();
    pauseControllerRef.current = createPauseController();
    setIsPaused(false);

    abortControllerRef.current = new AbortController();

    let didFallback = false;
    let stallWatchdogTimer: any = null;

    const triggerYtDlpStreamFallback = async (reason?: string) => {
      // ON NATIVE ANDROID: Banish remote Vercel /api/youtube/download fallback!
      // Vercel serverless has no yt-dlp binary and datacenter IPs are blocked by YouTube.
      // Remote download URLs from googlevideo are IP-bound to the user's phone.
      if (Capacitor.isNativePlatform()) {
        console.warn("Direct turbo streaming encountered an issue on Android:", reason);
        throw new Error(
          `Local stream download interrupted (${reason || "stream timeout"}). Please tap "Start Turbo Download" to retry directly with Android hardware engine.`
        );
      }

      console.warn("Direct turbo streaming stalled or failed, activating stream fallback:", reason);
      setProgress({
        phase: "downloading",
        progress: 10,
        speedMbps: 0,
        downloadedBytes: 0,
        totalBytes: selectedQuality.approxSizeBytes || 0,
        activeThreads: 1,
        etaSeconds: 0,
        statusMessage: "Connecting to stream engine…",
      });

      const qualityParam = selectedQuality.badge || selectedQuality.resolutionLabel || selectedQuality.label || "best";
      const fallbackUrl = getYouTubeApiUrl(
        `/api/youtube/download?url=${encodeURIComponent(inputUrl.trim() || videoInfo.videoId)}&quality=${encodeURIComponent(qualityParam)}&format=${encodeURIComponent(selectedQuality.container)}`
      );

      // Strict 15-second hard timeout on fallback stream to guarantee UI never freezes indefinitely
      const fallbackTimeoutController = new AbortController();
      const fallbackTimeoutTimer = setTimeout(() => {
        fallbackTimeoutController.abort();
      }, 15000);

      const onParentAbort = () => fallbackTimeoutController.abort();
      abortControllerRef.current?.signal.addEventListener("abort", onParentAbort, { once: true });

      let streamBytes: Uint8Array;
      try {
        streamBytes = await fetchStreamWithProgress(
          fallbackUrl,
          (received, total) => {
            const tot = total || selectedQuality.approxSizeBytes || 0;
            const pct = tot > 0 ? Math.min(95, Math.max(10, Math.round((received / tot) * 90))) : Math.min(85, Math.round(received / (1024 * 1024)));
            setProgress({
              phase: "downloading",
              progress: pct,
              speedMbps: 0,
              downloadedBytes: received,
              totalBytes: tot,
              activeThreads: 1,
              etaSeconds: 0,
              statusMessage: `Streaming media: ${(received / (1024 * 1024)).toFixed(1)} MB transferred…`,
            });
          },
          fallbackTimeoutController.signal
        );
      } catch (streamErr: any) {
        if (fallbackTimeoutController.signal.aborted && !abortControllerRef.current?.signal.aborted) {
          throw new Error("Stream connection timed out. Please check your network and tap Download to retry.");
        }
        // STRICT RESOLUTION LOCK: Banned silent 360p fallback!
        // Never substitute itag 18 or lower resolutions when user requested 4K/2K/1080p.
        throw streamErr;
      } finally {
        clearTimeout(fallbackTimeoutTimer);
        abortControllerRef.current?.signal.removeEventListener("abort", onParentAbort);
      }

      const mimeType = selectedQuality.isAudioOnly
        ? (selectedQuality.container === "mp3" ? "audio/mpeg" : "audio/mp4")
        : (selectedQuality.container === "webm" ? "video/webm" : "video/mp4");

      const blob = new Blob([streamBytes.buffer as ArrayBuffer], { type: mimeType });
      const safeTitle = (videoInfo.title || "video").replace(/[<>:"/\\|?*]/g, "_").trim().slice(0, 60);
      const resTag = selectedQuality.badge || selectedQuality.resolutionLabel || selectedQuality.label || "HD";
      const filename = `${safeTitle} [${resTag}].${selectedQuality.container}`;
      const url = URL.createObjectURL(blob);

      const fbResult: TurboDownloadResult = {
        blob,
        url,
        filename,
        fileSizeBytes: blob.size,
        mimeType,
        is4K: selectedQuality.is4K,
        is60fps: selectedQuality.is60fps,
      };

      currentResultUrlRef.current = fbResult.url;
      setDownloadResult(fbResult);
      await nativeSave(blob, filename);

      void haptics.success();
      playSuccess();

      // Record to History Vault
      historyStore.addItem({
        videoId: videoInfo.videoId,
        title: videoInfo.title,
        author: videoInfo.author,
        thumbnailUrl: videoInfo.thumbnailUrl,
        durationFormatted: videoInfo.durationFormatted,
        qualityBadge: selectedQuality.badge,
        format: selectedQuality.container,
        fileSizeBytes: blob.size,
        isAudioOnly: selectedQuality.isAudioOnly,
        audioStreamUrl: selectedQuality.isAudioOnly ? url : undefined,
        localFileName: filename,
        platform: "youtube",
      });

      setProgress({
        phase: "complete",
        progress: 100,
        speedMbps: 0,
        downloadedBytes: blob.size,
        totalBytes: blob.size,
        activeThreads: 0,
        etaSeconds: 0,
        statusMessage: "Download complete!",
      });
    };

    // Watchdog: If direct chunk streaming hasn't received any bytes within 25s (extended for 4K/2K), switch to high-speed stream (Web only)
    const isUltraHd = selectedQuality.is4K || selectedQuality.resolutionLabel?.includes("2160") || selectedQuality.resolutionLabel?.includes("1440");
    const watchdogTimeoutMs = isUltraHd ? 25000 : 15000;
    if (!Capacitor.isNativePlatform()) {
      stallWatchdogTimer = setTimeout(() => {
        if (!didFallback) {
          console.warn(`Direct stream stalled at 0% after ${watchdogTimeoutMs}ms — switching to high-speed server stream`);
          didFallback = true;
          abortControllerRef.current?.abort();
          abortControllerRef.current = new AbortController();
          void triggerYtDlpStreamFallback("Direct stream initial connection timeout").catch((err) => {
            if (err.name !== "AbortError" && err.message !== "Download aborted") {
              setResolveError(err.message || "Download failed. Please check network connection.");
              void haptics.error();
              playError();
            }
          }).finally(() => {
            setIsDownloading(false);
          });
        }
      }, watchdogTimeoutMs);
    }

    try {
      const result = await downloadYouTubeStream({
        option: selectedQuality,
        videoTitle: videoInfo.title,
        author: videoInfo.author,
        thumbnailUrl: videoInfo.thumbnailUrl,
        engine: activeEngine,
        maxParallelWorkers: workersCount,
        clipRange: isClipEnabled && (clipStartTime || clipEndTime) ? { startTime: clipStartTime, endTime: clipEndTime } : undefined,
        pauseController: pauseControllerRef.current || undefined,
        onProgress: (p) => {
          if (p.downloadedBytes > 0 && stallWatchdogTimer) {
            clearTimeout(stallWatchdogTimer);
            stallWatchdogTimer = null;
          }
          setProgress(p);
        },
        signal: abortControllerRef.current.signal,
      });

      if (stallWatchdogTimer) clearTimeout(stallWatchdogTimer);
      if (didFallback) return;

      currentResultUrlRef.current = result.url;
      setDownloadResult(result);

      if (result.savedNativePath || result.url.startsWith("file://")) {
        // Native Android MediaMuxer already muxed directly into Movies/ZenoDeck and indexed into MediaStore
        const nativeUri = result.savedNativePath
          ? (result.savedNativePath.startsWith("file://") ? result.savedNativePath : `file://${result.savedNativePath}`)
          : result.url;
        useSaveDialogStore.getState().showSuccess({
          filename: result.filename,
          directory: "Movies/ZenoDeck",
          uri: nativeUri,
          fileSize: result.fileSizeBytes,
          blob: result.blob,
        });
      } else {
        await nativeSave(result.blob, result.filename);
      }
      void haptics.success();
      playSuccess();

      // Record to Download History Vault
      if (videoInfo && selectedQuality) {
        historyStore.addItem({
          videoId: videoInfo.videoId,
          title: videoInfo.title,
          author: videoInfo.author,
          thumbnailUrl: videoInfo.thumbnailUrl,
          durationFormatted: videoInfo.durationFormatted,
          qualityBadge: selectedQuality.badge,
          format: selectedQuality.container,
          fileSizeBytes: result.fileSizeBytes || result.blob.size,
          isAudioOnly: selectedQuality.isAudioOnly,
          audioStreamUrl: selectedQuality.isAudioOnly ? selectedQuality.audioFormat?.url || result.url : undefined,
          localFileName: result.filename,
        });
      }
    } catch (err: any) {
      if (stallWatchdogTimer) clearTimeout(stallWatchdogTimer);
      if (didFallback) return;

      if (err.name === "AbortError" || err.message === "Download aborted") {
        return;
      }

      if (Capacitor.isNativePlatform()) {
        console.error("Native Android download encountered error:", err);
        const isExpiredOrForbidden =
          err.message?.includes("403") ||
          err.message?.includes("expired") ||
          err.message?.includes("Forbidden");

        if (isExpiredOrForbidden && videoInfo?.videoId && !abortControllerRef.current?.signal.aborted) {
          try {
            console.info("Re-resolving fresh stream manifest on Android via InnerTube client pipeline...");
            setProgress({
              phase: "resolving",
              progress: 10,
              speedMbps: 0,
              downloadedBytes: 0,
              totalBytes: selectedQuality.approxSizeBytes || 0,
              activeThreads: 1,
              etaSeconds: 0,
              statusMessage: "Refreshing unthrottled stream credentials…",
            });
            const freshInfo = await resolveYouTubeVideo(videoInfo.videoId);
            setVideoInfo(freshInfo);
            const matchingQ =
              freshInfo.qualities.find((q) => q.id === selectedQuality.id) ||
              freshInfo.qualities.find((q) => q.badge === selectedQuality.badge) ||
              freshInfo.qualities[0];
            if (matchingQ) {
              setSelectedQuality(matchingQ);
              const retryRes = await downloadYouTubeStream({
                option: matchingQ,
                videoTitle: freshInfo.title,
                author: freshInfo.author,
                thumbnailUrl: freshInfo.thumbnailUrl,
                engine: activeEngine,
                maxParallelWorkers: workersCount,
                signal: abortControllerRef.current.signal,
                onProgress: (p) => setProgress(p),
              });
              currentResultUrlRef.current = retryRes.url;
              setDownloadResult(retryRes);
              void haptics.success();
              playSuccess();
              return;
            }
          } catch (retryErr: any) {
            console.warn("On-device stream re-resolution retry failed:", retryErr);
          }
        }

        setResolveError(
          err.message?.includes("CORS") || err.message?.includes("502")
            ? "YouTube download interrupted. Please check connection and try again."
            : err.message || "Download failed. Please check network connection."
        );
        void haptics.error();
        playError();
        return;
      }

      console.warn("Direct download failed, attempting high-speed stream fallback:", err);
      try {
        didFallback = true;
        abortControllerRef.current = new AbortController();
        await triggerYtDlpStreamFallback(err.message || "Direct stream error");
      } catch (fallbackErr: any) {
        if (fallbackErr.name !== "AbortError" && fallbackErr.message !== "Download aborted") {
          console.error("Both direct streaming and stream fallback failed:", fallbackErr);
          setResolveError(fallbackErr.message || "Download failed. Please try a different quality tier.");
          void haptics.error();
          playError();
        }
      }
    } finally {
      void releaseWakeLock();
      pauseControllerRef.current = null;
      setIsPaused(false);
      if (stallWatchdogTimer) clearTimeout(stallWatchdogTimer);
      if (!didFallback) {
        setIsDownloading(false);
      }
    }

  };

  // Batch Download Handlers
  const handleToggleVideoSelect = (vid: string) => {
    void haptics.light();
    setSelectedVideoIds((prev) => {
      const next = new Set(prev);
      if (next.has(vid)) next.delete(vid);
      else next.add(vid);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    void haptics.light();
    if (!playlistInfo) return;
    if (selectedVideoIds.size === playlistInfo.items.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(playlistInfo.items.map((i) => i.videoId)));
    }
  };

  const handleStartBatchDownload = async () => {
    if (!playlistInfo || selectedVideoIds.size === 0) return;

    let activeEngine = engine;
    if (!activeEngine || engineState !== "ready") {
      try {
        const booted = await boot();
        if (booted) activeEngine = booted;
      } catch (bootErr) {
        console.warn("FFmpeg engine boot deferred for batch:", bootErr);
      }
    }

    const itemsToDownload: BatchItem[] = playlistInfo.items
      .filter((item) => selectedVideoIds.has(item.videoId))
      .map((item) => ({
        id: `${item.videoId}-${Date.now()}`,
        videoId: item.videoId,
        title: item.title,
        author: item.author,
        durationFormatted: item.durationFormatted,
        thumbnailUrl: item.thumbnailUrl,
        status: "idle",
        progress: 0,
        speedMbps: 0,
      }));

    setBatchItems(itemsToDownload);
    setIsBatchRunning(true);
    void haptics.medium();
    void acquireWakeLock();

    const controller = new BatchQueueController({
      items: itemsToDownload,
      targetQualityBadge: batchQualityBadge,
      isAudioOnly: batchIsAudioOnly,
      engine: activeEngine,
      onItemUpdate: (updatedItem, stats) => {
        setBatchItems((prev) =>
          prev.map((i) => (i.videoId === updatedItem.videoId ? { ...updatedItem } : i))
        );
        setBatchStats(stats);
      },
      onQueueComplete: (finalItems) => {
        void releaseWakeLock();
        setIsBatchRunning(false);
        setBatchItems([...finalItems]);
        void haptics.success();
        playSuccess();
      },
    });

    batchControllerRef.current = controller;
    void controller.start();
  };

  const handlePauseBatch = () => {
    void haptics.light();
    void releaseWakeLock();
    batchControllerRef.current?.pause();
    setIsBatchRunning(false);
  };

  const handleCancelBatch = () => {
    void haptics.light();
    void releaseWakeLock();
    batchControllerRef.current?.cancel();
    setIsBatchRunning(false);
    setBatchItems([]);
    setBatchStats(null);
  };

  const handleRetryFailedBatch = () => {
    void haptics.light();
    setIsBatchRunning(true);
    batchControllerRef.current?.retryFailed();
  };

  // Handle Cancel
  const handleCancelDownload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsDownloading(false);
    setProgress(null);
    void haptics.light();
  };

  // Handle Save to Device
  const handleSaveToDevice = async () => {
    if (!downloadResult) return;
    void haptics.medium();
    if (downloadResult.savedNativePath || downloadResult.url.startsWith("file://")) {
      const nativeUri = downloadResult.savedNativePath
        ? (downloadResult.savedNativePath.startsWith("file://") ? downloadResult.savedNativePath : `file://${downloadResult.savedNativePath}`)
        : downloadResult.url;
      useSaveDialogStore.getState().showSuccess({
        filename: downloadResult.filename,
        directory: "Movies/ZenoDeck",
        uri: nativeUri,
        fileSize: downloadResult.fileSizeBytes,
        blob: downloadResult.blob,
      });
      return;
    }
    await nativeSave(downloadResult.blob, downloadResult.filename);
  };

  // Subtitle Handlers
  const handleDownloadSubtitle = async (track: YouTubeSubtitleTrack, format: "srt" | "vtt" | "txt") => {
    try {
      setIsDownloadingSubtitle(true);
      void haptics.light();

      const { content, filename, mimeType } = await fetchAndFormatSubtitles(track, format);
      const blob = new Blob([content], { type: mimeType });
      const fullFilename = `${(videoInfo?.title || "youtube").replace(/[^a-zA-Z0-9_-]/g, "_")}_${filename}`;

      await nativeSave(blob, fullFilename);

      if (videoInfo) {
        historyStore.addItem({
          videoId: videoInfo.videoId,
          title: `${videoInfo.title} [${track.languageName}]`,
          author: videoInfo.author,
          thumbnailUrl: videoInfo.thumbnailUrl,
          durationFormatted: videoInfo.durationFormatted,
          qualityBadge: format.toUpperCase(),
          format: format,
          fileSizeBytes: blob.size,
          isAudioOnly: false,
          localFileName: fullFilename,
        });
      }

      void haptics.success();
      playSuccess();
    } catch (err: any) {
      console.error("Subtitle download error:", err);
      setResolveError(err.message || "Failed to download subtitles.");
      void haptics.error();
      playError();
    } finally {
      setIsDownloadingSubtitle(false);
    }
  };

  const handlePreviewSubtitle = async (track: YouTubeSubtitleTrack) => {
    try {
      setIsDownloadingSubtitle(true);
      void haptics.light();
      const { content } = await fetchAndFormatSubtitles(track, "txt");
      setPreviewSubtitleText(content);
      setSelectedSubtitleTrack(track);
      setIsPreviewOpen(true);
    } catch (err: any) {
      setResolveError(err.message || "Failed to preview subtitles.");
      void haptics.error();
      playError();
    } finally {
      setIsDownloadingSubtitle(false);
    }
  };

  // Sample 4K Demo Video
  const handleLoadSample = () => {
    const sample = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    setInputUrl(sample);
    void handleResolve(sample);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-3 sm:px-6 py-4">
      {/* Tool Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-red-400">
              <Youtube className="size-2.5" />
              <span>YouTube 4K</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-cyan-400">
              <span>TikTok No-WM</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-pink-500/40 bg-pink-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-pink-400">
              <span>Instagram Reels</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-sky-400">
              <span>X / Twitter</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-orange-400">
              <span>Reddit Mux</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-blue-400">
              <span>Facebook</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-teal-500/40 bg-teal-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-teal-400">
              <span>Vimeo</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-purple-400">
              <span>Twitch</span>
            </span>
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              <span>yt-dlp Core</span>
            </span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Universal Media Downloader
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            High-speed video & audio downloads · YouTube 4K, Watermark-Free TikTok, Reels, Twitter, Reddit, Facebook, Vimeo & 1,700+ sites
          </p>

        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isResolving || isDownloading}
            className="rounded-lg border border-border/70 bg-card/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all cursor-pointer"
          >
            Load 4K Sample
          </button>
        </div>
      </div>

      {/* View Switcher: Downloader | Subtitles | Download Vault */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl border border-border/60 bg-card/40 w-fit">
        <button
          type="button"
          onClick={() => {
            setActiveViewTab("downloader");
            void haptics.light();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
            activeViewTab === "downloader"
              ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Film className="size-3.5" />
          <span>Downloader</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveViewTab("subtitles");
            void haptics.light();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
            activeViewTab === "subtitles"
              ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Subtitles className="size-3.5" />
          <span>Subtitles</span>
          {videoInfo?.subtitles && videoInfo.subtitles.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-500/30 text-[10px] text-red-300 font-bold">
              {videoInfo.subtitles.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveViewTab("vault");
            void haptics.light();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all cursor-pointer ${
            activeViewTab === "vault"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="size-3.5" />
          <span>Vault</span>
          {historyStore.items.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-[10px] text-amber-300 font-bold">
              {historyStore.items.length}
            </span>
          )}
        </button>
      </div>

      {/* 1. Downloader Main View */}
      {activeViewTab === "downloader" && (
        <>

      {/* URL Input Bar */}
      <div className="panel-hud rounded-2xl border border-primary/20 bg-card/50 p-4 sm:p-5 shadow-elevation1 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Enter Media Link (YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, Twitch…)
          </label>
          {detectPlatform(inputUrl) && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider border ${
                PLATFORM_CONFIGS[detectPlatform(inputUrl)!.platform].badgeClass
              }`}
            >
              {PLATFORM_CONFIGS[detectPlatform(inputUrl)!.platform].name} Detected
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
              <Zap className="size-4 text-primary" />
            </div>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                setResolveError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleResolve();
              }}
              placeholder="Paste YouTube, TikTok, Instagram, X/Twitter, Reddit, Facebook, Vimeo or any video link…"
              disabled={isResolving || isDownloading}
              className={`w-full rounded-xl border border-border/80 bg-background/80 py-2.5 pl-10 ${
                inputUrl.length > 0 ? "pr-28" : "pr-20"
              } font-mono text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary/50`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {inputUrl.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl("");
                    setResolveError(null);
                    clearResult();
                    setVideoInfo(null);
                    void haptics.light();
                  }}
                  disabled={isResolving || isDownloading}
                  className="flex items-center justify-center size-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title="Remove link"
                  aria-label="Remove link"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handlePaste}
                disabled={isResolving || isDownloading}
                className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/80 px-2 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title="Paste from clipboard"
              >
                <Clipboard className="size-3" />
                <span>Paste</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleResolve()}
            disabled={isResolving || isDownloading || !inputUrl.trim()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-display text-xs font-bold text-white shadow-xs hover:bg-red-500 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            {isResolving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>RESOLVING 4K STREAMS…</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>FETCH VIDEO</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {resolveError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-mono text-red-300 shadow-elevation1">
            <div className="flex items-start gap-3">
              <AlertCircle className="size-5 shrink-0 text-red-400 mt-0.5" />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-red-200">
                    {resolveError.toLowerCase().includes("bot") || resolveError.includes("LOGIN_REQUIRED")
                      ? "Stream Extraction Restricted"
                      : "Unable to Resolve Stream"}
                  </span>
                </div>
                <p className="text-xs text-red-200/80 leading-relaxed font-sans">
                  {resolveError.toLowerCase().includes("bot") || resolveError.includes("LOGIN_REQUIRED")
                    ? "YouTube has restricted access for this video from the cloud. Please try a different quality tier or video."
                    : resolveError}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResolveError(null)}
                className="shrink-0 p-1 rounded-lg text-red-400 hover:text-red-200 hover:bg-red-500/20 transition-colors cursor-pointer"
                title="Dismiss"
                aria-label="Dismiss error"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Playlist Detection Banner */}
      {playlistInfo && (
        <div className="panel-hud flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-card/70 to-card/50 p-4 shadow-sm">
          <div className="flex items-center gap-3.5 min-w-0">
            {playlistInfo.thumbnailUrl ? (
              <img
                src={playlistInfo.thumbnailUrl}
                alt={playlistInfo.title}
                className="size-14 rounded-xl object-cover border border-primary/40 shrink-0 shadow-xs"
              />
            ) : (
              <div className="grid size-14 place-items-center rounded-xl border border-primary/40 bg-primary/20 text-primary shrink-0">
                <ListPlus className="size-7" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                  Playlist Detected
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {playlistInfo.videoCount} Videos
                </span>
              </div>
              <h3 className="font-display text-sm font-bold text-foreground truncate mt-0.5">
                {playlistInfo.title}
              </h3>
              <p className="font-mono text-xs text-muted-foreground truncate">
                by {playlistInfo.author}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              void haptics.light();
              setIsPlaylistMode(!isPlaylistMode);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
              isPlaylistMode
                ? "bg-primary text-primary-foreground shadow-md hover:brightness-110"
                : "border border-primary/50 bg-primary/15 text-primary hover:bg-primary/25"
            }`}
          >
            <Layers className="size-4" />
            <span>{isPlaylistMode ? "View Single Video" : "Open Playlist Batch Deck"}</span>
          </button>
        </div>
      )}

      {/* Playlist Batch Deck */}
      {isPlaylistMode && playlistInfo && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="panel-hud rounded-2xl border border-primary/30 bg-card/60 p-4 sm:p-6 shadow-elevation1 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <ListPlus className="size-5 text-primary" />
                  <span>Batch Download Playlist ({selectedVideoIds.size} of {playlistInfo.videoCount} selected)</span>
                </h3>
                <p className="font-mono text-xs text-muted-foreground">
                  Select videos and choose a target format to download and save sequentially to device.
                </p>
              </div>

              {/* Select / Deselect All */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  disabled={isBatchRunning}
                  className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
                >
                  {selectedVideoIds.size === playlistInfo.items.length ? (
                    <>
                      <Square className="size-3.5" />
                      <span>Deselect All</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="size-3.5" />
                      <span>Select All ({playlistInfo.items.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Target Quality Selector for Batch */}
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase tracking-wider text-muted-foreground block">
                Target Batch Quality & Format:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { badge: "1080P", label: "Full HD 1080p", audio: false, desc: "Crisp Video MP4" },
                  { badge: "720P", label: "HD 720p", audio: false, desc: "Fast-path Direct MP4" },
                  { badge: "320 KBPS", label: "Pro MP3 (320k)", audio: true, desc: "ID3 Tagged + Cover Art" },
                  { badge: "NATIVE AAC", label: "Native AAC (M4A)", audio: true, desc: "Direct Native Audio" },
                ].map((opt) => (
                  <button
                    key={opt.badge}
                    type="button"
                    onClick={() => {
                      setBatchQualityBadge(opt.badge);
                      setBatchIsAudioOnly(opt.audio);
                      void haptics.light();
                    }}
                    disabled={isBatchRunning}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      batchQualityBadge === opt.badge
                        ? "border-primary bg-primary/10 shadow-xs"
                        : "border-border/70 bg-background/40 hover:border-primary/40"
                    } disabled:opacity-50`}
                  >
                    <span className="font-display text-xs font-bold text-foreground">
                      {opt.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Batch Controls & Progress Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              {!isBatchRunning ? (
                <button
                  type="button"
                  onClick={handleStartBatchDownload}
                  disabled={selectedVideoIds.size === 0}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Download className="size-4" />
                  <span>Start Batch Download ({selectedVideoIds.size} Items)</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePauseBatch}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 font-display text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                  >
                    <Pause className="size-4" />
                    <span>Pause</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelBatch}
                    className="flex items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 font-display text-xs font-bold text-red-300 hover:bg-red-500/20 transition-all cursor-pointer"
                  >
                    <X className="size-4" />
                    <span>Stop Queue</span>
                  </button>
                </div>
              )}

              {batchStats && (
                <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                  <span>
                    Progress: <strong className="text-foreground">{batchStats.completed} / {batchStats.total}</strong>
                  </span>
                  <span>·</span>
                  <span className="text-primary font-bold">{batchStats.overallProgress}%</span>
                </div>
              )}
            </div>

            {/* Overall Progress Gauge */}
            {isBatchRunning && batchStats && (
              <div className="space-y-1.5 pt-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                  <div
                    className="h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${batchStats.overallProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Video List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {playlistInfo.items.map((item) => {
                const isSelected = selectedVideoIds.has(item.videoId);
                const activeBatchItem = batchItems.find((b) => b.videoId === item.videoId);

                return (
                  <div
                    key={item.videoId}
                    onClick={() => {
                      if (!isBatchRunning) handleToggleVideoSelect(item.videoId);
                    }}
                    className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary/50 bg-background/80"
                        : "border-border/60 bg-background/30 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <button
                      type="button"
                      disabled={isBatchRunning}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVideoSelect(item.videoId);
                      }}
                      className="text-primary shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="size-5 text-primary" />
                      ) : (
                        <Square className="size-5 text-muted-foreground" />
                      )}
                    </button>

                    <div className="relative aspect-video w-20 sm:w-24 shrink-0 rounded-lg overflow-hidden border border-border/70 bg-black">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 font-mono text-[9px] text-white">
                        {item.durationFormatted}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs sm:text-sm text-foreground truncate">
                        {item.title}
                      </h4>
                      <p className="font-mono text-[11px] text-muted-foreground truncate">
                        {item.author}
                      </p>

                      {/* Active Download Progress */}
                      {activeBatchItem && activeBatchItem.status === "downloading" && (
                        <div className="mt-1.5 space-y-1">
                          <div className="flex justify-between font-mono text-[10px] text-primary">
                            <span>Downloading… {activeBatchItem.speedMbps > 0 ? `(${activeBatchItem.speedMbps.toFixed(1)} MB/s)` : ""}</span>
                            <span>{activeBatchItem.progress}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-secondary/50 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-200"
                              style={{ width: `${activeBatchItem.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 font-mono text-xs">
                      {activeBatchItem?.status === "complete" ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-bold">
                          <CheckCircle2 className="size-4" />
                          <span className="hidden sm:inline">Saved</span>
                        </span>
                      ) : activeBatchItem?.status === "error" ? (
                        <span className="flex items-center gap-1 text-red-400 font-bold">
                          <AlertCircle className="size-4" />
                          <span className="hidden sm:inline">Error</span>
                        </span>
                      ) : activeBatchItem?.status === "downloading" ? (
                        <span className="flex items-center gap-1 text-primary animate-pulse font-bold">
                          <Loader2 className="size-4 animate-spin" />
                          <span className="hidden sm:inline">Processing</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Video Details & Quality Selection */}
      <AnimatePresence mode="wait">
        {videoInfo && !isPlaylistMode && !downloadResult && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* Metadata Card */}
            <div className="panel-hud flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-border/80 bg-card/40 p-4 sm:p-5">
              <div className="relative aspect-video w-full sm:w-64 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-black">
                <img
                  src={videoInfo.thumbnailUrl}
                  alt={videoInfo.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-xs">
                  {videoInfo.durationFormatted}
                </div>
                {videoInfo.qualities?.some((q) => q.is4K) && (
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md border border-amber-500/40 bg-black/85 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300 shadow-sm backdrop-blur-xs">
                    <Sparkles className="size-2.5 text-amber-400" />
                    <span>4K 60FPS</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2 min-w-0">
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground line-clamp-2 leading-snug">
                  {videoInfo.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span className="font-semibold text-foreground/90">{videoInfo.author}</span>
                  <span>•</span>
                  <span>{videoInfo.viewCount} views</span>
                  <span>•</span>
                  <span>{videoInfo.durationFormatted}</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono text-emerald-300 w-fit">
                  <ShieldCheck className="size-3.5 text-emerald-400" />
                  <span>Streams verified · Direct unthrottled endpoints ready</span>
                </div>
              </div>
            </div>

            {/* Quality Selector & Media Type Selection */}
            <div className="space-y-3">
              {/* Segmented Media Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => handleTabChange("video")}
                    disabled={isDownloading}
                    className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3.5 py-1.5 font-display text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                      mediaTypeTab === "video"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent"
                    }`}
                  >
                    <Film className="size-3.5" />
                    <span>Video Streams ({videoQualities.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTabChange("audio")}
                    disabled={isDownloading}
                    className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3.5 py-1.5 font-display text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                      mediaTypeTab === "audio"
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50 border border-transparent"
                    }`}
                  >
                    <Music className="size-3.5" />
                    <span>Direct Audio ({audioQualities.length})</span>
                    <span className="rounded-full bg-violet-500/30 px-1.5 py-0.2 font-mono text-[9px] text-violet-200 uppercase">
                      Fast
                    </span>
                  </button>
                </div>

                <span className="hidden sm:inline-block font-mono text-[11px] text-muted-foreground">
                  {selectedQuality ? `${selectedQuality.label} · ${formatBytes(selectedQuality.approxSizeBytes)}` : ""}
                </span>
              </div>

              {/* Quality Cards Grid */}
              {displayedQualities.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-border/70 text-center font-mono text-xs text-muted-foreground">
                  No {mediaTypeTab} streams available for this media. Try the {mediaTypeTab === "video" ? "audio" : "video"} tab.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {displayedQualities.map((q) => {
                    const isSelected = selectedQuality?.id === q.id;
                    const isAudio = q.isAudioOnly;

                    let badgeColor = "bg-primary/15 text-primary border border-primary/30";
                    if (q.is4K) badgeColor = "bg-amber-500/20 text-amber-300 border border-amber-500/40";
                    else if (q.badge.includes("60")) badgeColor = "bg-red-500/20 text-red-300 border border-red-500/40";
                    else if (q.badge === "320 KBPS") badgeColor = "bg-violet-500/20 text-violet-300 border border-violet-500/40";
                    else if (q.badge === "256 KBPS") badgeColor = "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40";
                    else if (q.badge === "192 KBPS") badgeColor = "bg-blue-500/20 text-blue-300 border border-blue-500/40";
                    else if (q.badge === "128 KBPS") badgeColor = "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40";
                    else if (q.badge === "NATIVE AAC") badgeColor = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
                    else if (q.badge === "WAV PCM") badgeColor = "bg-amber-500/20 text-amber-300 border border-amber-500/40";
                    else if (isAudio) badgeColor = "bg-violet-500/20 text-violet-300 border border-violet-500/40";

                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setSelectedQuality(q);
                          void haptics.light();
                        }}
                        disabled={isDownloading}
                        className={`relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                          isSelected
                            ? isAudio
                              ? "border-violet-500/80 bg-violet-500/15 shadow-[0_0_16px_rgba(139,92,246,0.25)] ring-1 ring-violet-500/50"
                              : "border-red-500/80 bg-red-500/15 shadow-[0_0_16px_rgba(239,68,68,0.2)] ring-1 ring-red-500/50"
                            : "border-border/70 bg-card/40 hover:border-primary/40 hover:bg-card/70"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <span className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${badgeColor}`}>
                            {q.badge}
                          </span>
                          <span className="font-mono text-xs font-semibold text-foreground/90">
                            {formatBytes(q.approxSizeBytes)}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {isAudio ? (
                              <Music className="size-3.5 text-violet-400" />
                            ) : (
                              <Film className="size-3.5 text-red-400" />
                            )}
                            <span className="font-display text-xs font-bold text-foreground">
                              {q.label}
                            </span>
                          </div>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {q.resolutionLabel} {q.fps > 0 ? `· ${q.fps} fps` : ""}
                          </p>
                        </div>

                        {/* Selected radio dot */}
                        <div className="absolute top-3 right-3">
                          <div
                            className={`size-3 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? isAudio
                                  ? "border-violet-500 bg-violet-500"
                                  : "border-red-500 bg-red-500"
                                : "border-border"
                            }`}
                          >
                            {isSelected && <div className="size-1 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Speed & Acceleration Settings */}
            <div className="panel-hud rounded-xl border border-border/70 bg-card/30 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gauge className="size-4 text-amber-400 shrink-0" />
                <div className="font-mono text-xs text-foreground">
                  <span>Turbo Multi-Worker Acceleration:</span>{" "}
                  <span className="font-bold text-amber-300">{workersCount} Parallel Channels</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                {[4, 6, 8].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setWorkersCount(count)}
                    disabled={isDownloading}
                    className={`rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      workersCount === count
                        ? "border border-amber-500/50 bg-amber-500/20 text-amber-300"
                        : "border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {count}x Threads
                  </button>
                ))}
              </div>
            </div>

            {/* Pre-Download Time-Range Clipper */}
            <div className="panel-hud rounded-xl border border-border/70 bg-card/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsClipEnabled((prev) => !prev)}
                  className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  <Scissors className={`size-3.5 ${isClipEnabled ? "text-primary" : "text-muted-foreground"}`} />
                  <span>Pre-Download Clip Range (Lossless Trim)</span>
                  <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase font-bold ${
                    isClipEnabled ? "bg-primary/20 text-primary border border-primary/30" : "bg-card/60 text-muted-foreground"
                  }`}>
                    {isClipEnabled ? "ACTIVE" : "OPTIONAL"}
                  </span>
                </button>
                {isClipEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setClipStartTime("00:00");
                      setClipEndTime("");
                      setIsClipEnabled(false);
                    }}
                    className="font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {isClipEnabled && (
                <div className="pt-1.5 space-y-2">
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Start Time (mm:ss)</label>
                      <input
                        type="text"
                        value={clipStartTime}
                        onChange={(e) => setClipStartTime(e.target.value)}
                        placeholder="00:00"
                        className="w-full rounded-lg border border-border/70 bg-background/60 px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">End Time (mm:ss)</label>
                      <input
                        type="text"
                        value={clipEndTime}
                        onChange={(e) => setClipEndTime(e.target.value)}
                        placeholder={videoInfo?.durationFormatted || "00:30"}
                        className="w-full rounded-lg border border-border/70 bg-background/60 px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground">Quick Presets:</span>
                    {[
                      { label: "0–30s", start: "00:00", end: "00:30" },
                      { label: "0–60s", start: "00:00", end: "01:00" },
                      { label: "30s–60s", start: "00:30", end: "01:00" },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setClipStartTime(preset.start);
                          setClipEndTime(preset.end);
                        }}
                        className="rounded-md border border-border/60 bg-card/60 px-2 py-0.5 font-mono text-[9px] text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Download Button or 3-Stage Progress HUD */}
            {!isDownloading ? (
              <button
                type="button"
                onClick={handleStartDownload}
                disabled={!selectedQuality}
                className={`w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl py-3 px-3 sm:py-3.5 sm:px-6 font-display text-xs sm:text-sm font-bold text-white transition-all cursor-pointer ${
                  selectedQuality?.isAudioOnly
                    ? "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 shadow-lg shadow-violet-500/25 hover:opacity-95"
                    : "bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 shadow-lg shadow-red-500/20 hover:opacity-95"
                }`}
              >
                {selectedQuality?.isAudioOnly ? (
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <Music className="size-4 shrink-0" />
                      <span>{isClipEnabled ? "EXTRACT AUDIO CLIP" : "EXTRACT AUDIO"}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono font-medium opacity-90 px-2 py-0.5 rounded-md bg-black/25">
                      <span>{selectedQuality?.badge}</span>
                      <span>•</span>
                      <span>{formatBytes(selectedQuality?.approxSizeBytes || 0)}</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <Download className="size-4 shrink-0" />
                      <span>{isClipEnabled ? "START TURBO CLIP DOWNLOAD" : "START TURBO DOWNLOAD"}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-mono font-medium opacity-90 px-2 py-0.5 rounded-md bg-black/25">
                      <span>{selectedQuality?.badge || "4K"}</span>
                      <span>•</span>
                      <span>{formatBytes(selectedQuality?.approxSizeBytes || 0)}</span>
                    </span>
                  </div>
                )}
              </button>
            ) : (
              /* 3-Stage Split Telemetry HUD */
              <div
                className={`panel-hud rounded-2xl border p-4 sm:p-5 space-y-4 shadow-elevation2 ${
                  selectedQuality?.isAudioOnly
                    ? "border-violet-500/40 bg-card/85"
                    : "border-red-500/40 bg-card/85"
                }`}
              >
                {/* Header & Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-3">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isPaused
                            ? "bg-amber-400"
                            : selectedQuality?.isAudioOnly
                            ? "bg-violet-400"
                            : "bg-red-400"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full size-3 ${
                          isPaused
                            ? "bg-amber-500"
                            : selectedQuality?.isAudioOnly
                            ? "bg-violet-500"
                            : "bg-red-500"
                        }`}
                      />
                    </span>
                    <span className="font-display text-sm font-bold text-foreground">
                      {isPaused
                        ? "DOWNLOAD PAUSED"
                        : progress?.phase === "muxing"
                        ? selectedQuality?.isAudioOnly
                          ? "MASTERING AUDIO IN WEBASSEMBLY…"
                          : "PACKAGING STREAMS (STAGE 3/3)…"
                        : selectedQuality?.isAudioOnly
                        ? "TURBO DOWNLOADING AUDIO TRACK…"
                        : "ACQUIRING MULTI-STREAM 4K ASSETS…"}
                    </span>
                  </div>

                  {/* Actions & Badges */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* RAM-Safe OPFS Badge */}
                    <div className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
                      <HardDrive className="size-2.5 text-emerald-400" />
                      <span>RAM-SAFE OPFS</span>
                    </div>

                    {/* Speed Gauge */}
                    {progress && progress.speedMbps > 0 && !isPaused && (
                      <div className="flex items-center gap-1 font-mono text-xs font-bold text-amber-400">
                        <Zap className="size-3.5 fill-amber-400" />
                        <span>{progress.speedMbps} MB/s</span>
                      </div>
                    )}

                    {/* Pause / Resume Button */}
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1 font-mono text-[10px] font-bold text-foreground hover:bg-card/90 cursor-pointer transition-all"
                    >
                      {isPaused ? <Play className="size-3 text-emerald-400 fill-emerald-400" /> : <Pause className="size-3 text-amber-400" />}
                      <span>{isPaused ? "Resume" : "Pause"}</span>
                    </button>

                    {/* Cancel Button */}
                    <button
                      type="button"
                      onClick={handleCancelDownload}
                      className="rounded-lg border border-border/70 px-2.5 py-1 font-mono text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* 3-Stage Progress Step Indicator */}
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                  {/* Step 1: Video */}
                  <div className={`p-2 rounded-lg border transition-all ${
                    (progress?.stage?.current || 1) === 1
                      ? "border-red-500/50 bg-red-500/10 text-foreground"
                      : (progress?.stage?.current || 1) > 1
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-border/60 bg-card/40 text-muted-foreground opacity-60"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">1. Video Track</span>
                      <span>{progress?.stage?.videoProgress ?? progress?.progress ?? 0}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-border/60 overflow-hidden">
                      <div
                        className="h-full bg-red-500 transition-all duration-200"
                        style={{ width: `${progress?.stage?.videoProgress ?? progress?.progress ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Step 2: Audio */}
                  <div className={`p-2 rounded-lg border transition-all ${
                    (progress?.stage?.current || 1) === 2
                      ? "border-violet-500/50 bg-violet-500/10 text-foreground"
                      : (progress?.stage?.current || 1) > 2
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-border/60 bg-card/40 text-muted-foreground opacity-60"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">2. Audio Track</span>
                      <span>{selectedQuality?.isAudioOnly ? progress?.progress : (progress?.stage?.audioProgress ?? 0)}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-border/60 overflow-hidden">
                      <div
                        className="h-full bg-violet-500 transition-all duration-200"
                        style={{ width: `${selectedQuality?.isAudioOnly ? progress?.progress : (progress?.stage?.audioProgress ?? 0)}%` }}
                      />
                    </div>
                  </div>

                  {/* Step 3: Muxing */}
                  <div className={`p-2 rounded-lg border transition-all ${
                    progress?.phase === "muxing"
                      ? "border-amber-500/50 bg-amber-500/10 text-foreground"
                      : progress?.phase === "complete"
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-border/60 bg-card/40 text-muted-foreground opacity-60"
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">3. Muxing</span>
                      <span>{progress?.phase === "muxing" ? "Active" : progress?.phase === "complete" ? "100%" : "Idle"}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-border/60 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-200"
                        style={{ width: progress?.phase === "muxing" ? "75%" : progress?.phase === "complete" ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                    <span>{progress?.statusMessage || "Streaming chunks…"}</span>
                    <span className="font-bold text-foreground">{progress?.progress || 0}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                    <motion.div
                      className={`h-full ${
                        selectedQuality?.isAudioOnly
                          ? "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-400"
                          : "bg-gradient-to-r from-red-500 via-rose-500 to-amber-400"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progress?.progress || 0}%` }}
                      transition={{ ease: "easeOut", duration: 0.2 }}
                    />
                  </div>
                </div>

                {/* Telemetry Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/50 text-center font-mono text-[10px]">
                  <div>
                    <span className="text-muted-foreground block">Transferred</span>
                    <span className="font-bold text-foreground">
                      {formatBytes(progress?.downloadedBytes || 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Channels</span>
                    <span className="font-bold text-amber-300">
                      {progress?.activeThreads || workersCount} Workers
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Estimated ETA</span>
                    <span className="font-bold text-foreground">
                      {progress?.etaSeconds && progress.etaSeconds > 0 ? `${progress.etaSeconds}s` : "Calculating…"}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        )}

        {/* Download Complete / Player View */}
        {downloadResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            {downloadResult.mimeType.startsWith("audio/") ? (
              /* Dedicated Audio Player View */
              <div className="panel-hud rounded-2xl border border-violet-500/40 bg-card/60 p-5 sm:p-6 space-y-4 shadow-elevation2">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-violet-400" />
                    <span className="font-display text-sm sm:text-base font-bold text-foreground">
                      AUDIO READY ({downloadResult.filename.split(".").pop()?.toUpperCase() || "MP3"})
                    </span>
                  </div>
                  <span className="font-mono text-xs text-violet-400 font-bold">
                    {formatBytes(downloadResult.fileSizeBytes)}
                  </span>
                </div>

                {/* Player Card */}
                <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-card/70 to-card/40 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-3.5">
                    {videoInfo?.thumbnailUrl ? (
                      <img
                        src={videoInfo.thumbnailUrl}
                        alt={videoInfo.title}
                        className="size-16 rounded-xl object-cover border border-violet-500/40 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="size-16 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                        <Music className="size-8 text-violet-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="font-display text-sm font-bold text-foreground truncate">
                        {videoInfo?.title}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground truncate">
                        {videoInfo?.author}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-violet-500/25 px-2 py-0.5 font-mono text-[10px] font-bold text-violet-300 border border-violet-500/40">
                          {downloadResult.filename.includes("[")
                            ? downloadResult.filename.split("[").pop()?.split("]")[0]
                            : "AUDIO"}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {formatBytes(downloadResult.fileSizeBytes)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <audio
                    controls
                    src={downloadResult.url}
                    className="w-full mt-2 accent-violet-500 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-xs font-semibold text-foreground break-all line-clamp-2">
                    {downloadResult.filename}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Mastered with high-fidelity WebAssembly audio engine · Studio response
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveToDevice}
                    className="w-full sm:flex-1 min-w-[180px] flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 px-5 font-display text-xs font-bold text-white shadow-xs hover:bg-violet-500 transition-all cursor-pointer"
                  >
                    <Download className="size-4" />
                    <span>SAVE AUDIO TO DEVICE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendToZenoTap("audio")}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/15 py-3 px-4 font-display text-xs font-bold text-violet-300 hover:bg-violet-500/25 transition-all cursor-pointer"
                  >
                    <Send className="size-3.5" />
                    <span>Send to ZenoTap</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenIn8DStudio}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 py-3 px-4 font-display text-xs font-bold text-indigo-300 hover:bg-indigo-500/25 transition-all cursor-pointer"
                  >
                    <Headphones className="size-3.5" />
                    <span>Open in 8D Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={clearResult}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/80 py-3 px-4 font-mono text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Convert Another</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Dedicated Video Player View */
              <div className="panel-hud rounded-2xl border border-emerald-500/40 bg-card/60 p-5 sm:p-6 space-y-4 shadow-elevation2">
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-400" />
                    <span className="font-display text-sm sm:text-base font-bold text-foreground">
                      DOWNLOAD READY ({downloadResult.is4K ? "4K 60FPS" : downloadResult.mimeType.split("/")[0].toUpperCase()})
                    </span>
                  </div>
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    {formatBytes(downloadResult.fileSizeBytes)}
                  </span>
                </div>

                {/* Video Player Preview */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/80 bg-black">
                  <video
                    ref={videoPreviewRef}
                    src={downloadResult.url}
                    controls
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-xs font-semibold text-foreground break-all line-clamp-2">
                    {downloadResult.filename}
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Lossless stream-copy muxed in WebAssembly · Zero compression artifacts
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveToDevice}
                    className="w-full sm:flex-1 min-w-[180px] flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 px-5 font-display text-xs font-bold text-white shadow-xs hover:bg-emerald-500 transition-all cursor-pointer"
                  >
                    <Download className="size-4" />
                    <span>SAVE TO DEVICE</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendToZenoTap("video")}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-3 px-4 font-display text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition-all cursor-pointer"
                  >
                    <Send className="size-3.5" />
                    <span>Send to ZenoTap</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenIn8DStudio}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 py-3 px-4 font-display text-xs font-bold text-indigo-300 hover:bg-indigo-500/25 transition-all cursor-pointer"
                  >
                    <Headphones className="size-3.5" />
                    <span>Open in 8D Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={clearResult}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/80 py-3 px-4 font-mono text-xs text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Download Another</span>
                  </button>
                </div>
              </div>

            )}
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}

      {/* 2. Subtitles View */}
      {activeViewTab === "subtitles" && (
        <YouTubeSubtitlesView
          videoInfo={videoInfo}
          onDownloadSubtitle={handleDownloadSubtitle}
          onPreviewSubtitle={handlePreviewSubtitle}
          isDownloadingSubtitle={isDownloadingSubtitle}
          onLoadSample={handleLoadSample}
        />
      )}

      {/* 3. Download History Vault View */}
      {activeViewTab === "vault" && <YouTubeVaultView />}

      {/* Subtitle Transcript Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && selectedSubtitleTrack && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pointer-events-auto">
            {/* Dimmed Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="transcript-modal-title"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border/80 bg-card/95 p-4 sm:p-5 shadow-2xl space-y-4 backdrop-blur-2xl overflow-hidden"
            >
              {/* Top ambient glow line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <h3 id="transcript-modal-title" className="font-display text-sm font-bold text-foreground truncate">
                    Subtitle Transcript: {selectedSubtitleTrack.languageName}
                  </h3>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Language Code: {selectedSubtitleTrack.languageCode} · {selectedSubtitleTrack.isAutoGenerated ? "Auto ASR Track" : "Manual Author Track"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  aria-label="Close transcript"
                  className="size-8 sm:size-9 grid place-items-center rounded-xl border border-border/70 bg-card hover:bg-secondary active:scale-95 text-muted-foreground hover:text-foreground transition-all shrink-0 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Scrollable text area */}
              <div className="flex-1 overflow-y-auto max-h-[50vh] p-3 rounded-xl border border-border/60 bg-background/80 font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed select-text">
                {previewSubtitleText || "Loading transcript..."}
              </div>

              <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    if (previewSubtitleText) {
                      await navigator.clipboard.writeText(previewSubtitleText);
                      void haptics.success();
                      playSuccess();
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
                >
                  <Clipboard className="size-3.5" />
                  <span>Copy Transcript</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void handleDownloadSubtitle(selectedSubtitleTrack, "srt");
                      setIsPreviewOpen(false);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold px-3.5 py-2 active:scale-95 transition-all shadow-sm cursor-pointer"
                  >
                    <Download className="size-3.5" />
                    <span>Download .SRT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(false)}
                    className="rounded-xl border border-border/70 bg-card/70 px-3 py-2 font-mono text-xs text-muted-foreground hover:text-foreground active:scale-95 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Background Mini Player Deck */}
      <YouTubeMiniPlayer />
    </div>
  );
}
