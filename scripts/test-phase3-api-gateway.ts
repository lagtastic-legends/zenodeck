/**
 * Verification Test Suite for Phase 3: Static Export API Gateway & Native Offline Routing
 *
 * Verifies:
 * 1. resolveApiUrl handles relative, absolute, and parameterized endpoints across web & native APK.
 * 2. zenoApiFetch intercepts /api/zenotap/v1/deck locally in native context without calling 404 endpoints.
 * 3. Local deck operations (GET, DELETE, upload-ticket) return valid Responses with expected JSON payloads.
 * 4. Remote endpoints (/api/zenotap/v1/device/pair, /api/zenotap/v1/sync, /api/ai) route to remote backend.
 * 5. Full compliance with standard Web Response interfaces (ok, status, json, text).
 */

import {
  zenoApiFetch,
  resolveApiUrl,
  isOfflineExportEnvironment,
  getRemoteApiBaseUrl,
} from "../src/lib/api-gateway";

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("   PHASE 3 VERIFICATION: STATIC EXPORT API GATEWAY & NATIVE OFFLINE ROUTING    ");
  console.log("================================================================================\n");

  // TEST 1: URL Resolution & Base URL
  console.log("--- Test 1: URL Resolution & Base URL ---");
  const remoteBase = getRemoteApiBaseUrl();
  assert(
    remoteBase.startsWith("http://") || remoteBase.startsWith("https://"),
    `Remote API base URL is valid: ${remoteBase}`
  );

  const absoluteUrl = "https://cdn.example.com/stream.mp4";
  assert(
    resolveApiUrl(absoluteUrl) === absoluteUrl,
    "Absolute external URLs are preserved untouched"
  );

  const resolvedRelative = resolveApiUrl("/api/zenotap/v1/deck");
  assert(
    resolvedRelative.startsWith("http") && resolvedRelative.includes("/api/zenotap/v1/deck"),
    `Relative path correctly resolved to: ${resolvedRelative}`
  );

  // TEST 2: Query Parameter Normalization in zenoApiFetch
  console.log("\n--- Test 2: Query Parameter Normalization ---");
  // Test parameter injection
  const testUrl = "/api/test/query";
  let capturedUrl = "";
  const originalFetch = global.fetch;

  // Intercept fetch for parameter test
  global.fetch = (async (input: any) => {
    capturedUrl = typeof input === "string" ? input : input.url;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as any;

  try {
    await zenoApiFetch(testUrl, {
      params: {
        id: "clip_123",
        format: "gif",
        active: true,
      },
    });

    assert(
      capturedUrl.includes("id=clip_123") &&
        capturedUrl.includes("format=gif") &&
        capturedUrl.includes("active=true"),
      `Query params accurately serialized into URL: ${capturedUrl}`
    );
  } finally {
    global.fetch = originalFetch;
  }

  // TEST 3: Native Offline Interception for /api/zenotap/v1/deck
  console.log("\n--- Test 3: Native Offline Deck Interception ---");
  // In Node environment, Capacitor.isNativePlatform() is false by default.
  // We simulate native mode by patching Capacitor
  const { Capacitor } = await import("@capacitor/core");
  const originalIsNative = Capacitor.isNativePlatform;
  (Capacitor as any).isNativePlatform = () => true;

  try {
    // A. GET /api/zenotap/v1/deck
    const deckRes = await zenoApiFetch("/api/zenotap/v1/deck");
    assert(deckRes.ok, "Native GET /api/zenotap/v1/deck returns 200 OK without server route");
    assert(deckRes.status === 200, "Native deck status is 200");
    const deckData = await deckRes.json();
    assert(deckData.success === true, "Native deck returns success: true");
    assert(Array.isArray(deckData.deck), "Native deck returns deck array");
    assert(deckData.source === "native_bridge", "Native deck confirms source: native_bridge");

    // B. DELETE /api/zenotap/v1/deck?id=sample.gif
    const deleteRes = await zenoApiFetch("/api/zenotap/v1/deck", {
      method: "DELETE",
      params: { id: "sample.gif" },
    });
    assert(deleteRes.ok, "Native DELETE /api/zenotap/v1/deck returns 200 OK");
    const deleteData = await deleteRes.json();
    assert(typeof deleteData.success === "boolean", "Native delete returns boolean success status");
    assert(deleteData.deletedId === "sample.gif", "Native delete returns deletedId");
    assert(deleteData.source === "native_bridge", "Native delete handled by native bridge");

    // C. POST /api/zenotap/v1/deck/upload-ticket
    const ticketRes = await zenoApiFetch("/api/zenotap/v1/deck/upload-ticket", {
      method: "POST",
    });
    assert(ticketRes.ok, "Native POST /upload-ticket returns 200 OK");
    const ticketData = await ticketRes.json();
    assert(ticketData.success === true, "Native ticket returns success: true");
    assert(
      typeof ticketData.ticket === "string" && ticketData.ticket.startsWith("offline_ticket_"),
      `Offline ticket generated: ${ticketData.ticket}`
    );
    assert(ticketData.expiresInSeconds === 300, "Offline ticket expiration is 300s");
  } finally {
    (Capacitor as any).isNativePlatform = originalIsNative;
  }

  // TEST 4: Remote Dispatch for Device Pairing & Sync
  console.log("\n--- Test 4: Remote Dispatch for Cross-Device Pairing & Sync ---");
  // Test that pairing endpoints target remote host when offline export is active
  process.env.NEXT_PUBLIC_MOBILE_EXPORT = "1";
  let remoteTargetUrl = "";

  global.fetch = (async (input: any) => {
    remoteTargetUrl = typeof input === "string" ? input : input.url;
    return new Response(JSON.stringify({ success: true, pairCode: "123456" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as any;

  try {
    const pairRes = await zenoApiFetch("/api/zenotap/v1/device/pair", {
      method: "POST",
      headers: { "x-zenotap-user-id": "usr_test" },
    });

    assert(pairRes.ok, "Pair request dispatched successfully");
    assert(
      remoteTargetUrl.startsWith(remoteBase) && remoteTargetUrl.includes("/api/zenotap/v1/device/pair"),
      `Pair request steered to remote backend: ${remoteTargetUrl}`
    );
  } finally {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_MOBILE_EXPORT;
  }

  // TEST 5: AI Endpoint Gateway Integration
  console.log("\n--- Test 5: AI Endpoint Gateway Integration ---");
  let aiTargetUrl = "";
  global.fetch = (async (input: any) => {
    aiTargetUrl = typeof input === "string" ? input : input.url;
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: "Zeno co-pilot online." }] } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as any;

  try {
    const { generateAiResponse } = await import("../src/lib/gemini");
    const aiText = await generateAiResponse([{ role: "user", content: "Status report" }]);

    assert(
      aiText === "Zeno co-pilot online.",
      `AI response received via gateway: "${aiText}"`
    );
    assert(
      aiTargetUrl.includes("/api/ai"),
      `AI request correctly dispatched to endpoint: ${aiTargetUrl}`
    );
  } finally {
    global.fetch = originalFetch;
  }

  console.log("\n================================================================================");
  console.log(`   PHASE 3 VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (100%) `);
  console.log("================================================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
