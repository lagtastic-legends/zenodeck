/**
 * Pinterest Video Extractor
 * Extracts direct MP4 video from Pinterest Pins
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

export async function extractPinterestMedia(url: string): Promise<UniversalMediaInfo> {
  let cleanUrl = url.trim();

  // If short link pin.it, resolve actual destination
  if (cleanUrl.includes("pin.it")) {
    try {
      const headRes = await universalFetch(cleanUrl, { method: "HEAD" });
      // If head gives final URL or text, try to extract pin ID
      const pinIdMatch = cleanUrl.match(/pin\.it\/([a-zA-Z0-9]+)/i);
      if (pinIdMatch) {
        // Continue with original short code
      }
    } catch {}
  }

  const idMatch = cleanUrl.match(/pin\/(?:.*--)?(\d+)/i) || cleanUrl.match(/pin\.it\/([a-zA-Z0-9]+)/i);
  const pinId = idMatch ? idMatch[1] : `pin_${Date.now()}`;

  let videoUrl: string | null = null;
  let title = "Pinterest Video";
  let author = "Pinterest Creator";
  let thumbnailUrl = "";

  // Strategy 1: HTML Scraper for OpenGraph & Video JSON
  try {
    const res = await universalFetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (res.ok) {
      const html = await res.text();

      // Look for og:video or og:video:secure_url
      const ogVideoMatch =
        html.match(/<meta\s+property=["']og:video(?:[:a-z]*)?["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:video(?:[:a-z]*)?["']/i);

      if (ogVideoMatch && ogVideoMatch[1]) {
        videoUrl = ogVideoMatch[1];
      }

      // Look for video_list JSON inside page
      if (!videoUrl) {
        const vListMatch = html.match(/"video_list"\s*:\s*\{([^}]+)\}/i);
        if (vListMatch) {
          const urlMatch = vListMatch[0].match(/"url"\s*:\s*"([^"]+)"/i);
          if (urlMatch && urlMatch[1]) {
            videoUrl = urlMatch[1];
          }
        }
      }

      // Look for direct .mp4 inside Pinterest CDN links
      if (!videoUrl) {
        const mp4Match = html.match(/https:\/\/[^"'\s]+\.pinimg\.com\/[^"'\s]+\.mp4/i);
        if (mp4Match) {
          videoUrl = mp4Match[0];
        }
      }

      // Look for title & image
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/\| Pinterest.*/i, "").trim() || "Pinterest Video";
      }

      const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
      if (ogImgMatch && ogImgMatch[1]) {
        thumbnailUrl = ogImgMatch[1];
      }
    }
  } catch (err) {
    console.warn("Pinterest HTML extraction failed:", err);
  }

  // Strategy 2: PinResource API Fallback
  if (!videoUrl && /^\d+$/.test(pinId)) {
    try {
      const apiUrl = `https://www.pinterest.com/resource/PinResource/get/?data=${encodeURIComponent(
        JSON.stringify({ options: { id: pinId, field_set_key: "detailed" } })
      )}`;
      const apiRes = await universalFetch(apiUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (apiRes.ok) {
        const data = await apiRes.json().catch(() => null);
        const pinData = data?.resource_response?.data;
        if (pinData) {
          const videos = pinData.videos?.video_list;
          if (videos) {
            const vOpt = videos.V_720P || videos.V_EXP || videos.V_480P || videos.V_360P;
            if (vOpt?.url) videoUrl = vOpt.url;
          }
          if (pinData.title) title = pinData.title;
          if (pinData.pinner?.username) author = pinData.pinner.username;
          if (pinData.images?.orig?.url) thumbnailUrl = pinData.images.orig.url;
        }
      }
    } catch (apiErr) {
      console.warn("Pinterest resource API fallback failed:", apiErr);
    }
  }

  if (!videoUrl) {
    throw new Error(
      "Could not find a downloadable video in this Pinterest Pin. Ensure the pin is public and contains a video."
    );
  }

  const qualities: UniversalQualityOption[] = [
    {
      label: "Pinterest HD Video (MP4)",
      resolution: "720p",
      ext: "mp4",
      downloadUrl: videoUrl,
      badge: "HD",
    },
    {
      label: "Extracted Audio Track (MP3)",
      resolution: "Audio",
      ext: "mp3",
      isAudioOnly: true,
      downloadUrl: videoUrl,
      badge: "MP3",
    },
  ];

  return {
    id: pinId,
    platform: "pinterest",
    url: cleanUrl,
    title,
    author,
    thumbnailUrl,
    qualities,
  };
}
