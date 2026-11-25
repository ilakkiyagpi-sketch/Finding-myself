// Optional passphrase encryption for backups (AES-GCM, key from PBKDF2).
// If the passphrase is forgotten the backup cannot be restored — by design.

export interface EncryptedBlob {
  enc: 'AES-GCM-PBKDF2';
  salt: string;
  iv: string;
  data: string;
}

const b64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 250_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptText(plain: string, passphrase: string): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  return { enc: 'AES-GCM-PBKDF2', salt: b64(salt), iv: b64(iv), data: b64(ct) };
}

export async function decryptText(blob: EncryptedBlob, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase, unb64(blob.salt));
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) as BufferSource }, key, unb64(blob.data) as BufferSource);
  return new TextDecoder().decode(pt);
}

export const isEncrypted = (x: unknown): x is EncryptedBlob =>
  typeof x === 'object' && x !== null && (x as EncryptedBlob).enc === 'AES-GCM-PBKDF2';
