import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Switch, Text, TextInput, View, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { FFmpegKit, ReturnCode } from '@nikhil-cephei/ffmpeg-kit-react-native';
import { usePlayer } from '../store/player';
import { C } from '../theme';

const PRESETS: [string, string][] = [['#B31F3C', '#1A0409'], ['#5B2A86', '#1B1033'], ['#0F7B8A', '#06212B'], ['#F2994A', '#4A1D0A'], ['#2D2D34', '#000000']];
const FONTS = [['System', undefined], ['Serif', 'serif'], ['Mono', 'monospace'], ['Light', 'sans-serif-light'], ['Condensed', 'sans-serif-condensed'], ['Cursive', 'cursive']] as const;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const strip = (u: string) => u.replace('file://', '');

function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const w = useRef(1);
  const pan = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => onChange(clamp(e.nativeEvent.locationX / w.current)),
    onPanResponderMove: e => onChange(clamp(e.nativeEvent.locationX / w.current)),
  }), []);
  return (
    <View {...pan.panHandlers} onLayout={e => (w.current = e.nativeEvent.layout.width)} style={{ height: 28, justifyContent: 'center' }}>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: '#39393d', overflow: 'hidden' }}>
        <View style={{ width: `${value * 100}%`, height: '100%', backgroundColor: C.accent }} />
      </View>
    </View>
  );
}

const Card = ({ title, children }: any) => (
  <View style={{ marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 18, backgroundColor: '#1c1c1e' }}>
    <Text style={{ color: '#fff', fontWeight: '600', marginBottom: 8 }}>{title}</Text>{children}
  </View>
);
const Chip = ({ label, on, onPress }: any) => (
  <Pressable onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 8, backgroundColor: on ? C.accent : '#2c2c30' }}>
    <Text style={{ color: '#fff', fontSize: 13 }}>{label}</Text>
  </Pressable>
);

export default function VideoMaker() {
  const { queue, index } = usePlayer();
  const cur = queue[index];
  const canvas = useRef<View>(null);
  const [audio, setAudio] = useState<{ uri: string; name: string } | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [grad, setGrad] = useState<[string, string]>(PRESETS[0]);
  const [blur, setBlur] = useState(0.5);
  const [text, setText] = useState('Your text here');
  const [font, setFont] = useState<string | undefined>(undefined);
  const [size, setSize] = useState(0.4);
  const [statusBar, setStatusBar] = useState(true);
  const [busy, setBusy] = useState(false);

  const pickAudio = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!r.canceled) setAudio({ uri: r.assets[0].uri, name: r.assets[0].name });
  };
  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!r.canceled) setImage(r.assets[0].uri);
  };

  const exportVideo = async () => {
    if (!audio) return Alert.alert('Choose an audio file first');
    setBusy(true);
    try {
      // 1) render the preview view to a 1080x1920 PNG
      const png = await captureRef(canvas, { format: 'png', width: 1080, height: 1920, result: 'tmpfile' });
      // 2) mux still image + audio -> mp4
      const out = FileSystem.cacheDirectory + `video-${Date.now()}.mp4`;
      const cmd = `-y -loop 1 -framerate 30 -i "${strip(png)}" -i "${strip(audio.uri)}" -c:v libx264 -tune stillimage -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "${strip(out)}"`;
      const session = await FFmpegKit.execute(cmd);
      if (!ReturnCode.isSuccess(await session.getReturnCode())) throw new Error(await session.getFailStackTrace() ?? 'ffmpeg failed');
      await Sharing.shareAsync(out, { mimeType: 'video/mp4' }); // user can save to gallery / share
    } catch (e: any) { Alert.alert('Export failed', String(e?.message ?? e)); }
    setBusy(false);
  };

  const fs = 18 + size * 40;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 140 }}>
      <Text style={{ color: C.text, fontSize: 34, fontWeight: '700', padding: 20 }}>Video Maker</Text>

      {/* PREVIEW (this exact view is captured) */}
      <View ref={canvas} collapsable={false} style={{ alignSelf: 'center', width: 240, height: 426, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' }}>
        {image
          ? <Image source={{ uri: image }} blurRadius={blur * 25} resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%' }} />
          : <LinearGradient colors={grad} style={{ position: 'absolute', width: '100%', height: '100%' }} />}
        {statusBar && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingTop: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>9:41</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <Ionicons name="cellular" size={12} color="#fff" /><Ionicons name="wifi" size={12} color="#fff" /><Ionicons name="battery-full" size={14} color="#fff" />
            </View>
          </View>
        )}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: '#fff', fontSize: fs * 0.6, fontFamily: font, textAlign: 'center', fontWeight: '700' }}>{text}</Text>
        </View>
      </View>

      <Card title="Audio">
        <View style={{ flexDirection: 'row' }}>
          <Chip label="Pick file" on={false} onPress={pickAudio} />
          {cur && <Chip label="Current song" on={false} onPress={() => setAudio({ uri: cur.uri, name: cur.title })} />}
        </View>
        <Text style={{ color: C.sub, marginTop: 8 }} numberOfLines={1}>{audio ? audio.name : 'No audio selected'}</Text>
      </Card>

      <Card title="Background">
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <Chip label="Image" on={false} onPress={pickImage} />
          {image && <Chip label="Remove image" on={false} onPress={() => setImage(null)} />}
        </View>
        {image ? (<><Text style={{ color: C.sub }}>Blur {Math.round(blur * 100)}%</Text><Slider value={blur} onChange={setBlur} /></>) : (
          <>
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              {PRESETS.map((p, i) => (
                <Pressable key={i} onPress={() => setGrad(p)} style={{ marginRight: 10 }}>
                  <LinearGradient colors={p} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: grad === p ? 2 : 0, borderColor: '#fff' }} />
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[0, 1].map(i => (
                <TextInput key={i} value={grad[i]} autoCapitalize="characters" maxLength={7}
                  onChangeText={v => setGrad(g => (i ? [g[0], v] : [v, g[1]]) as [string, string])}
                  style={{ flex: 1, color: '#fff', backgroundColor: '#2c2c30', borderRadius: 10, padding: 8 }} placeholder="#RRGGBB" placeholderTextColor="#777" />
              ))}
            </View>
          </>
        )}
      </Card>

      <Card title="Text">
        <TextInput value={text} onChangeText={setText} multiline style={{ color: '#fff', backgroundColor: '#2c2c30', borderRadius: 10, padding: 10, minHeight: 44 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {FONTS.map(([l, f]) => <Chip key={l} label={l} on={font === f} onPress={() => setFont(f)} />)}
        </ScrollView>
        <Text style={{ color: C.sub, marginTop: 8 }}>Size</Text>
        <Slider value={size} onChange={setSize} />
      </Card>

      <Card title="iPhone status bar">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: C.sub }}>Show wifi / battery / time</Text>
          <Switch value={statusBar} onValueChange={setStatusBar} trackColor={{ true: '#34C759' }} />
        </View>
      </Card>

      <Pressable onPress={exportVideo} disabled={busy} style={{ margin: 16, height: 52, borderRadius: 26, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Export MP4</Text>}
      </Pressable>
    </ScrollView>
  );
}
