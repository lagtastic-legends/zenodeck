/**
 * Twitter / X Video & Audio Extractor
 * Extracts direct MP4 video and audio from tweets via public syndication endpoints
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

export async function extractTwitterMedia(url: string): Promise<UniversalMediaInfo> {
  const cleanUrl = url.trim();
  const idMatch = cleanUrl.match(/(?:twitter\.com|x\.com)\/(?:[a-zA-Z0-9_]+)\/status\/(\d+)/i);
  if (!idMatch || !idMatch[1]) {
    throw new Error("Invalid Twitter / X status URL. Expected format: https://x.com/.../status/123456789");
  }

  const tweetId = idMatch[1];
  let tweetData: any = null;

  // Try Provider 1: api.vxtwitter.com
  try {
    const vxRes = await universalFetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });
    if (vxRes.ok) {
      tweetData = await vxRes.json();
    }
  } catch (err) {
    console.warn("Twitter provider 1 failed, trying fallback...", err);
  }

  // Try Provider 2: api.fxtwitter.com
  if (!tweetData || (!tweetData.media_extended && !tweetData.video_url)) {
    try {
      const fxRes = await universalFetch(`https://api.fxtwitter.com/status/${tweetId}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (fxRes.ok) {
        const fxJson = await fxRes.json();
        tweetData = fxJson.tweet || fxJson;
      }
    } catch (fxErr) {
      console.warn("Twitter provider 2 failed", fxErr);
    }
  }

  // Try Provider 3: Twitter Syndication endpoint
  if (!tweetData || (!tweetData.media_extended && !tweetData.video_url)) {
    try {
      const synRes = await universalFetch(`https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&lang=en`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (synRes.ok) {
        const synJson = await synRes.json();
        if (synJson && synJson.video) {
          const variants: any[] = synJson.video.variants || [];
          const mp4s = variants
            .filter((v: any) => v.type === "video/mp4" || v.src?.includes(".mp4"))
            .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));

          if (mp4s.length > 0) {
            tweetData = {
              text: synJson.text,
              user_name: synJson.user?.name,
              user_screen_name: synJson.user?.screen_name,
              video_url: mp4s[0].src,
              mediaURLs: [synJson.video.poster],
              duration_millis: synJson.video.durationMillis,
            };
          }
        }
      }
    } catch (synErr) {
      console.warn("Twitter syndication fallback failed:", synErr);
    }
  }

  if (!tweetData) {
    throw new Error("Could not resolve video from this tweet. Ensure the tweet contains a video and is public.");
  }

  // Extract video media
  const mediaList: any[] = tweetData.media_extended || [];
  const videoMedia = mediaList.find((m: any) => m.type === "video" || m.type === "gif") || {
    url: tweetData.video_url || (tweetData.mediaURLs && tweetData.mediaURLs[0]),
    thumbnail_url: tweetData.mediaURLs && tweetData.mediaURLs[0],
  };

  if (!videoMedia || !videoMedia.url) {
    throw new Error("This tweet does not appear to contain a downloadable video or GIF.");
  }

  const qualities: UniversalQualityOption[] = [];
  const directVideoUrl = videoMedia.url;

  qualities.push({
    label: "X / Twitter HD Video (MP4)",
    resolution: "HD",
    ext: "mp4",
    downloadUrl: directVideoUrl,
    badge: "HD",
  });

  // Audio track option
  qualities.push({
    label: "Extracted Audio Track (MP3)",
    resolution: "Audio",
    ext: "mp3",
    isAudioOnly: true,
    downloadUrl: directVideoUrl,
    badge: "MP3",
  });

  const author = tweetData.user_name || "X User";
  const authorHandle = tweetData.user_screen_name ? `@${tweetData.user_screen_name}` : undefined;
  const title = (tweetData.text || `${author}'s Post on X`).slice(0, 120).trim();
  const thumbnailUrl = videoMedia.thumbnail_url || (tweetData.mediaURLs && tweetData.mediaURLs[0]) || "";
  const duration = videoMedia.duration_millis ? Math.round(videoMedia.duration_millis / 1000) : undefined;

  return {
    id: tweetId,
    platform: "twitter",
    url: cleanUrl,
    title,
    author,
    authorHandle,
    thumbnailUrl,
    duration,
    qualities,
  };
}
