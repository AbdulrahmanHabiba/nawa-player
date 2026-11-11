import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { requestRecordingPermissionsAsync, createAudioPlayer } from 'expo-audio';
import MusicMeta from '../../modules/music-meta';
import { C } from '../theme';

type Rec = { uri: string; name: string; seconds: number };
const BARS = 48;
const DIR = FileSystem.documentDirectory + 'recordings/';
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function Recorder() {
  const [isRec, setIsRec] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isolation, setIsolation] = useState(true);
  const [sens, setSens] = useState(0.5);
  const [levels, setLevels] = useState<number[]>(Array(BARS).fill(0));
  const [recs, setRecs] = useState<Rec[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const player = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const t0 = useRef(0);

  // live meter from the native recorder (already noise-suppressed / gained)
  useEffect(() => {
    const sub = MusicMeta.addListener('onMeter', e => setLevels(l => [...l.slice(1), Math.min(1, e.level)]));
    return () => sub.remove();
  }, []);
  useEffect(() => { if (!isRec) return; const id = setInterval(() => setElapsed((Date.now() - t0.current) / 1000), 100); return () => clearInterval(id); }, [isRec]);
  // changes apply live, even while recording
  useEffect(() => { MusicMeta.setIsolation(isolation); }, [isolation]);
  useEffect(() => { MusicMeta.setSensitivity(sens); }, [sens]);

  useEffect(() => {
    (async () => {
      const info = await FileSystem.getInfoAsync(DIR);
      if (!info.exists) return;
      const names = (await FileSystem.readDirectoryAsync(DIR)).filter(n => n.endsWith('.wav')).sort().reverse();
      setRecs(names.map(n => ({ uri: DIR + n, name: n.replace(/\.wav$/, ''), seconds: 0 })));
    })();
  }, []);

  const start = async () => {
    const p = await requestRecordingPermissionsAsync();
    if (!p.granted) return Alert.alert('Microphone permission is required');
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
    const name = `New Recording ${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`;
    const ok = await MusicMeta.startRecording((DIR + name + '.wav').replace('file://', ''), isolation, sens);
    if (!ok) return Alert.alert('Could not start recording');
    setLevels(Array(BARS).fill(0)); t0.current = Date.now(); setElapsed(0); setIsRec(true);
  };
  const stop = async () => {
    const r = await MusicMeta.stopRecording();
    setIsRec(false);
    const uri = 'file://' + r.path;
    setRecs(x => [{ uri, name: r.path.split('/').pop()!.replace(/\.wav$/, ''), seconds: r.seconds }, ...x]);
  };
  const playRec = (r: Rec) => {
    player.current?.remove();
    if (playing === r.uri) return setPlaying(null);
    player.current = createAudioPlayer({ uri: r.uri });
    player.current.play(); setPlaying(r.uri);
  };

  const w = useRef(1);
  const pan = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => setSens(Math.min(1, Math.max(0, e.nativeEvent.locationX / w.current))),
    onPanResponderMove: e => setSens(Math.min(1, Math.max(0, e.nativeEvent.locationX / w.current))),
  }), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Text style={{ color: C.text, fontSize: 34, fontWeight: '700', padding: 20 }}>Voice Memos</Text>
      <View style={{ marginHorizontal: 16, padding: 16, borderRadius: 20, backgroundColor: '#1c1c1e' }}>
        <Pressable onPress={() => setIsolation(v => !v)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Noise Isolation</Text>
            <Text style={{ color: C.sub, fontSize: 12 }}>{isolation ? 'On — background noise reduced' : 'Off — raw sound'}</Text>
          </View>
          <View style={{ width: 51, height: 31, borderRadius: 16, padding: 2, backgroundColor: isolation ? '#34C759' : '#39393d', alignItems: isolation ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: '#fff' }} />
          </View>
        </Pressable>
        <Text style={{ color: '#fff', fontSize: 14, marginTop: 14 }}>Sensitivity</Text>
        <View {...pan.panHandlers} onLayout={e => (w.current = e.nativeEvent.layout.width)} style={{ height: 28, justifyContent: 'center' }}>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: '#39393d', overflow: 'hidden' }}>
            <View style={{ width: `${sens * 100}%`, height: '100%', backgroundColor: C.accent }} />
          </View>
        </View>
      </View>

      <View style={{ height: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginTop: 16 }}>
        {levels.map((v, i) => <View key={i} style={{ width: 3, height: 4 + v * 90, borderRadius: 2, backgroundColor: C.accent, opacity: 0.4 + v * 0.6 }} />)}
      </View>
      <Text style={{ color: '#fff', fontSize: 40, textAlign: 'center', fontVariant: ['tabular-nums'] }}>{fmt(elapsed)}</Text>
      <Pressable onPress={isRec ? stop : start} style={{ alignSelf: 'center', marginVertical: 18, width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: isRec ? 28 : 62, height: isRec ? 28 : 62, borderRadius: isRec ? 7 : 31, backgroundColor: '#FF3B30' }} />
      </Pressable>

      <FlatList data={recs} keyExtractor={r => r.uri} contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => playRec(item)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5, borderColor: '#2a2a2e' }}>
            <Ionicons name={playing === item.uri ? 'pause-circle' : 'play-circle'} size={32} color={C.accent} />
            <Text numberOfLines={1} style={{ flex: 1, color: '#fff', marginLeft: 12 }}>{item.name}</Text>
            {item.seconds > 0 && <Text style={{ color: C.sub }}>{fmt(item.seconds)}</Text>}
          </Pressable>
        )} />
    </View>
  );
}
