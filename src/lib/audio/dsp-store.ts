"use client";

/**
 * ZenoDeck Audio DSP Studio - Persistent State Store
 * ===================================================
 * Zustand store with localStorage persistence managing:
 * - 10-band graphic equalizer gains
 * - Dynamic Bass Boost configuration
 * - Real-Time 8D Spatial Audio parameters
 * - Center vocal processing mode
 * - A/B Bypass toggle
 * - Curated preset application
 *
 * Automatically synchronizes changes with the live AudioDspEngine graph.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  BassBoostConfig,
  Spatial8DConfig,
  VocalMode,
  EqGainsArray,
  DSPState,
  DEFAULT_DSP_STATE,
  DEFAULT_EQ_GAINS,
  DEFAULT_BASS_BOOST,
  DEFAULT_SPATIAL_8D,
  DSP_PRESET_MAP,
  clampGain,
} from "./dsp-types";
import { AudioDspEngine } from "./dsp-engine";

export interface AudioDspActions {
  setBandGain: (index: number, gainDb: number) => void;
  setAllGains: (gains: number[]) => void;
  setBassBoost: (config: Partial<BassBoostConfig>) => void;
  setSpatial8D: (config: Partial<Spatial8DConfig>) => void;
  setVocalMode: (mode: VocalMode) => void;
  setBypass: (isBypassed: boolean) => void;
  toggleBypass: () => void;
  applyPreset: (presetId: string) => void;
  resetEq: () => void;
  resetAll: () => void;
  syncWithEngine: () => void;
}

export type AudioDspStore = DSPState & AudioDspActions;

// Memory storage fallback for SSR and testing environments
const memoryStorage = (() => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
})();

/**
 * Safely invokes an operation on the AudioDspEngine singleton.
 */
function withEngine(fn: (engine: AudioDspEngine) => void): void {
  try {
    const engine = AudioDspEngine.getInstance();
    fn(engine);
  } catch (err) {
    // Engine may not be initialized in non-browser environment
    console.debug("[AudioDspStore] Engine call deferred:", err);
  }
}

export const useAudioDspStore = create<AudioDspStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_DSP_STATE,

      setBandGain: (index: number, gainDb: number) => {
        if (index < 0 || index >= 10) return;
        const clamped = clampGain(gainDb);

        set((state) => {
          const newGains = [...state.eqGains] as EqGainsArray;
          newGains[index] = clamped;
          return {
            eqGains: newGains,
            activePresetId: null, // Clear preset since user customized EQ
          };
        });

        withEngine((engine) => engine.setBandGain(index, clamped));
      },

      setAllGains: (gains: number[]) => {
        const clampedGains = gains.slice(0, 10).map(clampGain);
        while (clampedGains.length < 10) clampedGains.push(0);
        const finalGains = clampedGains as EqGainsArray;

        set({
          eqGains: finalGains,
          activePresetId: null,
        });

        withEngine((engine) => engine.setAllGains(finalGains));
      },

      setBassBoost: (config: Partial<BassBoostConfig>) => {
        set((state) => {
          const updated: BassBoostConfig = {
            ...state.bassBoost,
            ...config,
          };
          withEngine((engine) => engine.setBassBoost(updated));
          return {
            bassBoost: updated,
            activePresetId: null,
          };
        });
      },

      setSpatial8D: (config: Partial<Spatial8DConfig>) => {
        set((state) => {
          const updated: Spatial8DConfig = {
            ...state.spatial8D,
            ...config,
          };
          withEngine((engine) => engine.setSpatial8D(updated));
          return {
            spatial8D: updated,
            activePresetId: null,
          };
        });
      },

      setVocalMode: (mode: VocalMode) => {
        set(() => {
          withEngine((engine) => engine.setVocalMode(mode));
          return {
            vocalMode: mode,
            activePresetId: null,
          };
        });
      },

      setBypass: (isBypassed: boolean) => {
        set(() => {
          withEngine((engine) => engine.setBypass(isBypassed));
          return { isBypassed };
        });
      },

      toggleBypass: () => {
        const nextBypass = !get().isBypassed;
        get().setBypass(nextBypass);
      },

      applyPreset: (presetId: string) => {
        const preset = DSP_PRESET_MAP[presetId];
        if (!preset) return;

        const nextGains = [...preset.eqGains] as EqGainsArray;
        const nextBass = { ...preset.bassBoost };
        const nextSpatial = { ...preset.spatial8D };
        const nextVocal = preset.vocalMode;

        set({
          eqGains: nextGains,
          bassBoost: nextBass,
          spatial8D: nextSpatial,
          vocalMode: nextVocal,
          activePresetId: preset.id,
        });

        withEngine((engine) => {
          engine.setAllGains(nextGains);
          engine.setBassBoost(nextBass);
          engine.setSpatial8D(nextSpatial);
          engine.setVocalMode(nextVocal);
        });
      },

      resetEq: () => {
        const zeroGains = [...DEFAULT_EQ_GAINS] as EqGainsArray;
        set({
          eqGains: zeroGains,
          activePresetId: null,
        });
        withEngine((engine) => engine.setAllGains(zeroGains));
      },

      resetAll: () => {
        set({
          ...DEFAULT_DSP_STATE,
          eqGains: [...DEFAULT_EQ_GAINS],
          bassBoost: { ...DEFAULT_BASS_BOOST },
          spatial8D: { ...DEFAULT_SPATIAL_8D },
        });

        withEngine((engine) => {
          engine.setBypass(false);
          engine.setAllGains(DEFAULT_EQ_GAINS);
          engine.setBassBoost(DEFAULT_BASS_BOOST);
          engine.setSpatial8D(DEFAULT_SPATIAL_8D);
          engine.setVocalMode("off");
        });
      },

      syncWithEngine: () => {
        const state = get();
        withEngine((engine) => {
          engine.setBypass(state.isBypassed);
          engine.setAllGains(state.eqGains);
          engine.setBassBoost(state.bassBoost);
          engine.setSpatial8D(state.spatial8D);
          engine.setVocalMode(state.vocalMode);
        });
      },
    }),
    {
      name: "zenodeck-audio-dsp-state",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && window.localStorage ? window.localStorage : memoryStorage
      ),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.syncWithEngine();
        }
      },
    }
  )
);
