import React from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { Track } from '../audio/library';
import { usePlayer } from '../store/player';
import { C } from '../theme';

export default function Library({ tracks }: { tracks: Track[] }) {
  const play = usePlayer(s => s.playQueue);
  return (
    <FlatList
      data={tracks}
      keyExtractor={t => t.id}
      ListHeaderComponent={<Text style={{ color: C.text, fontSize: 34, fontWeight: '700', padding: 20 }}>Songs</Text>}
      contentContainerStyle={{ paddingBottom: 120 }}
      renderItem={({ item, index }) => (
        <Pressable onPress={() => play(tracks, index)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 }}>
          {item.artwork
            ? <Image source={{ uri: item.artwork }} style={{ width: 48, height: 48, borderRadius: 6, marginRight: 14 }} />
            : <View style={{ width: 48, height: 48, borderRadius: 6, backgroundColor: '#2a2a2e', marginRight: 14 }} />}
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ color: C.text, fontSize: 16 }}>{item.title}</Text>
            <Text numberOfLines={1} style={{ color: C.sub, fontSize: 14 }}>{item.artist}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}
