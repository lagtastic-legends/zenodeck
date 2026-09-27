/**
 * Universal Multi-Platform Media Types
 * Supports YouTube, TikTok, Instagram, Twitter/X, and Reddit
 */

export type PlatformType = "youtube" | "tiktok" | "instagram" | "twitter" | "reddit";

export interface UniversalQualityOption {
  itag?: number;
  label: string;
  resolution?: string;
  ext: "mp4" | "webm" | "mp3" | "m4a" | "wav";
  fileSize?: number;
  isAudioOnly?: boolean;
  downloadUrl: string;
  audioUrl?: string; // Optional separate audio stream (e.g. Reddit DASH)
  requiresMuxing?: boolean;
  bitrate?: number;
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
  viewCount?: string;
  qualities: UniversalQualityOption[];
}
