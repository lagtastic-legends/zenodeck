/**
 * Comprehensive Verification Suite for Subtitles Engine, History Vault, & Mini Player
 * (scripts/test-subtitles-and-vault.ts)
 */

import {
  formatSrtTimestamp,
  formatVttTimestamp,
  decodeHtmlEntities,
  parseJson3Cues,
  parseXmlCues,
  cuesToSrt,
  cuesToVtt,
  cuesToTxt,
} from "../src/lib/youtube/subtitles";
import { useHistoryStore } from "../src/lib/youtube/history-store";
import { usePlayerStore } from "../src/lib/youtube/player-store";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function runTests() {
  console.log("==========================================================");
  console.log("   ZENODECK SUBTITLES, VAULT, & MINI PLAYER TEST SUITE   ");
  console.log("==========================================================");

  // 1. Timestamps Formatting
  console.log("\n--- 1. Testing Subtitle Timestamp Formatters ---");
  assert(formatSrtTimestamp(0) === "00:00:00,000", "SRT 0ms");
  assert(formatSrtTimestamp(1234) === "00:00:01,234", "SRT 1234ms");
  assert(formatSrtTimestamp(65432) === "00:01:05,432", "SRT 65432ms");
  assert(formatSrtTimestamp(3661500) === "01:01:01,500", "SRT 1h1m1.5s");
  console.log("  ✓ PASS: formatSrtTimestamp converts milliseconds to standard SubRip syntax");

  assert(formatVttTimestamp(0) === "00:00:00.000", "VTT 0ms");
  assert(formatVttTimestamp(1234) === "00:00:01.234", "VTT 1234ms");
  assert(formatVttTimestamp(65432) === "00:01:05.432", "VTT 65432ms");
  assert(formatVttTimestamp(3661500) === "01:01:01.500", "VTT 1h1m1.5s");
  console.log("  ✓ PASS: formatVttTimestamp converts milliseconds to standard WebVTT syntax");

  // 2. HTML Entity Decoding
  console.log("\n--- 2. Testing Subtitle HTML Entity Decoding ---");
  const rawHtml = "Rock &amp; Roll &lt;bands&gt; don&#39;t say &quot;stop&quot;! &#65;";
  const decoded = decodeHtmlEntities(rawHtml);
  assert(decoded === "Rock & Roll <bands> don't say \"stop\"! A", `Decoded: ${decoded}`);
  console.log("  ✓ PASS: decodeHtmlEntities correctly decodes entities & strips tags");

  // 3. JSON3 TimedText Parsing
  console.log("\n--- 3. Testing YouTube JSON3 TimedText Parser ---");
  const sampleJson3 = {
    events: [
      {
        tStartMs: 1360,
        dDurationMs: 1680,
        segs: [{ utf8: "We're no strangers to love" }],
      },
      {
        tStartMs: 3120,
        dDurationMs: 2360,
        segs: [{ utf8: "You know the rules" }, { utf8: " and so do I" }],
      },
    ],
  };

  const jsonCues = parseJson3Cues(sampleJson3);
  assert(jsonCues.length === 2, "Parsed 2 cues");
  assert(jsonCues[0].startMs === 1360 && jsonCues[0].endMs === 3040, "Cue 1 timestamps");
  assert(jsonCues[0].text === "We're no strangers to love", "Cue 1 text");
  assert(jsonCues[1].text === "You know the rules and so do I", "Cue 2 combined segs");
  console.log("  ✓ PASS: parseJson3Cues accurately converts YouTube events into cues");

  // 4. XML TimedText Parsing Fallback
  console.log("\n--- 4. Testing Legacy XML TimedText Parser ---");
  const sampleXml = `
    <transcript>
      <text start="1.5" dur="2.0">Hello &amp; welcome</text>
      <text start="4.0" dur="3.5">To ZenoDeck Workstation</text>
    </transcript>
  `;
  const xmlCues = parseXmlCues(sampleXml);
  assert(xmlCues.length === 2, "Parsed 2 XML cues");
  assert(xmlCues[0].startMs === 1500 && xmlCues[0].endMs === 3500, "XML Cue 1 timing");
  assert(xmlCues[0].text === "Hello & welcome", "XML Cue 1 text decode");
  assert(xmlCues[1].text === "To ZenoDeck Workstation", "XML Cue 2 text");
  console.log("  ✓ PASS: parseXmlCues accurately extracts cues from XML transcripts");

  // 5. SRT, VTT, and TXT Generation
  console.log("\n--- 5. Testing SRT / VTT / TXT Exporters ---");
  const srtOutput = cuesToSrt(jsonCues);
  assert(srtOutput.includes("1\n00:00:01,360 --> 00:00:03,040\nWe're no strangers to love"), "SRT format structure");
  assert(srtOutput.includes("2\n00:00:03,120 --> 00:00:05,480"), "SRT cue 2 timing");
  console.log("  ✓ PASS: cuesToSrt formats valid SubRip document");

  const vttOutput = cuesToVtt(jsonCues);
  assert(vttOutput.startsWith("WEBVTT"), "VTT header");
  assert(vttOutput.includes("00:00:01.360 --> 00:00:03.040"), "VTT timestamp format");
  console.log("  ✓ PASS: cuesToVtt formats valid WebVTT document");

  const txtOutput = cuesToTxt(jsonCues);
  assert(txtOutput === "We're no strangers to love\nYou know the rules and so do I", "TXT transcript output");
  console.log("  ✓ PASS: cuesToTxt formats clean plain-text transcript");

  // 6. History Vault Zustand Store
  console.log("\n--- 6. Testing History Vault Zustand Store ---");
  useHistoryStore.getState().clearHistory();
  assert(useHistoryStore.getState().items.length === 0, "Vault starts empty");

  useHistoryStore.getState().addItem({
    videoId: "vid_01",
    title: "Rick Astley - Never Gonna Give You Up",
    author: "RickAstleyVEVO",
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    durationFormatted: "3:33",
    qualityBadge: "4K 60FPS",
    format: "mp4",
    fileSizeBytes: 52428800,
    isAudioOnly: false,
    localFileName: "rick_astley_4k.mp4",
  });

  assert(useHistoryStore.getState().items.length === 1, "Added 1 item to vault");
  assert(useHistoryStore.getState().items[0].qualityBadge === "4K 60FPS", "Item badge correct");

  // Add 55 items to test capacity capping (max 50)
  for (let i = 0; i < 55; i++) {
    useHistoryStore.getState().addItem({
      videoId: `test_vid_${i}`,
      title: `Test Video ${i}`,
      author: "Test Author",
      thumbnailUrl: "",
      durationFormatted: "1:00",
      qualityBadge: "1080P",
      format: "mp4",
      fileSizeBytes: 1048576,
      isAudioOnly: false,
    });
  }

  assert(useHistoryStore.getState().items.length === 50, "Vault successfully capped at 50 items");
  console.log("  ✓ PASS: useHistoryStore adds items and enforces 50-item capacity limit");

  const firstId = useHistoryStore.getState().items[0].id;
  useHistoryStore.getState().removeItem(firstId);
  assert(useHistoryStore.getState().items.length === 49, "Removed 1 item");
  console.log("  ✓ PASS: useHistoryStore removes items by ID");

  // 7. Mini Player Playback Store
  console.log("\n--- 7. Testing Mini Player Playback Store ---");
  usePlayerStore.getState().closePlayer();
  assert(usePlayerStore.getState().activeTrack === null, "Player initial null");
  assert(usePlayerStore.getState().isPlaying === false, "Player initial not playing");

  usePlayerStore.getState().playTrack({
    id: "track_123",
    title: "Awesome Audio Master",
    artist: "Zeno Studio",
    audioUrl: "https://example.com/audio.mp3",
    thumbnailUrl: "https://example.com/thumb.jpg",
    duration: 180,
  });

  assert(usePlayerStore.getState().activeTrack?.title === "Awesome Audio Master", "Track title set");
  assert(usePlayerStore.getState().isPlaying === true, "Track isPlaying true");

  usePlayerStore.getState().pause();
  assert(usePlayerStore.getState().isPlaying === false, "Paused");

  usePlayerStore.getState().resume();
  assert(usePlayerStore.getState().isPlaying === true, "Resumed");

  usePlayerStore.getState().setPlaybackRate(1.5);
  assert(usePlayerStore.getState().playbackRate === 1.5, "Playback rate set");

  usePlayerStore.getState().setVolume(0.8);
  assert(usePlayerStore.getState().volume === 0.8, "Volume set");

  usePlayerStore.getState().toggleMute();
  assert(usePlayerStore.getState().isMuted === true, "Muted");

  usePlayerStore.getState().closePlayer();
  assert(usePlayerStore.getState().activeTrack === null, "Player closed cleanly");
  console.log("  ✓ PASS: usePlayerStore handles all track auditioning and transport actions");

  console.log("\n==========================================================");
  console.log("ALL SUBTITLES, VAULT, & MINI PLAYER TESTS PASSED (100%)!");
  console.log("==========================================================");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
