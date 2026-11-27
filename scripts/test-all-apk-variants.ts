setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 60000).unref();

/**
 * ZenoDeck & ZenoTap — Exhaustive Verification Across ALL APK Variants
 * =====================================================================
 * Audits all 8 built Android APKs (Debug + Release across Universal,
 * arm64-v8a, armeabi-v7a, and x86_64 splits):
 * 1. Variant metadata & version parity (`versionName`, `versionCode`)
 * 2. ZIP central directory archive integrity (0 leaked APKs/WASM, dex, assets, ABI .so isolation)
 * 3. Cryptographic APK signature verification (`apksigner verify --print-certs`)
 * 4. Binary AndroidManifest, permissions, activities, IME service & FileProvider (`aapt2 dump`)
 * 5. ProGuard/R8 rule coverage & native plugin registrations
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { APP_VERSION, parseSemver } from "../src/config/version";

console.log("================================================================================");
console.log("   ZENODECK & ZENOTAP — ALL APK BUILD TYPES & ABI SPLITS VERIFICATION SUITE");
console.log("================================================================================");

const ROOT = path.resolve(__dirname, "..");
const APK_ROOT = path.join(ROOT, "android/app/build/outputs/apk");
const [maj, min, pat] = parseSemver(APP_VERSION);
const EXPECTED_VERSION_CODE = maj * 10000 + min * 100 + pat;

let totalPassed = 0;
let totalFailed = 0;

function check(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${label}`);
    totalPassed++;
  } else {
    console.error(`  ✗ [FAIL] ${label}${detail ? ` -> ${detail}` : ""}`);
    totalFailed++;
  }
}

function findAndroidBuildTools(): { apksigner: string; aapt2: string } {
  const sdkRoot =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk") : "");
  const buildToolsDir = path.join(sdkRoot, "build-tools");
  if (!sdkRoot || !fs.existsSync(buildToolsDir)) {
    throw new Error(`Android SDK build-tools not found under "${sdkRoot}"`);
  }
  const versions = fs
    .readdirSync(buildToolsDir)
    .filter((d) => fs.statSync(path.join(buildToolsDir, d)).isDirectory())
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .reverse();

  for (const ver of versions) {
    const dir = path.join(buildToolsDir, ver);
    const apksigner = path.join(dir, process.platform === "win32" ? "apksigner.bat" : "apksigner");
    const aapt2 = path.join(dir, process.platform === "win32" ? "aapt2.exe" : "aapt2");
    if (fs.existsSync(apksigner) && fs.existsSync(aapt2)) {
      return { apksigner, aapt2 };
    }
  }
  throw new Error(`apksigner and aapt2 not found in "${buildToolsDir}"`);
}

/**
 * Lightweight, zero-dependency ZIP Central Directory reader (reads only the tail + CD
 * so multi-10MB APKs inspect all entries in milliseconds without RAM bloat).
 */
function readZipEntries(filePath: string): string[] {
  const stat = fs.statSync(filePath);
  const fd = fs.openSync(filePath, "r");
  try {
    const tailLen = Math.min(stat.size, 65536 + 22);
    const tailBuf = Buffer.alloc(tailLen);
    fs.readSync(fd, tailBuf, 0, tailLen, stat.size - tailLen);

    let eocdPos = -1;
    for (let i = tailLen - 22; i >= 0; i--) {
      if (tailBuf.readUInt32LE(i) === 0x06054b50) {
        eocdPos = i;
        break;
      }
    }
    if (eocdPos < 0) {
      throw new Error("ZIP End-Of-Central-Directory record not found");
    }

    const totalEntries = tailBuf.readUInt16LE(eocdPos + 10);
    const cdSize = tailBuf.readUInt32LE(eocdPos + 12);
    const cdOffset = tailBuf.readUInt32LE(eocdPos + 16);

    const cdBuf = Buffer.alloc(cdSize);
    fs.readSync(fd, cdBuf, 0, cdSize, cdOffset);

    const names: string[] = [];
    let offset = 0;
    for (let idx = 0; idx < totalEntries && offset + 46 <= cdBuf.length; idx++) {
      const sig = cdBuf.readUInt32LE(offset);
      if (sig !== 0x02014b50) break;
      const nameLen = cdBuf.readUInt16LE(offset + 28);
      const extraLen = cdBuf.readUInt16LE(offset + 30);
      const commentLen = cdBuf.readUInt16LE(offset + 32);
      const name = cdBuf.subarray(offset + 46, offset + 46 + nameLen).toString("utf8");
      names.push(name);
      offset += 46 + nameLen + extraLen + commentLen;
    }
    return names;
  } finally {
    fs.closeSync(fd);
  }
}

interface ApkSpec {
  buildType: "debug" | "release";
  abiKey: "universal" | "arm64-v8a" | "armeabi-v7a" | "x86_64";
  fileName: string;
  expectedAbis: string[];
  disallowedAbis: string[];
}

const APK_SPECS: ApkSpec[] = [
  {
    buildType: "release",
    abiKey: "universal",
    fileName: "app-universal-release.apk",
    expectedAbis: ["arm64-v8a", "armeabi-v7a", "x86_64"],
    disallowedAbis: [],
  },
  {
    buildType: "release",
    abiKey: "arm64-v8a",
    fileName: "app-arm64-v8a-release.apk",
    expectedAbis: ["arm64-v8a"],
    disallowedAbis: ["armeabi-v7a", "x86_64"],
  },
  {
    buildType: "release",
    abiKey: "armeabi-v7a",
    fileName: "app-armeabi-v7a-release.apk",
    expectedAbis: ["armeabi-v7a"],
    disallowedAbis: ["arm64-v8a", "x86_64"],
  },
  {
    buildType: "release",
    abiKey: "x86_64",
    fileName: "app-x86_64-release.apk",
    expectedAbis: ["x86_64"],
    disallowedAbis: ["arm64-v8a", "armeabi-v7a"],
  },
  {
    buildType: "debug",
    abiKey: "universal",
    fileName: "app-universal-debug.apk",
    expectedAbis: ["arm64-v8a", "armeabi-v7a", "x86_64"],
    disallowedAbis: [],
  },
  {
    buildType: "debug",
    abiKey: "arm64-v8a",
    fileName: "app-arm64-v8a-debug.apk",
    expectedAbis: ["arm64-v8a"],
    disallowedAbis: ["armeabi-v7a", "x86_64"],
  },
  {
    buildType: "debug",
    abiKey: "armeabi-v7a",
    fileName: "app-armeabi-v7a-debug.apk",
    expectedAbis: ["armeabi-v7a"],
    disallowedAbis: ["arm64-v8a", "x86_64"],
  },
  {
    buildType: "debug",
    abiKey: "x86_64",
    fileName: "app-x86_64-debug.apk",
    expectedAbis: ["x86_64"],
    disallowedAbis: ["arm64-v8a", "armeabi-v7a"],
  },
];

const { apksigner, aapt2 } = findAndroidBuildTools();
console.log(`Using SDK tools:\n  apksigner: ${apksigner}\n  aapt2:     ${aapt2}`);

// 1. Metadata JSON verification across both buildTypes
console.log("\n[1/4] Verifying Gradle output-metadata.json (debug & release)...");
for (const buildType of ["release", "debug"] as const) {
  const metaPath = path.join(APK_ROOT, buildType, "output-metadata.json");
  check(fs.existsSync(metaPath), `${buildType}/output-metadata.json exists`);
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  check(meta.applicationId === "com.omnitool.app", `${buildType} applicationId === "com.omnitool.app"`);
  check(meta.variantName === buildType, `${buildType} variantName === "${buildType}"`);
  check(Array.isArray(meta.elements) && meta.elements.length === 4, `${buildType} defines 4 APK elements`);

  for (const el of meta.elements) {
    check(
      el.versionCode === EXPECTED_VERSION_CODE && el.versionName === APP_VERSION,
      `${buildType}/${el.outputFile} metadata matches v${APP_VERSION} (${EXPECTED_VERSION_CODE})`,
      `Got ${el.versionName} (${el.versionCode})`
    );
  }
}

// 2. Inspect ALL 8 APKs (ZIP structure, ABI splits, cryptographic signature, badging & manifest tree)
console.log("\n[2/4] Verifying all 8 APK binaries (Debug & Release × 4 ABIs)...");
for (const spec of APK_SPECS) {
  const apkPath = path.join(APK_ROOT, spec.buildType, spec.fileName);
  const label = `${spec.buildType}/${spec.fileName}`;
  console.log(`\n  --- Auditing ${label} ---`);

  const exists = fs.existsSync(apkPath);
  check(exists, `${label} exists`);
  if (!exists) continue;

  const sizeMb = fs.statSync(apkPath).size / (1024 * 1024);
  check(sizeMb >= 20 && sizeMb <= 200, `${label} size within clean bounds (${sizeMb.toFixed(2)} MB)`);

  // ZIP structure & asset hygiene
  const entries = readZipEntries(apkPath);
  const entrySet = new Set(entries);
  check(entries.length > 50, `${label} valid ZIP archive (${entries.length} entries)`);
  check(entrySet.has("AndroidManifest.xml"), `${label} contains AndroidManifest.xml`);
  check(entrySet.has("resources.arsc"), `${label} contains compiled resources.arsc`);
  check(entries.some((e) => /^classes\d*\.dex$/.test(e)), `${label} contains DEX bytecode`);
  check(entrySet.has("assets/public/index.html"), `${label} bundles Capacitor assets/public/index.html`);
  check(entrySet.has("assets/capacitor.config.json"), `${label} bundles assets/capacitor.config.json`);
  check(entrySet.has("assets/capacitor.plugins.json"), `${label} bundles assets/capacitor.plugins.json`);
  check(entries.some((e) => e.startsWith("assets/chaquopy/")), `${label} bundles Chaquopy embedded Python runtime`);

  // Verify compiled ZenoTap IME & FileProvider XML resources via aapt2 resource table (handles AGP optimizeReleaseResources shortened paths like res/OQ.xml)
  const resDump = execFileSync(aapt2, ["dump", "resources", apkPath], {
    encoding: "utf8",
    timeout: 15000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const hasCompiledImeResources =
    resDump.includes("xml/method") &&
    resDump.includes("xml/file_paths") &&
    resDump.includes("layout/keyboard_view") &&
    resDump.includes("layout/item_clipboard_cell");
  check(hasCompiledImeResources, `${label} compiles ZenoTap IME & FileProvider XML resources in resources.arsc`);

  // No leaked APKs or static FFmpeg WASM inside assets
  const nestedLeaks = entries.filter(
    (e) => /\.(apk|aab)$/i.test(e) || path.basename(e) === "ffmpeg-core.wasm"
  );
  check(nestedLeaks.length === 0, `${label} contains 0 nested APKs or static ffmpeg-core.wasm`, nestedLeaks.join(", "));

  // Strict ABI .so split isolation
  for (const abi of spec.expectedAbis) {
    const abiLibs = entries.filter((e) => e.startsWith(`lib/${abi}/`) && e.endsWith(".so"));
    check(abiLibs.length > 0, `${label} bundles native .so libs for expected ABI ${abi} (${abiLibs.length} libs)`);
  }
  for (const disAbi of spec.disallowedAbis) {
    const extraLibs = entries.filter((e) => e.startsWith(`lib/${disAbi}/`));
    check(extraLibs.length === 0, `${label} excludes disallowed split ABI ${disAbi}`, extraLibs.join(", "));
  }

  // Cryptographic signature verification
  let verifyOut = "";
  let sigOk = false;
  try {
    verifyOut = execFileSync(
      process.platform === "win32" ? "cmd.exe" : apksigner,
      process.platform === "win32"
        ? ["/c", apksigner, "verify", "--verbose", "--print-certs", apkPath]
        : ["verify", "--verbose", "--print-certs", apkPath],
      { encoding: "utf8", timeout: 15000 }
    );
    sigOk = verifyOut.includes("Verifies");
  } catch (err: any) {
    verifyOut = String(err?.stdout || "") + String(err?.stderr || err?.message || "");
  }
  check(sigOk, `${label} passes apksigner cryptographic verification`);
  if (spec.buildType === "release") {
    check(
      !verifyOut.includes("CN=Android Debug"),
      `${label} signed with release keystore (not debug cert)`
    );
  } else {
    check(
      verifyOut.includes("CN=Android Debug"),
      `${label} signed with standard Android Debug cert`
    );
  }

  // Binary badging & manifest tree inspection via aapt2
  const badging = execFileSync(aapt2, ["dump", "badging", apkPath], {
    encoding: "utf8",
    timeout: 15000,
    maxBuffer: 8 * 1024 * 1024,
  });
  check(
    badging.includes("package: name='com.omnitool.app'") &&
      badging.includes(`versionCode='${EXPECTED_VERSION_CODE}'`) &&
      badging.includes(`versionName='${APP_VERSION}'`),
    `${label} aapt2 badging confirms com.omnitool.app v${APP_VERSION} (${EXPECTED_VERSION_CODE})`
  );
  check(
    badging.includes("launchable-activity: name='com.omnitool.app.MainActivity'"),
    `${label} exposes launchable MainActivity`
  );
  for (const perm of [
    "android.permission.INTERNET",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_MEDIA_AUDIO",
  ]) {
    check(badging.includes(`uses-permission: name='${perm}'`), `${label} declares permission ${perm}`);
  }
  for (const abi of spec.expectedAbis) {
    check(badging.includes(abi), `${label} native-code advertises ABI ${abi}`);
  }

  const xmlTree = execFileSync(aapt2, ["dump", "xmltree", "--file", "AndroidManifest.xml", apkPath], {
    encoding: "utf8",
    timeout: 15000,
    maxBuffer: 8 * 1024 * 1024,
  });
  check(
    xmlTree.includes("com.omnitool.app.keyboard.ZenoDeckKeyboardService") &&
      xmlTree.includes("android.permission.BIND_INPUT_METHOD"),
    `${label} compiles ZenoDeckKeyboardService with BIND_INPUT_METHOD`
  );
  check(
    xmlTree.includes("com.omnitool.app.recorder.OmniRecordService"),
    `${label} compiles OmniRecordService`
  );
  check(
    xmlTree.includes("androidx.core.content.FileProvider") &&
      xmlTree.includes("com.omnitool.app.fileprovider"),
    `${label} compiles FileProvider with com.omnitool.app.fileprovider authority`
  );
}

// 3. ProGuard/R8 & Plugin Contract Parity
console.log("\n[3/4] Verifying ProGuard/R8 rules & native plugin wiring...");
const proguard = fs.readFileSync(path.join(ROOT, "android/app/proguard-rules.pro"), "utf-8");
for (const keepRule of [
  "com.omnitool.app.**",
  "com.omnitool.app.media.**",
  "com.omnitool.app.keyboard.**",
  "com.getcapacitor.**",
  "androidx.media3.**",
  "com.hbisoft.hbrecorder.**",
]) {
  check(proguard.includes(keepRule), `proguard-rules.pro keeps ${keepRule}`);
}

const mainAct = fs.readFileSync(path.join(ROOT, "android/app/src/main/java/com/omnitool/app/MainActivity.java"), "utf-8");
for (const plugin of ["OmniRecorderPlugin", "ZenoDeckKeyboardBridgePlugin", "ZenoMedia3Plugin"]) {
  check(mainAct.includes(`registerPlugin(${plugin}.class)`), `MainActivity registers ${plugin}`);
}

const instTest = fs.readFileSync(
  path.join(ROOT, "android/app/src/androidTest/java/com/getcapacitor/myapp/ExampleInstrumentedTest.java"),
  "utf-8"
);
check(instTest.includes('"com.omnitool.app"'), "ExampleInstrumentedTest asserts com.omnitool.app package ID");

// 4. Universal vs Split Size Sanity Comparison
console.log("\n[4/4] Verifying Universal APK >= individual ABI splits...");
for (const buildType of ["release", "debug"] as const) {
  const uniSize = fs.statSync(path.join(APK_ROOT, buildType, `app-universal-${buildType}.apk`)).size;
  for (const abi of ["arm64-v8a", "armeabi-v7a", "x86_64"]) {
    const splitSize = fs.statSync(path.join(APK_ROOT, buildType, `app-${abi}-${buildType}.apk`)).size;
    check(
      uniSize > splitSize,
      `${buildType} universal APK (${(uniSize / 1e6).toFixed(1)} MB) > ${abi} split (${(splitSize / 1e6).toFixed(1)} MB)`
    );
  }
}

console.log("\n================================================================================");
console.log(`ALL APK VARIANTS VERIFICATION SUMMARY: ${totalPassed} Passed | ${totalFailed} Failed`);
console.log("================================================================================");

if (totalFailed > 0) {
  process.exit(1);
}
process.exit(0);
