/**
 * Reddit Video & DASH Audio Extractor
 * Resolves reddit_video streams and pairs DASH audio for FFmpeg WASM / native muxing
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

/**
 * Probes for valid DASH audio track on v.redd.it
 */
async function probeRedditAudioUrl(videoBaseUrl: string): Promise<string | null> {
  const candidates = [
    `${videoBaseUrl}/DASH_AUDIO_128.mp4`,
    `${videoBaseUrl}/DASH_audio.mp4`,
    `${videoBaseUrl}/DASH_AUDIO_64.mp4`,
    `${videoBaseUrl}/DASH_224.mp4`,
    `${videoBaseUrl}/audio`,
  ];

  for (const candidate of candidates) {
    try {
      const res = await universalFetch(candidate, {
        method: "HEAD",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        },
      });
      if (res.ok) {
        return candidate;
      }
      if (res.status === 405) {
        const getRes = await universalFetch(candidate, {
          headers: {
            Range: "bytes=0-10",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          },
        });
        if (getRes.ok || getRes.status === 206) {
          return candidate;
        }
      }
    } catch {
      // Continue probing next candidate
    }
  }
  return null;
}

export async function extractRedditMedia(url: string): Promise<UniversalMediaInfo> {
  const cleanUrl = url.trim();

  // Extract Reddit Post ID
  const match = cleanUrl.match(
    /(?:reddit\.com\/r\/[\w-]+\/comments\/([a-zA-Z0-9]+)|redd\.it\/([a-zA-Z0-9]+)|v\.redd\.it\/([a-zA-Z0-9]+))/i
  );
  const postId = match ? match[1] || match[2] || match[3] : null;

  if (!postId) {
    throw new Error("Invalid Reddit URL. Expected format: https://www.reddit.com/r/.../comments/id/...");
  }

  // Construct Reddit JSON API URL
  const jsonApiUrl = `https://www.reddit.com/comments/${postId}.json`;
  const res = await universalFetch(jsonApiUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Reddit API returned HTTP ${res.status}`);
  }

  const json = await res.json();
  const post = json?.[0]?.data?.children?.[0]?.data;
  if (!post) {
    throw new Error("Could not find post details in Reddit response.");
  }

  const title = (post.title || "Reddit Media").trim();
  const author = post.author ? `u/${post.author}` : "Reddit User";
  const authorHandle = post.subreddit_name_prefixed || (post.subreddit ? `r/${post.subreddit}` : undefined);
  const thumbnailUrl =
    post.thumbnail && post.thumbnail.startsWith("http") ? post.thumbnail : "";

  // Check for reddit_video in secure_media or in crosspost
  const redditVideo =
    post.secure_media?.reddit_video ||
    post.media?.reddit_video ||
    post.crosspost_parent_list?.[0]?.secure_media?.reddit_video ||
    post.crosspost_parent_list?.[0]?.media?.reddit_video;

  // Handle Gallery / Multi-Image Reddit Posts
  if (!redditVideo && (post.is_gallery || post.gallery_data)) {
    const galleryItems = post.gallery_data?.items || [];
    const mediaMetadata = post.media_metadata || {};
    const items: Array<{
      id: string;
      type: "image" | "video";
      url: string;
      thumbnailUrl?: string;
      title?: string;
      qualities?: UniversalQualityOption[];
    }> = [];

    for (const item of galleryItems) {
      const mediaId = item.media_id;
      const meta = mediaMetadata[mediaId];
      if (meta && meta.s) {
        const rawUrl = (meta.s.u || meta.s.gif || "").replace(/&amp;/g, "&");
        if (rawUrl) {
          items.push({
            id: mediaId,
            type: meta.e === "AnimatedImage" ? "video" : "image",
            url: rawUrl,
            thumbnailUrl: rawUrl,
            title: `${title} - Slide ${items.length + 1}`,
            qualities: [
              {
                label: `Image Slide ${items.length + 1} (${meta.s.x || 1080}x${meta.s.y || 1080})`,
                resolution: `${meta.s.x || 1080}x${meta.s.y || 1080}`,
                ext: rawUrl.includes(".gif") ? "gif" : "jpg",
                downloadUrl: rawUrl,
                badge: "IMAGE",
              },
            ],
          });
        }
      }
    }

    if (items.length > 0) {
      const primaryItem = items[0];
      return {
        id: postId,
        platform: "reddit",
        url: cleanUrl,
        title,
        author,
        authorHandle,
        thumbnailUrl: primaryItem.thumbnailUrl || thumbnailUrl,
        qualities: primaryItem.qualities || [],
        isCarousel: true,
        items,
      };
    }
  }

  // Handle Single Image Post
  if (!redditVideo && post.url && /\.(jpe?g|png|gif|webp)$/i.test(post.url)) {
    return {
      id: postId,
      platform: "reddit",
      url: cleanUrl,
      title,
      author,
      authorHandle,
      thumbnailUrl: post.url,
      qualities: [
        {
          label: "Full Resolution Image",
          resolution: "Original",
          ext: "jpg",
          downloadUrl: post.url,
          badge: "IMAGE",
        },
      ],
    };
  }

  if (!redditVideo || !redditVideo.fallback_url) {
    throw new Error("This Reddit post does not contain a downloadable video or image gallery.");
  }

  const fallbackUrl = String(redditVideo.fallback_url);
  // Derive base Reddit video URL (e.g. https://v.redd.it/abc123xyz/)
  const baseUrlMatch = fallbackUrl.match(/(https?:\/\/v\.redd\.it\/[a-zA-Z0-9]+)/i);
  const videoBaseUrl = baseUrlMatch
    ? baseUrlMatch[1]
    : fallbackUrl.split("?")[0].replace(/\/DASH_[^/]+$/, "");

  // Asynchronously probe for valid DASH audio tracks
  const verifiedAudioUrl = await probeRedditAudioUrl(videoBaseUrl);

  const qualities: UniversalQualityOption[] = [];
  const height = redditVideo.height || 720;
  const duration = redditVideo.duration ? Math.round(redditVideo.duration) : undefined;

  // 1. Primary: Synced High-Definition Video with Muxed Audio
  if (verifiedAudioUrl) {
    const badge = height >= 1080 ? "1080P" : height >= 720 ? "720P" : `${height}P`;
    qualities.push({
      label: `Reddit HD Video (${height}p) + Synced Audio`,
      resolution: `${height}p`,
      ext: "mp4",
      downloadUrl: fallbackUrl,
      audioUrl: verifiedAudioUrl,
      requiresMuxing: true,
      badge,
    });

    // Provide 720p option if original was 1080p
    if (height >= 1080) {
      qualities.push({
        label: "Reddit Video (720p) + Synced Audio",
        resolution: "720p",
        ext: "mp4",
        downloadUrl: `${videoBaseUrl}/DASH_720.mp4`,
        audioUrl: verifiedAudioUrl,
        requiresMuxing: true,
        badge: "720P",
      });
    }

    // 2. Audio track only
    qualities.push({
      label: "Audio Track Only (M4A/MP3)",
      resolution: "Audio",
      ext: "m4a",
      isAudioOnly: true,
      downloadUrl: verifiedAudioUrl,
      badge: "AUDIO",
    });
  } else {
    // Video has no audio (silent gif/video)
    qualities.push({
      label: `Reddit Video (${height}p) [No Audio]`,
      resolution: `${height}p`,
      ext: "mp4",
      downloadUrl: fallbackUrl,
      requiresMuxing: false,
      badge: `${height}P`,
    });
  }

  // 3. Raw Video Stream Only (Always available)
  qualities.push({
    label: `Raw Video Stream Only (${height}p)`,
    resolution: `${height}p`,
    ext: "mp4",
    downloadUrl: fallbackUrl,
    requiresMuxing: false,
    badge: "VIDEO",
  });

  return {
    id: postId,
    platform: "reddit",
    url: cleanUrl,
    title,
    author,
    authorHandle,
    thumbnailUrl,
    duration,
    qualities,
  };
}

