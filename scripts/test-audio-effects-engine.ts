/**
 * Test Suite: Audio Effects Engine (Phase 1: Slowed & Reverb)
 * ============================================================
 * Validates the FFmpeg command generation, filter parameters,
 * argument array structure, and error handling for the Slowed & Reverb engine.
 */

import {
  generateSlowedReverbCommand,
  SLOWED_REVERB_FILTER,
  getSlowedReverbFilter,
} from "../src/lib/audio/effects-engine";

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

console.log("=== Testing Audio Effects Engine — Phase 1 ===");

// 1. Exact Filter String Validation
const EXPECTED_FILTER = "asetrate=44100*0.85,aresample=44100,aecho=0.8:0.9:1000:0.3";
assert(
  SLOWED_REVERB_FILTER === EXPECTED_FILTER,
  "SLOWED_REVERB_FILTER matches exact specification",
  `Got: ${SLOWED_REVERB_FILTER}`
);
assert(
  getSlowedReverbFilter() === EXPECTED_FILTER,
  "getSlowedReverbFilter() matches exact specification"
);

// 2. Command Generation (Array compatibility with @ffmpeg/ffmpeg exec)
const input = "track_01.mp3";
const output = "track_01_slowed_reverb.mp3";
const cmd = generateSlowedReverbCommand(input, output);

assert(Array.isArray(cmd), "Command is an Array instance");
assert(cmd.length === 5, "Command argument count is exactly 5");
assert(cmd[0] === "-i", "cmd[0] is '-i'");
assert(cmd[1] === input, "cmd[1] matches input file");
assert(cmd[2] === "-af", "cmd[2] is '-af'");
assert(cmd[3] === EXPECTED_FILTER, "cmd[3] contains exact audio filter chain");
assert(cmd[4] === output, "cmd[4] matches output file");

// 3. Extended Command Metadata & String Representation
assert(cmd.filterChain === EXPECTED_FILTER, "cmd.filterChain property matches");
assert(cmd.inputFile === input, "cmd.inputFile property matches");
assert(cmd.outputFile === output, "cmd.outputFile property matches");

assert(
  cmd.commandString === `ffmpeg -i "${input}" -af "${EXPECTED_FILTER}" "${output}"`,
  "cmd.commandString produces valid CLI command syntax"
);
assert(
  cmd.toString() === `ffmpeg -i "${input}" -af "${EXPECTED_FILTER}" "${output}"`,
  "cmd.toString() matches commandString"
);

// 4. Edge Cases and Error Handling
let threwOnEmptyInput = false;
try {
  generateSlowedReverbCommand("", "out.mp3");
} catch {
  threwOnEmptyInput = true;
}
assert(threwOnEmptyInput, "Throws on empty inputFile");

let threwOnEmptyOutput = false;
try {
  generateSlowedReverbCommand("in.mp3", "");
} catch {
  threwOnEmptyOutput = true;
}
assert(threwOnEmptyOutput, "Throws on empty outputFile");

console.log("\n=== Testing Audio Effects Engine — Phase 2: 8D Audio ===");

import {
  generate8DAudioCommand,
  EIGHT_D_AUDIO_FILTER,
  get8DAudioFilter,
} from "../src/lib/audio/effects-engine";

// 5. Exact 8D Filter String Validation
const EXPECTED_8D_FILTER = "apulsator=mode=sine:hz=0.08:amount=0.85,aecho=0.8:0.9:1000:0.3";
assert(
  EIGHT_D_AUDIO_FILTER === EXPECTED_8D_FILTER,
  "EIGHT_D_AUDIO_FILTER matches exact specification",
  `Got: ${EIGHT_D_AUDIO_FILTER}`
);
assert(
  get8DAudioFilter() === EXPECTED_8D_FILTER,
  "get8DAudioFilter() matches exact specification"
);

// 6. Command Generation (Array compatibility with @ffmpeg/ffmpeg exec)
const input8D = "audio_track.mp3";
const output8D = "audio_track_8d.mp3";
const cmd8D = generate8DAudioCommand(input8D, output8D);

assert(Array.isArray(cmd8D), "8D Command is an Array instance");
assert(cmd8D.length === 5, "8D Command argument count is exactly 5");
assert(cmd8D[0] === "-i", "cmd8D[0] is '-i'");
assert(cmd8D[1] === input8D, "cmd8D[1] matches input file");
assert(cmd8D[2] === "-af", "cmd8D[2] is '-af'");
assert(cmd8D[3] === EXPECTED_8D_FILTER, "cmd8D[3] contains exact 8D audio filter chain");
assert(cmd8D[4] === output8D, "cmd8D[4] matches output file");

// 7. Extended Command Metadata & String Representation
assert(cmd8D.filterChain === EXPECTED_8D_FILTER, "cmd8D.filterChain property matches");
assert(cmd8D.inputFile === input8D, "cmd8D.inputFile property matches");
assert(cmd8D.outputFile === output8D, "cmd8D.outputFile property matches");

assert(
  cmd8D.commandString === `ffmpeg -i "${input8D}" -af "${EXPECTED_8D_FILTER}" "${output8D}"`,
  "cmd8D.commandString produces valid CLI command syntax"
);
assert(
  cmd8D.toString() === `ffmpeg -i "${input8D}" -af "${EXPECTED_8D_FILTER}" "${output8D}"`,
  "cmd8D.toString() matches commandString"
);

// 8. 8D Edge Cases and Error Handling
let threwOnEmpty8DInput = false;
try {
  generate8DAudioCommand("", "out8d.mp3");
} catch {
  threwOnEmpty8DInput = true;
}
assert(threwOnEmpty8DInput, "8D Throws on empty inputFile");

let threwOnEmpty8DOutput = false;
try {
  generate8DAudioCommand("in.mp3", "");
} catch {
  threwOnEmpty8DOutput = true;
}
assert(threwOnEmpty8DOutput, "8D Throws on empty outputFile");

console.log("\n=== Testing Audio Effects Engine — Phase 3: UI Integration ===");

import { AudioEffectsPanel } from "../src/components/audio/AudioEffectsPanel";
import { AudioEffectsPanel as AliasedPanel } from "../src/components/AudioEffectsPanel";
import { TOOL_REGISTRY } from "../src/lib/tools/registry";

// 9. Component Export & Integrity
assert(typeof AudioEffectsPanel === "function", "AudioEffectsPanel React component is defined and exported");
assert(AudioEffectsPanel === AliasedPanel, "Aliased AudioEffectsPanel matches primary export");

// 10. Tool Registry Integration
const audioEffectsTool = TOOL_REGISTRY.find((t) => t.id === "audio-effects");
assert(!!audioEffectsTool, "audio-effects tool is registered in TOOL_REGISTRY");
assert(audioEffectsTool?.category === "audio", "audio-effects tool category is 'audio'");
assert(audioEffectsTool?.status === "online", "audio-effects tool status is 'online'");

console.log(`\nResults: ${passedTests}/${totalTests} tests passed.\n`);


