/**
 * TikTok Video & Audio Extractor
 * Extracts watermark-free MP4 and MP3 audio via TikWM & secondary fallback APIs
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

/**
 * Normalizes and extracts media data from TikDown / Loovids fallback responses (HTML or JSON)
 */
export function parseTikDownResponse(payload: any, baseUrl: string): any {
  if (!payload) return null;

  // Case 1: Structured JSON Object
  if (typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.play || payload.hdplay || (Array.isArray(payload.images) && payload.images.length > 0)) {
      return payload;
    }

    if (Array.isArray(payload.medias)) {
      const hd = payload.medias.find(
        (m: any) =>
          m.quality === "hd" ||
          (m.extension === "mp4" && !m.watermark && (String(m.resolution).includes("1080") || String(m.label).includes("HD")))
      );
      const normal = payload.medias.find(
        (m: any) =>
          !m.watermark &&
          (m.quality === "normal" || m.quality === "sd" || m.quality === "720" || (m.extension === "mp4" && m.quality !== "hd"))
      );
      const wm = payload.medias.find((m: any) => m.watermark === true);
      const audio = payload.medias.find((m: any) => m.extension === "mp3" || m.quality === "audio");
      const imgList = payload.medias
        .filter((m: any) => m.type === "image" || /\.(jpe?g|png|webp)$/i.test(m.url))
        .map((m: any) => m.url);

      const hdUrl = hd?.url;
      const playUrl = normal?.url || hdUrl;
      const authorObj =
        typeof payload.author === "object"
          ? payload.author
          : { nickname: payload.author || "TikTok Creator" };

      return {
        id: payload.id || String(Date.now()),
        title: (payload.title || payload.desc || "").trim(),
        author: authorObj,
        cover: payload.cover || payload.thumbnail || payload.avatar || "",
        hdplay: hdUrl,
        play: playUrl,
        wmplay: wm?.url,
        music: audio?.url || (typeof payload.music === "string" ? payload.music : payload.music?.url),
        images: imgList.length > 0 ? imgList : Array.isArray(payload.images) ? payload.images : undefined,
        duration: payload.duration ? Number(payload.duration) : undefined,
        hd_size: hd?.size || payload.hd_size,
        size: normal?.size || payload.size,
        wm_size: wm?.size || payload.wm_size,
      };
    }

    if (payload.links && typeof payload.links === "object") {
      const links = payload.links;
      const hdUrl = links.download_hd || links.hd;
      const playUrl = links.download_mp4 || links.mp4 || hdUrl;
      const audioUrl = links.download_mp3 || links.mp3;
      return {
        id: payload.id || String(Date.now()),
        title: (payload.title || "").trim(),
        author:
          typeof payload.author === "object"
            ? payload.author
            : { nickname: payload.author || "TikTok Creator" },
        cover: payload.cover || payload.thumbnail || "",
        hdplay: hdUrl,
        play: playUrl,
        music: audioUrl,
        duration: payload.duration ? Number(payload.duration) : undefined,
        hd_size: payload.hd_size,
        size: payload.size,
      };
    }
  }

  // Case 2: Rendered HTML Fragment (Standard TikDown / SaveTik / Loovids response)
  const html = typeof payload === "string" ? payload : typeof payload.data === "string" ? payload.data : null;
  if (!html || typeof html !== "string") return null;

  let hdplay: string | undefined;
  let play: string | undefined;
  let wmplay: string | undefined;
  let music: string | undefined;
  const images: string[] = [];

  function resolveUrl(raw: string): string {
    if (!raw) return "";
    let clean = raw.replace(/&amp;/g, "&").trim();
    if (clean.startsWith("//")) return "https:" + clean;
    if (clean.startsWith("/")) {
      try {
        return new URL(clean, baseUrl).toString();
      } catch {
        return clean;
      }
    }
    return clean;
  }

  // Parse anchor tags
  const aRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = aRegex.exec(html)) !== null) {
    const rawHref = match[2];
    if (!rawHref || rawHref === "#" || rawHref.startsWith("javascript:")) continue;

    const fullUrl = resolveUrl(rawHref);
    const attrs = (match[1] + " " + match[3]).toLowerCase();
    const innerText = match[4].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const combined = `${attrs} ${innerText}`;

    if (
      combined.includes("mp3") ||
      combined.includes("audio") ||
      combined.includes("music") ||
      fullUrl.includes(".mp3")
    ) {
      if (!music) music = fullUrl;
    } else if (
      combined.includes("photo") ||
      combined.includes("image") ||
      combined.includes("gambar") ||
      /\.(jpe?g|png|webp)/i.test(fullUrl)
    ) {
      if (!images.includes(fullUrl)) images.push(fullUrl);
    } else if (
      combined.includes("watermark") &&
      !combined.includes("no watermark") &&
      !combined.includes("without watermark")
    ) {
      if (!wmplay) wmplay = fullUrl;
    } else if (
      combined.includes("hd") ||
      combined.includes("1080") ||
      combined.includes("full hd") ||
      combined.includes("btn-primary")
    ) {
      if (!hdplay) hdplay = fullUrl;
    } else if (
      combined.includes("mp4") ||
      combined.includes("video") ||
      combined.includes("download") ||
      combined.includes("unduh")
    ) {
      if (!play) play = fullUrl;
    }
  }

  // Scan for carousel/slideshow photos in container
  const photoContainer = html.match(
    /class=["'][^"']*(?:photo-list|download-box|carousel)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  if (photoContainer) {
    const imgRegex = /<img\s+[^>]*?src=["']([^"']+)["']/gi;
    let imgM: RegExpExecArray | null;
    while ((imgM = imgRegex.exec(photoContainer[1])) !== null) {
      const srcUrl = resolveUrl(imgM[1]);
      if (srcUrl && !images.includes(srcUrl) && !srcUrl.includes("icon") && !srcUrl.includes("logo")) {
        images.push(srcUrl);
      }
    }
  }

  // Thumbnail / Cover image
  const thumbMatch =
    html.match(
      /class=["'][^"']*(?:thumbnail|image-tik|cover)[^"']*["'][^>]*>[\s\S]*?<img\s+[^>]*?src=["']([^"']+)["']/i
    ) ||
    html.match(/<img\s+[^>]*?src=["']([^"']+)["'][^>]*?class=["'][^"']*(?:thumb|cover)[^"']*["']/i) ||
    html.match(/<img\s+[^>]*?src=["'](https?:\/\/[^"']*(?:ibyteimg|tiktokcdn|byteoversea)[^"']*)["']/i) ||
    html.match(/<img\s+[^>]*?src=["']([^"']+)["']/i);
  const cover = thumbMatch ? resolveUrl(thumbMatch[1]) : images[0] || "";

  // Title / Caption
  const titleMatch =
    html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) ||
    html.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/i) ||
    html.match(/<img[^>]+alt=["']([^"']+)["']/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  // Author username / nickname
  const authorMatch =
    html.match(/<h2[^>]*>@?([\s\S]*?)<\/h2>/i) ||
    html.match(/class=["'][^"']*(?:author|unique_id|username)[^"']*["'][^>]*>@?([\s\S]*?)<\//i) ||
    html.match(/@([a-zA-Z0-9_.-]+)/i);
  const authorName = authorMatch ? authorMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  // Fallbacks between HD and standard
  if (hdplay && !play) play = hdplay;
  if (play && !hdplay) hdplay = play;

  // Validation: At least one media stream or image collection must exist
  if (!hdplay && !play && !music && images.length === 0) {
    return null;
  }

  return {
    id: String(Date.now()),
    title: title || "TikTok Video",
    author: {
      nickname: authorName || "TikTok Creator",
      unique_id: authorName || undefined,
    },
    cover,
    hdplay,
    play,
    wmplay,
    music,
    images: images.length > 0 ? images : undefined,
  };
}

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
    const fallbackUrls = [
      "https://api.tikdown.org/api/ajaxSearch",
      "https://tikdown.org/api/ajaxSearch",
    ];

    for (const fallbackUrl of fallbackUrls) {
      try {
        const fbRes = await universalFetch(fallbackUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: `q=${encodeURIComponent(cleanUrl)}&lang=en`,
        });

        if (fbRes.ok) {
          const fbJson = await fbRes.json().catch(() => null);
          if (fbJson) {
            const parsed = parseTikDownResponse(fbJson.data || fbJson, fallbackUrl);
            if (parsed) {
              dataObj = parsed;
              break;
            }
          }
        }
      } catch (fbErr) {
        console.warn(`TikTok fallback provider (${fallbackUrl}) failed:`, fbErr);
      }
    }
  }

  if (!dataObj) {
    throw new Error("Could not resolve TikTok video. Ensure the video link is public and valid.");
  }

  const d = dataObj;
  const qualities: UniversalQualityOption[] = [];
  const author = d.author?.nickname || d.author?.unique_id || "TikTok Creator";
  const authorHandle = d.author?.unique_id ? `@${d.author.unique_id}` : undefined;
  const title = (d.title || `${author}'s TikTok Video`).trim();
  const coverUrl = d.cover?.startsWith("http") ? d.cover : d.origin_cover || "";

  // Check for TikTok Slideshow / Photo Album (Carousel)
  if (Array.isArray(d.images) && d.images.length > 0) {
    const items = d.images.map((imgUrl: string, idx: number) => {
      const fullUrl = imgUrl.startsWith("http") ? imgUrl : `https://www.tikwm.com${imgUrl}`;
      return {
        id: `${d.id || "slide"}_${idx + 1}`,
        type: "image" as const,
        url: fullUrl,
        thumbnailUrl: fullUrl,
        title: `${title} - Slide ${idx + 1}`,
        qualities: [
          {
            label: `HD Photo Slide ${idx + 1}`,
            resolution: "Original",
            ext: "jpg",
            downloadUrl: fullUrl,
            badge: "IMAGE",
          },
        ],
      };
    });

    const musicUrl = d.music
      ? d.music.startsWith("http")
        ? d.music
        : `https://www.tikwm.com${d.music}`
      : undefined;

    if (musicUrl) {
      qualities.push({
        label: `Background Music (${d.music_info?.title || "MP3"})`,
        resolution: "Audio",
        ext: "mp3",
        isAudioOnly: true,
        downloadUrl: musicUrl,
        badge: "MP3",
      });
    }

    return {
      id: d.id || String(Date.now()),
      platform: "tiktok",
      url: cleanUrl,
      title,
      author,
      authorHandle,
      thumbnailUrl: items[0]?.thumbnailUrl || coverUrl,
      duration: d.duration,
      viewCount: d.play_count ? String(d.play_count) : undefined,
      qualities,
      isCarousel: true,
      items,
    };
  }

  // HD No Watermark (1080p, Highest Priority)
  if (d.hdplay) {
    qualities.push({
      label: "Full HD 1080p Video (No Watermark)",
      resolution: "1080p",
      ext: "mp4",
      fileSize: d.hd_size,
      downloadUrl: d.hdplay.startsWith("http") ? d.hdplay : `https://www.tikwm.com${d.hdplay}`,
      badge: "1080P",
    });
  }

  // Standard No Watermark (720p HD)
  if (d.play) {
    qualities.push({
      label: d.hdplay ? "HD 720p Video (No Watermark)" : "HD Video (No Watermark)",
      resolution: "720p",
      ext: "mp4",
      fileSize: d.size,
      downloadUrl: d.play.startsWith("http") ? d.play : `https://www.tikwm.com${d.play}`,
      badge: "720P",
    });
  }

  // MP3 Audio Track (Direct)
  const musicUrl = d.music
    ? d.music.startsWith("http")
      ? d.music
      : `https://www.tikwm.com${d.music}`
    : d.play
    ? d.play.startsWith("http")
      ? d.play
      : `https://www.tikwm.com${d.play}`
    : null;

  if (musicUrl) {
    qualities.push({
      label: `Original Audio Track (${d.music_info?.title ? d.music_info.title.slice(0, 30) : "MP3"})`,
      resolution: "Audio",
      ext: "mp3",
      isAudioOnly: true,
      downloadUrl: musicUrl,
      badge: "MP3",
    });
  }

  // Watermarked Original (Fallback)
  if (d.wmplay) {
    qualities.push({
      label: "Standard Video (Original Watermarked)",
      resolution: "720p",
      ext: "mp4",
      fileSize: d.wm_size,
      downloadUrl: d.wmplay.startsWith("http") ? d.wmplay : `https://www.tikwm.com${d.wmplay}`,
      badge: "SD",
    });
  }

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
