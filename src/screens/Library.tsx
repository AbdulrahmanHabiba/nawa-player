import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FS from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Track } from '../audio/library';
import { usePlayer } from '../store/player';

const sections = ['Songs','Albums','Artists','Playlists'] as const;
type Section = typeof sections[number];
type List = {name:string; ids:string[]};
const file = FS.documentDirectory + 'nawa-playlists.json';
const accent = '#ff526d';
function Cover({track}:{track?:Track}) {
  return track?.artwork ? <Image source={{uri:track.artwork}} style={s.cover}/> :
    <LinearGradient colors={['#713f60','#251c32']} style={s.cover}><Ionicons name="musical-notes" color="#ffc8d1" size={22}/></LinearGradient>;
}
export default function Library({tracks}:{tracks:Track[]}) {
  const [section,setSection]=useState<Section>('Songs');
  const [group,setGroup]=useState<string|null>(null);
  const [query,search]=useState('');
  const [reverse,sort]=useState(false);
  const [lists,setLists]=useState<List[]>([]);
  const [name,setName]=useState('');
  const [edit,setEdit]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const writes=useRef(Promise.resolve());
  const play=usePlayer(p=>p.playQueue);
  useEffect(()=>{(async()=>{if((await FS.getInfoAsync(file)).exists) setLists(JSON.parse(await FS.readAsStringAsync(file)));})().catch(()=>Alert.alert('Could not read playlists')).finally(()=>setLoaded(true));},[]);
  function save(next:List[]) {
    setLists(next);
    writes.current=writes.current.then(()=>FS.writeAsStringAsync(file,JSON.stringify(next))).catch(()=>Alert.alert('Playlist could not be saved'));
  }
  function open(value:Section) {setSection(value);setGroup(null);setEdit(false);search('');}
  const groups=useMemo(()=>{
    const result=new Map<string,Track[]>();
    if(section==='Playlists'){
      const byId=new Map(tracks.map(t=>[t.id,t]));
      lists.forEach(l=>result.set(l.name,l.ids.map(id=>byId.get(id)).filter((t):t is Track=>!!t)));
    }else for(const t of tracks){
      const key=section==='Albums'?(t.album||'Unknown Album'):t.artist;
      const items=result.get(key);if(items) items.push(t);else result.set(key,[t]);
    }
    return result;
  },[tracks,section,lists]);
  const term=query.trim().toLocaleLowerCase();
  const showingGroups=section!=='Songs' && group===null;
  const order=(a:string,b:string)=>(reverse?-1:1)*a.localeCompare(b);
  const songs=(group!==null && !edit ? groups.get(group)||[] : tracks).filter(t=>[t.title,t.artist,t.album].some(v=>v?.toLocaleLowerCase().includes(term))).sort((a,b)=>order(a.title,b.title));
  const current=lists.find(l=>l.name===group);
  const labels=[...groups.keys()].filter(k=>k.toLocaleLowerCase().includes(term)).sort(order);
  function toggle(id:string){
    if(!current) return;
    save(lists.map(l=>l!==current?l:{...l,ids:l.ids.includes(id)?l.ids.filter(v=>v!==id):[...l.ids,id]}));
  }
  return <View style={s.root}>
    {group!==null && <Pressable onPress={()=>open(section)}><Text style={s.link}>‹ {section}</Text></Pressable>}
    <Text numberOfLines={1} style={s.title}>{group??'Library'}</Text>
    {group===null && <View style={{height:48}}><ScrollView horizontal showsHorizontalScrollIndicator={false}>{sections.map(v=><Pressable key={v} style={[s.pill,v===section&&s.selected]} onPress={()=>open(v)}><Text style={{color:v===section?'white':'#c6c0c6',fontWeight:'600'}}>{v}</Text></Pressable>)}</ScrollView></View>}
    <View style={s.search}><Ionicons name="search" color="#aaa" size={19}/><TextInput value={query} onChangeText={search} placeholder={'Search '+(group??section)} placeholderTextColor="#979098" style={s.input}/><Pressable onPress={()=>sort(!reverse)}><Text style={s.link}>{reverse?'Z–A':'A–Z'}</Text></Pressable></View>
    {section==='Playlists' && (group===null?<View style={s.search}><TextInput style={s.input} value={name} onChangeText={setName} placeholder="New playlist name" placeholderTextColor="#999"/><Pressable disabled={!loaded} onPress={()=>{const n=name.trim();if(!n)return;if(lists.some(l=>l.name===n))return Alert.alert('Playlist already exists');save([...lists,{name:n,ids:[]}]);setName('');setGroup(n);setEdit(true);}}><Text style={s.link}>Create</Text></Pressable></View>:<Pressable onPress={()=>setEdit(!edit)}><Text style={s.link}>{edit?'Done':'Edit songs'}</Text></Pressable>)}
    {showingGroups?<FlatList data={labels} keyExtractor={v=>v} ListEmptyComponent={<Text style={s.sub}>No {section.toLowerCase()} found</Text>} renderItem={({item})=><Pressable style={s.row} onPress={()=>{setGroup(item);search('');}}><Cover track={groups.get(item)?.[0]}/><View style={s.info}><Text style={s.label}>{item}</Text><Text style={s.sub}>{groups.get(item)?.length} tracks</Text></View><Ionicons name="chevron-forward" color="#938893" size={18}/></Pressable>}/>:
    <FlatList data={songs} keyExtractor={t=>t.id} contentContainerStyle={{paddingBottom:95}} ListEmptyComponent={<Text style={s.sub}>{section==='Songs'&&!tracks.length?'No local audio found. Check Music and audio access in Android settings.':'No matching tracks'}</Text>} renderItem={({item,index})=><Pressable accessibilityLabel={item.title} style={s.row} onPress={()=>edit?toggle(item.id):play(songs,index)}><Cover track={item}/><View style={s.info}><Text numberOfLines={1} style={s.label}>{item.title}</Text><Text numberOfLines={1} style={s.sub}>{item.artist}</Text></View>{edit && <Ionicons name={current?.ids.includes(item.id)?'checkmark-circle':'ellipse-outline'} color={accent} size={24}/>}</Pressable>}/>}
  </View>;
}
const s=StyleSheet.create({root:{flex:1,paddingHorizontal:20,backgroundColor:'#100e13'},title:{color:'white',fontSize:36,fontWeight:'800',marginVertical:12},pill:{paddingHorizontal:14,paddingVertical:8,borderRadius:20,backgroundColor:'#29232c',marginRight:7,alignSelf:'flex-start'},selected:{backgroundColor:'#a82c49'},search:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#252027',paddingHorizontal:12,borderRadius:12,marginBottom:10},input:{flex:1,color:'white',height:44},link:{color:accent,paddingVertical:8,fontWeight:'600'},row:{flexDirection:'row',alignItems:'center',paddingVertical:9,gap:12,borderBottomColor:'#322b34',borderBottomWidth:StyleSheet.hairlineWidth},cover:{width:50,height:50,borderRadius:9,alignItems:'center',justifyContent:'center'},info:{flex:1},label:{color:'white',fontSize:16,fontWeight:'600'},sub:{color:'#aba3af',fontSize:13,marginVertical:3}});
