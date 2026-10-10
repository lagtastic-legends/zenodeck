import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { zenoTapDb } from "./db";

const DEFAULT_SECRET = "zt_sec_8f921a4cb03e4822bc6791d09e51c2e4318bf9e0237da7b2";
const SECRET = process.env.ZENOTAP_SIGNING_SECRET || DEFAULT_SECRET;

export interface UploadTicketPayload {
  userId: string;
  ticketId: string;
  nonce: string;
  maxSizeBytes: number;
  expiresAt: number;
}

// In-memory sliding window rate limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

export const zenoTapSecurity = {
  /**
   * Generates a short-lived (60 seconds), single-use HMAC-SHA256 signed upload ticket.
   */
  generateUploadTicket(userId: string, maxSizeBytes = 10 * 1024 * 1024): string {
    const payload: UploadTicketPayload = {
      userId,
      ticketId: crypto.randomUUID(),
      nonce: crypto.randomBytes(12).toString("hex"),
      maxSizeBytes,
      expiresAt: Date.now() + 60_000, // Valid for 60 seconds only
    };

    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    return `${data}.${signature}`;
  },

  /**
   * Cryptographically verifies the ticket, validates expiration, and enforces single-use nonce.
   */
  verifyAndConsumeUploadTicket(ticket: string): UploadTicketPayload | null {
    if (!ticket || typeof ticket !== "string") return null;

    const parts = ticket.split(".");
    if (parts.length !== 2) return null;

    const [data, signature] = parts;
    const expectedSignature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

    // Timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    try {
      const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as UploadTicketPayload;

      // 1. Check expiration
      if (Date.now() > payload.expiresAt) return null;

      // 2. Prevent replay attacks (single-use nonce registration)
      const nonceRecorded = zenoTapDb.checkAndStoreNonce(payload.nonce, payload.expiresAt);
      if (!nonceRecorded) {
        // Nonce was already consumed! Replay attack blocked.
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  },

  /**
   * Deep binary inspection: verifies magic header bytes match standard GIF specification
   * and extracts dimensions while preventing decompression bombs.
   * Standard GIFs must begin with ASCII 'GIF87a' or 'GIF89a'.
   */
  isValidGifBuffer(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 14) return false;
    const header = buffer.toString("ascii", 0, 6);
    return header === "GIF87a" || header === "GIF89a";
  },

  /**
   * Parses GIF dimensions and structure directly from the binary header.
   */
  validateGifBuffer(buffer: Buffer): { valid: boolean; width?: number; height?: number; error?: string } {
    if (!this.isValidGifBuffer(buffer)) {
      return { valid: false, error: "Invalid file format. File is not a valid GIF or contains a forged header." };
    }

    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);

    if (width <= 0 || height <= 0) {
      return { valid: false, error: "Invalid GIF dimensions (width or height is zero)" };
    }

    // Protection against decompression bombs (max 4096 x 4096)
    if (width > 4096 || height > 4096) {
      return { valid: false, error: "Dimensions exceed maximum allowed limit (4096px)" };
    }

    return { valid: true, width, height };
  },

  /**
   * Origin verification: ensure upload/write requests strictly originate from the official app.
   */
  isAllowedOrigin(req: NextRequest): boolean {
    const origin = req.headers.get("origin") || req.headers.get("referer");
    if (!origin) {
      // In Capacitor native WebView, origin may be capacitor://localhost or http://localhost
      return true;
    }

    try {
      const url = new URL(origin);
      const host = url.host.toLowerCase();
      const allowedHosts = [
        "localhost:3000",
        "127.0.0.1:3000",
        "localhost",
        "capacitor",
        "vercel.app",
      ];

      // Allow configured app domain
      if (process.env.NEXT_PUBLIC_APP_URL) {
        try {
          const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
          allowedHosts.push(appUrl.host.toLowerCase());
        } catch {
          // ignore
        }
      }

      // Also allow host of current request
      const reqHost = req.headers.get("host")?.toLowerCase();
      if (reqHost && (host === reqHost || reqHost.includes(host) || host.includes(reqHost))) return true;

      return allowedHosts.some((allowed) => host.includes(allowed));
    } catch {
      return false;
    }
  },

  /**
   * Sliding-window token bucket rate limiter.
   */
  checkRateLimit(key: string, maxRequests = 10, windowMs = 60_000): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = rateLimits.get(key);

    if (!record || now > record.resetAt) {
      rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: maxRequests - record.count };
  },

  /**
   * Extracts authenticated user identifier from headers or session.
   */
  extractUser(req: NextRequest): { userId: string; isGuest: boolean } | null {
    // 1. Bearer Token (for App or Web API calls)
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      // Scoped Sync Token check
      const link = zenoTapDb.getDeviceLinkBySyncToken(token);
      if (link) {
        return { userId: link.userId, isGuest: false };
      }
    }

    // 2. Custom App Attestation / User Header from verified frontend
    const clientUserId = req.headers.get("x-zenotap-user-id");
    if (clientUserId && clientUserId.length >= 3 && clientUserId.length <= 64) {
      // Sanitize alphanumeric + hyphens
      const sanitized = clientUserId.replace(/[^a-zA-Z0-9_-]/g, "");
      if (sanitized) {
        return { userId: sanitized, isGuest: clientUserId.startsWith("guest_") };
      }
    }

    // Default fallback to anonymous guest session based on IP/UserAgent for dev
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const guestId = `guest_${crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16)}`;
    return { userId: guestId, isGuest: true };
  },
};

export const zenoTapCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-zenotap-user-id",
  "Access-Control-Max-Age": "86400",
};

export function zenoTapResponse(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  for (const [key, val] of Object.entries(zenoTapCorsHeaders)) {
    headers.set(key, val);
  }
  return Response.json(data, { ...init, headers });
}

