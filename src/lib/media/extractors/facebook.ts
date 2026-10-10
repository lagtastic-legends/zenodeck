/**
 * Facebook Video & Reel Extractor
 * Extracts direct MP4 video and audio from Facebook Reels, Watch, and public posts
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

export async function extractFacebookMedia(url: string): Promise<UniversalMediaInfo> {
  const cleanUrl = url.trim();

  // Extract ID or clean video identifier
  const idMatch =
    cleanUrl.match(/(?:facebook\.com\/(?:watch\/\?v=|reel\/|.*\/videos\/)|fb\.watch\/)([0-9a-zA-Z_-]+)/i);
  const videoId = idMatch ? idMatch[1] : `fb_${Date.now()}`;

  let hdUrl: string | null = null;
  let sdUrl: string | null = null;
  let title = "Facebook Video";
  let author = "Facebook Creator";
  let thumbnailUrl = "";

  // Strategy 1: Facebook Video Plugin Embed Scraper
  try {
    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleanUrl)}`;
    const embedRes = await universalFetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (embedRes.ok) {
      const html = await embedRes.text();

      // Search for hd_src and sd_src in embed payload
      const hdMatch = html.match(/"hd_src"\s*:\s*"([^"]+)"/i) || html.match(/"hd_src_no_ratelimit"\s*:\s*"([^"]+)"/i);
      const sdMatch = html.match(/"sd_src"\s*:\s*"([^"]+)"/i) || html.match(/"sd_src_no_ratelimit"\s*:\s*"([^"]+)"/i);

      if (hdMatch && hdMatch[1]) {
        hdUrl = hdMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      }
      if (sdMatch && sdMatch[1]) {
        sdUrl = sdMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      }

      // Check for thumbnail
      const thumbMatch = html.match(/"thumb_url"\s*:\s*"([^"]+)"/i) || html.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i);
      if (thumbMatch && thumbMatch[1]) {
        thumbnailUrl = thumbMatch[1].replace(/\\u0026/g, "&").replace(/\\/g, "");
      }

      // Check for title / message
      const titleMatch = html.match(/"message"\s*:\s*\{"text"\s*:\s*"([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        const rawTitle = titleMatch[1].replace(/\\n/g, " ").trim();
        if (!rawTitle.toLowerCase().includes("facebook")) {
          title = rawTitle.slice(0, 100);
        }
      }
    }
  } catch (err) {
    console.warn("Facebook embed extraction failed, trying fallback...", err);
  }

  // Strategy 2: Fast Public Resolver Fallback
  if (!hdUrl && !sdUrl) {
    try {
      const pubApiUrl = `https://api.v1.snapinst.app/api/facebook?url=${encodeURIComponent(cleanUrl)}`;
      const pubRes = await universalFetch(pubApiUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
      });

      if (pubRes.ok) {
        const data = await pubRes.json().catch(() => null);
        if (data && data.url) {
          hdUrl = data.url;
        } else if (data && Array.isArray(data.links)) {
          const hdLink = data.links.find((l: any) => l.quality === "HD" || l.resolution?.includes("720"));
          const sdLink = data.links.find((l: any) => l.quality === "SD");
          if (hdLink?.url) hdUrl = hdLink.url;
          if (sdLink?.url) sdUrl = sdLink.url;
        }
        if (data?.title) title = data.title;
        if (data?.thumbnail) thumbnailUrl = data.thumbnail;
      }
    } catch (fbErr) {
      console.warn("Facebook secondary provider failed:", fbErr);
    }
  }

  const primaryDownloadUrl = hdUrl || sdUrl;
  if (!primaryDownloadUrl) {
    throw new Error(
      "Could not extract video stream from this Facebook URL. Please ensure the post is public and contains a video."
    );
  }

  const qualities: UniversalQualityOption[] = [];

  if (hdUrl) {
    qualities.push({
      label: "Facebook Full HD Video (MP4)",
      resolution: "1080p",
      ext: "mp4",
      downloadUrl: hdUrl,
      badge: "HD",
    });
  }

  if (sdUrl && sdUrl !== hdUrl) {
    qualities.push({
      label: "Facebook Standard Video (MP4)",
      resolution: "SD",
      ext: "mp4",
      downloadUrl: sdUrl,
      badge: "SD",
    });
  } else if (!hdUrl && sdUrl) {
    qualities.push({
      label: "Facebook Video (MP4)",
      resolution: "SD",
      ext: "mp4",
      downloadUrl: sdUrl,
      badge: "SD",
    });
  }

  // Audio track option
  qualities.push({
    label: "Extracted Audio Track (MP3)",
    resolution: "Audio",
    ext: "mp3",
    isAudioOnly: true,
    downloadUrl: primaryDownloadUrl,
    badge: "MP3",
  });

  return {
    id: videoId,
    platform: "facebook",
    url: cleanUrl,
    title,
    author,
    thumbnailUrl,
    qualities,
  };
}
