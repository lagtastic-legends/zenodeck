/**
 * URL Detector and Platform Classifier
 * Supports YouTube 4K and all social media networks
 */

import type { PlatformType } from "./types";

export interface DetectedPlatformResult {
  platform: PlatformType;
  cleanUrl: string;
  id?: string;
}

/**
 * Detects media platform from a given URL string.
 */
export function detectPlatform(inputUrl: string): DetectedPlatformResult | null {
  if (!inputUrl || typeof inputUrl !== "string") return null;

  const url = inputUrl.trim();

  // 1. YouTube
  // Matches: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/..., music.youtube.com/...
  const ytMatch = url.match(
    /(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch) {
    return {
      platform: "youtube",
      cleanUrl: url,
      id: ytMatch[1],
    };
  }

  // Also check for YouTube playlist URLs
  if (url.match(/(?:youtube\.com|youtu\.be).*(?:list=)/i)) {
    return {
      platform: "youtube",
      cleanUrl: url,
    };
  }

  // If naked 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return {
      platform: "youtube",
      cleanUrl: `https://www.youtube.com/watch?v=${url}`,
      id: url,
    };
  }

  // 2. TikTok
  // Matches: tiktok.com/@user/video/12345, vt.tiktok.com/..., vm.tiktok.com/..., tiktok.com/t/...
  const tiktokMatch = url.match(
    /(?:https?:\/\/)?(?:www\.|m\.|vm\.|vt\.)?tiktok\.com\/(?:@[\w.-]+\/video\/(\d+)|(?:t\/|v\/)?([a-zA-Z0-9_-]+))/i
  );
  if (tiktokMatch || /(?:tiktok\.com)/i.test(url)) {
    const id = tiktokMatch ? tiktokMatch[1] || tiktokMatch[2] : undefined;
    return {
      platform: "tiktok",
      cleanUrl: url,
      id,
    };
  }

  // 3. Instagram
  // Matches: instagram.com/reel/shortcode, instagram.com/p/shortcode, instagram.com/tv/shortcode
  const igMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p|tv|stories)\/([a-zA-Z0-9_-]+)/i
  );
  if (igMatch || /(?:instagram\.com\/(?:reel|p|tv|stories)\/)/i.test(url)) {
    return {
      platform: "instagram",
      cleanUrl: url,
      id: igMatch ? igMatch[1] : undefined,
    };
  }

  // 4. Twitter / X
  // Matches: twitter.com/user/status/12345, x.com/user/status/12345
  const twitterMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/(?:[a-zA-Z0-9_]+)\/status\/(\d+)/i
  );
  if (twitterMatch || /(?:twitter\.com|x\.com)/i.test(url)) {
    return {
      platform: "twitter",
      cleanUrl: url,
      id: twitterMatch ? twitterMatch[1] : undefined,
    };
  }

  // 5. Reddit
  // Matches: reddit.com/r/subreddit/comments/id/title, redd.it/id, v.redd.it/id
  const redditMatch = url.match(
    /(?:https?:\/\/)?(?:www\.|old\.|new\.)?(?:reddit\.com\/r\/[\w-]+\/comments\/([a-zA-Z0-9]+)|redd\.it\/([a-zA-Z0-9]+)|v\.redd\.it\/([a-zA-Z0-9]+))/i
  );
  if (redditMatch || /(?:reddit\.com|redd\.it)/i.test(url)) {
    const id = redditMatch
      ? redditMatch[1] || redditMatch[2] || redditMatch[3]
      : undefined;
    return {
      platform: "reddit",
      cleanUrl: url,
      id,
    };
  }

  // 6. Facebook
  // Matches: facebook.com/.../videos/..., fb.watch/..., facebook.com/reel/...
  const fbMatch = url.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com\/(?:watch\/\?v=|reel\/|.*\/videos\/)|fb\.watch\/)([0-9a-zA-Z_-]+)/i
  );
  if (fbMatch || /(?:facebook\.com|fb\.watch|fb\.com)/i.test(url)) {
    return {
      platform: "facebook",
      cleanUrl: url,
      id: fbMatch ? fbMatch[1] : undefined,
    };
  }

  // 7. Vimeo
  // Matches: vimeo.com/123456789
  const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/i);
  if (vimeoMatch || /(?:vimeo\.com)/i.test(url)) {
    return {
      platform: "vimeo",
      cleanUrl: url,
      id: vimeoMatch ? vimeoMatch[1] : undefined,
    };
  }

  // 8. Twitch
  // Matches: twitch.tv/videos/..., clips.twitch.tv/...
  const twitchMatch = url.match(/(?:https?:\/\/)?(?:clips\.)?twitch\.tv\/(?:videos\/)?([a-zA-Z0-9_-]+)/i);
  if (twitchMatch || /(?:twitch\.tv)/i.test(url)) {
    return {
      platform: "twitch",
      cleanUrl: url,
      id: twitchMatch ? twitchMatch[1] : undefined,
    };
  }

  // 9. Pinterest
  // Matches: pinterest.com/pin/..., pin.it/...
  const pinMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:pinterest\.[a-z.]+\/pin\/|pin\.it\/)([a-zA-Z0-9_-]+)/i);
  if (pinMatch || /(?:pinterest\.com|pin\.it)/i.test(url)) {
    return {
      platform: "pinterest",
      cleanUrl: url,
      id: pinMatch ? pinMatch[1] : undefined,
    };
  }

  // 10. Threads
  // Matches: threads.net/@user/post/...
  if (/(?:threads\.net)/i.test(url)) {
    return {
      platform: "threads",
      cleanUrl: url,
    };
  }

  // 11. Bluesky
  // Matches: bsky.app/profile/.../post/...
  if (/(?:bsky\.app)/i.test(url)) {
    return {
      platform: "bluesky",
      cleanUrl: url,
    };
  }

  // 12. Generic HTTP(S) URL (Supported by yt-dlp)
  if (/^https?:\/\//i.test(url)) {
    return {
      platform: "social",
      cleanUrl: url,
    };
  }

  return null;
}

/**
 * Platform Presentation Metadata
 */
export interface PlatformBadgeConfig {
  name: string;
  badgeClass: string;
  iconColor: string;
  glowColor: string;
}

export const PLATFORM_CONFIGS: Record<PlatformType, PlatformBadgeConfig> = {
  youtube: {
    name: "YouTube",
    badgeClass: "border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.2)]",
    iconColor: "text-red-500",
    glowColor: "rgba(239, 68, 68, 0.25)",
  },
  tiktok: {
    name: "TikTok",
    badgeClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]",
    iconColor: "text-cyan-400",
    glowColor: "rgba(6, 182, 212, 0.25)",
  },
  instagram: {
    name: "Instagram",
    badgeClass: "border-pink-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.2)]",
    iconColor: "text-pink-400",
    glowColor: "rgba(236, 72, 153, 0.25)",
  },
  twitter: {
    name: "X / Twitter",
    badgeClass: "border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.2)]",
    iconColor: "text-sky-400",
    glowColor: "rgba(14, 165, 233, 0.25)",
  },
  reddit: {
    name: "Reddit",
    badgeClass: "border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.2)]",
    iconColor: "text-orange-400",
    glowColor: "rgba(249, 115, 22, 0.25)",
  },
  facebook: {
    name: "Facebook",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]",
    iconColor: "text-blue-500",
    glowColor: "rgba(59, 130, 246, 0.25)",
  },
  vimeo: {
    name: "Vimeo",
    badgeClass: "border-teal-500/30 bg-teal-500/10 text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.2)]",
    iconColor: "text-teal-400",
    glowColor: "rgba(20, 184, 166, 0.25)",
  },
  twitch: {
    name: "Twitch",
    badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]",
    iconColor: "text-purple-400",
    glowColor: "rgba(168, 85, 247, 0.25)",
  },
  pinterest: {
    name: "Pinterest",
    badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.2)]",
    iconColor: "text-rose-400",
    glowColor: "rgba(244, 63, 94, 0.25)",
  },
  threads: {
    name: "Threads",
    badgeClass: "border-zinc-400/30 bg-zinc-400/10 text-zinc-300 shadow-[0_0_12px_rgba(161,161,170,0.2)]",
    iconColor: "text-zinc-300",
    glowColor: "rgba(161, 161, 170, 0.25)",
  },
  bluesky: {
    name: "Bluesky",
    badgeClass: "border-sky-400/30 bg-sky-400/10 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]",
    iconColor: "text-sky-300",
    glowColor: "rgba(56, 189, 248, 0.25)",
  },
  social: {
    name: "Media (yt-dlp)",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]",
    iconColor: "text-emerald-400",
    glowColor: "rgba(16, 185, 129, 0.25)",
  },
};
