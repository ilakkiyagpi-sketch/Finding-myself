import { useEffect, useState } from 'react';
import { AppState, BackHandler, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DataProvider, useStore } from './src/lib/store';
import { useTheme } from './src/components/theme';
import { Btn, H, Screen, T } from './src/components/ui';
import Onboarding from './src/screens/Onboarding';
import Home from './src/screens/Home';
import CheckIn from './src/screens/CheckIn';
import Journal from './src/screens/Journal';
import Self from './src/screens/Self';
import Rhythm from './src/screens/Rhythm';
import More, { BackupCard } from './src/screens/More';
import { checkForUpdate, shouldAutoCheck } from './src/lib/updates';

export type Tab = 'home' | 'checkin' | 'journal' | 'self' | 'rhythm' | 'more';

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏡' },
  { key: 'journal', label: 'Journal', icon: '✍️' },
  { key: 'self', label: 'Self', icon: '🪞' },
  { key: 'rhythm', label: 'Rhythm', icon: '🌱' },
  { key: 'more', label: 'More', icon: '☁️' },
];

function FirstRunRestore({ back }: { back: () => void }) {
  return (
    <Screen footer={<Btn title="Back" onPress={back} style={{ flex: 1 }} />}>
      <H>Welcome back 🌿</H>
      <T muted style={{ marginBottom: 12 }}>Sign in with the Google account you backed up to.</T>
      <BackupCard firstRun />
    </Screen>
  );
}

/** Quietly looks for a newer APK on launch and when the app returns to the foreground. */
function useUpdateCheck() {
  const { data, update } = useStore();
  const last = data.settings.lastUpdateCheck;
  useEffect(() => {
    const run = () => {
      if (!shouldAutoCheck(last)) return;
      checkForUpdate()
        .then((u) =>
          update((d) => ({ ...d, settings: { ...d.settings, lastUpdateCheck: new Date().toISOString(), availableUpdate: u ?? undefined } })),
        )
        .catch(() => {}); // offline: try again next time
    };
    run();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && run());
    return () => sub.remove();
  }, [last, update]);
}

function Shell() {
  const { data } = useStore();
  useUpdateCheck();
  const t = useTheme();
  const [tab, setTab] = useState<Tab>('home');
  const [restoring, setRestoring] = useState(false);

  // Android back button: return to Home instead of closing the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (restoring) {
        setRestoring(false);
        return true;
      }
      if (data.profile && tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [tab, restoring, data.profile]);

  let body;
  if (!data.profile) {
    body = restoring ? <FirstRunRestore back={() => setRestoring(false)} /> : <Onboarding onRestore={() => setRestoring(true)} />;
  } else {
    body = (
      <>
        <View style={{ flex: 1 }}>
          {tab === 'home' && <Home go={setTab} />}
          {tab === 'checkin' && <CheckIn done={() => setTab('home')} />}
          {tab === 'journal' && <Journal />}
          {tab === 'self' && <Self />}
          {tab === 'rhythm' && <Rhythm />}
          {tab === 'more' && <More />}
        </View>
        {tab !== 'checkin' && (
          <View style={{ flexDirection: 'row', backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.line }} accessibilityRole="tablist">
            {NAV.map((n) => {
              const on = tab === n.key;
              return (
                <Pressable
                  key={n.key}
                  onPress={() => setTab(n.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={n.label}
                  style={{ flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 22 }}>{n.icon}</Text>
                  <Text style={{ fontSize: 12, color: on ? t.primary : t.muted, fontWeight: on ? '700' : '400' }}>{n.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="auto" />
      {body}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </SafeAreaProvider>
  );
}
