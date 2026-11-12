import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, Text, View, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadLibrary, enrich, Track } from './src/audio/library';
import { usePlayer } from './src/store/player';
import Library from './src/screens/Library';
import NowPlaying from './src/screens/NowPlaying';
import Recorder from './src/screens/Recorder';
import VideoMaker from './src/screens/VideoMaker';
import { C } from './src/theme';

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'songs' | 'rec' | 'video'>('songs');
  const { queue, index, playing, toggle } = usePlayer();
  useEffect(() => { loadLibrary().then(async l => { setTracks(l); await enrich(l, setTracks); }).catch(e=>Alert.alert('Music library',String(e))); }, []);
  const cur = queue[index];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 40 }}>
      <StatusBar barStyle="light-content" />
      {tab === 'songs' ? <Library tracks={tracks} /> : tab === 'rec' ? <Recorder /> : <VideoMaker />}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20 }} />
      {cur && tab === 'songs' && (
        <Pressable accessibilityLabel="Open Now Playing" onPress={() => setOpen(true)} style={{ position: 'absolute', left: 12, right: 12, bottom: 76, height: 60, borderRadius: 30, backgroundColor: '#362b38', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
          {cur.artwork && <Image source={{uri:cur.artwork}} style={{width:40,height:40,borderRadius:8,marginRight:10}}/>}
          <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: 15 }}>{cur.title}</Text>
          <Pressable onPress={toggle} hitSlop={12}><Ionicons name={playing ? 'pause' : 'play'} size={26} color="#fff" /></Pressable>
        </Pressable>
      )}
      <View style={{ flexDirection: 'row', backgroundColor: '#111', paddingBottom: 12, paddingTop: 8 }}>
        {([['songs', 'musical-notes', 'Library'], ['rec', 'mic', 'Record'], ['video', 'videocam', 'Video']] as const).map(([k, ic, label]) => (
          <Pressable accessibilityLabel={label+" tab"} key={k} onPress={() => setTab(k)} style={{ flex: 1, alignItems: 'center' }}>
            <Ionicons name={ic} size={24} color={tab === k ? C.accent : C.sub} />
            <Text style={{ color: tab === k ? C.accent : C.sub, fontSize: 11 }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} supportedOrientations={['portrait', 'landscape']}>
        <NowPlaying onClose={() => setOpen(false)} />
      </Modal>
    </View>
  );
}
