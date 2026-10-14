/**
 * Atomic Mobile Export Build Wrapper (scripts/build-mobile-export.ts)
 * ===================================================================
 * Safely executes `MOBILE_EXPORT=1 next build --webpack` for Capacitor static export.
 *
 * Problem:
 * 1. Next.js App Router static export (`output: "export"`) requires all GET route
 *    handlers to be statically exportable (`force-static` or static params).
 *    Dynamic server API routes (`force-dynamic`) fail the static export compilation.
 * 2. Recursive APK Nesting: Any .apk in public/ or out/ gets recursively copied
 *    into android/app/src/main/assets/public/ during `npx cap sync android`,
 *    causing multi-gigabyte/megabyte nesting loops inside newly generated APKs.
 *
 * Solution:
 * 1. Pre-build & post-build recursive APK purge across public/, out/, and Android assets.
 * 2. Stashes dynamic API routes in-memory and in `.next/mobile-export-backup/`.
 * 3. Temporarily writes static export stubs so Next.js static export succeeds.
 * 4. Spawns `next build --webpack` with `MOBILE_EXPORT=1`.
 * 5. Validates asset safety (0 nested APKs) before allowing Capacitor sync/Gradle build.
 * 6. UNCONDITIONALLY restores original route files in a `finally` block and signal traps.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const PROJECT_ROOT = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(PROJECT_ROOT, ".next", "mobile-export-backup");
const API_DIR = path.join(PROJECT_ROOT, "src", "app", "api");
const OUT_DIR = path.join(PROJECT_ROOT, "out");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const ANDROID_ASSETS_DIR = path.join(PROJECT_ROOT, "android", "app", "src", "main", "assets", "public");

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

/**
 * Recursively scans a directory and purges any .apk or .aab binary files.
 * Returns the list of purged file paths.
 */
export function purgeApkFiles(dir: string, label = ""): string[] {
  const purged: string[] = [];
  if (!fs.existsSync(dir)) return purged;

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === ".apk" || ext === ".aab") {
          try {
            const stats = fs.statSync(fullPath);
            const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
            fs.unlinkSync(fullPath);
            purged.push(fullPath);
            console.log(`▸ [mobile-export] [PURGE] Removed ${entry.name} (${sizeMb} MB) from ${label || path.relative(PROJECT_ROOT, currentDir)}`);
          } catch (err) {
            console.warn(`▸ [mobile-export] Warning: Failed to remove ${fullPath}:`, err);
          }
        }
      }
    }
  }

  walk(dir);
  return purged;
}

/**
 * Recursively scans a directory and purges any static ffmpeg-core.wasm binary files.
 * This guarantees the 32MB WASM core is never bundled inside static mobile exports or Capacitor assets.
 */
export function purgeStaticFfmpegWasm(dir: string, label = ""): string[] {
  const purged: string[] = [];
  if (!fs.existsSync(dir)) return purged;

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name === "ffmpeg-core.wasm") {
        try {
          const stats = fs.statSync(fullPath);
          const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
          fs.unlinkSync(fullPath);
          purged.push(fullPath);
          console.log(`▸ [mobile-export] [PURGE] Removed static ${entry.name} (${sizeMb} MB) from ${label || path.relative(PROJECT_ROOT, currentDir)}`);
        } catch (err) {
          console.warn(`▸ [mobile-export] Warning: Failed to remove ${fullPath}:`, err);
        }
      }
    }
  }

  walk(dir);
  return purged;
}

/**
 * Validates that no APK files or static FFmpeg WASM binaries exist in the target directory.
 * Returns validation summary including disallowed binaries and oversized files.
 */
export function validateExportAssets(
  dir: string,
  maxFileSizeMb = 10
): { valid: boolean; errors: string[]; largeFiles: string[] } {
  const errors: string[] = [];
  const largeFiles: string[] = [];
  if (!fs.existsSync(dir)) return { valid: true, errors, largeFiles };

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === ".apk" || ext === ".aab") {
          errors.push(`Disallowed APK binary found in export: ${path.relative(PROJECT_ROOT, fullPath)}`);
        }
        if (entry.name === "ffmpeg-core.wasm") {
          errors.push(`Disallowed static FFmpeg WASM binary found in export: ${path.relative(PROJECT_ROOT, fullPath)} (must be loaded on-demand to keep APK <25MB)`);
        }
        try {
          const stats = fs.statSync(fullPath);
          const sizeMb = stats.size / (1024 * 1024);
          if (sizeMb > maxFileSizeMb) {
            largeFiles.push(`${path.relative(PROJECT_ROOT, fullPath)} (${sizeMb.toFixed(2)} MB)`);
          }
        } catch {}
      }
    }
  }

  walk(dir);
  return {
    valid: errors.length === 0,
    errors,
    largeFiles,
  };
}

const STATIC_STUB_CONTENT = `import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET(_req?: any) {
  return NextResponse.json({ status: "static-export" });
}

export function POST(_req?: any) {
  return NextResponse.json({ status: "static-export" });
}

export function PUT(_req?: any) {
  return NextResponse.json({ status: "static-export" });
}

export function DELETE(_req?: any) {
  return NextResponse.json({ status: "static-export" });
}

export function PATCH(_req?: any) {
  return NextResponse.json({ status: "static-export" });
}

export function HEAD(_req?: any) {
  return new NextResponse(null, { status: 200 });
}

export function OPTIONS(_req?: any) {
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
    // 1. Pre-build asset purge: remove all .apk / .aab binaries and static ffmpeg-core.wasm from public, out, and Android assets
    console.log("▸ [mobile-export] Pre-build asset check: purging any nested APK binaries & static WASM...");
    purgeApkFiles(PUBLIC_DIR, "public/");
    purgeApkFiles(OUT_DIR, "out/");
    purgeApkFiles(ANDROID_ASSETS_DIR, "android/app/src/main/assets/public/");
    purgeStaticFfmpegWasm(OUT_DIR, "out/");
    purgeStaticFfmpegWasm(ANDROID_ASSETS_DIR, "android/app/src/main/assets/public/");

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

    if (exitCode === 0) {
      // 2. Post-build asset purge: ensure out/ directory never contains APKs or static FFmpeg WASM
      console.log("▸ [mobile-export] Post-build asset check: verifying out/ directory...");
      purgeApkFiles(OUT_DIR, "out/");
      purgeApkFiles(ANDROID_ASSETS_DIR, "android/app/src/main/assets/public/");
      purgeStaticFfmpegWasm(OUT_DIR, "out/");
      purgeStaticFfmpegWasm(ANDROID_ASSETS_DIR, "android/app/src/main/assets/public/");

      // 3. Asset safety verification
      const check = validateExportAssets(OUT_DIR, 35);
      if (!check.valid) {
        console.error("▸ [mobile-export] FATAL: Disallowed assets found in export output!");
        for (const err of check.errors) {
          console.error(`   ✗ ${err}`);
        }
        exitCode = 1;
      } else {
        console.log("▸ [mobile-export] ✓ Asset safety check passed: 0 nested APKs and 0 static FFmpeg WASM detected.");
        if (check.largeFiles.length > 0) {
          console.log(`▸ [mobile-export] Note: Large assets present (>10 MB): ${check.largeFiles.join(", ")}`);
        }
      }
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
