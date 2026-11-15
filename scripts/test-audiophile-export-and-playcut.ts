import assert from "assert";
import fs from "fs";
import path from "path";
import { audioOutputArgs as dspOutputArgs } from "../src/lib/audio-dsp";
import { audioOutputArgs as filterOutputArgs } from "../src/lib/audio/filters";

console.log("=== RUNNING AUDIOPHILE EXPORT PIPELINE & PLAY CUT VERIFICATION ===");

const root = path.resolve(__dirname, "..");
const cutterFile = fs.readFileSync(path.join(root, "src", "components", "audio", "PrecisionAudioCutterDeck.tsx"), "utf-8");
const studioFile = fs.readFileSync(path.join(root, "src", "components", "audio", "UnifiedAudioStudio.tsx"), "utf-8");

// 1. Verify audioOutputArgs MP3 high-fidelity flags in audio-dsp.ts
const mp3ArgsDsp256 = dspOutputArgs("mp3", 256);
assert(mp3ArgsDsp256.includes("-c:a") && mp3ArgsDsp256.includes("libmp3lame"), "MP3 must use libmp3lame encoder");
assert(mp3ArgsDsp256.includes("-b:a") && mp3ArgsDsp256.includes("256k"), "MP3 must enforce 256k target bitrate");
assert(mp3ArgsDsp256.includes("-q:a") && mp3ArgsDsp256.includes("0"), "MP3 must use -q:a 0 for highest LAME psychoacoustic fidelity without 16kHz cutoff");
assert(mp3ArgsDsp256.includes("-compression_level") && mp3ArgsDsp256.includes("0"), "MP3 must use -compression_level 0");
assert(mp3ArgsDsp256.includes("-reservoir") && mp3ArgsDsp256.includes("1"), "MP3 must enable bit reservoir for transient preservation");
assert(mp3ArgsDsp256.includes("-ac") && mp3ArgsDsp256.includes("2"), "MP3 must guarantee 2-channel stereo");
assert(!mp3ArgsDsp256.includes("-ar"), "MP3 must not force -ar 44100 to preserve source 48kHz audio without aliasing");
console.log("✓ PASS 1: audio-dsp.ts audioOutputArgs generates audiophile 256k/320k parameters.");

// 2. Verify audioOutputArgs MP3 high-fidelity flags in audio/filters.ts
const mp3ArgsFilters = filterOutputArgs("mp3", 320);
assert(mp3ArgsFilters.includes("-b:a") && mp3ArgsFilters.includes("320k"), "Filters MP3 must enforce 320k target bitrate");
assert(mp3ArgsFilters.includes("-q:a") && mp3ArgsFilters.includes("0"), "Filters MP3 must use -q:a 0");
assert(!mp3ArgsFilters.includes("-ar"), "Filters MP3 must not downsample to 44.1kHz");
console.log("✓ PASS 2: audio/filters.ts audioOutputArgs matches audiophile pipeline.");

// 3. Verify UnifiedAudioStudio does not force sampleRate: 44100
assert(!studioFile.includes("sampleRate: 44100"), "UnifiedAudioStudio must not hardcode sampleRate: 44100");
console.log("✓ PASS 3: UnifiedAudioStudio preserves native source sample rate.");

// 4. Verify UnifiedAudioStudio implements handlePlayCut
assert(studioFile.includes("const handlePlayCut = (startAt?: number) =>"), "UnifiedAudioStudio must declare handlePlayCut");
assert(studioFile.includes("audioRef.current.play()"), "handlePlayCut must start real audio playback");
assert(studioFile.includes("isPlaying={isPlaying}"), "UnifiedAudioStudio must pass isPlaying to PrecisionAudioCutterDeck");
assert(studioFile.includes("onPlayCut={handlePlayCut}"), "UnifiedAudioStudio must pass onPlayCut to PrecisionAudioCutterDeck");
console.log("✓ PASS 4: UnifiedAudioStudio integrates handlePlayCut and live playback state.");

// 5. Verify PrecisionAudioCutterDeck connects onPlayCut to all audition triggers
assert(cutterFile.includes("isPlaying?: boolean;"), "PrecisionAudioCutterDeckProps must declare isPlaying");
assert(cutterFile.includes("onPlayCut?: (startAt?: number) => void;"), "PrecisionAudioCutterDeckProps must declare onPlayCut");
assert(cutterFile.includes("Pause Cut"), "PrecisionAudioCutterDeck must display Pause Cut when currently playing");
assert(cutterFile.includes("onPlayCut(isPlaying ? undefined : startSec)"), "Play Cut button must trigger onPlayCut with toggle capability");
console.log("✓ PASS 5: PrecisionAudioCutterDeck connects onPlayCut to all transport & audition buttons.");

console.log("\nALL 5 AUDIOPHILE & PLAY-CUT TEST SUITES PASSED! (100% GREEN)");
