import { registerRootComponent } from 'expo';
import TrackPlayer, { Event } from 'react-native-track-player';
import App from './App';

TrackPlayer.registerPlaybackService(() => async () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext().catch(() => {}));
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious().catch(() => TrackPlayer.seekTo(0)));
  TrackPlayer.addEventListener(Event.RemoteSeek, e => TrackPlayer.seekTo(e.position));
});
registerRootComponent(App);
