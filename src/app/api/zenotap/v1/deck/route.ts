import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { zenoTapSecurity, zenoTapResponse, zenoTapCorsHeaders } from "@/lib/zenotap/security";
import { zenoTapDb } from "@/lib/zenotap/db";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: zenoTapCorsHeaders });
}

export async function GET(req: NextRequest) {
  // 1. Origin verification
  if (!zenoTapSecurity.isAllowedOrigin(req)) {
    return zenoTapResponse({ error: "Untrusted origin" }, { status: 403 });
  }

  // 2. Identify caller
  const user = zenoTapSecurity.extractUser(req);
  if (!user) {
    return zenoTapResponse({ error: "Authentication required" }, { status: 401 });
  }

  // 3. Fetch user's deck
  const items = zenoTapDb.getUserDeck(user.userId);

  return zenoTapResponse({
    success: true,
    count: items.length,
    deck: items,
  });
}

export async function DELETE(req: NextRequest) {
  // 1. Origin verification
  if (!zenoTapSecurity.isAllowedOrigin(req)) {
    return zenoTapResponse({ error: "Untrusted origin" }, { status: 403 });
  }

  // 2. Identify caller
  const user = zenoTapSecurity.extractUser(req);
  if (!user) {
    return zenoTapResponse({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return zenoTapResponse({ error: "Missing GIF id parameter" }, { status: 400 });
  }

  // Find item to delete
  const userDeck = zenoTapDb.getUserDeck(user.userId);
  const target = userDeck.find((item) => item.id === id);
  if (!target) {
    return zenoTapResponse({ error: "Item not found in user's deck" }, { status: 404 });
  }

  const deleted = zenoTapDb.deleteDeckItem(id, user.userId);
  if (deleted) {
    // Optionally clean up disk file
    try {
      const filePath = path.join(process.cwd(), "public", "uploads", "zenotap", target.filename);
      await fs.unlink(filePath).catch(() => {});
    } catch {
      // Ignored
    }
  }

  return zenoTapResponse({
    success: deleted,
  });
}
