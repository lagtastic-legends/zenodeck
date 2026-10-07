import { NextRequest, NextResponse } from "next/server";
import { zenoTapDb } from "@/lib/zenotap/db";
import { zenoTapSecurity } from "@/lib/zenotap/security";

export async function GET(req: NextRequest) {
  // 1. Authenticate keyboard device via scoped syncToken
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid device Sync Token" }, { status: 401 });
  }

  const syncToken = authHeader.substring(7).trim();
  const link = zenoTapDb.getDeviceLinkBySyncToken(syncToken);

  if (!link) {
    return NextResponse.json({ error: "Unauthorized or expired device token" }, { status: 401 });
  }

  // 2. Rate limit sync requests (max 60 sync polls per minute per device)
  const rateLimit = zenoTapSecurity.checkRateLimit(`sync:${link.id}`, 60, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many sync requests. Please back off." },
      { status: 429, headers: { "Retry-After": "10" } }
    );
  }

  // 3. Fetch user's deck items
  const items = zenoTapDb.getUserDeck(link.userId);

  // Return absolute or relative URLs suitable for Android download
  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const baseUrl = `${protocol}://${host}`;

  const payload = items.map((item) => ({
    id: item.id,
    filename: item.filename,
    originalName: item.originalName,
    downloadUrl: item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`,
    size: item.size,
    width: item.width,
    height: item.height,
    updatedAt: item.updatedAt,
  }));

  return NextResponse.json({
    success: true,
    deviceId: link.id,
    deviceName: link.deviceName,
    count: payload.length,
    deck: payload,
    syncedAt: Date.now(),
  });
}
