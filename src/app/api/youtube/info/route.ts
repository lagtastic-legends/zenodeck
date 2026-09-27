import { NextResponse } from "next/server";
import { resolveYouTubeVideo, extractYouTubeId } from "@/lib/youtube/innertube";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const dynamic = "force-dynamic";

async function tryResolveWithPython(urlOrId: string): Promise<any | null> {
  try {
    const scriptPath = path.join(process.cwd(), "scripts/youtube_downloader.py");
    if (!fs.existsSync(scriptPath)) return null;

    return await new Promise((resolve) => {
      const pyCmd = process.platform === "win32" ? "python" : "python3";
      execFile(pyCmd, [scriptPath, urlOrId, "--info-json"], { timeout: 15000 }, (error, stdout) => {
        if (error || !stdout) {
          return resolve(null);
        }
        try {
          const json = JSON.parse(stdout);
          if (json && json.videoId && Array.isArray(json.qualities) && json.qualities.length > 0) {
            return resolve(json);
          }
        } catch {}
        resolve(null);
      });
    });
  } catch {
    return null;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const urlOrId = searchParams.get("url") || searchParams.get("v") || searchParams.get("videoId");

    if (!urlOrId) {
      return NextResponse.json({ status: "YouTube Info Service Online" }, { headers: corsHeaders });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    let info = await tryResolveWithPython(urlOrId);
    if (!info) {
      info = await resolveYouTubeVideo(urlOrId, clientIp);
    }
    return NextResponse.json(info, { headers: corsHeaders });
  } catch (error: any) {
    console.error("YouTube Info API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve YouTube video streams." },
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

    let info = await tryResolveWithPython(urlOrId);
    if (!info) {
      info = await resolveYouTubeVideo(urlOrId, clientIp);
    }
    return NextResponse.json(info, { headers: corsHeaders });
  } catch (error: any) {
    console.error("YouTube Info API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve YouTube video streams." },
      { status: 500, headers: corsHeaders }
    );
  }
}
