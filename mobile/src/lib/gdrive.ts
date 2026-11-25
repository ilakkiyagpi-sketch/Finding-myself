// Google Drive backup into the hidden, app-only "appDataFolder".
// Scope drive.appdata: the app sees ONLY its own backup file — never her other Drive files.
// Sign-in uses the native Google account picker on Android (@react-native-google-signin).
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'finding-myself-backup.json';

let configured = false;

function configure() {
  if (configured) return;
  const webClientId = (Constants.expoConfig?.extra as { googleWebClientId?: string } | undefined)?.googleWebClientId;
  GoogleSignin.configure({ scopes: [SCOPE], ...(webClientId ? { webClientId } : {}) });
  configured = true;
}

export function friendlyGoogleError(e: unknown): string {
  if (isErrorWithCode(e)) {
    if (e.code === statusCodes.SIGN_IN_CANCELLED) return 'Google sign-in was cancelled.';
    if (e.code === statusCodes.IN_PROGRESS) return 'Google sign-in is already open.';
    if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return 'Google Play services are needed for backup.';
    if (String(e.code) === '10' || /DEVELOPER_ERROR/i.test(e.message))
      return 'Google backup isn’t set up for this app build yet (Android OAuth client / SHA-1 mismatch). See the setup guide.';
  }
  return e instanceof Error ? e.message : String(e);
}

/** Returns the signed-in email and a fresh access token with Drive app-data access. */
async function getAccess(): Promise<{ token: string; email: string }> {
  if (Platform.OS === 'web') throw new Error('Google backup works in the installed Android app.');
  configure();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  let user = GoogleSignin.getCurrentUser();
  if (!user) {
    const silent = GoogleSignin.hasPreviousSignIn() ? await GoogleSignin.signInSilently() : null;
    if (silent && silent.type === 'success') user = silent.data;
  }
  if (!user) {
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) throw new Error('Google sign-in was cancelled.');
    user = res.data;
  }
  if (!user.scopes?.includes(SCOPE)) {
    const res = await GoogleSignin.addScopes({ scopes: [SCOPE] });
    if (!res || !isSuccessResponse(res)) throw new Error('Drive permission was not granted, so backup can’t be saved.');
    user = res.data;
  }
  const { accessToken } = await GoogleSignin.getTokens();
  return { token: accessToken, email: user.user.email };
}

export async function signedInEmail(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  configure();
  return GoogleSignin.getCurrentUser()?.user.email ?? null;
}

export async function signOutGoogle(): Promise<void> {
  if (Platform.OS === 'web') return;
  configure();
  await GoogleSignin.signOut();
}

async function api(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { ...((init.headers as Record<string, string>) || {}), Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    await GoogleSignin.clearCachedAccessToken(token).catch(() => {});
    throw new Error('Google session expired — please tap again.');
  }
  if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${await res.text()}`);
  return res;
}

async function findBackup(token: string): Promise<{ id: string; modifiedTime: string } | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const res = await api(
    token,
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime%20desc`,
  );
  const json = (await res.json()) as { files?: { id: string; modifiedTime: string }[] };
  return json.files?.[0] ?? null;
}

export async function backupToDrive(content: string): Promise<{ at: string; email: string }> {
  const { token, email } = await getAccess();
  const existing = await findBackup(token);
  const boundary = 'fm' + Math.random().toString(36).slice(2);
  const meta = existing ? { name: FILE_NAME } : { name: FILE_NAME, parents: ['appDataFolder'] };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  await api(token, url, {
    method: existing ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  return { at: new Date().toISOString(), email };
}

export async function restoreFromDrive(): Promise<{ content: string; modifiedTime: string; email: string } | null> {
  const { token, email } = await getAccess();
  const file = await findBackup(token);
  if (!file) return null;
  const res = await api(token, `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
  return { content: await res.text(), modifiedTime: file.modifiedTime, email };
}
