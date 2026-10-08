/**
 * Atomic Mobile Export Build Wrapper (scripts/build-mobile-export.ts)
 * ===================================================================
 * Safely executes `MOBILE_EXPORT=1 next build --webpack` for Capacitor static export.
 *
 * Problem:
 * Next.js App Router static export (`output: "export"`) requires all GET route
 * handlers to be statically exportable (`force-static` or static params).
 * Dynamic server API routes (`force-dynamic`) fail the static export compilation.
 *
 * Solution:
 * 1. Atomically stashes dynamic API routes in-memory and in `.next/mobile-export-backup/`.
 * 2. Temporarily writes static export stubs so Next.js static export succeeds.
 * 3. Spawns `next build --webpack` with `MOBILE_EXPORT=1`.
 * 4. UNCONDITIONALLY restores the original tracked route files in a `finally` block
 *    and on OS termination signals (SIGINT, SIGTERM, exit), guaranteeing ZERO git diff.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(PROJECT_ROOT, ".next", "mobile-export-backup");
const API_DIR = path.join(PROJECT_ROOT, "src", "app", "api");

function findAllApiRoutes(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findAllApiRoutes(fullPath));
    } else if (entry.isFile() && (entry.name === "route.ts" || entry.name === "route.js")) {
      results.push(fullPath);
    }
  }
  return results;
}

const STATIC_STUB_CONTENT = `import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({ status: "static-export" });
}

export function POST() {
  return NextResponse.json({ status: "static-export" });
}

export function PUT() {
  return NextResponse.json({ status: "static-export" });
}

export function DELETE() {
  return NextResponse.json({ status: "static-export" });
}

export function PATCH() {
  return NextResponse.json({ status: "static-export" });
}

export function HEAD() {
  return new NextResponse(null, { status: 200 });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
`;

const fileBackups = new Map<string, string>();
let discoveredRoutes: string[] = [];
let isRestored = false;

function getBackupFileName(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).replace(/[\\/:]/g, "_");
}

function backupAndSubstituteRoutes(): void {
  console.log("▸ [mobile-export] Stashing dynamic route handlers for static export...");

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  discoveredRoutes = findAllApiRoutes(API_DIR);

  for (const filePath of discoveredRoutes) {
    if (!fs.existsSync(filePath)) {
      console.warn(`▸ [mobile-export] Warning: Target route not found: ${filePath}`);
      continue;
    }

    const originalContent = fs.readFileSync(filePath, "utf8");
    fileBackups.set(filePath, originalContent);

    // Also persist to disk backup in .next/ for crash resilience
    const backupFileName = getBackupFileName(filePath);
    const diskBackupPath = path.join(BACKUP_DIR, backupFileName);
    fs.writeFileSync(diskBackupPath, originalContent, "utf8");

    // Write static stub
    fs.writeFileSync(filePath, STATIC_STUB_CONTENT, "utf8");
  }

  console.log(`▸ [mobile-export] Substituted ${fileBackups.size} routes with static stubs.`);
}

function restoreOriginalRoutes(): void {
  if (isRestored) return;
  isRestored = true;

  console.log("▸ [mobile-export] Restoring original dynamic route files...");

  for (const [filePath, originalContent] of fileBackups.entries()) {
    try {
      fs.writeFileSync(filePath, originalContent, "utf8");
    } catch (err) {
      console.error(`▸ [mobile-export] Error restoring ${filePath}:`, err);
    }
  }

  // Also check if any disk backups exist in case in-memory was empty
  if (fileBackups.size === 0 && fs.existsSync(BACKUP_DIR)) {
    for (const filePath of discoveredRoutes) {
      const backupFileName = getBackupFileName(filePath);
      const diskBackupPath = path.join(BACKUP_DIR, backupFileName);
      if (fs.existsSync(diskBackupPath)) {
        const content = fs.readFileSync(diskBackupPath, "utf8");
        fs.writeFileSync(filePath, content, "utf8");
      }
    }
  }

  // Clean up disk backup directory
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
  } catch {}

  console.log("▸ [mobile-export] Original dynamic route files restored successfully.");
}

// Register process exit and signal listeners for unconditional restoration
process.on("exit", () => restoreOriginalRoutes());
process.on("SIGINT", () => {
  restoreOriginalRoutes();
  process.exit(130);
});
process.on("SIGTERM", () => {
  restoreOriginalRoutes();
  process.exit(143);
});
process.on("uncaughtException", (err) => {
  restoreOriginalRoutes();
  console.error("▸ [mobile-export] Uncaught exception:", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  restoreOriginalRoutes();
  console.error("▸ [mobile-export] Unhandled rejection:", reason);
  process.exit(1);
});

export function buildMobileExport(): number {
  let exitCode = 0;

  try {
    backupAndSubstituteRoutes();

    console.log("▸ [mobile-export] Launching Next.js build (MOBILE_EXPORT=1)...");
    const nextCmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const result = spawnSync(nextCmd, ["next", "build", "--webpack"], {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        MOBILE_EXPORT: "1",
      },
      shell: true,
    });

    exitCode = result.status ?? (result.error ? 1 : 0);
    if (result.error) {
      console.error("▸ [mobile-export] Build process failed to start:", result.error);
    }
  } finally {
    restoreOriginalRoutes();
  }

  return exitCode;
}

// Execute if run directly via tsx / node
const isDirectRun =
  (typeof require !== "undefined" && require.main === module) ||
  (typeof process !== "undefined" &&
    process.argv[1] &&
    path.resolve(process.argv[1]) === path.resolve(__filename));

if (isDirectRun) {
  const code = buildMobileExport();
  process.exit(code);
}
