import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useStore } from '../lib/store';
import { Btn, H, T } from './ui';
import { useTheme } from './theme';

const RELOCK_AFTER_MS = 60_000; // locked again after a minute in the background

export async function unlock(prompt = 'Unlock Finding Myself'): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (Platform.OS === 'web') return { ok: true };
  if (!(await LocalAuthentication.hasHardwareAsync()) && !(await LocalAuthentication.isEnrolledAsync())) {
    return { ok: false, reason: 'This phone has no fingerprint or screen lock set up.' };
  }
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, fallbackLabel: 'Use PIN' });
  return r.success ? { ok: true } : { ok: false, reason: r.error === 'not_enrolled' ? 'Set up a screen lock in Android settings first.' : 'Not unlocked.' };
}

/** Covers the app with a lock screen when app lock is on. */
export function LockGate({ children }: { children: ReactNode }) {
  const { data } = useStore();
  const t = useTheme();
  const enabled = !!data.settings.appLock && Platform.OS !== 'web';
  const [locked, setLocked] = useState(enabled);
  const [msg, setMsg] = useState('');
  const hiddenAt = useRef<number | null>(null);

  const tryUnlock = async () => {
    const r = await unlock();
    if (r.ok) {
      setLocked(false);
      setMsg('');
    } else setMsg(r.reason);
  };

  useEffect(() => {
    if (!enabled) return setLocked(false);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') hiddenAt.current = Date.now();
      if (st === 'active' && hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER_MS) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  useEffect(() => {
    if (enabled && locked) tryUnlock();
  }, [enabled, locked]); // eslint-disable-line react-hooks/exhaustive-deps

  // The app stays mounted underneath, so a half-written entry isn't lost when it relocks.
  return (
    <View style={{ flex: 1 }}>
      {children}
      {enabled && locked && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: t.bg }}>
          <T size={56}>🔐</T>
          <H>Finding Myself</H>
          <T muted style={{ textAlign: 'center', marginBottom: 20 }}>Your space is locked.</T>
          <Btn primary title="Unlock" onPress={tryUnlock} />
          {!!msg && <T small muted style={{ marginTop: 12 }}>{msg}</T>}
        </View>
      )}
    </View>
  );
}
