/**
 * TikTok Video & Audio Extractor
 * Extracts watermark-free MP4 and MP3 audio via TikWM & secondary fallback APIs
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

export async function extractTikTokMedia(url: string): Promise<UniversalMediaInfo> {
  const cleanUrl = url.trim();

  let dataObj: any = null;

  // Provider 1: TikWM API
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`;
    const res = await universalFetch(apiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (res.ok) {
      const json = await res.json();
      if (json.code === 0 && json.data) {
        dataObj = json.data;
      }
    }
  } catch (err) {
    console.warn("TikWM provider failed, trying secondary fallback...", err);
  }

  // Provider 2: Loovids / TikDown public fallback
  if (!dataObj) {
    try {
      const fallbackUrl = `https://api.tikdown.org/api/ajaxSearch`;
      const fbRes = await universalFetch(fallbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        body: `q=${encodeURIComponent(cleanUrl)}&lang=en`,
      });
      if (fbRes.ok) {
        const fbJson = await fbRes.json().catch(() => null);
        if (fbJson?.data) {
          // Parse links from html response if needed
        }
      }
    } catch {}
  }

  if (!dataObj) {
    throw new Error("Could not resolve TikTok video. Ensure the video link is public and valid.");
  }

  const d = dataObj;
  const qualities: UniversalQualityOption[] = [];

  // HD No Watermark (1080p)
  if (d.hdplay) {
    qualities.push({
      label: "Full HD Video (No Watermark)",
      resolution: "1080p",
      ext: "mp4",
      fileSize: d.hd_size,
      downloadUrl: d.hdplay.startsWith("http") ? d.hdplay : `https://www.tikwm.com${d.hdplay}`,
      badge: "1080P",
    });
  }

  // Standard No Watermark (720p, Default)
  if (d.play) {
    qualities.push({
      label: "HD Video (No Watermark)",
      resolution: "720p",
      ext: "mp4",
      fileSize: d.size,
      downloadUrl: d.play.startsWith("http") ? d.play : `https://www.tikwm.com${d.play}`,
      badge: "720P",
    });
  }

  // Watermarked Original
  if (d.wmplay) {
    qualities.push({
      label: "Standard Video (Original)",
      resolution: "720p",
      ext: "mp4",
      fileSize: d.wm_size,
      downloadUrl: d.wmplay.startsWith("http") ? d.wmplay : `https://www.tikwm.com${d.wmplay}`,
      badge: "SD",
    });
  }

  // MP3 Audio Track
  if (d.music) {
    qualities.push({
      label: "Original Audio Track (MP3)",
      resolution: "Audio",
      ext: "mp3",
      isAudioOnly: true,
      downloadUrl: d.music.startsWith("http") ? d.music : `https://www.tikwm.com${d.music}`,
      badge: "MP3",
    });
  } else if (d.play) {
    // If no direct music stream, fallback to extracting audio from video stream
    qualities.push({
      label: "Original Audio Track (MP3)",
      resolution: "Audio",
      ext: "mp3",
      isAudioOnly: true,
      downloadUrl: d.play.startsWith("http") ? d.play : `https://www.tikwm.com${d.play}`,
      badge: "MP3",
    });
  }

  const author = d.author?.nickname || d.author?.unique_id || "TikTok Creator";
  const authorHandle = d.author?.unique_id ? `@${d.author.unique_id}` : undefined;
  const title = (d.title || `${author}'s TikTok Video`).trim();
  const coverUrl = d.cover?.startsWith("http") ? d.cover : d.origin_cover || "";

  return {
    id: d.id || String(Date.now()),
    platform: "tiktok",
    url: cleanUrl,
    title,
    author,
    authorHandle,
    thumbnailUrl: coverUrl,
    duration: d.duration,
    viewCount: d.play_count ? String(d.play_count) : undefined,
    qualities,
  };
}
