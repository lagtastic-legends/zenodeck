/**
 * ZenoDeck — YouTube InnerTube Metadata & Stream Resolver
 *
 * Lightweight, zero-dependency extractor querying YouTube's official
 * InnerTube player endpoints (ANDROID_VR / TVHTML5 profiles).
 * Resolves full adaptive stream manifests including 4K 60fps (2160p60)
 * with direct unthrottled streaming URLs.
 */

import { Capacitor, CapacitorHttp } from "@capacitor/core";
import type { YouTubeSubtitleTrack } from "./subtitles";

export type { YouTubeSubtitleTrack };

export async function universalFetch(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
): Promise<{
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<any>;
  text: () => Promise<string>;
}> {
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    try {
      let dataPayload: any = undefined;
      if (options?.body) {
        try {
          dataPayload = JSON.parse(options.body);
        } catch {
          dataPayload = options.body;
        }
      }
      const res = await CapacitorHttp.request({
        url,
        method: options?.method || "GET",
        headers: options?.headers,
        data: dataPayload,
        responseType: "text",
      });
      const ok = res.status >= 200 && res.status < 300;
      const textData = typeof res.data === "string" ? res.data : JSON.stringify(res.data);
      return {
        ok,
        status: res.status,
        statusText: ok ? "OK" : `HTTP ${res.status}`,
        json: async () => (typeof res.data === "string" ? JSON.parse(res.data) : res.data),
        text: async () => textData,
      };
    } catch (err: any) {
      console.warn("CapacitorHttp native request failed, falling back to fetch:", err);
    }
  }

  const res = await fetch(url, options as any);
  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    json: () => res.json(),
    text: () => res.text(),
  };
}

export interface YouTubeFormatMeta {
  itag: number;
  url: string;
  mimeType: string;
  container: "mp4" | "webm" | "m4a";
  codec: string;
  bitrate: number;
  averageBitrate?: number;
  contentLength?: number;
  qualityLabel?: string;
  width?: number;
  height?: number;
  fps?: number;
  audioQuality?: string;
  audioSampleRate?: string;
  approxDurationMs?: number;
}

export interface YouTubeQualityOption {
  id: string; // e.g. "2160p60", "1080p60", "audio-320", "audio-256", "audio-192", "audio-128", "audio-m4a", "audio-wav"
  label: string;
  resolutionLabel: string;
  fps: number;
  badge:
    | "4K 60FPS"
    | "4K"
    | "2K 60FPS"
    | "2K"
    | "1080P 60"
    | "1080P"
    | "720P"
    | "480P"
    | "360P"
    | "SD"
    | "320 KBPS"
    | "256 KBPS"
    | "192 KBPS"
    | "128 KBPS"
    | "NATIVE AAC"
    | "WAV PCM"
    | "AUDIO"
    | string;
  is4K: boolean;
  is60fps: boolean;
  isAudioOnly: boolean;
  audioBitrate?: number; // in kbps (e.g. 320, 256, 192, 128)
  container: "mp4" | "webm" | "mp3" | "m4a" | "wav";
  approxSizeBytes: number;
  videoFormat?: YouTubeFormatMeta;
  audioFormat?: YouTubeFormatMeta;
}

export interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  author: string;
  channelId?: string;
  durationSeconds: number;
  durationFormatted: string;
  thumbnailUrl: string;
  viewCount?: string;
  qualities: YouTubeQualityOption[];
  subtitles?: YouTubeSubtitleTrack[];
}

/**
 * Robust YouTube video ID parser supporting watch URLs, short URLs,
 * shorts, embeds, and raw 11-char video IDs.
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  let trimmed = urlOrId.trim();

  // Strip trailing punctuation like : / ? &
  trimmed = trimmed.replace(/[:\/\?&]+$/, "").trim();

  // If already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle standard YouTube URLs
  const patterns = [
    /(?:youtu\.be\/|(?:www\.|m\.|music\.)?youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Format duration in seconds to "MM:SS" or "HH:MM:SS"
 */
export function formatDuration(sec: number): string {
  if (isNaN(sec) || sec <= 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format bytes to readable size string (MB / GB)
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Helper to get the fully qualified or relative YouTube API endpoint.
 * - In native Capacitor mobile APK (Android / iOS), routes to remote API fallback.
 * - In any browser environment (localhost on any port: 3000, 3001, custom domain, LAN IP),
 *   returns `${window.location.origin}${normalizedPath}`.
 * - In SSR / Node runtime, falls back to remote API origin.
 */
export function getYouTubeApiUrl(path: string): string {
  let normalizedPath = path;
  const [pathname, search] = path.split("?");
  if (!pathname.endsWith("/")) {
    normalizedPath = `${pathname}/${search ? `?${search}` : ""}`;
  }
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`;
  }

  if (typeof window !== "undefined") {
    // 1. In native mobile APK (Capacitor Android / iOS), route to remote API fallback
    if (Capacitor.isNativePlatform()) {
      const fallback = process.env.NEXT_PUBLIC_APP_URL || "https://omni-tool-two.vercel.app";
      return `${fallback.replace(/\/$/, "")}${normalizedPath}`;
    }

    // 2. In any web browser environment (localhost on ANY port, custom domain, LAN IP):
    const origin = window.location.origin;
    if (origin && !origin.startsWith("file:")) {
      return `${origin}${normalizedPath}`;
    }
  }

  // 3. SSR / Node.js fallback
  const fallback = process.env.NEXT_PUBLIC_APP_URL || "https://omni-tool-two.vercel.app";
  return `${fallback.replace(/\/$/, "")}${normalizedPath}`;
}

/**
 * Generates fallback CDN candidate URLs from embedded YouTube parameters (mn, fallback_host)
 * Ensures high reliability even if primary edge node times out or is geo-throttled.
 */
export function buildCandidateUrls(targetUrl: string): string[] {
  const candidateUrls: string[] = [targetUrl];
  try {
    const parsedUrl = new URL(targetUrl);
    const mnParam = parsedUrl.searchParams.get("mn");
    if (mnParam) {
      const nodes = mnParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (nodes.length > 1) {
        const primaryNode = nodes[0];
        for (let i = 1; i < nodes.length; i++) {
          const altNode = nodes[i];
          if (parsedUrl.host.includes(primaryNode)) {
            const altUrl = new URL(targetUrl);
            altUrl.host = parsedUrl.host.replace(primaryNode, altNode);
            candidateUrls.push(altUrl.toString());
          }
        }
      }
    }

    const fallbackHost = parsedUrl.searchParams.get("fallback_host");
    if (fallbackHost && !candidateUrls.some((u) => u.includes(fallbackHost))) {
      const fallbackUrl = new URL(targetUrl);
      fallbackUrl.host = fallbackHost;
      candidateUrls.push(fallbackUrl.toString());
    }
  } catch {}
  return candidateUrls;
}

const IOS_CLIENT_VERSION = "20.10.4";
const IOS_USER_AGENT = `com.google.ios.youtube/${IOS_CLIENT_VERSION} (iPhone16,2; U; CPU iOS 18_1 like Mac OS X; en_US)`;

export interface InnerTubeClientConfig {
  name: string;
  headers: Record<string, string>;
  context: Record<string, any>;
}

let cachedVisitorData: { data: string; expires: number } | null = null;

export async function getVisitorData(): Promise<string | undefined> {
  if (cachedVisitorData && cachedVisitorData.expires > Date.now()) {
    return cachedVisitorData.data;
  }
  try {
    const res = await universalFetch("https://www.youtube.com/youtubei/v1/visitor_id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": IOS_USER_AGENT,
        "X-YouTube-Client-Name": "5",
        "X-YouTube-Client-Version": IOS_CLIENT_VERSION,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "IOS",
            clientVersion: IOS_CLIENT_VERSION,
            deviceModel: "iPhone16,2",
            hl: "en",
          },
        },
      }),
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const json = await res.json();
      const visitor = json.responseContext?.visitorData;
      if (visitor) {
        cachedVisitorData = { data: visitor, expires: Date.now() + 1000 * 60 * 60 };
        return visitor;
      }
    }
  } catch {}
  return undefined;
}

const INNERTUBE_CLIENTS: InnerTubeClientConfig[] = [
  {
    name: "IOS_NO_GL",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": IOS_USER_AGENT,
      "X-YouTube-Client-Name": "5",
      "X-YouTube-Client-Version": IOS_CLIENT_VERSION,
    },
    context: {
      client: {
        clientName: "IOS",
        clientVersion: IOS_CLIENT_VERSION,
        deviceModel: "iPhone16,2",
        hl: "en",
      },
    },
  },
  {
    name: "IOS_PRIMARY",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": IOS_USER_AGENT,
      "X-YouTube-Client-Name": "5",
      "X-YouTube-Client-Version": IOS_CLIENT_VERSION,
    },
    context: {
      client: {
        clientName: "IOS",
        clientVersion: IOS_CLIENT_VERSION,
        deviceModel: "iPhone16,2",
        hl: "en",
        gl: "US",
      },
    },
  },
  {
    name: "IOS_SECONDARY",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": `com.google.ios.youtube/20.15.2 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X; en_US)`,
      "X-YouTube-Client-Name": "5",
      "X-YouTube-Client-Version": "20.15.2",
    },
    context: {
      client: {
        clientName: "IOS",
        clientVersion: "20.15.2",
        deviceModel: "iPhone16,2",
        hl: "en",
      },
    },
  },
  {
    name: "ANDROID_TESTSUITE",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    context: {
      client: {
        clientName: "ANDROID_TESTSUITE",
        clientVersion: "1.9",
        hl: "en",
      },
    },
  },
];

/**
 * Resolves video details and extracts complete 4K 60fps streaming manifest
 */
export async function resolveYouTubeVideo(videoIdOrUrl: string, clientIp?: string): Promise<YouTubeVideoInfo> {
  const videoId = extractYouTubeId(videoIdOrUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL or Video ID. Please check the link and try again.");
  }

  const diagnosticAttempts: any[] = [];
  let playerResponse: any = null;
  const visitorData = await getVisitorData();

  for (const clientConfig of INNERTUBE_CLIENTS) {
    try {
      const reqHeaders: Record<string, string> = {
        ...clientConfig.headers,
      };

      if (visitorData) {
        reqHeaders["X-Goog-Visitor-Id"] = visitorData;
      }

      if (clientIp) {
        reqHeaders["X-Forwarded-For"] = clientIp;
        reqHeaders["X-Real-IP"] = clientIp;
        reqHeaders["CF-Connecting-IP"] = clientIp;
      }

      const clientContext = {
        ...clientConfig.context,
        client: {
          ...clientConfig.context.client,
          ...(visitorData ? { visitorData } : {}),
        },
      };

      const res = await universalFetch("https://www.youtube.com/youtubei/v1/player", {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify({
          videoId,
          context: clientContext,
          playbackContext: {
            contentPlaybackContext: {
              html5Preference: "HTML5_PREF_WANTS",
              signatureTimestamp: 20000,
            },
          },
        }),
      });

      if (!res.ok) {
        diagnosticAttempts.push({
          client: clientConfig.name,
          httpStatus: res.status,
          statusText: res.statusText,
        });
        continue;
      }

      const data = await res.json();
      const status = data.playabilityStatus?.status;
      const reason = data.playabilityStatus?.reason;

      diagnosticAttempts.push({
        client: clientConfig.name,
        httpStatus: res.status,
        status,
        reason,
      });

      if (status === "OK" && (data.streamingData?.formats || data.streamingData?.adaptiveFormats)) {
        playerResponse = data;
        break;
      }
    } catch (err: any) {
      diagnosticAttempts.push({
        client: clientConfig.name,
        error: err?.message || String(err),
      });
    }
  }

  if (!playerResponse) {
    const isBotBlocked = diagnosticAttempts.some(
      (a) => a.reason?.includes("bot") || a.status === "LOGIN_REQUIRED"
    );

    if (isBotBlocked) {
      throw new Error(
        "YouTube Bot Protection: Cloud datacenter server IP is restricted by YouTube. Please use the ZenoDeck Android APK for direct unthrottled streaming on your mobile/residential network."
      );
    }

    const detailMsg = diagnosticAttempts
      .map((a) => `${a.client}: ${a.status || a.error || a.httpStatus}${a.reason ? ` (${a.reason})` : ""}`)
      .join(" | ");
    throw new Error(
      `Could not retrieve video streaming data. Details: [${detailMsg}]`
    );
  }

  const details = playerResponse.videoDetails || {};
  const title = details.title || "YouTube Video";
  const author = details.author || details.channelTitle || "Unknown Artist";
  const durationSeconds = Number(details.lengthSeconds) || 0;
  const durationFormatted = formatDuration(durationSeconds);
  const viewCount = Number(details.viewCount || 0).toLocaleString();

  // Pick highest quality thumbnail
  const thumbs = details.thumbnail?.thumbnails || [];
  const thumbnailUrl =
    thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  const rawAdaptive: any[] = playerResponse.streamingData?.adaptiveFormats || [];
  const rawCombined: any[] = playerResponse.streamingData?.formats || [];

  // Parse all formats
  const parsedFormats: YouTubeFormatMeta[] = [];

  for (const f of [...rawCombined, ...rawAdaptive]) {
    if (!f.url) continue;

    const mime = f.mimeType || "";
    const container = mime.includes("video/mp4")
      ? "mp4"
      : mime.includes("audio/mp4")
      ? "m4a"
      : "webm";
    const codecMatch = mime.match(/codecs="([^"]+)"/);
    const codec = codecMatch ? codecMatch[1] : "";

    const contentLength = f.contentLength ? Number(f.contentLength) : undefined;
    const bitrate = Number(f.bitrate) || 0;

    parsedFormats.push({
      itag: f.itag,
      url: f.url,
      mimeType: mime,
      container,
      codec,
      bitrate,
      averageBitrate: f.averageBitrate ? Number(f.averageBitrate) : undefined,
      contentLength:
        contentLength ||
        (durationSeconds && bitrate ? Math.round((bitrate * durationSeconds) / 8) : undefined),
      qualityLabel: f.qualityLabel,
      width: f.width,
      height: f.height,
      fps: f.fps || 30,
      audioQuality: f.audioQuality,
      audioSampleRate: f.audioSampleRate,
      approxDurationMs: f.approxDurationMs ? Number(f.approxDurationMs) : undefined,
    });
  }

  // Find best available audio format (prioritize high-bitrate Opus or AAC)
  const audioFormats = parsedFormats
    .filter((f) => f.mimeType.startsWith("audio/"))
    .sort((a, b) => b.bitrate - a.bitrate);

  const bestAudio = audioFormats[0];

  // Specific format queries for intelligent container pairing:
  // Best AAC audio (itag 140 or audio/mp4 / m4a)
  const aacAudioFormats = audioFormats.filter(
    (f) =>
      f.container === "m4a" ||
      f.mimeType.includes("audio/mp4") ||
      f.codec.toLowerCase().includes("mp4a") ||
      f.codec.toLowerCase().includes("aac") ||
      f.itag === 140
  );
  const bestAacAudio = aacAudioFormats[0] || null;

  // Best Opus audio (itag 251 or audio/webm / opus)
  const opusAudioFormats = audioFormats.filter(
    (f) =>
      f.container === "webm" ||
      f.mimeType.includes("audio/webm") ||
      f.codec.toLowerCase().includes("opus") ||
      f.itag === 251
  );
  const bestOpusAudio = opusAudioFormats[0] || null;

  // Group and sort video formats
  const videoFormats = parsedFormats.filter((f) => f.mimeType.startsWith("video/"));

  // Build targeted quality tiers
  const qualities: YouTubeQualityOption[] = [];

  // Helper to determine format container & codec profile
  const isWebMFormat = (f: YouTubeFormatMeta) =>
    f.container === "webm" ||
    f.mimeType.toLowerCase().includes("webm") ||
    f.codec.toLowerCase().includes("vp9") ||
    f.codec.toLowerCase().includes("vp8");

  // Helper to get paired audio for video format
  const getPairedAudio = (videoFmt: YouTubeFormatMeta) => {
    if (isWebMFormat(videoFmt)) {
      return bestOpusAudio || bestAudio;
    }
    return bestAacAudio || bestAudio;
  };

  const getContainerForVideo = (videoFmt: YouTubeFormatMeta): "mp4" | "webm" => {
    return isWebMFormat(videoFmt) ? "webm" : "mp4";
  };

  // Helper to find best format matching resolution and fps criteria
  const findFormat = (minHeight: number, maxHeight: number, prefer60 = false) => {
    const candidates = videoFormats.filter((f) => {
      const h = f.height || (f.qualityLabel ? parseInt(f.qualityLabel) : 0);
      return h >= minHeight && h <= maxHeight;
    });

    if (candidates.length === 0) return null;

    if (prefer60) {
      const fps60 = candidates.filter((f) => (f.fps || 0) >= 50);
      if (fps60.length > 0) {
        return fps60.sort((a, b) => b.bitrate - a.bitrate)[0];
      }
    }

    return candidates.sort((a, b) => b.bitrate - a.bitrate)[0];
  };

  // 1. 4K 60fps / 4K UHD (2160p)
  const fmt4k = findFormat(2000, 2160, true);
  if (fmt4k) {
    const is60 = (fmt4k.fps || 0) >= 50;
    const pairedAudio = getPairedAudio(fmt4k);
    const vSize = fmt4k.contentLength || 0;
    const aSize = pairedAudio?.contentLength || 0;
    qualities.push({
      id: is60 ? "2160p60" : "2160p",
      label: is60 ? "4K Ultra HD 60fps" : "4K Ultra HD",
      resolutionLabel: "3840 × 2160 (2160p)",
      fps: fmt4k.fps || 30,
      badge: is60 ? "4K 60FPS" : "4K",
      is4K: true,
      is60fps: is60,
      isAudioOnly: false,
      container: getContainerForVideo(fmt4k),
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt4k,
      audioFormat: pairedAudio,
    });
  }

  // 2. 2K 60fps / 1440p QHD
  const fmt2k = findFormat(1300, 1440, true);
  if (fmt2k) {
    const is60 = (fmt2k.fps || 0) >= 50;
    const pairedAudio = getPairedAudio(fmt2k);
    const vSize = fmt2k.contentLength || 0;
    const aSize = pairedAudio?.contentLength || 0;
    qualities.push({
      id: is60 ? "1440p60" : "1440p",
      label: is60 ? "2K Quad HD 60fps" : "2K Quad HD",
      resolutionLabel: "2560 × 1440 (1440p)",
      fps: fmt2k.fps || 30,
      badge: is60 ? "2K 60FPS" : "2K",
      is4K: false,
      is60fps: is60,
      isAudioOnly: false,
      container: getContainerForVideo(fmt2k),
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt2k,
      audioFormat: pairedAudio,
    });
  }

  // 3. 1080p 60fps / 1080p FHD
  const fmt1080 = findFormat(950, 1080, true);
  if (fmt1080) {
    const is60 = (fmt1080.fps || 0) >= 50;
    const pairedAudio = getPairedAudio(fmt1080);
    const vSize = fmt1080.contentLength || 0;
    const aSize = pairedAudio?.contentLength || 0;
    qualities.push({
      id: is60 ? "1080p60" : "1080p",
      label: is60 ? "Full HD 60fps" : "Full HD 1080p",
      resolutionLabel: "1920 × 1080 (1080p)",
      fps: fmt1080.fps || 30,
      badge: is60 ? "1080P 60" : "1080P",
      is4K: false,
      is60fps: is60,
      isAudioOnly: false,
      container: getContainerForVideo(fmt1080),
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt1080,
      audioFormat: pairedAudio,
    });
  }

  // 4. 720p HD
  const fmt720 = findFormat(650, 720, true);
  if (fmt720) {
    const pairedAudio = getPairedAudio(fmt720);
    const vSize = fmt720.contentLength || 0;
    const aSize = pairedAudio?.contentLength || 0;
    qualities.push({
      id: "720p",
      label: "High Definition 720p",
      resolutionLabel: "1280 × 720 (720p)",
      fps: fmt720.fps || 30,
      badge: "720P",
      is4K: false,
      is60fps: (fmt720.fps || 0) >= 50,
      isAudioOnly: false,
      container: getContainerForVideo(fmt720),
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt720,
      audioFormat: pairedAudio,
    });
  }

  // 5. 480p Standard Quality
  const fmt480 = findFormat(400, 480);
  if (fmt480) {
    const pairedAudio = getPairedAudio(fmt480);
    const vSize = fmt480.contentLength || 0;
    const aSize = pairedAudio?.contentLength || 0;
    qualities.push({
      id: "480p",
      label: "Standard Definition 480p",
      resolutionLabel: "854 × 480 (480p)",
      fps: fmt480.fps || 30,
      badge: "480P",
      is4K: false,
      is60fps: false,
      isAudioOnly: false,
      container: getContainerForVideo(fmt480),
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt480,
      audioFormat: pairedAudio,
    });
  }

  // 6. 360p Standard Quality
  const fmt360 = findFormat(300, 399);
  if (fmt360) {
    const pairedAudio = getPairedAudio(fmt360);
    const vSize = fmt360.contentLength || 0;
    const aSize = pairedAudio?.contentLength || 0;
    qualities.push({
      id: "360p",
      label: "Standard Definition 360p",
      resolutionLabel: "640 × 360 (360p)",
      fps: fmt360.fps || 30,
      badge: "360P",
      is4K: false,
      is60fps: false,
      isAudioOnly: false,
      container: getContainerForVideo(fmt360),
      approxSizeBytes: vSize + aSize,
      videoFormat: fmt360,
      audioFormat: pairedAudio,
    });
  }

  // Fallback: If no standard quality tier matched (e.g. very old 240p video), add highest available video format
  const hasVideoTier = qualities.some((q) => !q.isAudioOnly);
  if (!hasVideoTier && videoFormats.length > 0) {
    const topVideo = [...videoFormats].sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    const h = topVideo.height || (topVideo.qualityLabel ? parseInt(topVideo.qualityLabel) : 360);
    const pairedAudio = getPairedAudio(topVideo);
    const vSize = topVideo.contentLength || 0;
    const aSize = pairedAudio?.contentLength || 0;
    qualities.unshift({
      id: `${h}p`,
      label: `Standard Definition ${h}p`,
      resolutionLabel: `${topVideo.width || 640} × ${h} (${h}p)`,
      fps: topVideo.fps || 30,
      badge: (h >= 480 ? "480P" : h >= 360 ? "360P" : "SD") as any,
      is4K: false,
      is60fps: false,
      isAudioOnly: false,
      container: getContainerForVideo(topVideo),
      approxSizeBytes: vSize + aSize,
      videoFormat: topVideo,
      audioFormat: pairedAudio,
    });
  }

  // 7. Direct Audio Extraction Qualities (Multi-tier bitrates & native/lossless formats)
  if (bestAudio) {
    const bestM4a = bestAacAudio || audioFormats.find((f) => f.container === "m4a") || bestAudio;

    // 6a. 320 kbps Studio Master MP3
    qualities.push({
      id: "audio-320",
      label: "Studio Master (320 kbps MP3)",
      resolutionLabel: "Ultra HQ 320 kbps · 44.1 kHz Stereo",
      fps: 0,
      badge: "320 KBPS",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      audioBitrate: 320,
      container: "mp3",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round((320 * 1000 * durationSeconds) / 8)
          : (bestAudio.contentLength || 0),
      audioFormat: bestAudio,
    });

    // 6b. 256 kbps High Fidelity MP3
    qualities.push({
      id: "audio-256",
      label: "High Fidelity (256 kbps MP3)",
      resolutionLabel: "Pro Audio 256 kbps · 44.1 kHz Stereo",
      fps: 0,
      badge: "256 KBPS",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      audioBitrate: 256,
      container: "mp3",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round((256 * 1000 * durationSeconds) / 8)
          : Math.round((bestAudio.contentLength || 0) * 0.8),
      audioFormat: bestAudio,
    });

    // 6c. 192 kbps Standard HQ MP3
    qualities.push({
      id: "audio-192",
      label: "Standard HQ (192 kbps MP3)",
      resolutionLabel: "Balanced 192 kbps · Great for Music",
      fps: 0,
      badge: "192 KBPS",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      audioBitrate: 192,
      container: "mp3",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round((192 * 1000 * durationSeconds) / 8)
          : Math.round((bestAudio.contentLength || 0) * 0.6),
      audioFormat: bestAudio,
    });

    // 6d. 128 kbps Compact MP3
    qualities.push({
      id: "audio-128",
      label: "Compact Audio (128 kbps MP3)",
      resolutionLabel: "Lightweight · Podcasts & Voice",
      fps: 0,
      badge: "128 KBPS",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      audioBitrate: 128,
      container: "mp3",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round((128 * 1000 * durationSeconds) / 8)
          : Math.round((bestAudio.contentLength || 0) * 0.4),
      audioFormat: bestAudio,
    });

    // 6e. Native AAC / M4A (Original Stream Copy)
    qualities.push({
      id: "audio-m4a",
      label: "Original Stream (M4A / AAC)",
      resolutionLabel: "Direct Native Audio · Zero Quality Loss",
      fps: 0,
      badge: "NATIVE AAC",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      container: "m4a",
      approxSizeBytes: bestM4a.contentLength || bestAudio.contentLength || 0,
      audioFormat: bestM4a,
    });

    // 6f. Uncompressed WAV PCM
    qualities.push({
      id: "audio-wav",
      label: "Studio Master PCM (WAV)",
      resolutionLabel: "Uncompressed 16-bit 44.1 kHz WAV",
      fps: 0,
      badge: "WAV PCM",
      is4K: false,
      is60fps: false,
      isAudioOnly: true,
      container: "wav",
      approxSizeBytes:
        durationSeconds > 0
          ? Math.round(44100 * 2 * 2 * durationSeconds)
          : (bestAudio.contentLength ? bestAudio.contentLength * 4 : 0),
      audioFormat: bestAudio,
    });
  }

  // Extract subtitle tracks if available in playerResponse
  const rawCaptionTracks =
    playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  const subtitles: YouTubeSubtitleTrack[] = rawCaptionTracks
    .filter((c: any) => c && c.baseUrl)
    .map((c: any) => ({
      languageCode: c.languageCode || "en",
      languageName: c.name?.simpleText || c.name?.runs?.[0]?.text || c.languageCode || "Subtitles",
      isAutoGenerated: c.kind === "asr" || (typeof c.vssId === "string" && c.vssId.startsWith("a.")),
      baseUrl: c.baseUrl,
      vssId: c.vssId,
    }));

  return {
    videoId,
    title,
    author,
    channelId: details.channelId,
    durationSeconds,
    durationFormatted,
    thumbnailUrl,
    viewCount,
    qualities,
    subtitles: subtitles.length > 0 ? subtitles : undefined,
  };
}
