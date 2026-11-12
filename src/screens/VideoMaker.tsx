import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Switch, Text, TextInput, View, PanResponder } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Font from 'expo-font';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { FFmpegKit, FFmpegKitConfig, FFprobeKit, ReturnCode } from '@nikhil-cephei/ffmpeg-kit-react-native';
import { usePlayer } from '../store/player';
import { C } from '../theme';

const PRESETS: [string, string][] = [['#B31F3C', '#1A0409'], ['#5B2A86', '#1B1033'], ['#0F7B8A', '#06212B'], ['#F2994A', '#4A1D0A'], ['#2D2D34', '#000000']];
const FONTS = [['System', undefined], ['Serif', 'serif'], ['Mono', 'monospace'], ['Light', 'sans-serif-light'], ['Condensed', 'sans-serif-condensed'], ['Cursive', 'cursive']] as const;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const strip = (u: string) => u.startsWith('file://') ? decodeURIComponent(u.slice(7)) : u;

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
  <Pressable accessibilityLabel={label} onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, marginRight: 8, backgroundColor: on ? C.accent : '#2c2c30' }}>
    <Text style={{ color: '#fff', fontSize: 13 }}>{label}</Text>
  </Pressable>
);

export default function VideoMaker() {
  const cur = usePlayer(p=>p.queue[p.index]);
  const canvas = useRef<View>(null);
  const [audio, setAudio] = useState<{ uri: string; name: string } | null>(null);
  const selectedAudio = audio ?? (cur ? { uri: cur.uri, name: cur.title } : null);
  const [image, setImage] = useState<string | null>(null);
  const [grad, setGrad] = useState<[string, string]>(PRESETS[0]);
  const [draftColors,setDraftColors] = useState<[string,string]>(PRESETS[0]);
  const [blur, setBlur] = useState(0.5);
  const [text, setText] = useState('');
  const [artist,setArtist]=useState('');
  const [deviceLabel,setDeviceLabel]=useState('iPhone');
  const [elapsedLabel,setElapsedLabel]=useState('0:00');
  const [remainingLabel,setRemainingLabel]=useState('');
  const [volume,setVolume]=useState(0.7);
  const [progress,setProgress]=useState(0.08);
  const [font, setFont] = useState<string | undefined>(undefined);
  const [size, setSize] = useState(0.4);
  const [statusBar, setStatusBar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [exported,setExported] = useState<string|null>(null);
  const [customFont,setCustomFont] = useState<string>();
  const ready=useRef(false);
  const pickFont=async()=>{
    try {
      const result=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true});
      if(result.canceled)return;
      const asset=result.assets[0];
      if(!/\.(otf|ttf)$/i.test(asset.name))throw Error('Choose a TTF or OTF font');
      const key='NawaFont'+Date.now();
      await Font.loadAsync({[key]:asset.uri});setFont(key);setCustomFont(key);
    }catch(e){Alert.alert('Font',String(e));}
  };

  const pickAudio = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!r.canceled) setAudio({ uri: r.assets[0].uri, name: r.assets[0].name });
  };
  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!r.canceled) setImage(r.assets[0].uri);
  };

  const exportVideo = async () => {
    if (!selectedAudio) return Alert.alert('Choose an audio file first');
    if(ready.current)return;
    ready.current=true;
    setBusy(true);
    setExported(null);
    let frame: string|undefined;
    try {
      frame=await captureRef(canvas,{format:'png',width:1080,height:1920,result:'tmpfile'});
      const input=selectedAudio.uri.startsWith('content://')?await FFmpegKitConfig.getSafParameterForRead(selectedAudio.uri):strip(selectedAudio.uri);
      const out=FileSystem.cacheDirectory+'nawa-'+Date.now()+'.mp4';
      const args=['-y','-loop','1','-framerate','12','-i',strip(frame),'-i',input,'-map','0:v:0','-map','1:a:0','-vf','scale=1080:1920,setsar=1','-c:v','libx264','-threads','2','-tune','stillimage','-preset','ultrafast','-crf','25','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',strip(out)];
      const session=await FFmpegKit.executeWithArguments(args);
      if(!ReturnCode.isSuccess(await session.getReturnCode())) {
        await FileSystem.deleteAsync(out,{idempotent:true});
        throw Error((await session.getOutput())?.trim().split('\n').slice(-4).join('\n') || 'Could not encode the selected media');
      }
      setExported(out);
    } catch(e){Alert.alert('Export failed',String(e));}
    finally { ready.current=false;setBusy(false);if(frame) await FileSystem.deleteAsync(frame.startsWith('/')?'file://'+frame:frame,{idempotent:true}).catch(()=>{}); }
  };

  const fs = 18 + size * 40;
  return (
    <ScrollView removeClippedSubviews={false} style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ paddingBottom: 140 }}>
      <Text style={{ color: C.text, fontSize: 34, fontWeight: '700', padding: 20 }}>Video Maker</Text>

      <View ref={canvas} collapsable={false} style={{alignSelf:'center',width:300,height:534,overflow:'hidden',backgroundColor:grad[1]}}>
        {image ? <Image source={{uri:image}} blurRadius={blur*35} resizeMode="cover" style={{position:'absolute',width:'100%',height:'100%',opacity:.85}}/> : <LinearGradient colors={grad} style={{position:'absolute',width:'100%',height:'100%'}}/>}
        {statusBar && <View style={{position:'absolute',top:9,left:18,right:18,flexDirection:'row',justifyContent:'space-between'}}>
          <Text style={{color:'white',fontFamily:font,fontSize:10}}>9:41</Text>
          <View style={{flexDirection:'row',gap:4}}><Ionicons name="cellular" size={11} color="white"/><Ionicons name="wifi" size={11} color="white"/><Ionicons name="battery-full" size={13} color="white"/></View>
        </View>}
        <View style={{position:'absolute',left:24,top:52,width:252,height:430,borderRadius:28,backgroundColor:'rgba(12,12,13,.94)',padding:14}}>
          <View style={{width:224,height:224,borderRadius:5,overflow:'hidden'}}>
            {image ? <Image source={{uri:image}} resizeMode="cover" style={{width:'100%',height:'100%'}}/> : <LinearGradient colors={grad} style={{flex:1,alignItems:'center',justifyContent:'center'}}><Ionicons name="musical-notes" size={76} color="rgba(255,255,255,.8)"/></LinearGradient>}
          </View>
          <Text numberOfLines={1} style={{color:'#929297',fontFamily:font,fontSize:9,marginTop:12}}>{deviceLabel}</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
            <Text numberOfLines={1} style={{flex:1,color:'white',fontFamily:font,fontSize:13+size*3,fontWeight:'600'}}>{text || selectedAudio?.name || 'Track title'}</Text>
            <Ionicons name="radio-outline" color="white" size={16}/>
          </View>
          <Text numberOfLines={1} style={{color:'#d6d6d8',fontFamily:font,fontSize:12,marginTop:2}}>{artist || cur?.artist || 'Artist'}</Text>
          <View style={{height:3,backgroundColor:'#555558',marginTop:17,borderRadius:2}}>
            <View style={{height:3,width:`${progress*100}%`,backgroundColor:'white',borderRadius:2}}/>
            <View style={{position:'absolute',left:`${progress*100}%`,top:-1,width:5,height:5,borderRadius:3,backgroundColor:'white'}}/>
          </View>
          <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:5}}><Text style={{color:'#a4a4a8',fontSize:9,fontFamily:font}}>{elapsedLabel}</Text><Text style={{color:'#a4a4a8',fontSize:9,fontFamily:font}}>{remainingLabel || (cur ? '-'+Math.floor(cur.duration/60)+':'+String(Math.floor(cur.duration%60)).padStart(2,'0') : '-0:00')}</Text></View>
          <View style={{flexDirection:'row',justifyContent:'space-evenly',alignItems:'center',marginTop:12}}><Ionicons name="play-back" size={27} color="white"/><Ionicons name="pause" size={34} color="white"/><Ionicons name="play-forward" size={27} color="white"/></View>
          <View style={{flexDirection:'row',alignItems:'center',gap:10,marginTop:15}}><Ionicons name="volume-low" color="#aaa" size={14}/><View style={{flex:1,height:3,backgroundColor:'#555558',borderRadius:2}}><View style={{width:`${volume*100}%`,height:3,backgroundColor:'white'}}/><View style={{position:'absolute',top:-4,left:`${volume*100}%`,width:11,height:11,borderRadius:6,backgroundColor:'white'}}/></View><Ionicons name="volume-high" size={14} color="#aaa"/></View>
        </View>
      </View>

      <Card title="Audio">
        <View style={{ flexDirection: 'row' }}>
          <Chip label="Pick file" on={false} onPress={pickAudio} />
          {cur && <Chip label="Current song" on={false} onPress={() => setAudio({ uri: cur.uri, name: cur.title })} />}
        </View>
        <Text style={{ color: C.sub, marginTop: 8 }} numberOfLines={1}>{selectedAudio?.name ?? 'No audio selected'}</Text>
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
                <Pressable key={i} onPress={() => {setGrad(p);setDraftColors(p);}} style={{ marginRight: 10 }}>
                  <LinearGradient colors={p} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: grad === p ? 2 : 0, borderColor: '#fff' }} />
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[0, 1].map(i => (
                <TextInput key={i} value={draftColors[i]} autoCapitalize="characters" maxLength={7}
                  onChangeText={v => {
                    const next:[string,string] = [...draftColors]; next[i] = v; setDraftColors(next);
                    if (/^#[0-9a-f]{6}$/i.test(v)) setGrad(g => i ? [g[0],v] : [v,g[1]]);
                  }}
                  style={{ flex: 1, color: '#fff', backgroundColor: '#2c2c30', borderRadius: 10, padding: 8 }} placeholder="#RRGGBB" placeholderTextColor="#777" />
              ))}
            </View>
          </>
        )}
      </Card>

      <Card title="Player details">
        {[['Device label',deviceLabel,setDeviceLabel],['Track title',text,setText],['Artist / subtitle',artist,setArtist],['Elapsed time',elapsedLabel,setElapsedLabel],['Remaining time',remainingLabel,setRemainingLabel]].map(([label,value,change])=><View key={label as string}><Text style={{color:C.sub,marginBottom:4}}>{label as string}</Text><TextInput value={value as string} onChangeText={change as (v:string)=>void} style={{color:'white',backgroundColor:'#2c2c30',borderRadius:10,padding:10,marginBottom:10}}/></View>)}
        <Text style={{color:C.sub}}>Timeline position</Text><Slider value={progress} onChange={setProgress}/>
        <Text style={{color:C.sub}}>Volume indicator</Text><Slider value={volume} onChange={setVolume}/>
      </Card>
      <Card title="Text">
        <TextInput value={text} onChangeText={setText} multiline style={{ color: '#fff', backgroundColor: '#2c2c30', borderRadius: 10, padding: 10, minHeight: 44 }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <Chip label="Import font" on={!!customFont && font===customFont} onPress={pickFont}/>
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
      {exported && <Card title="Video ready"><View style={{flexDirection:'row'}}>
        <Chip label="Save to gallery" on onPress={async()=>{try{await MediaLibrary.saveToLibraryAsync(exported);Alert.alert('Saved to gallery');}catch(e){Alert.alert('Save failed',String(e));}}}/>
        <Chip label="Share video" on onPress={()=>Sharing.shareAsync(exported,{mimeType:'video/mp4'}).catch(e=>Alert.alert('Share failed',String(e)))}/>
      </View></Card>}
    </ScrollView>
  );
}
