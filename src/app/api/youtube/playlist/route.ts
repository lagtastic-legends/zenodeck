import { NextResponse } from "next/server";
import { resolveYouTubePlaylist } from "@/lib/youtube/playlist";
import { execFile } from "child_process";
import path from "path";
import fs from "fs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const dynamic = "force-dynamic";

async function tryResolvePlaylistWithPython(urlOrId: string): Promise<any | null> {
  try {
    const scriptPath = path.join(process.cwd(), "scripts/youtube_downloader.py");
    if (!fs.existsSync(scriptPath)) return null;

    return await new Promise((resolve) => {
      const pyCmd = process.platform === "win32" ? "python" : "python3";
      execFile(
        pyCmd,
        [scriptPath, urlOrId, "--playlist-json"],
        { timeout: 20000 },
        (error, stdout) => {
          if (error || !stdout) {
            return resolve(null);
          }
          try {
            const json = JSON.parse(stdout);
            if (json && Array.isArray(json.items) && json.items.length > 0) {
              return resolve(json);
            }
          } catch {}
          resolve(null);
        }
      );
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
    const list = searchParams.get("list") || searchParams.get("url") || searchParams.get("playlistId");

    if (!list) {
      return NextResponse.json({ status: "YouTube Playlist Service Online" }, { headers: corsHeaders });
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      undefined;

    let playlistInfo = await tryResolvePlaylistWithPython(list);
    if (!playlistInfo) {
      playlistInfo = await resolveYouTubePlaylist(list, clientIp);
    }

    return NextResponse.json(playlistInfo, { headers: corsHeaders });
  } catch (error: any) {
    console.error("YouTube Playlist API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to resolve YouTube playlist." },
      { status: 500, headers: corsHeaders }
    );
  }
}
