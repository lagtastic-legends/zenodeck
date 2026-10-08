import { NextResponse } from "next/server";
import { downloadMediaWithPython, isValidMediaInput } from "@/lib/media/python-engine";
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

  const result = await downloadMediaWithPython(url, {
    quality,
    format,
  });

  if (result.status !== "success" || !result.filepath || !fs.existsSync(result.filepath)) {
    return NextResponse.json(
      { error: result.error || "Failed to download media via yt-dlp engine." },
      { status: 500, headers: corsHeaders }
    );
  }

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
