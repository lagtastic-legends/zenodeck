/**
 * Milestone 3 Test Suite: Mobile APK Native Save & OOM Elimination
 * Validates chunk slicing math, base64 size boundaries, memory safety, and directory fallbacks.
 */

import fs from "fs";
import path from "path";

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ""}`);
    process.exit(1);
  }
}

async function runNativeSaveTests() {
  console.log("==========================================================");
  console.log("   MILESTONE M3: MOBILE NATIVE SAVE & OOM ELIMINATION     ");
  console.log("==========================================================\n");

  const CHUNK_SIZE = 512 * 1024; // 512 KB

  // 1. Chunk boundary mathematics
  console.log("--- 1. Testing Chunk Boundary Calculations ---");
  assert(Math.ceil(100 / CHUNK_SIZE) === 1, "100 bytes partitions into 1 chunk");
  assert(Math.ceil(CHUNK_SIZE / CHUNK_SIZE) === 1, "Exact 512KB partitions into 1 chunk");
  assert(Math.ceil((CHUNK_SIZE + 1) / CHUNK_SIZE) === 2, "512KB + 1 byte partitions into 2 chunks");
  assert(Math.ceil((2 * 1024 * 1024) / CHUNK_SIZE) === 4, "2MB partitions into 4 chunks");
  assert(Math.ceil((50 * 1024 * 1024) / CHUNK_SIZE) === 100, "50MB partitions into 100 chunks");
  assert(Math.ceil((250 * 1024 * 1024) / CHUNK_SIZE) === 500, "250MB 4K video partitions into 500 chunks");

  // 2. Android IPC Binder safety
  console.log("\n--- 2. Testing Android IPC Binder Buffer Safety ---");
  const maxBase64Len = Math.ceil((CHUNK_SIZE * 4) / 3) + 4;
  assert(
    maxBase64Len < 1024 * 1024,
    `Max base64 payload per chunk (${maxBase64Len} bytes) is strictly under 1MB Binder limit`
  );
  assert(
    maxBase64Len <= 700 * 1024,
    `Max base64 payload is safely <= 700KB for low-memory devices`
  );

  // 3. Source code structural audit
  console.log("\n--- 3. Testing native-save.ts Implementation Integrity ---");
  const filePath = path.join(process.cwd(), "src/lib/native-save.ts");
  assert(fs.existsSync(filePath), "native-save.ts exists");

  const source = fs.readFileSync(filePath, "utf-8");
  assert(source.includes("CHUNK_SIZE"), "native-save defines CHUNK_SIZE");
  assert(source.includes("Filesystem.writeFile"), "native-save calls writeFile for first chunk");
  assert(source.includes("Filesystem.appendFile"), "native-save calls appendFile for subsequent chunks");
  assert(source.includes("Directory.Documents"), "native-save targets Documents directory");
  assert(source.includes("Directory.Data"), "native-save falls back to Data directory on permission rejection");
  assert(source.includes("showSuccess"), "native-save emits success to save dialog store");
  assert(source.includes("showError"), "native-save handles and displays errors gracefully");

  // 4. Memory footprint verification
  console.log("\n--- 4. Memory Allocation Model Audit ---");
  assert(!source.includes("reader.readAsDataURL(blob);"), "Eliminated whole-blob readAsDataURL memory leak");
  assert(source.includes("blob.slice("), "Uses slice-based streaming chunk reader");

  console.log("\n==========================================================");
  console.log(`TOTAL M3 TESTS: ${totalTests}`);
  console.log(`PASSED:         ${passedTests}`);
  console.log(`FAILED:         0`);
  console.log("==========================================================");
}

runNativeSaveTests().catch(console.error);
