/**
 * TikTok Video & Audio Extractor
 * Extracts watermark-free MP4 and MP3 audio via TikWM & direct API
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

export async function extractTikTokMedia(url: string): Promise<UniversalMediaInfo> {
  const cleanUrl = url.trim();

  // Call TikWM public API with universalFetch
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(cleanUrl)}`;
  const res = await universalFetch(apiUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`TikTok resolution failed with HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.code !== 0 || !json.data) {
    throw new Error(json.msg || "Could not resolve TikTok video. Ensure the video is public.");
  }

  const d = json.data;
  const qualities: UniversalQualityOption[] = [];

  // HD No Watermark
  if (d.hdplay) {
    qualities.push({
      label: "Full HD Video (No Watermark)",
      resolution: "1080p",
      ext: "mp4",
      fileSize: d.hd_size,
      downloadUrl: d.hdplay.startsWith("http") ? d.hdplay : `https://www.tikwm.com${d.hdplay}`,
    });
  }

  // Standard No Watermark (Default)
  if (d.play) {
    qualities.push({
      label: "HD Video (No Watermark)",
      resolution: "720p",
      ext: "mp4",
      fileSize: d.size,
      downloadUrl: d.play.startsWith("http") ? d.play : `https://www.tikwm.com${d.play}`,
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
    });
  }

  // MP3 Audio Track
  if (d.music) {
    qualities.push({
      label: "Audio Track (MP3)",
      resolution: "Audio",
      ext: "mp3",
      isAudioOnly: true,
      downloadUrl: d.music.startsWith("http") ? d.music : `https://www.tikwm.com${d.music}`,
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
