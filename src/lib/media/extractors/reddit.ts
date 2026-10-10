/**
 * Reddit Video & DASH Audio Extractor
 * Resolves reddit_video streams and pairs DASH audio for FFmpeg WASM muxing
 */

import { universalFetch } from "../innertube-bridge";
import type { UniversalMediaInfo, UniversalQualityOption } from "../types";

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

  // Check for reddit_video in secure_media or in crosspost
  const redditVideo =
    post.secure_media?.reddit_video ||
    post.media?.reddit_video ||
    post.crosspost_parent_list?.[0]?.secure_media?.reddit_video ||
    post.crosspost_parent_list?.[0]?.media?.reddit_video;

  if (!redditVideo || !redditVideo.fallback_url) {
    throw new Error("This Reddit post does not contain a native video stream (v.redd.it).");
  }

  const fallbackUrl = String(redditVideo.fallback_url);
  // Derive base Reddit video URL (e.g. https://v.redd.it/abc123xyz/)
  const baseUrlMatch = fallbackUrl.match(/(https?:\/\/v\.redd\.it\/[a-zA-Z0-9]+)/i);
  const videoBaseUrl = baseUrlMatch
    ? baseUrlMatch[1]
    : fallbackUrl.split("?")[0].replace(/\/DASH_[^/]+$/, "");

  // Probable DASH audio URLs for Reddit
  const dashAudioUrl = `${videoBaseUrl}/DASH_AUDIO_128.mp4`;

  const qualities: UniversalQualityOption[] = [];
  const height = redditVideo.height || 720;
  const badge = height >= 1080 ? "1080P" : height >= 720 ? "720P" : `${height}P`;

  // 1. Synced High Quality Video with Muxed Audio (Primary)
  qualities.push({
    label: `Reddit HD Video (${height}p) + Synced Audio`,
    resolution: `${height}p`,
    ext: "mp4",
    downloadUrl: fallbackUrl,
    audioUrl: dashAudioUrl,
    requiresMuxing: true,
    badge,
  });

  // 2. Video stream only (fallback)
  qualities.push({
    label: `Video Stream Only (${height}p)`,
    resolution: `${height}p`,
    ext: "mp4",
    downloadUrl: fallbackUrl,
    requiresMuxing: false,
    badge: "VIDEO",
  });

  // 3. Audio track only
  qualities.push({
    label: "Audio Track Only (MP3)",
    resolution: "Audio",
    ext: "mp3",
    isAudioOnly: true,
    downloadUrl: dashAudioUrl,
    badge: "MP3",
  });

  const title = (post.title || "Reddit Video").trim();
  const author = post.author ? `u/${post.author}` : "Reddit User";
  const authorHandle = post.subreddit_name_prefixed || (post.subreddit ? `r/${post.subreddit}` : undefined);
  const thumbnailUrl =
    post.thumbnail && post.thumbnail.startsWith("http") ? post.thumbnail : "";
  const duration = redditVideo.duration ? Math.round(redditVideo.duration) : undefined;

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
