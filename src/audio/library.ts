import * as MediaLibrary from 'expo-media-library';
import * as FS from 'expo-file-system';
import MusicMeta from '../../modules/music-meta';

export type Track = { id: string; uri: string; title: string; artist: string; album?: string; artwork?: string; duration: number; addedAt?: number };

export async function loadLibrary(): Promise<Track[]> {
  const perm = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
  if (!perm.granted) return [];
  const out: Track[] = [];
  let after: string | undefined;
  while (true) {
    const page = await MediaLibrary.getAssetsAsync({ mediaType: 'audio', first: 200, after, sortBy: [[MediaLibrary.SortBy.creationTime, false]] });
    page.assets.forEach(a => out.push({
      id: a.id, uri: a.uri, title: a.filename.replace(/\.[^.]+$/, ''), artist: 'Unknown Artist', duration: a.duration, addedAt: a.creationTime,
    }));
    if (!page.hasNextPage) break;
    after = page.endCursor;
  }
  return out;
}

export async function readOne(t: Track): Promise<Track> {
  try {
    const m = await MusicMeta.read(t.uri, t.id);
    if (!m) return t;
    return { ...t, title: m.title || t.title, artist: m.artist || t.artist, album: m.album ?? undefined, artwork: m.artwork ?? undefined };
  } catch { return t; }
}

/** Fills title/artist/album/artwork in batches so the list stays responsive. */
export async function enrich(list: Track[], set: (t: Track[]) => void) {
  const cur = [...list];
  const cachePath=FS.cacheDirectory+'nawa-metadata.json';
  let cache: Record<string,Track> = {};
  try { cache=JSON.parse(await FS.readAsStringAsync(cachePath)); } catch {}
  const key=(t:Track)=>t.uri+'|'+t.addedAt+'|'+t.duration;
  for (let i = 0; i < cur.length; i += 4) {
    const done = await Promise.all(cur.slice(i, i + 4).map(async track => cache[key(track)] || readOne(track)));
    done.forEach((t, j) => {cur[i+j]=t;});
    if (i % 24 === 0 || i + 4 >= cur.length) set([...cur]);
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  await FS.writeAsStringAsync(cachePath,JSON.stringify(Object.fromEntries(cur.map(t=>[key(t),t])))).catch(()=>{});
}
