// Photos and voice notes live as files in the app's private "media" folder.
// Backups carry them inside the backup JSON (base64) so a restore brings them back.
import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { SaveFormat, manipulateAsync } from 'expo-image-manipulator';
import { uid } from './dates';
import type { AppData } from './types';

const dir = () => {
  const d = new Directory(Paths.document, 'media');
  if (!d.exists) d.create();
  return d;
};

export const mediaUri = (name: string) => new File(dir(), name).uri;

export function deleteMedia(names: string[]) {
  if (Platform.OS === 'web') return;
  for (const n of names) {
    const f = new File(dir(), n);
    if (f.exists) f.delete();
  }
}

/** Pick (or take) a photo, shrink it to ~1280px JPEG, store it; returns the file name. */
export async function addPhoto(source: 'camera' | 'library'): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Camera permission is needed to take a photo.' : 'Photo access is needed to add a picture.');
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets?.[0]) return null;
  const a = res.assets[0];
  const resize = (a.width ?? 0) >= (a.height ?? 0) ? { width: Math.min(1280, a.width || 1280) } : { height: Math.min(1280, a.height || 1280) };
  const small = await manipulateAsync(a.uri, [{ resize }], { compress: 0.6, format: SaveFormat.JPEG });
  const name = `photo-${uid()}.jpg`;
  await new File(small.uri).copy(new File(dir(), name));
  return name;
}

/** Moves a finished recording into the media folder; returns the file name. */
export async function keepRecording(tmpUri: string): Promise<string> {
  const ext = tmpUri.split('.').pop()?.split('?')[0] || 'm4a';
  const name = `voice-${uid()}.${ext}`;
  await new File(tmpUri).copy(new File(dir(), name));
  return name;
}

export function referencedMedia(d: AppData): string[] {
  return [
    ...d.journal.flatMap((j) => [...(j.photos ?? []), ...(j.audio ?? []).map((a) => a.name)]),
    ...(d.chapters ?? []).flatMap((c) => (c.photo ? [c.photo] : [])),
  ];
}

/** name → base64 for every media file the data refers to. */
export async function exportMedia(d: AppData): Promise<Record<string, string>> {
  if (Platform.OS === 'web') return {};
  const out: Record<string, string> = {};
  for (const n of referencedMedia(d)) {
    const f = new File(dir(), n);
    if (f.exists) out[n] = await f.base64();
  }
  return out;
}

export async function importMedia(media: Record<string, string> | undefined) {
  if (!media || Platform.OS === 'web') return;
  for (const [n, b64] of Object.entries(media)) {
    if (!/^[\w.-]+$/.test(n)) continue; // never write outside the media folder
    const f = new File(dir(), n);
    if (!f.exists) f.create();
    await f.write(b64, { encoding: 'base64' });
  }
}
