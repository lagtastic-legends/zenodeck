import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { zenoTapSecurity, zenoTapResponse, zenoTapCorsHeaders } from "@/lib/zenotap/security";
import { zenoTapDb } from "@/lib/zenotap/db";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: zenoTapCorsHeaders });
}

export async function POST(req: NextRequest) {
  // 1. Origin verification
  if (!zenoTapSecurity.isAllowedOrigin(req)) {
    return zenoTapResponse({ error: "Untrusted origin or cross-site request" }, { status: 403 });
  }

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return zenoTapResponse({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const ticket = formData.get("ticket") as string | null;
  const file = formData.get("file") as File | null;
  const originalName = (formData.get("originalName") as string | null) || file?.name || "animation.gif";

  if (!ticket || !file) {
    return zenoTapResponse({ error: "Missing upload ticket or file payload" }, { status: 400 });
  }

  // 3. Verify single-use HMAC-SHA256 signed ticket
  const ticketPayload = zenoTapSecurity.verifyAndConsumeUploadTicket(ticket);
  if (!ticketPayload) {
    return zenoTapResponse(
      { error: "Invalid, expired, or already consumed upload ticket. Request a new ticket first." },
      { status: 403 }
    );
  }

  // 4. Validate file size against ticket constraint
  if (file.size > ticketPayload.maxSizeBytes) {
    return zenoTapResponse(
      { error: `File size exceeds allowed limit of ${Math.round(ticketPayload.maxSizeBytes / 1024 / 1024)}MB` },
      { status: 413 }
    );
  }

  // 5. Read binary bytes into memory Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 6. Deep Magic-Byte & Header Dimension Inspection
  const gifValidation = zenoTapSecurity.validateGifBuffer(buffer);
  if (!gifValidation.valid) {
    return zenoTapResponse(
      { error: gifValidation.error || "Invalid file format. File is not a valid GIF or contains a forged header." },
      { status: 400 }
    );
  }

  // 8. Generate safe, unguessable storage filename
  const safeFilename = `zt_${crypto.randomUUID()}.gif`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "zenotap");

  try {
    await fs.mkdir(uploadDir, { recursive: true });
    const targetFilePath = path.join(uploadDir, safeFilename);

    // Atomic write via temp file
    const tempFilePath = `${targetFilePath}.tmp`;
    await fs.writeFile(tempFilePath, buffer);
    await fs.rename(tempFilePath, targetFilePath);

    const publicUrl = `/uploads/zenotap/${safeFilename}`;

    // 9. Record item in database
    const deckItem = zenoTapDb.addDeckItem({
      id: `gif_${crypto.randomUUID()}`,
      userId: ticketPayload.userId,
      filename: safeFilename,
      originalName: originalName.substring(0, 100).replace(/[^\w\s.-]/gi, ""),
      url: publicUrl,
      size: buffer.length,
      width: gifValidation.width || null,
      height: gifValidation.height || null,
      mimeType: "image/gif",
      tags: null,
    });

    return zenoTapResponse({
      success: true,
      item: deckItem,
    });
  } catch (err) {
    console.error("Failed to store GIF:", err);
    return zenoTapResponse({ error: "Failed to persist media asset" }, { status: 500 });
  }
}
