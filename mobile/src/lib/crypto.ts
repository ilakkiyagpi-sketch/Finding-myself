// Optional passphrase encryption for backups: AES-256-GCM, key from PBKDF2-SHA256.
// Same format as the web version (ciphertext||tag), so backups move between them.
// If the passphrase is forgotten, the backup cannot be opened — by design.
import { gcm } from '@noble/ciphers/aes.js';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { getRandomBytes } from 'expo-crypto';

export interface EncryptedBlob {
  enc: 'AES-GCM-PBKDF2';
  salt: string;
  iv: string;
  data: string;
  iter?: number; // absent = 250000 (web version default)
}

// Lower than the web version because PBKDF2 runs in JavaScript on the phone.
const ITERATIONS = 120_000;

const b64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const unb64 = (s: string) => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const deriveKey = (passphrase: string, salt: Uint8Array, c: number) =>
  pbkdf2Async(sha256, utf8ToBytes(passphrase), salt, { c, dkLen: 32, asyncTick: 20 });

export async function encryptText(plain: string, passphrase: string): Promise<EncryptedBlob> {
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const ct = gcm(key, iv).encrypt(utf8ToBytes(plain));
  return { enc: 'AES-GCM-PBKDF2', salt: b64(salt), iv: b64(iv), data: b64(ct), iter: ITERATIONS };
}

export async function decryptText(blob: EncryptedBlob, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase, unb64(blob.salt), blob.iter ?? 250_000);
  return bytesToUtf8(gcm(key, unb64(blob.iv)).decrypt(unb64(blob.data)));
}

export const isEncrypted = (x: unknown): x is EncryptedBlob =>
  typeof x === 'object' && x !== null && (x as EncryptedBlob).enc === 'AES-GCM-PBKDF2';
