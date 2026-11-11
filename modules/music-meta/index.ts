import { requireNativeModule } from 'expo-modules-core';

const M: any = requireNativeModule('MusicMeta');
export type Meta = { title?: string | null; artist?: string | null; album?: string | null; artwork?: string | null };

export default {
  read: (uri: string, key: string): Promise<Meta | null> => M.read(uri, key),
  startRecording: (path: string, isolation: boolean, sens: number): Promise<boolean> => M.startRecording(path, isolation, sens),
  stopRecording: (): Promise<{ path: string; seconds: number }> => M.stopRecording(),
  setIsolation: (on: boolean) => M.setIsolation(on),
  setSensitivity: (v: number) => M.setSensitivity(v),
  addListener: (name: 'onMeter', cb: (e: { level: number }) => void) => M.addListener(name, cb),
};
