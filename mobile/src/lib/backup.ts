// Builds the backup file (data + photos/voice notes) and runs the silent weekly backup.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { encryptText } from './crypto';
import { exportMedia } from './media';
import { backupToDrive } from './gdrive';
import type { AppData } from './types';

const PASS_KEY = 'backup-passphrase';
const WEEK = 7 * 24 * 60 * 60 * 1000;

export async function buildBackup(d: AppData, passphrase?: string): Promise<string> {
  const json = JSON.stringify({ ...d, media: await exportMedia(d) });
  return passphrase ? JSON.stringify(await encryptText(json, passphrase)) : json;
}

/** The passphrase is kept in Android's encrypted keystore only if she turns on auto-backup. */
export async function rememberedPassphrase(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  return SecureStore.getItemAsync(PASS_KEY).catch(() => null);
}

export async function setRememberedPassphrase(p: string | null) {
  if (Platform.OS === 'web') return;
  if (p) await SecureStore.setItemAsync(PASS_KEY, p);
  else await SecureStore.deleteItemAsync(PASS_KEY);
}

/** If auto-backup is on and the last backup is a week old, back up quietly (no sign-in screens). */
export async function maybeAutoBackup(d: AppData): Promise<string | null> {
  if (Platform.OS === 'web' || !d.settings.autoBackup || !d.profile) return null;
  const last = d.settings.lastBackupAt ? new Date(d.settings.lastBackupAt).getTime() : 0;
  if (Date.now() - last < WEEK) return null;
  try {
    const content = await buildBackup(d, (await rememberedPassphrase()) ?? undefined);
    return (await backupToDrive(content, false)).at;
  } catch {
    return null; // offline or not signed in — try next time
  }
}
