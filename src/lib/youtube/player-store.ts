"use client";

/**
 * ZenoDeck Mini Player Playback Store (src/lib/youtube/player-store.ts)
 * ====================================================================
 * Global state management for background audio auditioning and in-app
 * playback deck.
 */

import { create } from "zustand";

export interface ActiveTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  thumbnailUrl: string;
  duration?: number;
}

interface PlayerStore {
  activeTrack: ActiveTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isMinimized: boolean;

  playTrack: (track: ActiveTrack) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackRate: (rate: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleMinimized: () => void;
  closePlayer: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  activeTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1.0,
  volume: 1.0,
  isMuted: false,
  isMinimized: false,

  playTrack: (track) =>
    set({
      activeTrack: track,
      isPlaying: true,
      currentTime: 0,
      duration: track.duration || 0,
      isMinimized: false,
    }),

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  seek: (time) => set({ currentTime: time }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setVolume: (vol) => set({ volume: vol, isMuted: vol === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleMinimized: () => set((state) => ({ isMinimized: !state.isMinimized })),
  closePlayer: () =>
    set({
      activeTrack: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    }),
}));
