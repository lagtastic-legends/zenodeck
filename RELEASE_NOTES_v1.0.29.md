# ZenoDeck v1.0.29 Release Notes

**Release Tag:** `v1.0.29`  
**Platform Coverage:** Web (`omni-tool-two.vercel.app`) & Native Android APK (Universal, ARM64, ARMv7, x86_64)

---

## Highlights

### 1. Functional "Play Cut" & Audition Controls
- **Live Audition Playback:**
  - Resolved the bug where clicking **"Play Cut"** or **"Audition (2s)"** only moved the timeline scrubber without starting playback.
  - Connected `handlePlayCut` across both the **Precision M3 mobile dock** and the **Cyber Workstation transport bar**, properly invoking `<audio>.play()` and the Web Audio DSP graph.
  - Added dynamic state toggle (`Play Cut` ➔ `Pause Cut`) with reactive `<Pause>` and `<Play>` icons.
  - Audio plays seamlessly from the In-Point and automatically stops at the Out-Point (or loops if Loop Region is toggled on).

### 2. Audiophile Sound Quality & Export Encoding Pipeline Optimization
- **Maximum LAME Algorithmic Quality (`-q:a 0` & `-compression_level 0`):**
  - Eliminated the severe quality drop when exporting MP3s. Previously, `libmp3lame` defaulted to quality 4, which applied an aggressive 16 kHz low-pass filter cutting off vocal air, cymbal shimmer, and high-frequency harmonics even at 256kbps or 320kbps.
  - With `-q:a 0`, the complete 20Hz – 22.05kHz audible spectrum is preserved with full bit reservoir (`-reservoir 1`) and guaranteed stereo imaging (`-ac 2`).
- **Eliminated Forced 44.1kHz Resampling:**
  - Removed the hardcoded `sampleRate: 44100` from `UnifiedAudioStudio` and `audioOutputArgs`. Source files at 48kHz (YouTube, modern cameras, phone recordings) now retain their pristine 48kHz sampling rate without aliasing or smearing.
