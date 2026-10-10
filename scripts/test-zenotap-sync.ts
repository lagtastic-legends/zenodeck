import { zenoTapSecurity, zenoTapCorsHeaders } from "../src/lib/zenotap/security";
import { zenoTapDb } from "../src/lib/zenotap/db";
import { getZenoTapApiUrl } from "../src/lib/zenotap/client-sdk";
import crypto from "node:crypto";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runSyncTests() {
  console.log("=================================================");
  console.log("🔄 RUNNING ZENOTAP CLOUD DECK & KEYBOARD SYNC SUITE");
  console.log("=================================================");

  // 1. API URL Resolution & Normalization
  console.log("\n[Test 1] API URL Normalization & Trailing Slash Elimination");
  const url1 = getZenoTapApiUrl("/api/zenotap/v1/deck/");
  assert(!url1.endsWith("/api/zenotap/v1/deck/"), "Trailing slash removed from endpoint path");
  assert(url1.includes("/api/zenotap/v1/deck"), "Path preserved accurately");

  const urlWithQuery = getZenoTapApiUrl("/api/zenotap/v1/deck/?id=123");
  assert(!urlWithQuery.includes("/?id="), "Trailing slash before query string stripped cleanly");
  assert(urlWithQuery.includes("/api/zenotap/v1/deck?id=123"), "Query string preserved correctly");

  // 2. CORS Preflight & Header Verification
  console.log("\n[Test 2] CORS Preflight & Attestation Headers");
  assert(zenoTapCorsHeaders["Access-Control-Allow-Origin"] === "*", "CORS Allow-Origin is universal (*)");
  assert(zenoTapCorsHeaders["Access-Control-Allow-Methods"].includes("PUT"), "CORS allows PUT for device pairing");
  assert(zenoTapCorsHeaders["Access-Control-Allow-Headers"].includes("Authorization"), "CORS allows Authorization header");
  assert(zenoTapCorsHeaders["Access-Control-Allow-Headers"].includes("x-zenotap-user-id"), "CORS allows user-id attestation");

  // 3. End-to-End Device Pairing & Bearer Token Authorization
  console.log("\n[Test 3] End-to-End Companion Device Pairing Flow");
  const userId = "sync_user_" + Date.now();
  const pairCode = "654321";
  const expiresAt = Date.now() + 600_000;

  // Web user creates 6-digit pair code
  zenoTapDb.createPairCode(userId, pairCode, expiresAt);

  // Add sample GIF to user's cloud deck
  const deckItem = zenoTapDb.addDeckItem({
    id: `gif_${crypto.randomUUID()}`,
    userId,
    filename: "zt_reaction.gif",
    originalName: "reaction.gif",
    url: "/uploads/zenotap/zt_reaction.gif",
    size: 4096,
    width: 250,
    height: 250,
    mimeType: "image/gif",
  });
  assert(deckItem.filename === "zt_reaction.gif", "Sample GIF added to user's cloud deck");

  // Android keyboard confirms pair code
  const syncToken = `zt_sync_${crypto.randomBytes(24).toString("hex")}`;
  const confirmation = zenoTapDb.confirmPairCode(pairCode, "Pixel 8 Pro ZenoDeck", syncToken);
  assert(confirmation !== null && confirmation.userId === userId, "Device successfully paired to correct user");

  // Verify pair code is immediately consumed (anti-replay/anti-hijack)
  const replayAttempt = zenoTapDb.confirmPairCode(pairCode, "Hacker Device", "bad_token");
  assert(replayAttempt === null, "Pair code immediately consumed — re-pairing blocked");

  // Keyboard queries /api/zenotap/v1/sync using Bearer token
  const link = zenoTapDb.getDeviceLinkBySyncToken(syncToken);
  assert(link !== null, "Sync token resolves paired device link");
  assert(link?.userId === userId, "Sync token belongs to target user");
  assert(link?.deviceName === "Pixel 8 Pro ZenoDeck", "Device metadata preserved");

  const userItems = zenoTapDb.getUserDeck(link!.userId);
  assert(userItems.length === 1 && userItems[0].id === deckItem.id, "Keyboard receives user's cloud deck");

  // 4. Multi-device Isolation Check
  console.log("\n[Test 4] Multi-Device User Account Isolation");
  const secondUser = "other_user_" + Date.now();
  const secondCode = "987654";
  zenoTapDb.createPairCode(secondUser, secondCode, Date.now() + 600_000);
  const secondToken = `zt_sync_${crypto.randomBytes(24).toString("hex")}`;
  zenoTapDb.confirmPairCode(secondCode, "Galaxy S24", secondToken);

  const secondLink = zenoTapDb.getDeviceLinkBySyncToken(secondToken);
  const secondItems = zenoTapDb.getUserDeck(secondLink!.userId);
  assert(secondItems.length === 0, "Second device sees isolated empty deck (no cross-account leakage)");

  // Clean up
  zenoTapDb.deleteDeckItem(deckItem.id, userId);
  zenoTapDb.deleteDeviceLink(link!.id, userId);
  zenoTapDb.deleteDeviceLink(secondLink!.id, secondUser);
  assert(zenoTapDb.getUserDeck(userId).length === 0, "Cleaned up test deck items");

  console.log("\n=================================================");
  console.log("🎉 ALL ZENOTAP SYNC & PAIRING TESTS PASSED!");
  console.log("=================================================\n");
}

runSyncTests().catch((err) => {
  console.error("Sync test failed:", err);
  process.exit(1);
});
