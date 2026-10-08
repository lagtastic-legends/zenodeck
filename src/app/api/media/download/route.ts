import { NextResponse } from "next/server";
import { downloadMediaWithPython, isValidMediaInput } from "@/lib/media/python-engine";
import { resolveYouTubeVideo, buildCandidateUrls } from "@/lib/youtube/innertube";
import { resolveMediaUrl } from "@/lib/media/universal-resolver";
import fs from "fs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Type",
};

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handleDownload(url: string, quality = "best", format?: string) {
  if (!isValidMediaInput(url)) {
    return NextResponse.json(
      { error: "Invalid media URL or video ID." },
      { status: 400, headers: corsHeaders }
    );
  }

  // 1. Primary: Download via python yt-dlp engine if available
  let result: any = null;
  try {
    result = await downloadMediaWithPython(url, {
      quality,
      format,
    });
  } catch (pyErr: any) {
    result = { status: "error", error: pyErr?.message || String(pyErr) };
  }

  if (result && result.status === "success" && result.filepath && fs.existsSync(result.filepath)) {
    const filepath = result.filepath;
    const stat = fs.statSync(filepath);
    const nodeStream = fs.createReadStream(filepath);

    // Convert Node.js readable stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on("data", (chunk) => {
          controller.enqueue(chunk);
        });
        nodeStream.on("end", () => {
          controller.close();
          // Clean up temp file on completion
          fs.unlink(filepath, () => {});
        });
        nodeStream.on("error", (err) => {
          controller.error(err);
          fs.unlink(filepath, () => {});
        });
      },
      cancel() {
        nodeStream.destroy();
        fs.unlink(filepath, () => {});
      },
    });

    const rawFilename = result.filename || "download.mp4";
    const safeFilename = rawFilename.replace(/[^\w\s.-]/g, "_");

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set("Content-Type", result.mimeType || "video/mp4");
    responseHeaders.set("Content-Length", String(stat.size));
    responseHeaders.set("Content-Disposition", `attachment; filename="${safeFilename}"`);

    return new NextResponse(webStream, {
      status: 200,
      headers: responseHeaders,
    });
  }

  // 2. Resilient Serverless Fallback: Stream directly using TypeScript extractors
  try {
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be") || /^[0-9A-Za-z_-]{11}$/.test(url);
    if (isYouTube) {
      const info = await resolveYouTubeVideo(url);
      const chosen =
        info.qualities.find(
          (q) =>
            q.label.toLowerCase() === quality.toLowerCase() ||
            q.badge.toLowerCase() === quality.toLowerCase() ||
            q.id.toLowerCase() === quality.toLowerCase() ||
            q.resolutionLabel.toLowerCase() === quality.toLowerCase()
        ) || info.qualities[0];

      const streamUrl = chosen?.videoFormat?.url || chosen?.audioFormat?.url;
      if (streamUrl) {
        const candidateUrls = buildCandidateUrls(streamUrl);
        let upstream: Response | null = null;

        for (const cand of candidateUrls.slice(0, 3)) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const isIos = cand.includes("c=IOS") || cand.includes("sparams=");
            const isAndroid = cand.includes("c=ANDROID");
            const ua = isIos
              ? "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_1 like Mac OS X; en_US)"
              : isAndroid
              ? "com.google.android.youtube/21.26.364 (Linux; U; Android 14) gzip"
              : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

            const res = await fetch(cand, {
              headers: {
                "User-Agent": ua,
                Accept: "*/*",
              },
              signal: controller.signal,
            });
            clearTimeout(timer);

            if (res.ok && res.body) {
              upstream = res;
              break;
            }
          } catch {
            // failover to next candidate edge
          }
        }

        if (upstream && upstream.ok && upstream.body) {
          const ext = chosen.container || (format === "mp3" ? "mp3" : "mp4");
          const safeTitle = (info.title || "video").replace(/[^\w\s.-]/g, "_").trim().slice(0, 60);
          const filename = `${safeTitle} [${chosen.label}].${ext}`;
          const mimeType = chosen.isAudioOnly ? (ext === "mp3" ? "audio/mpeg" : "audio/mp4") : "video/mp4";

          const responseHeaders = new Headers(corsHeaders);
          responseHeaders.set("Content-Type", mimeType);
          const cl = upstream.headers.get("content-length");
          if (cl) responseHeaders.set("Content-Length", cl);
          responseHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);

          return new NextResponse(upstream.body, {
            status: 200,
            headers: responseHeaders,
          });
        }
      }
    } else {
      const res = await resolveMediaUrl(url);
      const chosen =
        res.mediaInfo.qualities.find(
          (q) =>
            q.label.toLowerCase() === quality.toLowerCase() ||
            q.badge?.toLowerCase() === quality.toLowerCase() ||
            q.resolution?.toLowerCase() === quality.toLowerCase()
        ) || res.mediaInfo.qualities[0];

      if (chosen?.downloadUrl) {
        const upstream = await fetch(chosen.downloadUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "*/*",
          },
        });

        if (upstream.ok && upstream.body) {
          const safeTitle = (res.mediaInfo.title || "media").replace(/[^\w\s.-]/g, "_").trim().slice(0, 60);
          const filename = `${safeTitle}.${chosen.ext}`;
          const mimeType = chosen.isAudioOnly ? (chosen.ext === "mp3" ? "audio/mpeg" : "audio/mp4") : "video/mp4";

          const responseHeaders = new Headers(corsHeaders);
          responseHeaders.set("Content-Type", mimeType);
          const cl = upstream.headers.get("content-length");
          if (cl) responseHeaders.set("Content-Length", cl);
          responseHeaders.set("Content-Disposition", `attachment; filename="${filename}"`);

          return new NextResponse(upstream.body, {
            status: 200,
            headers: responseHeaders,
          });
        }
      }
    }
  } catch (fbErr: any) {
    console.warn("TypeScript stream fallback error:", fbErr?.message);
  }

  const fallbackErrMsg =
    result?.error && !result.error.includes("ENOENT")
      ? result.error
      : "Could not stream video directly. The requested format may be restricted or unavailable.";

  return NextResponse.json(
    { error: fallbackErrMsg },
    { status: 502, headers: corsHeaders }
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url") || searchParams.get("v");
    const quality = searchParams.get("quality") || "best";
    const format = searchParams.get("format") || undefined;

    if (!url) {
      return NextResponse.json(
        { status: "Universal Media Downloader Stream API Online (yt-dlp powered)" },
        { headers: corsHeaders }
      );
    }

    return await handleDownload(url, quality, format);
  } catch (err: any) {
    console.error("Media Download API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during download." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const url = body.url || body.v || body.videoId;
    const quality = body.quality || "best";
    const format = body.format;

    if (!url) {
      return NextResponse.json(
        { error: "Missing required field 'url'" },
        { status: 400, headers: corsHeaders }
      );
    }

    return await handleDownload(url, quality, format);
  } catch (err: any) {
    console.error("Media Download API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during download." },
      { status: 500, headers: corsHeaders }
    );
  }
}
