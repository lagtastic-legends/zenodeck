setTimeout(() => { console.error("TIMEOUT"); process.exit(1); }, 25000).unref();

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { APP_VERSION } from "../src/config/version";
import {
  AUDIO_TOOLS_CATALOG,
  build8DSlowedReverbFilter,
  buildTrimmerFilter,
  getAudioFilterGraph,
  getDefaultAudioParams,
  mapCombined8DParams,
  type AudioEffectType,
} from "../src/lib/audio-dsp";
import {
  DEFAULT_FX_RACK_CONFIG,
  SLOWED_REVERB_STUDIO_PRESET,
  EIGHT_D_SLOWED_REVERB_STUDIO_PRESET,
  EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET,
  buildFXRackFilterChain,
  createFXRackWebAudioNodes,
} from "../src/lib/audio/fx-rack-engine";
import {
  STEM_DEFINITIONS,
  DEFAULT_STEM_MIXER_STATE,
  buildSingleStemFilter,
  buildSinglePassStemSeparationArgs,
  createStemMixerWebAudioNodes,
} from "../src/lib/audio/stem-separator";
import { isAllowedStreamHost, canonicalizeYouTubeUrl } from "../src/lib/media/stream-security";

console.log("================================================================================");
console.log("   ZENODECK & ZENOTAP — FULL-CODEBASE INTEGRITY & WIRING VERIFICATION AUDIT");
console.log("================================================================================");

const ROOT = path.resolve(__dirname, "..");
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

function walkFiles(dir: string, exts?: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip compiled Capacitor web asset copies inside android assets/public
      if (full.includes(`${path.sep}assets${path.sep}public`)) continue;
      results.push(...walkFiles(full, exts));
    } else if (!exts || exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function resolveModulePath(fromFile: string, specifier: string): boolean {
  let candidateBase = "";
  if (specifier.startsWith("@/")) {
    candidateBase = path.join(ROOT, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    candidateBase = path.resolve(path.dirname(fromFile), specifier);
  } else {
    return true; // External npm package or node: builtin (verified globally by tsc --noEmit)
  }

  const candidates = [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.js`,
    `${candidateBase}.jsx`,
    `${candidateBase}.json`,
    `${candidateBase}.css`,
    path.join(candidateBase, "index.ts"),
    path.join(candidateBase, "index.tsx"),
  ];
  return candidates.some((c) => fs.existsSync(c));
}

function hasExportedIdentifier(sf: ts.SourceFile): string[] {
  const exported: string[] = [];
  sf.forEachChild((node) => {
    const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExport = Boolean(mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
    if (ts.isExportAssignment(node)) {
      exported.push("default");
    } else if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) exported.push(el.name.text);
      } else {
        exported.push("*");
      }
    } else if (isExport) {
      if (ts.isFunctionDeclaration(node) && node.name) exported.push(node.name.text);
      else if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) exported.push(decl.name.text);
        }
      } else if (ts.isClassDeclaration(node) && node.name) {
        exported.push(node.name.text);
      }
    }
  });
  return exported;
}

// -----------------------------------------------------------------------------
// SECTION 1: Tool Registry, Router Coverage & React Module Exports
// -----------------------------------------------------------------------------
console.log("\n[1/5] Checking Tool Registry, AppShell Wiring & Tool Component Exports...");
const registrySrc = fs.readFileSync(path.join(ROOT, "src/lib/tools/registry.ts"), "utf-8");
const appShellSrc = fs.readFileSync(path.join(ROOT, "src/components/shell/app-shell.tsx"), "utf-8");

const toolIdMatches = [...registrySrc.matchAll(/id:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
const uniqueRegistryIds = [...new Set(toolIdMatches)];
check(uniqueRegistryIds.length >= 30, `TOOL_REGISTRY defines ${uniqueRegistryIds.length} unique tool IDs`);

for (const id of uniqueRegistryIds) {
  const wired =
    appShellSrc.includes(`"${id}":`) ||
    new RegExp(`\\b${id}:\\s*[A-Z]`).test(appShellSrc);
  check(wired, `Registry tool "${id}" maps to component in app-shell.tsx`);
}

const toolFiles = walkFiles(path.join(ROOT, "src/components/tools"), [".tsx"]);
const audioFiles = walkFiles(path.join(ROOT, "src/components/audio"), [".tsx"]);
const shellFiles = walkFiles(path.join(ROOT, "src/components/shell"), [".tsx"]);
const componentFiles = [...toolFiles, ...audioFiles, ...shellFiles];

for (const file of componentFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const src = fs.readFileSync(file, "utf-8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const exported = hasExportedIdentifier(sf);
  const hasComponentExport = exported.some((name) => /^[A-Z]|^default$/.test(name));
  check(hasComponentExport, `${rel} exports valid React component (${exported.join(", ") || "none"})`);

  let brokenImports: string[] = [];
  sf.forEachChild((node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!resolveModulePath(file, node.moduleSpecifier.text)) {
        brokenImports.push(node.moduleSpecifier.text);
      }
    }
  });
  check(brokenImports.length === 0, `${rel} has zero broken local imports`, brokenImports.join(", "));
}

// -----------------------------------------------------------------------------
// SECTION 2: API Route Handlers & Security Validation
// -----------------------------------------------------------------------------
console.log("\n[2/5] Checking All API Route Handlers & SSRF/Input Security...");
const apiRoutes = walkFiles(path.join(ROOT, "src/app/api"), ["route.ts"]);
check(apiRoutes.length >= 15, `Discovered ${apiRoutes.length} API route handlers under src/app/api`);

for (const routeFile of apiRoutes) {
  const rel = path.relative(ROOT, routeFile).replace(/\\/g, "/");
  const src = fs.readFileSync(routeFile, "utf-8");
  const sf = ts.createSourceFile(routeFile, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exported = hasExportedIdentifier(sf);
  const httpMethods = exported.filter((e) => ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(e));
  check(httpMethods.length > 0, `${rel} exports valid HTTP handlers (${httpMethods.join(", ")})`);

  if (rel.includes("/youtube/stream/")) {
    check(src.includes("isAllowedStreamHost") || src.includes("isAllowedHost"), `${rel} enforces SSRF host allowlist`);
  } else if (rel.includes("/zenotap/")) {
    check(src.includes("zenoTapSecurity"), `${rel} enforces zenoTapSecurity origin/auth guards`);
  } else if (rel.includes("/media/download/") || rel.includes("/youtube/info/") || rel.includes("/youtube/playlist/")) {
    check(
      src.includes("isValidMediaInput") || src.includes("canonicalizeYouTubeUrl"),
      `${rel} enforces input canonicalization / validation`
    );
  }
}

// Verify stream-security SSRF & canonicalization at runtime
check(
  canonicalizeYouTubeUrl("https://youtu.be/rxwTkp_xHSE") === "https://www.youtube.com/watch?v=rxwTkp_xHSE",
  "stream-security canonicalizeYouTubeUrl normalizes youtu.be URLs"
);
check(
  isAllowedStreamHost("https://rr3---sn-4g5ednsd.googlevideo.com/videoplayback") &&
    !isAllowedStreamHost("http://127.0.0.1/secret") &&
    !isAllowedStreamHost("http://169.254.169.254/latest/meta-data/"),
  "stream-security isAllowedStreamHost allows CDNs and blocks SSRF loopback/metadata"
);

// -----------------------------------------------------------------------------
// SECTION 3: Audio DSP, 20 Audio Modules, FX Rack & Stem Separator
// -----------------------------------------------------------------------------
console.log("\n[3/5] Checking Audio DSP Builders, FX Rack & Stem Separator...");
const EXPECTED_AUDIO_TOOL_IDS = [
  "audio-editor", "slowed-reverb", "audio-effects", "bass-booster", "spatial-8d",
  "equalizer", "reverse-audio", "stereo-panner", "volume-changer", "audio-dsp",
  "fx-rack", "stem-separator", "vocal-remover", "reverb", "auto-panner",
  "noise-reducer", "pitch-shifter", "tempo-changer", "trimmer", "ringtone-maker",
];
for (const audioId of EXPECTED_AUDIO_TOOL_IDS) {
  check(Boolean(appShellSrc.includes(`"${audioId}":`)), `Audio tool ID "${audioId}" wired in app-shell.tsx`);
}
check(AUDIO_TOOLS_CATALOG.length >= 12, `AUDIO_TOOLS_CATALOG populated (${AUDIO_TOOLS_CATALOG.length} entries)`);

// Verify every AudioEffectType filtergraph compiles non-empty (with active params where default is unity) and safe
const activeParamOverrides: Partial<Record<AudioEffectType, Record<string, any>>> = {
  equalizer: { gains: [4, 2, 0, 0, 0, 0, 0, 0, 2, 3] },
  "pitch-shifter": { semitones: -4 },
  "stereo-panner": { balance: 0.5 },
  "tempo-changer": { speed: 0.85 },
  "volume-changer": { gainDb: 3 },
};
const effectTypes: AudioEffectType[] = [
  "spatial-8d", "auto-panner", "bass-booster", "equalizer", "noise-reducer",
  "pitch-shifter", "reverb", "reverse-audio", "stereo-panner", "tempo-changer",
  "trimmer", "vocal-remover", "volume-changer", "slowed-reverb",
];
for (const eff of effectTypes) {
  const defaults = getDefaultAudioParams(eff);
  const defaultGraph = getAudioFilterGraph(eff, defaults);
  check(Array.isArray(defaultGraph), `getAudioFilterGraph("${eff}", defaults) returns valid filter array`);

  const activeParams = { ...defaults, ...(activeParamOverrides[eff] || {}) };
  const activeGraph = getAudioFilterGraph(eff, activeParams);
  check(
    Array.isArray(activeGraph) && activeGraph.length > 0 && !activeGraph.join(";").includes("lowpass=f=-"),
    `getAudioFilterGraph("${eff}", active) compiles non-empty filtergraph (${activeGraph.length} filters)`
  );
}

// Direct tests on buildTrimmerFilter, build8DSlowedReverbFilter & mapCombined8DParams
const trimKeep = buildTrimmerFilter({ startSec: 2, endSec: 12, cutMode: "keep", fadeInSec: 0.5, fadeOutSec: 0.5 });
const trimCut = buildTrimmerFilter({ startSec: 2, endSec: 5, cutMode: "cut", fadeInSec: 0.2, fadeOutSec: 0.2 });
check(trimKeep.some((f) => f.includes("atrim=")) && trimCut.some((f) => f.includes("aselect=")), "buildTrimmerFilter generates valid keep and cut graphs");

const mapped8D = mapCombined8DParams({ speed: 0.84, cycleSec: 10, intensity: 0.9, hfDamping: 100 });
check(mapped8D.tempo === 0.84 && mapped8D.panDepth === 0.9 && mapped8D.hfDamping === 100, "mapCombined8DParams maps speed/cycle/intensity/damping cleanly");

const combined8DGraph = build8DSlowedReverbFilter(mapped8D).join(";");
check(
  combined8DGraph.includes("alimiter=limit=") && !combined8DGraph.includes("lowpass=f=-"),
  "build8DSlowedReverbFilter includes limiter and positive lowpass floor even at 100% HF damping"
);

// FX Rack & Stem Separator checks
check(typeof createFXRackWebAudioNodes === "function", "createFXRackWebAudioNodes exported");
check(typeof createStemMixerWebAudioNodes === "function", "createStemMixerWebAudioNodes exported");
const fxPresets: Array<[string, typeof DEFAULT_FX_RACK_CONFIG]> = [
  ["DEFAULT_FX_RACK_CONFIG", DEFAULT_FX_RACK_CONFIG],
  ["SLOWED_REVERB_STUDIO_PRESET", SLOWED_REVERB_STUDIO_PRESET],
  ["EIGHT_D_SLOWED_REVERB_STUDIO_PRESET", EIGHT_D_SLOWED_REVERB_STUDIO_PRESET],
  ["EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET", EIGHT_D_SLOWED_REVERB_HYPNOTIC_PRESET],
];
for (const [label, preset] of fxPresets) {
  const fxChain = buildFXRackFilterChain(preset);
  check(fxChain.length > 0 && fxChain.some((f) => f.includes("alimiter")), `FX Rack preset "${label}" compiles non-clipping filterchain`);
}
for (const stem of Object.keys(STEM_DEFINITIONS) as Array<keyof typeof STEM_DEFINITIONS>) {
  const singleStem = buildSingleStemFilter(stem);
  check(singleStem.length > 0, `Stem separator buildSingleStemFilter("${stem}") returns valid filters`);
}
const multiStemResult = buildSinglePassStemSeparationArgs("input.mp3", "stem-out", "mp3");
check(
  multiStemResult.args.includes("-filter_complex") && multiStemResult.outputFiles.vocals === "stem-out-vocals.mp3",
  "buildSinglePassStemSeparationArgs builds single-pass filter_complex"
);

// -----------------------------------------------------------------------------
// SECTION 4: Native Android Kotlin & XML Safety
// -----------------------------------------------------------------------------
console.log("\n[4/5] Checking Native Android Kotlin Braces/Packages & XML Well-Formedness...");

function checkKotlinBracesBalanced(code: string): { balanced: boolean; balance: number } {
  let depth = 0;
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];
    // Line comment
    if (ch === "/" && next === "/") {
      while (i < code.length && code[i] !== "\n") i++;
      continue;
    }
    // Block comment
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    // Triple-quoted raw string
    if (ch === '"' && code[i + 1] === '"' && code[i + 2] === '"') {
      i += 3;
      while (i < code.length && !(code[i] === '"' && code[i + 1] === '"' && code[i + 2] === '"')) i++;
      i += 3;
      continue;
    }
    // Regular string literal (count braces only inside ${...} templates)
    if (ch === '"') {
      i++;
      let templateDepth = 0;
      while (i < code.length) {
        if (code[i] === "\\") { i += 2; continue; }
        if (code[i] === '"' && templateDepth === 0) { i++; break; }
        if (code[i] === "$" && code[i + 1] === "{") { templateDepth++; i += 2; continue; }
        if (code[i] === "{" && templateDepth > 0) { templateDepth++; }
        else if (code[i] === "}" && templateDepth > 0) { templateDepth--; }
        i++;
      }
      continue;
    }
    // Char literal
    if (ch === "'") {
      i++;
      if (code[i] === "\\") i += 2;
      else i += 1;
      if (code[i] === "'") i++;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth < 0) return { balanced: false, balance: depth };
    }
    i++;
  }
  return { balanced: depth === 0, balance: depth };
}

function validateXmlWellFormed(xml: string): { ok: boolean; error?: string } {
  // Strip XML declarations, comments, and CDATA
  let cleaned = xml
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");

  // Check for unescaped ampersands outside valid entities
  const badAmp = cleaned.match(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/);
  if (badAmp) {
    return { ok: false, error: "Unescaped '&' character in XML" };
  }

  const stack: string[] = [];
  const tagRegex = /<\/?([A-Za-z_][\w.:-]*)(?:\s+[^<>]*?)?(\/?)>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(cleaned)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    const isSelfClosing = match[2] === "/";
    if (fullTag.startsWith("</")) {
      const popped = stack.pop();
      if (popped !== tagName) {
        return { ok: false, error: `Mismatched closing tag </${tagName}> (expected </${popped || "none"}>)` };
      }
    } else if (!isSelfClosing) {
      stack.push(tagName);
    }
  }
  if (stack.length > 0) {
    return { ok: false, error: `Unclosed XML tags: ${stack.join(", ")}` };
  }
  return { ok: true };
}

const kotlinFiles = walkFiles(path.join(ROOT, "android/app/src/main/java"), [".kt"]);
const javaFiles = walkFiles(path.join(ROOT, "android/app/src/main/java"), [".java"]);
check(kotlinFiles.length >= 9, `Found ${kotlinFiles.length} Kotlin files under android/app/src/main/java`);

for (const ktFile of kotlinFiles) {
  const rel = path.relative(ROOT, ktFile).replace(/\\/g, "/");
  const code = fs.readFileSync(ktFile, "utf-8");
  const hasPkg = /^package\s+com\.omnitool\.app(\.[a-z0-9_]+)?\b/m.test(code);
  const braceRes = checkKotlinBracesBalanced(code);
  check(hasPkg, `${rel} declares valid com.omnitool.app package`);
  check(braceRes.balanced, `${rel} has balanced {} braces (delta=${braceRes.balance})`);
}

for (const javaFile of javaFiles) {
  const rel = path.relative(ROOT, javaFile).replace(/\\/g, "/");
  const code = fs.readFileSync(javaFile, "utf-8");
  const hasPkg = /^package\s+com\.omnitool\.app(\.[a-z0-9_]+)?\s*;/m.test(code);
  const braceRes = checkKotlinBracesBalanced(code);
  check(hasPkg && braceRes.balanced, `${rel} declares valid package and balanced braces`);
}

const manifestPath = path.join(ROOT, "android/app/src/main/AndroidManifest.xml");
const xmlResFiles = [manifestPath, ...walkFiles(path.join(ROOT, "android/app/src/main/res"), [".xml"])];
check(xmlResFiles.length >= 20, `Found ${xmlResFiles.length} Android XML files (Manifest + res/)`);

for (const xmlFile of xmlResFiles) {
  const rel = path.relative(ROOT, xmlFile).replace(/\\/g, "/");
  const xml = fs.readFileSync(xmlFile, "utf-8");
  const wf = validateXmlWellFormed(xml);
  check(wf.ok, `${rel} is well-formed XML`, wf.error);

  const badText = xml.match(/android:text="([?@][^"]*)"/g) || [];
  const realBad = badText.filter(
    (m) =>
      !m.startsWith('android:text="@string/') &&
      !m.startsWith('android:text="@android:') &&
      !m.startsWith('android:text="\\') &&
      !m.startsWith('android:text="?attr/')
  );
  check(realBad.length === 0, `${rel} has zero unescaped leading ?/@ literals in android:text`, realBad.join(", "));
}

// -----------------------------------------------------------------------------
// SECTION 5: Version Synchronization & Public Build Hygiene
// -----------------------------------------------------------------------------
console.log("\n[5/5] Checking Build Hygiene & Version Parity...");
const pkgJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
const gradleSrc = fs.readFileSync(path.join(ROOT, "android/app/build.gradle"), "utf-8");
const expectedVersionCode = (() => {
  const [maj, min, pat] = APP_VERSION.split(".").map((n) => parseInt(n, 10));
  return maj * 10000 + min * 100 + pat;
})();

check(pkgJson.version === APP_VERSION, `package.json (${pkgJson.version}) === version.ts (${APP_VERSION})`);
check(gradleSrc.includes(`versionName "${APP_VERSION}"`), `build.gradle versionName === "${APP_VERSION}"`);
check(gradleSrc.includes(`versionCode ${expectedVersionCode}`), `build.gradle versionCode === ${expectedVersionCode}`);

const publicLeaks = walkFiles(path.join(ROOT, "public")).filter((f) => /\.(apk|aab)$/i.test(f) || path.basename(f) === "ffmpeg-core.wasm");
check(publicLeaks.length === 0, "public/ contains zero leaked .apk, .aab, or ffmpeg-core.wasm artifacts", publicLeaks.join(", "));

console.log("\n================================================================================");
console.log(`FULL-CODEBASE INTEGRITY AUDIT SUMMARY: ${totalPassed} Passed | ${totalFailed} Failed`);
console.log("================================================================================");

if (totalFailed > 0) {
  process.exit(1);
}
process.exit(0);
