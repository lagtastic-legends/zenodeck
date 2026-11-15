# ZenoDeck v1.0.28 Release Notes

**Release Tag:** `v1.0.28`  
**Platform Coverage:** Web (`omni-tool-two.vercel.app`) & Native Android APK (Universal, ARM64, ARMv7, x86_64)

---

## Highlights

### 1. In-Point & Out-Point Value Reset-to-Zero Resolution in Audio Editor
- **Continuous Global Timestamp Steppers with Automatic Unit Rollover:**
  - Resolved the critical bug where clicking `▲` on `SEC` at `59s` or `ArrowUp` wrapped the single segment back to `00` without incrementing minutes, collapsing the timestamp back to `00:00.00`.
  - Steppers and arrow keys now step the global timestamp directly (`HR: ±3600s`, `MIN: ±60s`, `SEC: ±1s`, `MS: ±0.05s`), allowing seamless rollover across minute and hour boundaries (e.g. `00:59.00` ➔ `01:00.00`).
- **Elastic Boundary Safety:**
  - Fixed boundary subtraction deadlock where pushing In-Point forward near track boundaries subtracted `selectionLength` (the full duration of the track, e.g. `180s - 180s = 0`), resetting the start point to zero.
  - Replaced with a safe constant 0.5s minimal gap guard (`Math.max(0, effectiveDuration - 0.5)`).
- **Direct Input Keystroke Preservation:**
  - Fixed `<input onChange>` slicing from `.slice(0, digits)` to `.slice(-digits)`, ensuring direct typing into digit boxes correctly appends digits rather than truncating them back to `"00"`.
- **Delayed Metadata Overwrite Guard:**
  - Prevented delayed `<audio onLoadedMetadata>` events from wiping out active user edits in `UnifiedAudioStudio.tsx`.

---

## Verification & Status

- **Automated Test Suites:** 39 test suites passed with 100% pass rate (including `scripts/test-audio-cutter-rollover.ts`).
- **TypeScript Typecheck:** Passed with 0 errors.
- **Production Build:** Successfully verified.
