import { NextRequest, NextResponse } from "next/server";
import { zenoTapSecurity } from "@/lib/zenotap/security";

export async function POST(req: NextRequest) {
  // 1. Origin verification
  if (!zenoTapSecurity.isAllowedOrigin(req)) {
    return NextResponse.json({ error: "Untrusted origin or cross-site request" }, { status: 403 });
  }

  // 2. Identify caller
  const user = zenoTapSecurity.extractUser(req);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // 3. Rate limiting (max 10 upload ticket requests per minute per user/IP)
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const rateLimitKey = `ticket:${user.userId}:${clientIp}`;
  const rateLimit = zenoTapSecurity.checkRateLimit(rateLimitKey, 10, 60_000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many upload requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }

  // 4. Generate cryptographically signed single-use ticket (valid 60s)
  const ticket = zenoTapSecurity.generateUploadTicket(user.userId, 10 * 1024 * 1024);

  return NextResponse.json({
    success: true,
    ticket,
    expiresInSeconds: 60,
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/gif"],
  });
}
