/**
 * Universal Media Resolver
 * Routes URL to yt-dlp Python engine or specialized platform extractors
 * Standardizes metadata across YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, etc.
 */

import { detectPlatform, type DetectedPlatformResult } from "./detector";
import type { UniversalMediaInfo, UniversalQualityOption, PlatformType } from "./types";
import { extractTikTokMedia } from "./extractors/tiktok";
import { extractTwitterMedia } from "./extractors/twitter";
import { extractRedditMedia } from "./extractors/reddit";
import { extractInstagramMedia } from "./extractors/instagram";
import { extractFacebookMedia } from "./extractors/facebook";
import { extractVimeoMedia } from "./extractors/vimeo";
import { extractPinterestMedia } from "./extractors/pinterest";
import { resolveYouTubeVideo, type YouTubeVideoInfo, getYouTubeApiUrl } from "@/lib/youtube/innertube";
import { universalFetch } from "./innertube-bridge";

/**
 * Generates studio-grade audio quality options (320k, 256k, 192k, 128k, WAV)
 * from a base stream URL so every social media video has direct audio options.
 */
export function synthesizeAudioLadder(
  sourceUrl: string,
  durationSeconds = 0
): UniversalQualityOption[] {
  const audioTiers = [
    { key: "audio-320", label: "Studio Master (320 kbps MP3)", badge: "320 KBPS", bitrate: 320, ext: "mp3" },
    { key: "audio-256", label: "High Fidelity (256 kbps AAC)", badge: "256 KBPS", bitrate: 256, ext: "m4a" },
    { key: "audio-192", label: "High Quality (192 kbps MP3)", badge: "192 KBPS", bitrate: 192, ext: "mp3" },
    { key: "audio-128", label: "Standard Audio (128 kbps MP3)", badge: "128 KBPS", bitrate: 128, ext: "mp3" },
    { key: "audio-wav", label: "Lossless Studio Audio (WAV PCM)", badge: "WAV PCM", bitrate: 1411, ext: "wav" },
  ];

  return audioTiers.map((t) => ({
    itag: t.key,
    label: t.label,
    resolution: `${t.bitrate} kbps`,
    ext: t.ext,
    isAudioOnly: true,
    downloadUrl: sourceUrl,
    bitrate: t.bitrate,
    badge: t.badge,
    fileSize: durationSeconds > 0 ? Math.round(((t.bitrate * 1000) / 8) * durationSeconds) : 0,
  }));
}

/**
 * Ensures mediaInfo contains both high-definition video tiers
 * and a full audio options ladder for the Direct Audio tab.
 */
export function ensureFullQualityLadder(info: UniversalMediaInfo): UniversalMediaInfo {
  const videoOpts = info.qualities.filter((q) => !q.isAudioOnly);
  const audioOpts = info.qualities.filter((q) => q.isAudioOnly);

  // If there are video options but fewer than 2 audio tiers, synthesize full audio ladder
  if (videoOpts.length > 0 && audioOpts.length < 3) {
    const primaryStreamUrl =
      audioOpts[0]?.downloadUrl || videoOpts[0].downloadUrl || info.url;
    const synthesized = synthesizeAudioLadder(primaryStreamUrl, info.duration || 0);

    // Keep existing direct audio streams (like original TikTok music or Reddit DASH audio)
    const existingDirect = audioOpts.filter((a) => a.audioUrl || a.label.includes("Original"));
    info.qualities = [...videoOpts, ...existingDirect, ...synthesized];
  }

  return info;
}

export async function resolveMediaUrl(url: string): Promise<{
  platformResult: DetectedPlatformResult;
  mediaInfo: UniversalMediaInfo;
  rawYouTubeInfo?: YouTubeVideoInfo;
}> {
  const detected = detectPlatform(url);
  if (!detected) {
    throw new Error(
      "Unsupported or invalid URL. Supported platforms: YouTube, TikTok, Instagram, Twitter / X, Reddit, Facebook, Vimeo, Twitch, and all social media."
    );
  }

  // 1. Try resolving with backend yt-dlp engine first (supports 1700+ platforms)
  try {
    const apiUrl = getYouTubeApiUrl("/api/media/info");
    const queryUrl = `${apiUrl}?url=${encodeURIComponent(url.trim())}`;
    const res = await universalFetch(queryUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(18000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && (data.videoId || data.id) && Array.isArray(data.qualities) && data.qualities.length > 0) {
        const qualities: UniversalQualityOption[] = data.qualities.map((q: any) => {
          const isAudio = Boolean(q.isAudioOnly);
          const downloadUrl = q.videoFormat?.url || q.downloadUrl || q.audioFormat?.url || "";
          const audioUrl = q.audioFormat?.url;
          const requiresMuxing =
            q.requiresMuxing !== undefined
              ? Boolean(q.requiresMuxing)
              : Boolean(audioUrl && (q.videoFormat?.url || (!isAudio && downloadUrl)) && !isAudio);

          return {
            label: q.label,
            resolution: q.resolutionLabel || (isAudio ? "AUDIO" : "HD"),
            ext: q.container || (isAudio ? "mp3" : "mp4"),
            fileSize: q.approxSizeBytes || q.fileSize || 0,
            isAudioOnly: isAudio,
            downloadUrl,
            audioUrl,
            requiresMuxing,
            bitrate: q.audioBitrate,
            fps: q.fps,
            badge: q.badge,
          };
        });

        const mediaInfo: UniversalMediaInfo = ensureFullQualityLadder({
          id: data.videoId || data.id,
          platform: (data.platform || detected.platform) as PlatformType,
          url: data.webpageUrl || url,
          title: data.title || "Media File",
          author: data.author || "Creator",
          authorHandle: data.authorHandle,
          thumbnailUrl: data.thumbnailUrl || "",
          duration: data.durationSeconds,
          durationFormatted: data.durationFormatted,
          viewCount: data.viewCount,
          qualities,
        });

        return {
          platformResult: {
            ...detected,
            platform: mediaInfo.platform,
          },
          mediaInfo,
        };
      }
    }
  } catch (apiErr) {
    console.warn("yt-dlp backend resolver deferred, attempting client extractor fallback:", apiErr);
  }

  // 2. Client-Side specialized platform extractors
  switch (detected.platform) {
    case "youtube": {
      const videoId = detected.id;
      if (!videoId) {
        throw new Error("Could not extract YouTube video ID from the provided URL.");
      }
      const ytInfo = await resolveYouTubeVideo(videoId);
      const qualities: UniversalQualityOption[] = (ytInfo.qualities || []).map((q) => {
        const isAudio = Boolean(q.isAudioOnly);
        const downloadUrl = q.videoFormat?.url || q.audioFormat?.url || "";
        const audioUrl = q.audioFormat?.url;
        const requiresMuxing = Boolean(!isAudio && audioUrl && q.videoFormat?.url);

        return {
          label: q.label,
          resolution: q.resolutionLabel,
          ext: q.container,
          fileSize: q.approxSizeBytes,
          isAudioOnly: isAudio,
          downloadUrl,
          audioUrl,
          requiresMuxing,
          bitrate: q.audioBitrate,
          fps: q.fps,
          badge: q.badge,
        };
      });

      const mediaInfo: UniversalMediaInfo = {
        id: ytInfo.videoId,
        platform: "youtube",
        url: `https://www.youtube.com/watch?v=${ytInfo.videoId}`,
        title: ytInfo.title,
        author: ytInfo.author,
        thumbnailUrl: ytInfo.thumbnailUrl,
        duration: ytInfo.durationSeconds,
        durationFormatted: ytInfo.durationFormatted,
        viewCount: ytInfo.viewCount,
        qualities,
      };

      return {
        platformResult: detected,
        mediaInfo,
        rawYouTubeInfo: ytInfo,
      };
    }

    case "tiktok": {
      const mediaInfo = await extractTikTokMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo: ensureFullQualityLadder(mediaInfo) };
    }

    case "twitter": {
      const mediaInfo = await extractTwitterMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo: ensureFullQualityLadder(mediaInfo) };
    }

    case "reddit": {
      const mediaInfo = await extractRedditMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo: ensureFullQualityLadder(mediaInfo) };
    }

    case "instagram": {
      const mediaInfo = await extractInstagramMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo: ensureFullQualityLadder(mediaInfo) };
    }

    case "facebook": {
      const mediaInfo = await extractFacebookMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo: ensureFullQualityLadder(mediaInfo) };
    }

    case "vimeo": {
      const mediaInfo = await extractVimeoMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo: ensureFullQualityLadder(mediaInfo) };
    }

    case "pinterest": {
      const mediaInfo = await extractPinterestMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo: ensureFullQualityLadder(mediaInfo) };
    }

    default:
      throw new Error(
        `Could not resolve media for ${detected.platform}. Please ensure the URL is public and valid.`
      );
  }
}
