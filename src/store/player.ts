import { create } from 'zustand';
import { Alert } from 'react-native';
import Player, { Capability, Event, State, RepeatMode } from 'react-native-track-player';
import { Track } from '../audio/library';

let startup: Promise<void> | undefined;
async function initialize() {
  try { await Player.setupPlayer(); }
  catch (error: any) { if (error.code !== 'player_already_initialized') throw error; }
  await Player.updateOptions({
    capabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo],
    progressUpdateEventInterval: 0.5,
  });
}
let pending = Promise.resolve();
function command(action: () => Promise<void>) {
  pending = pending.then(async () => {
    startup ??= initialize().catch(error => { startup = undefined; throw error; });
    await startup;
    await action();
  }).catch(error => Alert.alert('Playback', String(error.message ?? error)));
}

export const usePlayer = create<{
  queue: Track[]; index: number; playing: boolean; position: number; duration: number; volume: number;
  playQueue(q: Track[], i: number): void; toggle(): void; next(): void; prev(): void;
  shuffleNext():void; repeat:RepeatMode; cycleRepeat():void;
  seek(seconds: number): void; setVolume(v: number): void; move(from: number, to: number): void;
} >((set,get) => ({
  queue: [], index: 0, playing: false, position: 0, duration: 0, volume: 0.8,
  repeat: RepeatMode.Off,
  cycleRepeat: () => command(async () => {
    const mode = get().repeat;
    const next = mode===RepeatMode.Off ? RepeatMode.Queue : mode===RepeatMode.Queue ? RepeatMode.Track : RepeatMode.Off;
    await Player.setRepeatMode(next); set({repeat:next});
  }),
  shuffleNext: () => command(async () => {
    const q=[...get().queue]; const start=get().index+1;
    for(let end=q.length-1;end>start;end--){
      const from=start+Math.floor(Math.random()*(end-start+1));
      if(from!==end){await Player.move(from,end);q.splice(end,0,q.splice(from,1)[0]);set({queue:[...q]});}
    }
  }),
  playQueue: (q,i) => command(async () => {
    if (!q[i]) return;
    await Player.setQueue(q.map(t => ({...t,url:t.uri})));
    await Player.skip(i);
    set({queue:q,index:i,position:0,duration:q[i].duration});
    await Player.setVolume(get().volume);
    await Player.play();
  }),
  toggle: () => command(async () => { if(await Player.getPlayWhenReady()) await Player.pause(); else await Player.play(); }),
  next: () => command(async () => {if(get().index+1<get().queue.length) await Player.skipToNext();}),
  prev: () => command(async () => {if(get().position>3 || get().index===0) await Player.seekTo(0); else await Player.skipToPrevious();}),
  seek: s => command(() => Player.seekTo(s)),
  setVolume: v => {set({volume:v});command(()=>Player.setVolume(v));},
  move: (from,to) => command(async () => {
    const q=[...get().queue]; if(!q[from] || !q[to]) return;
    await Player.move(from,to); q.splice(to,0,q.splice(from,1)[0]);
    set({queue:q,index:await Player.getActiveTrackIndex() ?? 0});
  }),
}));
Player.addEventListener(Event.PlaybackProgressUpdated, e => usePlayer.setState({position:e.position,duration:e.duration,index:e.track}));
Player.addEventListener(Event.PlaybackActiveTrackChanged, e => usePlayer.setState({index:e.index ?? 0,position:0,duration:e.track?.duration ?? 0}));
Player.addEventListener(Event.PlaybackState, e => usePlayer.setState({playing:e.state===State.Playing}));
Player.addEventListener(Event.PlaybackError, e => Alert.alert('Unable to play this file',e.message));
