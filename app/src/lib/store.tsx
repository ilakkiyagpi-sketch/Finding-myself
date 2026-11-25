import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { get, set, del } from 'idb-keyval';
import { emptyData, type AppData } from './types';

const KEY = 'finding-myself-data-v1';

interface Store {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  replaceAll: (d: AppData) => void;
  wipe: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    get<AppData>(KEY)
      .then((d) => setData(d ? { ...emptyData(), ...d, settings: { ...emptyData().settings, ...d.settings } } : emptyData()))
      .catch(() => setData(emptyData()));
  }, []);

  const persist = useCallback((d: AppData) => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      set(KEY, d).catch((e) => console.error('Save failed', e));
    }, 250);
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
      setData(d);
      persist(d);
    },
    [persist],
  );

  const wipe = useCallback(async () => {
    window.clearTimeout(saveTimer.current);
    await del(KEY);
    setData(emptyData());
  }, []);

  if (!data) return <div className="loading">🌿</div>;
  return <Ctx.Provider value={{ data, update, replaceAll, wipe }}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside DataProvider');
  return s;
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const todayStr = (d = new Date()) => {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

export const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return todayStr(d);
};
