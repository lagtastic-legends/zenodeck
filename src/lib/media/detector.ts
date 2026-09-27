/**
 * URL Detector and Platform Classifier
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
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:reel|p|tv)\/([a-zA-Z0-9_-]+)/i
  );
  if (igMatch || /(?:instagram\.com\/(?:reel|p|tv)\/)/i.test(url)) {
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
  if (twitterMatch) {
    return {
      platform: "twitter",
      cleanUrl: url,
      id: twitterMatch[1],
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
};
