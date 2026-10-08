/**
 * Universal Multi-Platform Media Types
 * Supports YouTube, TikTok, Instagram, Twitter/X, Reddit, Facebook, Vimeo, Twitch, Pinterest, etc.
 * Powered by yt-dlp and specialized high-speed client extractors.
 */

export type PlatformType =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "twitter"
  | "reddit"
  | "facebook"
  | "vimeo"
  | "twitch"
  | "pinterest"
  | "threads"
  | "bluesky"
  | "social";

export interface UniversalQualityOption {
  itag?: number | string;
  label: string;
  resolution?: string;
  ext: "mp4" | "webm" | "mp3" | "m4a" | "wav" | string;
  fileSize?: number;
  isAudioOnly?: boolean;
  downloadUrl: string;
  audioUrl?: string; // Optional separate audio stream (e.g. Reddit DASH, YouTube adaptive)
  requiresMuxing?: boolean;
  bitrate?: number;
  fps?: number;
  badge?: string;
}

export interface UniversalMediaInfo {
  id: string;
  platform: PlatformType;
  url: string;
  title: string;
  author: string;
  authorHandle?: string;
  thumbnailUrl: string;
  duration?: number;
  durationFormatted?: string;
  viewCount?: string;
  qualities: UniversalQualityOption[];
}
