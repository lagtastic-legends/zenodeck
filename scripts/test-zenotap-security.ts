import { zenoTapSecurity } from "../src/lib/zenotap/security";
import { zenoTapDb } from "../src/lib/zenotap/db";
import crypto from "node:crypto";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runTests() {
  console.log("=================================================");
  console.log("🛡️  RUNNING ZENOTAP SECURITY & API TEST SUITE");
  console.log("=================================================");

  const testUser = "test_user_" + Date.now();

  // Test 1: Ticket Generation
  console.log("\n[Test 1] Ticket Generation & HMAC Signing");
  const ticket = zenoTapSecurity.generateUploadTicket(testUser, 5 * 1024 * 1024);
  assert(typeof ticket === "string" && ticket.includes("."), "Generated ticket contains data and HMAC signature");

  // Test 2: Ticket Verification
  console.log("\n[Test 2] Ticket Cryptographic Verification");
  const payload = zenoTapSecurity.verifyAndConsumeUploadTicket(ticket);
  assert(payload !== null, "Valid ticket successfully verified");
  assert(payload?.userId === testUser, "Ticket payload contains correct user ID");

  // Test 3: Anti-Replay Attack Protection
  console.log("\n[Test 3] Anti-Replay Single-Use Protection");
  const replayed = zenoTapSecurity.verifyAndConsumeUploadTicket(ticket);
  assert(replayed === null, "Replaying same ticket is blocked (nonce was consumed)");

  // Test 4: Forged / Tampered Signature Detection
  console.log("\n[Test 4] Tampered Signature Rejection");
  const tamperedTicket = ticket.slice(0, -4) + "XXXX";
  const tamperedResult = zenoTapSecurity.verifyAndConsumeUploadTicket(tamperedTicket);
  assert(tamperedResult === null, "Tampered signature rejected with null");

  // Test 5: Magic Byte Inspection
  console.log("\n[Test 5] Magic Byte Binary Inspection");
  const fakeFile = Buffer.from("<html><script>alert(1)</script></html>");
  assert(!zenoTapSecurity.isValidGifBuffer(fakeFile), "Malicious HTML rejected as non-GIF");

  // Valid 1x1 transparent GIF bytes
  const validGifBytes = Buffer.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, // GIF89a
    0x01, 0x00, 0x01, 0x00,             // 1x1 px
    0x80, 0x00, 0x00,                   // GCT flag
    0x00, 0x00, 0x00,                   // Color 0
    0xff, 0xff, 0xff,                   // Color 1
    0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, // GCE
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, // Image descriptor
    0x02, 0x02, 0x44, 0x01, 0x00,       // Image data
    0x3b                                // Trailer
  ]);

  const validationResult = zenoTapSecurity.validateGifBuffer(validGifBytes);
  assert(validationResult.valid, "Valid GIF buffer passed binary validation");
  assert(validationResult.width === 1 && validationResult.height === 1, "Correctly extracted dimensions (1x1)");

  // Test 6: Database Storage & Retrieval
  console.log("\n[Test 6] Database Storage & Isolation");
  const item = zenoTapDb.addDeckItem({
    id: "gif_" + crypto.randomUUID(),
    userId: testUser,
    filename: "zt_test.gif",
    originalName: "test.gif",
    url: "/uploads/zenotap/zt_test.gif",
    size: validGifBytes.length,
    width: 1,
    height: 1,
    mimeType: "image/gif",
  });
  assert(item.id.startsWith("gif_"), "Item stored with unique ID");

  const deck = zenoTapDb.getUserDeck(testUser);
  assert(deck.length === 1 && deck[0].id === item.id, "User deck query returns stored item");

  // Other user isolation check
  const otherDeck = zenoTapDb.getUserDeck("other_user_999");
  assert(otherDeck.length === 0, "User isolation verified (other user cannot see deck)");

  // Test 7: Device Pairing & Scoped Sync Token
  console.log("\n[Test 7] Mobile Device Pairing & Scoped Sync Token");
  const pairCode = "123456";
  zenoTapDb.createPairCode(testUser, pairCode, Date.now() + 600_000);

  const syncToken = "zt_sync_test_" + Date.now();
  const pairConfirmation = zenoTapDb.confirmPairCode(pairCode, "Pixel 8 Pro", syncToken);
  assert(pairConfirmation !== null && pairConfirmation.userId === testUser, "Pairing code confirmed for user");

  const link = zenoTapDb.getDeviceLinkBySyncToken(syncToken);
  assert(link !== null && link.userId === testUser, "Sync token resolves to correct user account");
  assert(link?.deviceName === "Pixel 8 Pro", "Device name recorded");

  // Expired / Bad Code rejection
  const badConfirmation = zenoTapDb.confirmPairCode("999999", "Hacker Device", "bad_token");
  assert(badConfirmation === null, "Invalid pairing code rejected");

  // Clean up test item
  zenoTapDb.deleteDeckItem(item.id, testUser);
  const deckAfterDelete = zenoTapDb.getUserDeck(testUser);
  assert(deckAfterDelete.length === 0, "Item cleanly deleted from database");

  console.log("\n=================================================");
  console.log("🎉 ALL ZENOTAP SECURITY & API TESTS PASSED!");
  console.log("=================================================\n");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
