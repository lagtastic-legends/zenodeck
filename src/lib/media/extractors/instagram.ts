/**
 * Instagram Reels & Post Media Extractor
 * Extracts direct MP4 video and cover art from Instagram Reels, Posts, and IGTV
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

export async function extractInstagramMedia(url: string): Promise<UniversalMediaInfo> {
  const cleanUrl = url.trim();

  // Extract shortcode from /reel/{code}/ or /p/{code}/ or /tv/{code}/
  const match = cleanUrl.match(/instagram\.com\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
  if (!match || !match[1]) {
    throw new Error("Invalid Instagram URL. Expected format: https://www.instagram.com/reel/CODE/");
  }

  const shortcode = match[1];
  let directVideoUrl: string | null = null;
  let caption = "Instagram Reel";
  let author = "Instagram Creator";
  let authorHandle: string | undefined = undefined;
  let thumbnailUrl = "";

  // Strategy 1: Instagram Embed Page Scraper via universalFetch
  try {
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
    const embedRes = await universalFetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml",
      },
    });

    if (embedRes.ok) {
      const html = await embedRes.text();

      // Look for video_url in embedded json or HTML tags
      const videoMatch = html.match(/"video_url"\s*:\s*"([^"]+)"/) || html.match(/<video[^>]+src="([^">]+)"/);
      if (videoMatch && videoMatch[1]) {
        directVideoUrl = videoMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      }

      // Look for author handle
      const authorMatch = html.match(/class="EmbeddedMediaUser-username">([^<]+)<\/span>/) || html.match(/"username"\s*:\s*"([^"]+)"/);
      if (authorMatch && authorMatch[1]) {
        authorHandle = `@${authorMatch[1].trim()}`;
        author = authorMatch[1].trim();
      }

      // Look for thumbnail
      const thumbMatch = html.match(/"display_url"\s*:\s*"([^"]+)"/) || html.match(/class="EmbeddedMediaImage"[^>]+src="([^">]+)"/);
      if (thumbMatch && thumbMatch[1]) {
        thumbnailUrl = thumbMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      }

      // Look for caption
      const captionMatch = html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/);
      if (captionMatch && captionMatch[1]) {
        caption = captionMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 120);
      }
    }
  } catch (err) {
    console.warn("Instagram embed extraction failed, trying fallback...", err);
  }

  // Strategy 2: Fast public resolver fallback if embed didn't yield video_url
  if (!directVideoUrl) {
    try {
      const fallbackUrl = `https://api.cobalt.tools/api/json`;
      const fallbackRes = await universalFetch(fallbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ url: cleanUrl }),
      });
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        if (data.url) {
          directVideoUrl = data.url;
        }
      }
    } catch (fbErr) {
      console.warn("Instagram secondary provider failed", fbErr);
    }
  }

  if (!directVideoUrl) {
    throw new Error("Could not extract video stream from this Instagram link. The post may be private or restricted.");
  }

  const qualities: UniversalQualityOption[] = [
    {
      label: "Instagram HD Video (MP4)",
      resolution: "1080p",
      ext: "mp4",
      downloadUrl: directVideoUrl,
    },
    {
      label: "Reel Audio Track (MP3)",
      resolution: "Audio",
      ext: "mp3",
      isAudioOnly: true,
      downloadUrl: directVideoUrl,
    },
  ];

  return {
    id: shortcode,
    platform: "instagram",
    url: cleanUrl,
    title: caption || `${author}'s Reel`,
    author,
    authorHandle,
    thumbnailUrl,
    qualities,
  };
}
