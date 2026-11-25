// Google Drive backup using the hidden, app-only "appDataFolder".
// Scope drive.appdata: the app can only see its OWN backup file — never her other Drive files.
// Auth: Google Identity Services token client (browser popup, no server needed).

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FILE_NAME = 'finding-myself-backup.json';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

let cachedToken: { value: string; expires: number } | null = null;

export const defaultClientId = (): string | undefined => import.meta.env.VITE_GOOGLE_CLIENT_ID || undefined;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const s = existing ?? document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google sign-in. Are you online?'));
    if (!existing) document.head.appendChild(s);
  });
}

async function getToken(clientId: string): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp: any) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        cachedToken = { value: resp.access_token, expires: Date.now() + Number(resp.expires_in ?? 3600) * 1000 };
        resolve(resp.access_token);
      },
      error_callback: (err: any) => reject(new Error(err?.message || 'Google sign-in was closed')),
    });
    client.requestAccessToken({ prompt: cachedToken ? '' : 'consent' });
  });
}

async function api(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${await res.text()}`);
  return res;
}

async function findBackup(token: string): Promise<{ id: string; modifiedTime: string } | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const res = await api(
    token,
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
  );
  const json = await res.json();
  return json.files?.[0] ?? null;
}

export async function backupToDrive(clientId: string, content: string): Promise<string> {
  const token = await getToken(clientId);
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
  return new Date().toISOString();
}

export async function restoreFromDrive(clientId: string): Promise<{ content: string; modifiedTime: string } | null> {
  const token = await getToken(clientId);
  const file = await findBackup(token);
  if (!file) return null;
  const res = await api(token, `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
  return { content: await res.text(), modifiedTime: file.modifiedTime };
}
