import * as MediaLibrary from 'expo-media-library';
import MusicMeta from '../../modules/music-meta';

export type Track = { id: string; uri: string; title: string; artist: string; album?: string; artwork?: string; duration: number };

export async function loadLibrary(): Promise<Track[]> {
  const perm = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
  if (!perm.granted) return [];
  const out: Track[] = [];
  let after: string | undefined;
  while (true) {
    const page = await MediaLibrary.getAssetsAsync({ mediaType: 'audio', first: 500, after });
    page.assets.forEach(a => out.push({
      id: a.id, uri: a.uri, title: a.filename.replace(/\.[^.]+$/, ''), artist: 'Unknown Artist', duration: a.duration,
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
  for (let i = 0; i < cur.length; i += 15) {
    const done = await Promise.all(cur.slice(i, i + 15).map(readOne));
    done.forEach((t, j) => (cur[i + j] = t));
    set([...cur]);
  }
}
