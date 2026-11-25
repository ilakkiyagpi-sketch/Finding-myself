import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { emptyData, type AppData } from './types';

export { todayStr, daysAgoStr, uid } from './dates';

const FILE_NAME = 'finding-myself-data.json';
const WEB_KEY = 'finding-myself-data-v1';

// Data lives in one JSON file in the app's private document folder.
// Other apps cannot read it; uninstalling the app deletes it (so keep Google backups).
async function load(): Promise<AppData | null> {
  if (Platform.OS === 'web') {
    const raw = globalThis.localStorage?.getItem(WEB_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  const f = new File(Paths.document, FILE_NAME);
  if (!f.exists) return null;
  return JSON.parse(await f.text());
}

async function save(d: AppData): Promise<void> {
  const json = JSON.stringify(d);
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(WEB_KEY, json);
    return;
  }
  // Write to a temp file then move into place, so a crash mid-write can't corrupt the data.
  const tmp = new File(Paths.document, FILE_NAME + '.tmp');
  if (!tmp.exists) tmp.create();
  await tmp.write(json);
  const target = new File(Paths.document, FILE_NAME);
  if (target.exists) target.delete();
  await tmp.move(target);
}

async function remove(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(WEB_KEY);
    return;
  }
  const f = new File(Paths.document, FILE_NAME);
  if (f.exists) f.delete();
}

const normalise = (d: Partial<AppData>): AppData => ({
  ...emptyData(),
  ...d,
  settings: { ...emptyData().settings, ...(d.settings ?? {}) },
});

interface Store {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  replaceAll: (d: AppData) => void;
  wipe: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    load()
      .then((d) => setData(d ? normalise(d) : emptyData()))
      .catch((e) => {
        console.error('Load failed', e);
        setData(emptyData());
      });
  }, []);

  const persist = useCallback((d: AppData) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      save(d).catch((e) => console.error('Save failed', e));
    }, 300);
  }, []);

  const update = useCallback(
    (fn: (d: AppData) => AppData) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...fn(prev), updatedAt: new Date().toISOString() };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const replaceAll = useCallback(
    (d: AppData) => {
      const n = normalise(d);
      setData(n);
      persist(n);
    },
    [persist],
  );

  const wipe = useCallback(async () => {
    clearTimeout(timer.current);
    await remove();
    setData(emptyData());
  }, []);

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 48 }}>🌿</Text>
      </View>
    );
  }
  return <Ctx.Provider value={{ data, update, replaceAll, wipe }}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside DataProvider');
  return s;
}

export { normalise };
