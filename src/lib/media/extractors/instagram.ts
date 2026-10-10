/**
 * Instagram Reels & Post Media Extractor
 * Extracts direct MP4 video and cover art from Instagram Reels, Posts, and IGTV
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

export async function extractInstagramMedia(url: string): Promise<UniversalMediaInfo> {
  const cleanUrl = url.trim();

  // Extract shortcode from /reel/{code}/ or /p/{code}/ or /tv/{code}/ or /stories/.../{code}
  const match = cleanUrl.match(/instagram\.com\/(?:reel|p|tv|stories\/[a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_-]+)/i);
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
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (embedRes.ok) {
      const html = await embedRes.text();

      // Look for video_url in embedded json or HTML tags
      const videoMatch =
        html.match(/"video_url"\s*:\s*"([^"]+)"/i) ||
        html.match(/<video[^>]+src="([^">]+)"/i) ||
        html.match(/video_versions"\s*:\s*\[\s*\{\s*"url"\s*:\s*"([^"]+)"/i);

      if (videoMatch && videoMatch[1]) {
        directVideoUrl = videoMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      }

      // Look for author handle
      const authorMatch =
        html.match(/class="EmbeddedMediaUser-username">([^<]+)<\/span>/i) ||
        html.match(/"username"\s*:\s*"([^"]+)"/i);
      if (authorMatch && authorMatch[1]) {
        authorHandle = `@${authorMatch[1].trim()}`;
        author = authorMatch[1].trim();
      }

      // Look for thumbnail
      const thumbMatch =
        html.match(/"display_url"\s*:\s*"([^"]+)"/i) ||
        html.match(/class="EmbeddedMediaImage"[^>]+src="([^">]+)"/i);
      if (thumbMatch && thumbMatch[1]) {
        thumbnailUrl = thumbMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      }

      // Look for caption
      const captionMatch = html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
      if (captionMatch && captionMatch[1]) {
        caption = captionMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 120);
      }
    }
  } catch (err) {
    console.warn("Instagram embed extraction failed, trying fallback...", err);
  }

  // Strategy 2: Fast Public SnapInsta / FastDL API Fallback
  if (!directVideoUrl) {
    try {
      const snapApi = `https://api.v1.snapinst.app/api/instagram?url=${encodeURIComponent(cleanUrl)}`;
      const res = await universalFetch(snapApi, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.url) {
          directVideoUrl = data.url;
        } else if (Array.isArray(data?.media) && data.media[0]?.url) {
          directVideoUrl = data.media[0].url;
        }
        if (data?.title) caption = data.title;
        if (data?.thumbnail) thumbnailUrl = data.thumbnail;
      }
    } catch (fbErr) {
      console.warn("Instagram secondary provider failed:", fbErr);
    }
  }

  if (!directVideoUrl) {
    throw new Error(
      "Could not extract video stream from this Instagram link. The post may be private or restricted."
    );
  }

  const qualities: UniversalQualityOption[] = [
    {
      label: "Instagram HD Video (MP4)",
      resolution: "1080p",
      ext: "mp4",
      downloadUrl: directVideoUrl,
      badge: "HD",
    },
    {
      label: "Reel Audio Track (MP3)",
      resolution: "Audio",
      ext: "mp3",
      isAudioOnly: true,
      downloadUrl: directVideoUrl,
      badge: "MP3",
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
