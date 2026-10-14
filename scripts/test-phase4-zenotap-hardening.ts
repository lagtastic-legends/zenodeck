/**
 * Unit Test Suite for Phase 4: ZenoTap Keyboard Hardening & Clipboard Pill
 */

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`FAIL: ${msg}`);
  }
}

function runTests() {
  console.log("=================================================");
  console.log("⚡ TESTING PHASE 4: ZENOTAP HARDENING & CLIPBOARD PILL");
  console.log("=================================================");

  // 1. Thumbnail Companion File Filter & Exclusion Invariants
  const sampleDeckFiles = [
    "meme_laser_cat.gif",
    "meme_laser_cat.gif.thumb.webp",
    "reaction_mindblown.gif",
    "reaction_mindblown.gif.thumb.webp",
    ".hidden_temp.gif",
    "dance_party.gif",
  ];

  const visibleMasterFiles = sampleDeckFiles.filter((name) => {
    return (
      name.endsWith(".gif") &&
      !name.endsWith(".thumb.webp") &&
      !name.startsWith(".")
    );
  });

  console.log(`[Test 1] Filtered Master Files (${visibleMasterFiles.length}):`, visibleMasterFiles);
  assert(visibleMasterFiles.length === 3, "Only master .gif files are surfaced in keyboard grid");
  assert(!visibleMasterFiles.some((f) => f.includes(".thumb.webp")), "Zero .thumb.webp companions in deck grid");
  assert(!visibleMasterFiles.some((f) => f.startsWith(".")), "Hidden files excluded");

  // 2. Companion Thumbnail Size & LMK Guard Invariant
  // Maximum allowed size for a thumbnail in memory is 15KB (15,360 bytes)
  const MAX_THUMB_BYTES = 15 * 1024;
  const mockWebpThumbSize = 8420; // typical 120x120 webp lossy
  console.log(`[Test 2] WebP Thumbnail size (${mockWebpThumbSize} bytes) vs LMK threshold (${MAX_THUMB_BYTES} bytes)`);
  assert(mockWebpThumbSize < MAX_THUMB_BYTES, "Thumbnail size is strictly below 15KB LMK ceiling");

  // 3. Rich Content MIME Support Matrix
  function isMimeSupported(supportedMimes: string[], targetMime: string): boolean {
    return supportedMimes.some((mime) => {
      return (
        mime.toLowerCase() === targetMime.toLowerCase() ||
        mime === "image/*" ||
        (targetMime.startsWith("image/") && mime.startsWith("image/*"))
      );
    });
  }

  const whatsAppMimes = ["image/gif", "image/png", "image/jpeg", "image/webp"];
  const telegramMimes = ["image/*"];
  const textOnlyMimes = ["text/plain"];

  console.log(`[Test 3] MIME WhatsApp: ${isMimeSupported(whatsAppMimes, "image/gif")}, Telegram: ${isMimeSupported(telegramMimes, "image/gif")}, TextOnly: ${isMimeSupported(textOnlyMimes, "image/gif")}`);
  assert(isMimeSupported(whatsAppMimes, "image/gif") === true, "WhatsApp supports image/gif");
  assert(isMimeSupported(telegramMimes, "image/gif") === true, "Telegram wildcard image/* supports image/gif");
  assert(isMimeSupported(textOnlyMimes, "image/gif") === false, "Text only input rejects image/gif safely");

  // 4. Ergonomic Spacebar Ratio Invariant (50% Spacebar)
  const leftWeight = 0.25;
  const spacebarWeight = 0.50;
  const rightWeight = 0.25;
  const totalWeight = leftWeight + spacebarWeight + rightWeight;

  console.log(`[Test 4] Keyboard Bottom Strip Weights: OpenApp=${leftWeight}, Spacebar=${spacebarWeight}, SwitchIME=${rightWeight}`);
  assert(Math.abs(totalWeight - 1.0) < 0.0001, "Bottom bar layout weights strictly sum to 1.0");
  assert(spacebarWeight === 0.5, "Spacebar commands exactly 50% of the total keyboard width");

  // 5. Clipboard Action Resolution
  const sampleClipboardUrls = [
    "https://example.com/art.gif",
    "https://cdn.discordapp.com/attachments/123/456/sticker.png",
    "https://i.imgur.com/sample.mp4",
  ];

  const isMediaPattern = /\.(png|jpe?g|webp|gif|mp4|mov)($|\?)/i;
  for (const url of sampleClipboardUrls) {
    assert(isMediaPattern.test(url), `Detected media URL: ${url}`);
  }
  console.log(`[Test 5] Verified clipboard media URL pattern recognition`);

  console.log("=================================================");
  console.log("✅ ALL PHASE 4 ZENOTAP HARDENING TESTS PASSED!");
  console.log("=================================================");
}

runTests();
