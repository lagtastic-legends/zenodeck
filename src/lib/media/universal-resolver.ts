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
import { resolveYouTubeVideo, type YouTubeVideoInfo, getYouTubeApiUrl } from "@/lib/youtube/innertube";
import { universalFetch } from "./innertube-bridge";

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
        const qualities: UniversalQualityOption[] = data.qualities.map((q: any) => ({
          label: q.label,
          resolution: q.resolutionLabel || (q.isAudioOnly ? "AUDIO" : "HD"),
          ext: q.container || (q.isAudioOnly ? "mp3" : "mp4"),
          fileSize: q.approxSizeBytes || q.fileSize || 0,
          isAudioOnly: !!q.isAudioOnly,
          downloadUrl: q.videoFormat?.url || q.audioFormat?.url || q.downloadUrl || "",
          audioUrl: q.audioFormat?.url,
          bitrate: q.audioBitrate,
          fps: q.fps,
          badge: q.badge,
        }));

        const mediaInfo: UniversalMediaInfo = {
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
        };

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

  // 2. Client-Side fallback extractors (e.g. mobile APK on-device or offline)
  switch (detected.platform) {
    case "youtube": {
      const videoId = detected.id;
      if (!videoId) {
        throw new Error("Could not extract YouTube video ID from the provided URL.");
      }
      const ytInfo = await resolveYouTubeVideo(videoId);
      const qualities: UniversalQualityOption[] = (ytInfo.qualities || []).map((q) => ({
        label: q.label,
        resolution: q.resolutionLabel,
        ext: q.container,
        fileSize: q.approxSizeBytes,
        isAudioOnly: q.isAudioOnly,
        downloadUrl: q.videoFormat?.url || q.audioFormat?.url || "",
        audioUrl: q.audioFormat?.url,
        bitrate: q.audioBitrate,
        fps: q.fps,
        badge: q.badge,
      }));

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
      return { platformResult: detected, mediaInfo };
    }

    case "twitter": {
      const mediaInfo = await extractTwitterMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo };
    }

    case "reddit": {
      const mediaInfo = await extractRedditMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo };
    }

    case "instagram": {
      const mediaInfo = await extractInstagramMedia(detected.cleanUrl);
      return { platformResult: detected, mediaInfo };
    }

    default:
      throw new Error(
        `Could not resolve media for ${detected.platform}. Please ensure the URL is public and valid.`
      );
  }
}
