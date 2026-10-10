/**
 * Vimeo Video Extractor
 * Extracts direct progressive MP4 streams from Vimeo Player Config API
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

export async function extractVimeoMedia(url: string): Promise<UniversalMediaInfo> {
  const cleanUrl = url.trim();

  // Extract Vimeo Video ID
  const idMatch = cleanUrl.match(/(?:vimeo\.com\/(?:channels\/[\w-]+\/|groups\/[\w-]+\/videos\/|album\/\d+\/video\/|video\/|)(\d+))/i);
  if (!idMatch || !idMatch[1]) {
    throw new Error("Invalid Vimeo URL. Expected format: https://vimeo.com/123456789");
  }

  const vimeoId = idMatch[1];
  let title = "Vimeo Video";
  let author = "Vimeo Creator";
  let thumbnailUrl = "";
  let duration = 0;
  const qualities: UniversalQualityOption[] = [];

  // Strategy 1: Vimeo Player Config API (Direct JSON with progressive MP4 streams)
  try {
    const configUrl = `https://player.vimeo.com/video/${vimeoId}/config`;
    const res = await universalFetch(configUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: "https://vimeo.com/",
      },
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.request && data.request.files) {
        const progressive = data.request.files.progressive || [];
        if (Array.isArray(progressive) && progressive.length > 0) {
          // Sort descending by height
          progressive.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

          for (const item of progressive) {
            if (!item.url) continue;
            const h = item.height || parseInt(item.quality, 10) || 720;
            const badge = h >= 1080 ? "1080P" : h >= 720 ? "720P" : `${h}P`;
            qualities.push({
              label: `Vimeo ${badge} (${item.fps || 30}fps)`,
              resolution: `${h}p`,
              ext: "mp4",
              downloadUrl: item.url,
              fps: item.fps,
              badge,
            });
          }
        }

        if (data.video) {
          if (data.video.title) title = data.video.title;
          if (data.video.owner?.name) author = data.video.owner.name;
          if (data.video.duration) duration = data.video.duration;
          if (data.video.thumbs) {
            thumbnailUrl =
              data.video.thumbs["1280"] ||
              data.video.thumbs["960"] ||
              data.video.thumbs["640"] ||
              data.video.thumbs.base ||
              "";
          }
        }
      }
    }
  } catch (err) {
    console.warn("Vimeo config resolution failed, trying oEmbed fallback...", err);
  }

  // Strategy 2: oEmbed Fallback for metadata if config failed
  if (qualities.length === 0) {
    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(cleanUrl)}`;
      const oRes = await universalFetch(oembedUrl);
      if (oRes.ok) {
        const oData = await oRes.json();
        if (oData.title) title = oData.title;
        if (oData.author_name) author = oData.author_name;
        if (oData.thumbnail_url) thumbnailUrl = oData.thumbnail_url;
        if (oData.duration) duration = oData.duration;
      }
    } catch {}
  }

  if (qualities.length === 0) {
    throw new Error(
      "Could not extract video streams for this Vimeo link. The video may be private or password-protected."
    );
  }

  // Add Audio Track option using highest video stream as source
  const bestVideoStream = qualities[0].downloadUrl;
  qualities.push({
    label: "Extracted Audio Track (MP3)",
    resolution: "Audio",
    ext: "mp3",
    isAudioOnly: true,
    downloadUrl: bestVideoStream,
    badge: "MP3",
  });

  return {
    id: vimeoId,
    platform: "vimeo",
    url: cleanUrl,
    title,
    author,
    thumbnailUrl,
    duration,
    qualities,
  };
}
