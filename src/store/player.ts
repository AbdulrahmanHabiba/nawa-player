import { create } from 'zustand';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Track, readOne } from '../audio/library';

type S = {
  queue: Track[]; index: number; playing: boolean; position: number; duration: number; volume: number;
  playQueue: (q: Track[], i: number) => void;
  toggle: () => void; next: () => void; prev: () => void; seek: (s: number) => void; setVolume: (v: number) => void;
};

let player: AudioPlayer | null = null;
let modeSet = false;

export const usePlayer = create<S>((set, get) => {
  const load = async (t0: Track) => {
    if (!modeSet) { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }); modeSet = true; }
    let t = t0;
    if (!t.artwork) { // make sure art exists even if the list was not enriched yet
      t = await readOne(t0);
      const q = [...get().queue]; const i = q.findIndex(x => x.id === t.id);
      if (i >= 0) { q[i] = t; set({ queue: q }); }
    }
    player?.remove();
    player = createAudioPlayer({ uri: t.uri });
    player.volume = get().volume;
    player.addListener('playbackStatusUpdate', s => {
      set({ position: s.currentTime, duration: s.duration || t.duration, playing: s.playing });
      if (s.didJustFinish) get().next();
    });
    // Expo SDK 53's audio player has no lock-screen activation API.
    // Add media-session controls when upgrading the audio implementation.
    player.play();
  };
  return {
    queue: [], index: 0, playing: false, position: 0, duration: 0, volume: 0.8,
    playQueue: (q, i) => { set({ queue: q, index: i }); load(q[i]); },
    toggle: () => { if (!player) return; player.playing ? player.pause() : player.play(); },
    next: () => { const { queue, index } = get(); if (index + 1 < queue.length) { set({ index: index + 1 }); load(queue[index + 1]); } },
    prev: () => {
      const { queue, index, position } = get();
      if (position > 3 || index === 0) return player?.seekTo(0);
      set({ index: index - 1 }); load(queue[index - 1]);
    },
    seek: s => player?.seekTo(s),
    setVolume: v => { set({ volume: v }); if (player) player.volume = v; },
  };
});
