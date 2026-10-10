import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { zenoTapSecurity, zenoTapResponse, zenoTapCorsHeaders } from "@/lib/zenotap/security";
import { zenoTapDb } from "@/lib/zenotap/db";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: zenoTapCorsHeaders });
}

// POST: Generate a new 6-digit pair code (Called from ZenoDeck Web / App)
export async function POST(req: NextRequest) {
  if (!zenoTapSecurity.isAllowedOrigin(req)) {
    return zenoTapResponse({ error: "Untrusted origin" }, { status: 403 });
  }

  const user = zenoTapSecurity.extractUser(req);
  if (!user) {
    return zenoTapResponse({ error: "Authentication required" }, { status: 401 });
  }

  // Generate 6-digit pairing code (100000 - 999999)
  const pairCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  zenoTapDb.createPairCode(user.userId, pairCode, expiresAt);

  return zenoTapResponse({
    success: true,
    pairCode,
    expiresAt,
    expiresInSeconds: 600,
  });
}

// PUT: Confirm pairing from Android ZenoTap App
export async function PUT(req: NextRequest) {
  let body: { pairCode?: string; deviceName?: string };
  try {
    body = await req.json();
  } catch {
    return zenoTapResponse({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pairCode, deviceName } = body;
  if (!pairCode || pairCode.length !== 6) {
    return zenoTapResponse({ error: "Invalid or missing 6-digit pair code" }, { status: 400 });
  }

  // Rate limit pairing attempts to prevent brute force (max 5 attempts/minute)
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const rateLimit = zenoTapSecurity.checkRateLimit(`pair:${clientIp}`, 5, 60_000);
  if (!rateLimit.allowed) {
    return zenoTapResponse(
      { error: "Too many pairing attempts. Please wait 1 minute." },
      { status: 429 }
    );
  }

  // Generate permanent, cryptographically strong sync token for the keyboard
  const syncToken = `zt_sync_${crypto.randomBytes(24).toString("hex")}`;
  const result = zenoTapDb.confirmPairCode(pairCode, deviceName || "Android Device", syncToken);

  if (!result) {
    return zenoTapResponse(
      { error: "Pairing code is invalid or has expired." },
      { status: 404 }
    );
  }

  return zenoTapResponse({
    success: true,
    syncToken,
    deviceName: deviceName || "Android Device",
    message: "Device successfully paired to ZenoTap cloud deck!",
  });
}
