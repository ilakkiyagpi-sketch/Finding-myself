// Unfinished writing (journal, check-in, plan, quick-add) is kept in its own small file,
// so an interruption — the baby waking, a call — never loses what was typed.
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';

const FILE = 'finding-myself-drafts.json';
const WEB_KEY = 'finding-myself-drafts';
let cache: Record<string, unknown> = {};
let loaded = false;
let timer: ReturnType<typeof setTimeout> | undefined;

export async function loadDrafts() {
  try {
    if (Platform.OS === 'web') cache = JSON.parse(globalThis.localStorage?.getItem(WEB_KEY) ?? '{}');
    else {
      const f = new File(Paths.document, FILE);
      cache = f.exists ? JSON.parse(await f.text()) : {};
    }
  } catch {
    cache = {};
  }
  loaded = true;
}

function persist() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    const json = JSON.stringify(cache);
    try {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(WEB_KEY, json);
      else {
        const f = new File(Paths.document, FILE);
        if (!f.exists) f.create();
        await f.write(json);
      }
    } catch (e) {
      console.warn('Draft save failed', e);
    }
  }, 600);
}

export function getDraft<T>(key: string): T | undefined {
  return loaded ? (cache[key] as T | undefined) : undefined;
}

export function setDraft(key: string, value: unknown) {
  if (value === undefined) delete cache[key];
  else cache[key] = value;
  persist();
}

export const clearDraft = (key: string) => setDraft(key, undefined);

/**
 * Like useState, but the value is kept as a draft until clear() is called.
 * `restored` is true when the starting value came from an earlier, unfinished session.
 */
export function useDraft<T>(key: string, initial: T, isEmpty: (v: T) => boolean = (v) => !v) {
  const saved = getDraft<T>(key);
  const [value, setValue] = useState<T>(saved ?? initial);
  const restored = useRef(saved !== undefined && !isEmpty(saved)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (isEmpty(value)) clearDraft(key);
    else setDraft(key, value);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  const clear = () => {
    clearDraft(key);
    setValue(initial);
  };
  return { value, setValue, clear, restored };
}
