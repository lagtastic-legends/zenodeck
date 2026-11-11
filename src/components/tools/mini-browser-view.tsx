"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Home,
  Search,
  Globe,
  X,
  Download,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
  Film,
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useHaptics } from "@/hooks/use-haptics";
import { useNavStore } from "@/lib/navigation/nav-store";
import { Capacitor } from "@capacitor/core";
import { isNativeAndroidPlatform, ZenoMedia3 } from "@/lib/media/native-media-muxer";
import { detectPlatform, PLATFORM_CONFIGS } from "@/lib/media/detector";

export interface MiniBrowserViewProps {
  initialUrl?: string;
  activeUrl?: string;
  onMediaSelect?: (url: string) => void;
  onSelectMediaUrl?: (url: string, title?: string) => void;
  onDownloadDetected?: (url: string) => void;
  onTriggerVidMateSheet?: (url: string, title?: string) => void;
}

interface BookmarkItem {
  id: string;
  name: string;
  url: string;
  category: string;
  badge: string;
  color: string;
  gradient: string;
  iconText: string;
}

const QUICK_PORTALS: BookmarkItem[] = [
  {
    id: "youtube",
    name: "YouTube",
    url: "https://m.youtube.com",
    category: "Video & Music",
    badge: "4K / MP3",
    color: "#FF0000",
    gradient: "from-red-600/20 via-red-500/10 to-transparent",
    iconText: "YT",
  },
  {
    id: "tiktok",
    name: "TikTok",
    url: "https://www.tiktok.com",
    category: "Shorts & Music",
    badge: "No Watermark",
    color: "#00F2FE",
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    iconText: "TT",
  },
  {
    id: "instagram",
    name: "Instagram",
    url: "https://www.instagram.com",
    category: "Reels & Stories",
    badge: "1080p HD",
    color: "#E1306C",
    gradient: "from-pink-600/20 via-purple-500/10 to-transparent",
    iconText: "IG",
  },
  {
    id: "facebook",
    name: "Facebook",
    url: "https://m.facebook.com/watch",
    category: "Watch & Clips",
    badge: "HD MP4",
    color: "#1877F2",
    gradient: "from-blue-600/20 via-indigo-500/10 to-transparent",
    iconText: "FB",
  },
  {
    id: "twitter",
    name: "X / Twitter",
    url: "https://x.com",
    category: "Viral Media",
    badge: "Fast MP4",
    color: "#1DA1F2",
    gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    iconText: "𝕏",
  },
  {
    id: "reddit",
    name: "Reddit",
    url: "https://www.reddit.com/r/videos",
    category: "Discussions & Clips",
    badge: "Audio Muxed",
    color: "#FF4500",
    gradient: "from-orange-600/20 via-amber-500/10 to-transparent",
    iconText: "RD",
  },
  {
    id: "vimeo",
    name: "Vimeo",
    url: "https://vimeo.com/watch",
    category: "Creative 4K",
    badge: "Cinema HD",
    color: "#1AB7EA",
    gradient: "from-teal-500/20 via-cyan-500/10 to-transparent",
    iconText: "VM",
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    url: "https://m.soundcloud.com",
    category: "Lossless Audio",
    badge: "320k MP3",
    color: "#FF5500",
    gradient: "from-amber-600/20 via-orange-500/10 to-transparent",
    iconText: "SC",
  },
];

export function MiniBrowserView({
  initialUrl,
  activeUrl,
  onMediaSelect,
  onSelectMediaUrl,
  onDownloadDetected,
  onTriggerVidMateSheet,
}: MiniBrowserViewProps) {
  const haptics = useHaptics();

  const startUrl = initialUrl || activeUrl || "";
  // Navigation State
  const [currentUrl, setCurrentUrl] = useState<string>(startUrl);
  const [inputUrl, setInputUrl] = useState<string>(startUrl);
  const [history, setHistory] = useState<string[]>(startUrl ? [startUrl] : []);
  const [historyIndex, setHistoryIndex] = useState<number>(startUrl ? 0 : -1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [pageTitle, setPageTitle] = useState<string>("");

  // Media Sniffing State
  const [detectedMediaUrl, setDetectedMediaUrl] = useState<string | null>(null);
  const [detectedMediaPlatform, setDetectedMediaPlatform] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Register step handler with ZenoDeck 5-tier navigation engine (back in web history first)
  useEffect(() => {
    return useNavStore.getState().registerStepHandler(() => {
      if (historyIndex > 0) {
        const newIdx = historyIndex - 1;
        setHistoryIndex(newIdx);
        const prevUrl = history[newIdx];
        setCurrentUrl(prevUrl);
        setInputUrl(prevUrl);
        if (iframeRef.current) {
          iframeRef.current.src = prevUrl;
        }
        return true;
      }
      return false;
    });
  }, [historyIndex, history]);

  // Normalize user query into a valid URL or search query
  const formatInputToUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    // Check if it looks like a URL
    if (/^(https?:\/\/)/i.test(trimmed)) {
      return trimmed;
    }
    if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    // Search query fallback
    return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
  };

  // Inspect URL for downloadable media
  const checkForDownloadableMedia = useCallback((urlToCheck: string) => {
    if (!urlToCheck) {
      setDetectedMediaUrl(null);
      setDetectedMediaPlatform(null);
      return;
    }

    const detected = detectPlatform(urlToCheck);
    if (detected) {
      setDetectedMediaUrl(urlToCheck);
      setDetectedMediaPlatform(PLATFORM_CONFIGS[detected.platform]?.name || "Media");
      return;
    }

    // Check generic media extensions or googlevideo streams
    if (
      urlToCheck.includes("googlevideo.com/videoplayback") ||
      /\.(mp4|webm|mkv|m3u8|mp3|m4a|wav)(\?|$)/i.test(urlToCheck)
    ) {
      setDetectedMediaUrl(urlToCheck);
      setDetectedMediaPlatform("Direct Stream");
      return;
    }

    setDetectedMediaUrl(null);
    setDetectedMediaPlatform(null);
  }, []);

  const navigateTo = useCallback(
    (targetUrl: string, pushHistory = true) => {
      const url = formatInputToUrl(targetUrl);
      if (!url) return;

      void haptics.selectionChanged();
      setIsLoading(true);
      setLoadingProgress(25);
      setCurrentUrl(url);
      setInputUrl(url);
      checkForDownloadableMedia(url);

      if (pushHistory) {
        setHistory((prev) => [...prev.slice(0, historyIndex + 1), url]);
        setHistoryIndex((prev) => prev + 1);
      }

      // Simulate network progress on web iframe
      const p1 = setTimeout(() => setLoadingProgress(65), 250);
      const p2 = setTimeout(() => setLoadingProgress(90), 600);
      const p3 = setTimeout(() => {
        setLoadingProgress(100);
        setTimeout(() => {
          setIsLoading(false);
          setLoadingProgress(0);
        }, 200);
      }, 1100);

      // On Native Android, trigger native browser coordinator if available
      if (isNativeAndroidPlatform()) {
        try {
          (ZenoMedia3 as any).openInAppBrowser?.({ url });
        } catch {}
      }

      return () => {
        clearTimeout(p1);
        clearTimeout(p2);
        clearTimeout(p3);
      };
    },
    [historyIndex, checkForDownloadableMedia, haptics]
  );

  const handleGoBack = () => {
    if (historyIndex > 0) {
      void haptics.light();
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      navigateTo(history[newIdx], false);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      void haptics.light();
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      navigateTo(history[newIdx], false);
    }
  };

  const handleReload = () => {
    if (currentUrl) {
      void haptics.light();
      navigateTo(currentUrl, false);
      if (iframeRef.current) {
        iframeRef.current.src = currentUrl;
      }
    }
  };

  const handleGoHome = () => {
    void haptics.light();
    setCurrentUrl("");
    setInputUrl("");
    setDetectedMediaUrl(null);
    setDetectedMediaPlatform(null);
  };

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      navigateTo(inputUrl);
    }
  };

  // FAB Trigger: Open quality sheet with detected media
  const handleFloatingActionDownload = () => {
    const target = detectedMediaUrl || currentUrl;
    if (!target) return;
    void haptics.medium();
    onMediaSelect?.(target);
    onSelectMediaUrl?.(target, pageTitle);
    onDownloadDetected?.(target);
    onTriggerVidMateSheet?.(target, pageTitle);
  };

  // Listen for native media sniffing events from ZenoMedia3Plugin
  useEffect(() => {
    let sub: any = null;
    if (isNativeAndroidPlatform()) {
      try {
        sub = (ZenoMedia3 as any).addListener?.("mediaDetected", (data: any) => {
          if (data?.url) {
            setDetectedMediaUrl(data.url);
            if (data.title) setPageTitle(data.title);
            checkForDownloadableMedia(data.url);
          }
        });
      } catch {}
    }
    return () => {
      sub?.then?.((h: any) => h?.remove?.())?.catch?.(() => {});
    };
  }, [checkForDownloadableMedia]);

  return (
    <div className="relative flex flex-col w-full h-[calc(100dvh-9rem)] sm:h-[700px] min-h-[500px] rounded-2xl border border-[#A79277]/30 bg-[#090D0C]/95 shadow-elevation1 overflow-hidden">
      {/* 1. Browser Top Omnibox & Navigation Strip */}
      <div className="flex flex-col border-b border-[#A79277]/30 bg-[#102C26]/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-1.5 p-2 sm:p-2.5">
          {/* Navigation Controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={handleGoBack}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-[#F7E7CE]/70 hover:text-[#F7E7CE] hover:bg-[#102C26]/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="size-4" />
            </button>

            <button
              type="button"
              onClick={handleGoForward}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-[#F7E7CE]/70 hover:text-[#F7E7CE] hover:bg-[#102C26]/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Forward"
            >
              <ArrowRight className="size-4" />
            </button>

            <button
              type="button"
              onClick={handleReload}
              disabled={!currentUrl}
              className="p-1.5 rounded-lg text-[#F7E7CE]/70 hover:text-[#F7E7CE] hover:bg-[#102C26]/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
              title="Reload"
            >
              <RotateCcw className={`size-3.5 ${isLoading ? "animate-spin text-[#F7E7CE]" : ""}`} />
            </button>

            <button
              type="button"
              onClick={handleGoHome}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                !currentUrl
                  ? "bg-[#102C26] text-[#F7E7CE] border border-[#F7E7CE]/30"
                  : "text-[#F7E7CE]/70 hover:text-[#F7E7CE] hover:bg-[#102C26]/80"
              }`}
              title="Browser Home"
            >
              <Home className="size-4" />
            </button>
          </div>

          {/* Omnibox URL Form */}
          <form onSubmit={handleSubmitUrl} className="flex-1 relative flex items-center min-w-0">
            <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-[#A79277]">
              {currentUrl.startsWith("https://") ? (
                <ShieldCheck className="size-3.5 text-emerald-400" />
              ) : (
                <Search className="size-3.5 text-[#F7E7CE]" />
              )}
            </div>

            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Search or enter web address (e.g. youtube.com, tiktok.com)…"
              className="w-full h-8 sm:h-9 pl-8 pr-16 rounded-xl border border-[#A79277]/40 bg-[#090D0C]/80 font-mono text-xs text-[#F7E7CE] placeholder:text-[#A79277]/60 focus:border-[#F7E7CE] focus:outline-hidden focus:ring-1 focus:ring-[#F7E7CE]/40 transition-all truncate"
            />

            <div className="absolute right-1.5 flex items-center gap-1">
              {inputUrl.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setInputUrl("");
                    void haptics.light();
                  }}
                  className="p-1 rounded-md text-[#A79277] hover:text-[#F7E7CE] hover:bg-[#102C26] transition-all cursor-pointer"
                  title="Clear"
                >
                  <X className="size-3.5" />
                </button>
              )}

              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-[#102C26] hover:bg-[#102C26]/90 text-[#F7E7CE] border border-[#A79277]/40 font-mono text-[10px] font-bold uppercase transition-all cursor-pointer"
                title="Navigate"
              >
                Go
              </button>
            </div>
          </form>
        </div>

        {/* Live Loading Progress Bar */}
        {isLoading && (
          <div className="w-full h-0.5 bg-[#102C26] overflow-hidden">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${loadingProgress}%` }}
              transition={{ ease: "easeInOut", duration: 0.2 }}
              className="h-full bg-gradient-to-r from-[#102C26] via-[#A79277] to-[#F7E7CE]"
            />
          </div>
        )}
      </div>

      {/* 2. Main Viewport Container */}
      <div className="relative flex-1 w-full bg-background/60 overflow-hidden">
        {/* State A: Quick Site Portal Deck (Home State) */}
        {!currentUrl ? (
          <div className="w-full h-full p-4 sm:p-6 overflow-y-auto space-y-5">
            <div className="text-center space-y-1.5 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#A79277]/40 bg-[#102C26]/60 text-[#F7E7CE] font-mono text-[11px] font-semibold">
                <Globe className="size-3.5 animate-spin text-[#F7E7CE]" />
                <span>In-App Mini Browser & Stream Sniffer</span>
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#F7E7CE]">
                Browse, Sniff & Download Media
              </h3>
              <p className="font-mono text-xs text-[#A79277] max-w-md mx-auto">
                Visit video sites directly. The floating VidMate action button will detect streaming media and open quality options automatically.
              </p>
            </div>

            {/* Bookmarks Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto pt-2 pb-6">
              {QUICK_PORTALS.map((portal) => (
                <button
                  key={portal.id}
                  type="button"
                  onClick={() => navigateTo(portal.url)}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border border-[#A79277]/30 bg-gradient-to-br from-[#102C26]/60 via-[#090D0C]/80 to-[#102C26]/30 hover:border-[#F7E7CE]/50 hover:bg-[#102C26]/80 transition-all duration-200 cursor-pointer text-left shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div
                      className="size-9 rounded-xl flex items-center justify-center font-display font-extrabold text-sm text-white shadow-xs"
                      style={{ backgroundColor: portal.color }}
                    >
                      {portal.iconText}
                    </div>

                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-[#090D0C]/80 border border-[#A79277]/30 text-[#A79277] group-hover:text-[#F7E7CE] transition-colors">
                      {portal.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-display text-xs sm:text-sm font-bold text-[#F7E7CE] group-hover:text-[#F7E7CE] transition-colors truncate">
                      {portal.name}
                    </h4>
                    <p className="font-mono text-[10px] text-[#A79277] truncate">
                      {portal.category}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* State B: Embedded Sandboxed Web Viewport */
          <div className="relative w-full h-full flex flex-col">
            <iframe
              ref={iframeRef}
              src={currentUrl}
              title="Mini Browser Viewport"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              className="w-full h-full border-none bg-white"
              onLoad={() => {
                setIsLoading(false);
                setLoadingProgress(0);
              }}
            />

            {/* Desktop Notice Banner */}
            {!isNativeAndroidPlatform() && (
              <div className="absolute top-2 left-2 right-2 p-2 rounded-xl border border-[#A79277]/30 bg-[#090D0C]/90 backdrop-blur-md flex items-center justify-between text-[11px] font-mono text-[#A79277] shadow-sm">
                <span className="truncate">
                  Browsing: <strong className="text-[#F7E7CE]">{currentUrl}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => window.open(currentUrl, "_blank")}
                  className="flex items-center gap-1 text-[#F7E7CE] hover:underline shrink-0 ml-2 cursor-pointer"
                >
                  <ExternalLink className="size-3 text-[#A79277]" />
                  <span>Open Tab</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Floating VidMate-Style Download Action Button (FAB) */}
      <AnimatePresence>
        {currentUrl && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="absolute bottom-5 right-5 z-30 flex items-center gap-2"
            style={{
              bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
              right: "calc(1.25rem + env(safe-area-inset-right, 0px))",
            }}
          >
            {/* Pulsing Label Pill when media detected */}
            {detectedMediaUrl && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#F7E7CE]/40 bg-[#102C26] text-[#F7E7CE] backdrop-blur-md shadow-lg font-mono text-xs font-bold"
              >
                <Sparkles className="size-3.5 animate-pulse text-[#F7E7CE]" />
                <span>⚡ {detectedMediaPlatform || "Media"} Ready</span>
              </motion.div>
            )}

            {/* Floating Action Button */}
            <button
              type="button"
              onClick={handleFloatingActionDownload}
              className={`relative group h-14 sm:h-16 px-5 sm:px-6 rounded-full shadow-2xl active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                detectedMediaUrl
                  ? "bg-[#102C26] text-[#F7E7CE] border-2 border-[#F7E7CE] ring-4 ring-emerald-500/35 animate-bounce shadow-emerald-950/60"
                  : "bg-[#102C26]/80 backdrop-blur-md border border-[#A79277]/40 text-[#F7E7CE]/80 hover:text-[#F7E7CE] hover:border-[#F7E7CE]/50 shadow-black/40"
              }`}
              title={detectedMediaUrl ? "Download Detected Media" : "Sniff Media on Current Page"}
            >
              {/* Pulsing Concentric Ring when Media is Detected */}
              {detectedMediaUrl && (
                <span className="absolute -inset-1.5 rounded-full bg-[#102C26]/40 ring-2 ring-[#F7E7CE]/30 animate-ping opacity-75 pointer-events-none" />
              )}

              <Download className={`size-5 sm:size-6 ${detectedMediaUrl ? "text-[#F7E7CE] animate-pulse" : "text-[#A79277]"} group-hover:translate-y-0.5 transition-transform`} />
              <div className="flex flex-col items-start leading-none text-left">
                <span className="font-mono text-[11px] sm:text-xs font-extrabold uppercase tracking-tight text-[#F7E7CE]">
                  {detectedMediaUrl ? "⚡ Download Video / MP3" : "Sniff Media"}
                </span>
                <span className="font-mono text-[8px] text-[#A79277] font-semibold mt-0.5">
                  {detectedMediaUrl ? "VidMate Pro Engine" : "VIDMATE"}
                </span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
