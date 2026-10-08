import { NextResponse } from "next/server";
import { resolveYouTubeVideo, extractYouTubeId } from "@/lib/youtube/innertube";
import { resolveMediaWithPython } from "@/lib/media/python-engine";
import { extractTikTokMedia } from "@/lib/media/extractors/tiktok";
import { extractTwitterMedia } from "@/lib/media/extractors/twitter";
import { extractRedditMedia } from "@/lib/media/extractors/reddit";
import { extractInstagramMedia } from "@/lib/media/extractors/instagram";
import { detectPlatform } from "@/lib/media/detector";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handleResolve(urlOrId: string, clientIp?: string) {
  // 1. Try yt-dlp Python engine first (supports YouTube 4K, 1700+ social platforms)
  const pyResult = await resolveMediaWithPython(urlOrId);
  if (pyResult && Array.isArray(pyResult.qualities) && pyResult.qualities.length > 0) {
    return pyResult;
  }

  // 2. Fallbacks based on detected platform
  const detected = detectPlatform(urlOrId);
  const platform = detected?.platform || "youtube";

  switch (platform) {
    case "tiktok": {
      const tt = await extractTikTokMedia(urlOrId);
      return {
        videoId: tt.id,
        platform: "tiktok",
        title: tt.title,
        author: tt.author,
        thumbnailUrl: tt.thumbnailUrl,
        durationSeconds: tt.duration || 0,
        durationFormatted: `${Math.floor((tt.duration || 0) / 60)}:${String((tt.duration || 0) % 60).padStart(2, "0")}`,
        viewCount: tt.viewCount,
        qualities: tt.qualities.map((q, idx) => ({
          id: `tiktok-${idx}`,
          itag: idx,
          label: q.label,
          resolutionLabel: q.resolution || "HD",
          fps: 30,
          badge: q.resolution || "HD",
          is4K: false,
          is60fps: false,
          isAudioOnly: !!q.isAudioOnly,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: q.isAudioOnly ? undefined : { url: q.downloadUrl },
          audioFormat: q.isAudioOnly ? { url: q.downloadUrl } : undefined,
        })),
      };
    }

    case "twitter": {
      const tw = await extractTwitterMedia(urlOrId);
      return {
        videoId: tw.id,
        platform: "twitter",
        title: tw.title,
        author: tw.author,
        thumbnailUrl: tw.thumbnailUrl,
        durationSeconds: tw.duration || 0,
        durationFormatted: "0:30",
        viewCount: tw.viewCount,
        qualities: tw.qualities.map((q, idx) => ({
          id: `twitter-${idx}`,
          itag: idx,
          label: q.label,
          resolutionLabel: q.resolution || "HD",
          fps: 30,
          badge: q.resolution || "HD",
          is4K: false,
          is60fps: false,
          isAudioOnly: false,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: { url: q.downloadUrl },
        })),
      };
    }

    case "reddit": {
      const rd = await extractRedditMedia(urlOrId);
      return {
        videoId: rd.id,
        platform: "reddit",
        title: rd.title,
        author: rd.author,
        thumbnailUrl: rd.thumbnailUrl,
        durationSeconds: rd.duration || 0,
        durationFormatted: "0:30",
        viewCount: rd.viewCount,
        qualities: rd.qualities.map((q, idx) => ({
          id: `reddit-${idx}`,
          itag: idx,
          label: q.label,
          resolutionLabel: q.resolution || "HD",
          fps: 30,
          badge: q.resolution || "HD",
          is4K: false,
          is60fps: false,
          isAudioOnly: false,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: { url: q.downloadUrl },
          audioFormat: q.audioUrl ? { url: q.audioUrl } : undefined,
        })),
      };
    }

    case "instagram": {
      const ig = await extractInstagramMedia(urlOrId);
      return {
        videoId: ig.id,
        platform: "instagram",
        title: ig.title,
        author: ig.author,
        thumbnailUrl: ig.thumbnailUrl,
        durationSeconds: ig.duration || 0,
        durationFormatted: "0:30",
        viewCount: ig.viewCount,
        qualities: ig.qualities.map((q, idx) => ({
          id: `instagram-${idx}`,
          itag: idx,
          label: q.label,
          resolutionLabel: q.resolution || "HD",
          fps: 30,
          badge: q.resolution || "HD",
          is4K: false,
          is60fps: false,
          isAudioOnly: false,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: { url: q.downloadUrl },
        })),
      };
    }

    default: {
      // YouTube fallback via Innertube
      return await resolveYouTubeVideo(urlOrId, clientIp);
    }
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const urlOrId = searchParams.get("url") || searchParams.get("v") || searchParams.get("videoId");

    if (!urlOrId) {
      return NextResponse.json(
        { status: "YouTube Info Service Online" },
        { headers: corsHeaders }
      );
    }


    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const info = await handleResolve(urlOrId, clientIp);
    return NextResponse.json(info, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Universal Media / YouTube Info API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve media streams." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const urlOrId = body.url || body.videoId || body.v;

    if (!urlOrId) {
      return NextResponse.json(
        { error: "Missing required body field 'url' or 'videoId'" },
        { status: 400, headers: corsHeaders }
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    const info = await handleResolve(urlOrId, clientIp);
    return NextResponse.json(info, { headers: corsHeaders });
  } catch (error: any) {
    console.error("Universal Media / YouTube Info API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve media streams." },
      { status: 500, headers: corsHeaders }
    );
  }
}
