// Checks the repo's "latest-apk" GitHub release for a newer build of this app.
// The app isn't on the Play Store, so this is how it learns about updates.
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

export interface UpdateInfo {
  build: number;
  url: string;
  sizeMb: number;
  publishedAt: string;
}

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000; // GitHub allows 60 unauthenticated checks/hour; we need far fewer.

const repo = (): string | undefined => (Constants.expoConfig?.extra as { updateRepo?: string } | undefined)?.updateRepo;

/** The installed build number (Android versionCode), or null when unknown (web / dev). */
export function installedBuild(): number | null {
  if (Platform.OS !== 'android') return null;
  const n = Number(Application.nativeBuildVersion);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function shouldAutoCheck(lastCheck?: string): boolean {
  if (installedBuild() === null || !repo()) return false;
  return !lastCheck || Date.now() - new Date(lastCheck).getTime() > CHECK_EVERY_MS;
}

/** Returns the newer release, or null if this is the latest. Throws on network errors.
 *  Reads the small version.json published next to the APK on the "latest-apk" release.
 *  (Release downloads aren't subject to the GitHub API's 60-requests/hour limit.) */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  const current = installedBuild();
  const r = repo();
  if (current === null || !r) return null;
  const base = `https://github.com/${r}/releases/download/latest-apk`;
  const res = await fetch(`${base}/version.json?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Update check failed (${res.status})`);
  return parseVersionInfo(await res.json(), current, base);
}

export function parseVersionInfo(v: unknown, current: number, base: string): UpdateInfo | null {
  const info = v as { build?: number; apk?: string; sizeBytes?: number; publishedAt?: string };
  const build = Number(info?.build);
  if (!Number.isFinite(build) || build <= current) return null;
  return {
    build,
    url: `${base}/${info.apk ?? 'finding-myself.apk'}`,
    sizeMb: Math.round(Number(info.sizeBytes ?? 0) / 1e6),
    publishedAt: info.publishedAt ?? '',
  };
}

/** Opens the APK link; the browser downloads it and Android offers "Update". */
export function startUpdate(u: UpdateInfo) {
  return Linking.openURL(u.url);
}
