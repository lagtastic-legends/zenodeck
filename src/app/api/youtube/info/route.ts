import { NextResponse } from "next/server";
import { resolveYouTubeVideo, extractYouTubeId } from "@/lib/youtube/innertube";
import { resolveMediaWithPython } from "@/lib/media/python-engine";
import { extractTikTokMedia } from "@/lib/media/extractors/tiktok";
import { extractTwitterMedia } from "@/lib/media/extractors/twitter";
import { extractRedditMedia } from "@/lib/media/extractors/reddit";
import { extractInstagramMedia } from "@/lib/media/extractors/instagram";
import { extractFacebookMedia } from "@/lib/media/extractors/facebook";
import { extractVimeoMedia } from "@/lib/media/extractors/vimeo";
import { extractPinterestMedia } from "@/lib/media/extractors/pinterest";
import { detectPlatform } from "@/lib/media/detector";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "Content-Type, Range, Authorization, User-Agent, X-Requested-With, Accept",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handleResolve(urlOrId: string, clientIp?: string) {
  const detected = detectPlatform(urlOrId);
  const platform = detected?.platform || "youtube";

  // 1. For YouTube URLs, query direct InnerTube resolver FIRST to get complete 4K 60fps/1080p adaptive tiers & direct URLs
  if (platform === "youtube" || extractYouTubeId(urlOrId)) {
    try {
      const ytInfo = await resolveYouTubeVideo(urlOrId, clientIp);
      if (ytInfo && Array.isArray(ytInfo.qualities) && ytInfo.qualities.length > 0) {
        return ytInfo;
      }
    } catch (ytErr) {
      console.warn("Direct InnerTube resolve error, falling back to Python engine:", ytErr);
    }
  }

  // 2. Try yt-dlp Python engine (supports 1700+ social platforms & YouTube fallback)
  try {
    const pyResult = await resolveMediaWithPython(urlOrId);
    if (pyResult && Array.isArray(pyResult.qualities) && pyResult.qualities.length > 0) {
      return pyResult;
    }
  } catch (pyErr) {
    console.warn("Python engine resolve error, falling back to TypeScript extractors:", pyErr);
  }

  // 3. Fallbacks based on detected platform

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
          isAudioOnly: !!q.isAudioOnly,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: q.isAudioOnly ? undefined : { url: q.downloadUrl },
          audioFormat: q.isAudioOnly ? { url: q.downloadUrl } : undefined,
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
          isAudioOnly: !!q.isAudioOnly,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: q.isAudioOnly ? undefined : { url: q.downloadUrl },
          audioFormat: q.isAudioOnly ? { url: q.downloadUrl } : (q.audioUrl ? { url: q.audioUrl } : undefined),
          requiresMuxing: !!q.requiresMuxing,
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
          isAudioOnly: !!q.isAudioOnly,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: q.isAudioOnly ? undefined : { url: q.downloadUrl },
          audioFormat: q.isAudioOnly ? { url: q.downloadUrl } : undefined,
          requiresMuxing: false,
        })),
      };
    }

    case "facebook": {
      const fb = await extractFacebookMedia(urlOrId);
      return {
        videoId: fb.id,
        platform: "facebook",
        title: fb.title,
        author: fb.author,
        thumbnailUrl: fb.thumbnailUrl,
        durationSeconds: fb.duration || 0,
        durationFormatted: "0:30",
        viewCount: fb.viewCount,
        qualities: fb.qualities.map((q, idx) => ({
          id: `facebook-${idx}`,
          itag: idx,
          label: q.label,
          resolutionLabel: q.resolution || "HD",
          fps: 30,
          badge: q.badge || q.resolution || "HD",
          is4K: false,
          is60fps: false,
          isAudioOnly: !!q.isAudioOnly,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: q.isAudioOnly ? undefined : { url: q.downloadUrl },
          audioFormat: q.isAudioOnly ? { url: q.downloadUrl } : undefined,
          requiresMuxing: false,
        })),
      };
    }

    case "vimeo": {
      const vm = await extractVimeoMedia(urlOrId);
      return {
        videoId: vm.id,
        platform: "vimeo",
        title: vm.title,
        author: vm.author,
        thumbnailUrl: vm.thumbnailUrl,
        durationSeconds: vm.duration || 0,
        durationFormatted: `${Math.floor((vm.duration || 0) / 60)}:${String((vm.duration || 0) % 60).padStart(2, "0")}`,
        viewCount: vm.viewCount,
        qualities: vm.qualities.map((q, idx) => ({
          id: `vimeo-${idx}`,
          itag: idx,
          label: q.label,
          resolutionLabel: q.resolution || "HD",
          fps: q.fps || 30,
          badge: q.badge || q.resolution || "HD",
          is4K: false,
          is60fps: (q.fps || 30) >= 50,
          isAudioOnly: !!q.isAudioOnly,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: q.isAudioOnly ? undefined : { url: q.downloadUrl },
          audioFormat: q.isAudioOnly ? { url: q.downloadUrl } : undefined,
          requiresMuxing: false,
        })),
      };
    }

    case "pinterest": {
      const pin = await extractPinterestMedia(urlOrId);
      return {
        videoId: pin.id,
        platform: "pinterest",
        title: pin.title,
        author: pin.author,
        thumbnailUrl: pin.thumbnailUrl,
        durationSeconds: pin.duration || 0,
        durationFormatted: "0:30",
        viewCount: pin.viewCount,
        qualities: pin.qualities.map((q, idx) => ({
          id: `pinterest-${idx}`,
          itag: idx,
          label: q.label,
          resolutionLabel: q.resolution || "HD",
          fps: 30,
          badge: q.badge || q.resolution || "HD",
          is4K: false,
          is60fps: false,
          isAudioOnly: !!q.isAudioOnly,
          container: q.ext,
          approxSizeBytes: q.fileSize || 0,
          videoFormat: q.isAudioOnly ? undefined : { url: q.downloadUrl },
          audioFormat: q.isAudioOnly ? { url: q.downloadUrl } : undefined,
          requiresMuxing: false,
        })),
      };
    }

    default: {
      if (platform === "youtube") {
        return await resolveYouTubeVideo(urlOrId, clientIp);
      }
      throw new Error(
        `Unable to extract media for platform: ${platform}. Please check the URL or try again.`
      );
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
      req.headers.get("cf-connecting-ip") ||
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
      req.headers.get("cf-connecting-ip") ||
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
