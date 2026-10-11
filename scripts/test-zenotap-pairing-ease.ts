import { zenoTapDb } from "../src/lib/zenotap/db";
import { extractPairCode } from "../src/lib/zenotap/client-sdk";
import crypto from "node:crypto";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
  console.log(`  ✓ ${msg}`);
}

async function runPairingEaseTests() {
  console.log("=================================================");
  console.log("⚡ RUNNING ZENOTAP EFFORTLESS PAIRING SUITE");
  console.log("=================================================");

  // 1. Pair Code Extraction (QR strings, URLs, spaces, raw numbers)
  console.log("\n[Test 1] Multi-Source Pair Code Extractor");
  assert(extractPairCode("847291") === "847291", "Extracts pure 6-digit string");
  assert(extractPairCode("847 291") === "847291", "Extracts spaced 3-3 digit string");
  assert(extractPairCode("  847-291  ") === "847291", "Extracts hyphenated string with padding");
  assert(
    extractPairCode("https://omni-tool-two.vercel.app/?pair=847291") === "847291",
    "Extracts code from magic link URL query param"
  );
  assert(
    extractPairCode("https://omni-tool-two.vercel.app/?source=qr&pair=847291#keyboard-deck") === "847291",
    "Extracts code from complex URL with multiple params & hash"
  );
  assert(
    extractPairCode("zenotap://pair?code=847291") === "847291",
    "Extracts code from custom URI scheme"
  );
  assert(
    extractPairCode("PAIR CODE: 847291 (use within 10 min)") === "847291",
    "Extracts code embedded in human clipboard snippet"
  );
  assert(extractPairCode("12345") === null, "Rejects short numeric sequence");
  assert(extractPairCode("abcdef") === null, "Rejects non-numeric alphabetic text");
  assert(extractPairCode("") === null, "Rejects empty string");

  // 2. Link ID creation and pending polling
  console.log("\n[Test 2] Link ID Generation & Pending Polling");
  const testUserId = "ease_user_" + Date.now();
  const pairCode = "192837";
  const expiresAt = Date.now() + 600_000;

  const linkId = zenoTapDb.createPairCode(testUserId, pairCode, expiresAt);
  assert(Boolean(linkId), "createPairCode returns unique linkId");
  assert(linkId.startsWith("link_"), "linkId format is prefix-standardized");

  // Check pending status via linkId
  const pendingStatusByLink = zenoTapDb.checkPairStatus(linkId);
  assert(pendingStatusByLink !== null, "checkPairStatus locates pending code by linkId");
  assert(pendingStatusByLink?.confirmed === false, "Status is unconfirmed before mobile scan");
  assert(pendingStatusByLink?.expired === false, "Status is active and unexpired");

  // Check pending status via pairCode
  const pendingStatusByCode = zenoTapDb.checkPairStatus(pairCode);
  assert(pendingStatusByCode?.confirmed === false, "checkPairStatus locates pending code by pairCode");

  // 3. Companion Confirmation & Post-Consumption Polling
  console.log("\n[Test 3] Companion Confirmation & Real-Time Polling Detection");
  const syncToken = `zt_sync_${crypto.randomBytes(24).toString("hex")}`;
  const deviceName = "Samsung Galaxy S24 Ultra";

  const confirmRes = zenoTapDb.confirmPairCode(pairCode, deviceName, syncToken);
  assert(confirmRes !== null, "confirmPairCode executes successfully");
  assert(confirmRes?.userId === testUserId, "confirmPairCode returns linked userId");

  // Critical requirement: desktop must be able to poll via linkId EVEN AFTER pair_code was consumed!
  const confirmedStatus = zenoTapDb.checkPairStatus(linkId);
  assert(confirmedStatus !== null, "checkPairStatus still resolves consumed record via linkId");
  assert(confirmedStatus?.confirmed === true, "Polling returns confirmed === true");
  assert(confirmedStatus?.deviceName === deviceName, "Polling returns connected deviceName");
  assert(confirmedStatus?.expired === false, "Confirmed record is not expired");

  // 4. Expiration handling
  console.log("\n[Test 4] Expired Pairing Code Detection");
  const expiredUserId = "expired_user_" + Date.now();
  const expiredCode = "999888";
  const pastTimestamp = Date.now() - 5000; // 5 seconds ago

  const expiredLinkId = zenoTapDb.createPairCode(expiredUserId, expiredCode, pastTimestamp);
  const expiredStatus = zenoTapDb.checkPairStatus(expiredLinkId);
  assert(expiredStatus?.expired === true, "checkPairStatus accurately flags expired codes");
  assert(expiredStatus?.confirmed === false, "Expired code cannot be confirmed");

  // 5. Non-existent record query
  console.log("\n[Test 5] Non-Existent Record Lookup Safety");
  const nonExistentStatus = zenoTapDb.checkPairStatus("link_non_existent_123");
  assert(nonExistentStatus === null, "Returns null safely for unknown linkId");

  console.log("\n=================================================");
  console.log("✅ ALL ZENOTAP EFFORTLESS PAIRING TESTS PASSED!");
  console.log("=================================================");
}

runPairingEaseTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
