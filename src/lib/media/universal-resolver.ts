/**
 * Universal Media Resolver
 * Routes URL to the appropriate platform extractor and standardizes metadata
 */

import { detectPlatform, type DetectedPlatformResult } from "./detector";
import type { UniversalMediaInfo, UniversalQualityOption } from "./types";
import { extractTikTokMedia } from "./extractors/tiktok";
import { extractTwitterMedia } from "./extractors/twitter";
import { extractRedditMedia } from "./extractors/reddit";
import { extractInstagramMedia } from "./extractors/instagram";
import { resolveYouTubeVideo, type YouTubeVideoInfo } from "@/lib/youtube/innertube";

export async function resolveMediaUrl(url: string): Promise<{
  platformResult: DetectedPlatformResult;
  mediaInfo: UniversalMediaInfo;
  rawYouTubeInfo?: YouTubeVideoInfo;
}> {
  const detected = detectPlatform(url);
  if (!detected) {
    throw new Error(
      "Unsupported or invalid URL. Supported platforms: YouTube, TikTok, Instagram, Twitter / X, and Reddit."
    );
  }

  switch (detected.platform) {
    case "youtube": {
      if (!detected.id) {
        throw new Error("Could not extract YouTube video ID from the provided URL.");
      }
      const ytInfo = await resolveYouTubeVideo(detected.id);
      const qualities: UniversalQualityOption[] = (ytInfo.qualities || []).map((q) => ({
        label: q.label,
        resolution: q.resolutionLabel,
        ext: q.container,
        fileSize: q.approxSizeBytes,
        isAudioOnly: q.isAudioOnly,
        downloadUrl: q.videoFormat?.url || q.audioFormat?.url || "",
        bitrate: q.audioBitrate,
      }));

      const mediaInfo: UniversalMediaInfo = {
        id: ytInfo.videoId,
        platform: "youtube",
        url: `https://www.youtube.com/watch?v=${ytInfo.videoId}`,
        title: ytInfo.title,
        author: ytInfo.author,
        thumbnailUrl: ytInfo.thumbnailUrl,
        duration: ytInfo.durationSeconds,
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
      throw new Error(`Unsupported platform: ${detected.platform}`);
  }
}
