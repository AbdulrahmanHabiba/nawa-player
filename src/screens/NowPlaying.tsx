import React from 'react';
import { Image, Pressable, Text, View, useWindowDimensions, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../store/player';
import { C } from '../theme';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Bar({ value, onChange, height = 6 }: { value: number; onChange: (v: number) => void; height?: number }) {
  const w = React.useRef(1);
  const pan = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => onChange(Math.min(1, Math.max(0, e.nativeEvent.locationX / w.current))),
    onPanResponderMove: e => onChange(Math.min(1, Math.max(0, e.nativeEvent.locationX / w.current))),
  }), [onChange]);
  return (
    <View {...pan.panHandlers} onLayout={e => (w.current = e.nativeEvent.layout.width)} style={{ height: 24, justifyContent: 'center' }}>
      <View style={{ height, borderRadius: height, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
        <View style={{ width: `${value * 100}%`, height: '100%', backgroundColor: 'rgba(255,255,255,0.85)' }} />
      </View>
    </View>
  );
}

export default function NowPlaying({ onClose }: { onClose: () => void }) {
  const { queue, index, playing, position, duration, volume, toggle, next, prev, seek, setVolume } = usePlayer();
  const { width, height } = useWindowDimensions();
  const t = queue[index];
  if (!t) return null;
  const land = width > height;
  if (land) {
    const d = Math.min(height - 70, width * 0.38);
    return (
      <LinearGradient colors={[C.gradTop, C.gradBottom]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 36 }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 12, left: 16, width: 34, height: 34, borderRadius: 17, backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-down" size={20} color="#fff" />
        </Pressable>
        <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
          {t.artwork ? <Image source={{ uri: t.artwork }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="musical-notes" size={d * 0.4} color="#fff" />}
        </View>
        <View style={{ flex: 1, marginLeft: 36 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="volume-low" size={14} color={C.sub} />
            <View style={{ flex: 1, marginHorizontal: 8 }}><Bar value={volume} onChange={setVolume} height={4} /></View>
            <Ionicons name="volume-high" size={14} color={C.sub} />
          </View>
          <Text style={{ color: C.sub, fontSize: 11, letterSpacing: 1, marginTop: 10 }}>NOW PLAYING</Text>
          <Text numberOfLines={1} style={{ color: '#fff', fontSize: 22, fontWeight: '600' }}>{t.title}</Text>
          <Text numberOfLines={1} style={{ color: C.sub, fontSize: 15 }}>{t.artist}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 36, marginVertical: 14 }}>
            <Pressable onPress={prev}><Ionicons name="play-back" size={36} color="#fff" /></Pressable>
            <Pressable onPress={toggle}><Ionicons name={playing ? 'pause' : 'play'} size={52} color="#fff" /></Pressable>
            <Pressable onPress={next}><Ionicons name="play-forward" size={36} color="#fff" /></Pressable>
          </View>
          <Bar value={duration ? position / duration : 0} onChange={v => seek(v * duration)} height={4} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: C.sub, fontSize: 11 }}>{fmt(position)}</Text>
            <Text style={{ color: C.sub, fontSize: 11 }}>-{fmt(Math.max(0, duration - position))}</Text>
          </View>
        </View>
      </LinearGradient>
    );
  }
  const art = Math.min(width - 56, height * 0.42);
  return (
    <LinearGradient colors={[C.gradTop, C.gradBottom]} style={{ flex: 1, paddingHorizontal: 28, paddingTop: 48 }}>
      <Pressable onPress={onClose} style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' }} />
      <View style={{ alignItems: 'center', marginTop: 28 }}>
        <View style={{ width: art, height: art, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', elevation: 20 }}>
          {t.artwork ? <Image source={{ uri: t.artwork }} style={{ width: '100%', height: '100%', borderRadius: 14 }} /> : <Ionicons name="musical-note" size={art * 0.35} color="rgba(255,255,255,0.5)" />}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 28 }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: C.text, fontSize: 22, fontWeight: '700' }}>{t.title}</Text>
          <Text numberOfLines={1} style={{ color: C.sub, fontSize: 20 }}>{t.artist}</Text>
        </View>
        {['star', 'ellipsis-horizontal'].map(n => (
          <View key={n} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center', marginLeft: 12 }}>
            <Ionicons name={n as any} size={16} color="#fff" />
          </View>
        ))}
      </View>
      <View style={{ marginTop: 16 }}>
        <Bar value={duration ? position / duration : 0} onChange={v => seek(v * duration)} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: C.sub, fontSize: 12 }}>{fmt(position)}</Text>
          <Text style={{ color: C.sub, fontSize: 12 }}>-{fmt(Math.max(0, duration - position))}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginTop: 20 }}>
        <Pressable onPress={prev}><Ionicons name="play-back" size={44} color="#fff" /></Pressable>
        <Pressable onPress={toggle}><Ionicons name={playing ? 'pause' : 'play'} size={64} color="#fff" /></Pressable>
        <Pressable onPress={next}><Ionicons name="play-forward" size={44} color="#fff" /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 28 }}>
        <Ionicons name="volume-low" size={16} color={C.sub} />
        <View style={{ flex: 1, marginHorizontal: 10 }}><Bar value={volume} onChange={setVolume} /></View>
        <Ionicons name="volume-high" size={16} color={C.sub} />
      </View>
    </LinearGradient>
  );
}
