import { useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, Linking, Pressable, Text, View } from 'react-native';
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
import Plan, { type PlanView } from './src/screens/Plan';
import { onReminderTap, setupNotifications, syncNotifications } from './src/lib/notify';
import { todayStr } from './src/lib/dates';
import { LockGate } from './src/components/Lock';
import { maybeAutoBackup } from './src/lib/backup';
import Review, { reviewDue } from './src/screens/Review';
import type { Section } from './src/screens/Self';
import { refreshWidget } from './src/widget/handler';
import Wellbeing from './src/screens/Wellbeing';
import { setLang, tr } from './src/lib/i18n';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Nunito_400Regular, Nunito_400Regular_Italic, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { ff } from './src/components/ui';

SplashScreen.preventAutoHideAsync().catch(() => {});

export type Tab = 'home' | 'plan' | 'checkin' | 'journal' | 'self' | 'rhythm' | 'more' | 'review' | 'wellbeing';

const NAV: { key: Tab; label: string; icon: string }[] = [
  { key: 'home', label: 'Home', icon: '🏡' },
  { key: 'plan', label: 'Plan', icon: '☀️' },
  { key: 'journal', label: 'Journal', icon: '✍️' },
  { key: 'self', label: 'Self', icon: '🪞' },
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

/** Keeps scheduled reminders in step with the data (plans, events, reminder settings). */
function useReminders() {
  const { data } = useStore();
  const onboarded = !!data.profile;
  useEffect(() => {
    if (onboarded) setupNotifications().then(() => syncNotifications(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded]);
  useEffect(() => {
    if (!onboarded) return;
    const id = setTimeout(() => syncNotifications(data), 1500);
    return () => clearTimeout(id);
  }, [data.events, data.dayPlans, data.settings, data.profile?.name, data.letters, data.snapshots.length, onboarded]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Weekly silent Google Drive backup when the app comes to the front (if turned on). */
function useAutoBackup() {
  const { data, update } = useStore();
  const latest = useRef(data);
  latest.current = data;
  useEffect(() => {
    const run = () =>
      maybeAutoBackup(latest.current).then((at) => at && update((d) => ({ ...d, settings: { ...d.settings, lastBackupAt: at } })));
    const id = setTimeout(run, 5000);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && run());
    return () => {
      clearTimeout(id);
      sub.remove();
    };
  }, [update]);
}

/** Keeps the home-screen widget in step with today's plan and check-in. */
function useWidgetRefresh() {
  const { data } = useStore();
  useEffect(() => {
    const id = setTimeout(() => refreshWidget(data), 800);
    return () => clearTimeout(id);
  }, [data.dayPlans, data.checkIns, data.events, data.profile]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Shell() {
  const { data } = useStore();
  setLang(data.settings.language);
  useWidgetRefresh();
  useUpdateCheck();
  useReminders();
  useAutoBackup();
  const t = useTheme();
  const latest = useRef(data);
  latest.current = data;
  const [tab, setTab] = useState<Tab>('home');
  const [planView, setPlanView] = useState<PlanView>('today');
  const [focusDate, setFocusDate] = useState<string | undefined>();
  const [restoring, setRestoring] = useState(false);
  const [reviewWeek, setReviewWeek] = useState<string | null>(null);
  const [selfSection, setSelfSection] = useState<Section>('graph');
  const [selfKey, setSelfKey] = useState(0);

  const openReview = (ws: string) => {
    setReviewWeek(ws);
    setTab('review');
  };
  const openSelf = (section: Section) => {
    setSelfSection(section);
    setSelfKey((k) => k + 1);
    setTab('self');
  };

  const openPlan = (v: PlanView, date?: string) => {
    setPlanView(v);
    setFocusDate(date);
    setTab('plan');
  };

  // Reminder taps open the matching screen.
  useEffect(
    () =>
      onReminderTap((r) => {
        if (r.screen === 'review') {
          const ws = reviewDue(latest.current);
          return ws ? openReview(ws) : setTab('home');
        }
        if (r.screen === 'letters') return openSelf('compass');
        if (r.screen === 'self') return openSelf('graph');
        openPlan(r.screen === 'year' ? 'year' : r.screen === 'evening' ? 'evening' : 'today', r.date);
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Widget buttons open findingmyself://plan | checkin | journal
  useEffect(() => {
    const handle = (url: string | null | undefined) => {
      if (!url || !latest.current.profile) return;
      const path = url.replace(/^findingmyself:\/\//, '').split(/[?#/]/)[0];
      if (path === 'plan') openPlan('today');
      else if (path === 'evening') openPlan('evening');
      else if (path === 'checkin') setTab('checkin');
      else if (path === 'journal') setTab('journal');
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Morning: the first time the app opens before 2 pm without a plan, ask for the day plan.
  const s = data.settings;
  useEffect(() => {
    const maybeAsk = () => {
      const today = todayStr();
      const h = new Date().getHours();
      if (!data.profile || h < 4 || h >= 14) return;
      if (s.planSkippedOn === today || data.dayPlans.some((p) => p.date === today)) return;
      openPlan('today');
    };
    maybeAsk();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && maybeAsk());
    return () => sub.remove();
  }, [!!data.profile, s.planSkippedOn, data.dayPlans.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
          {tab === 'home' && <Home go={setTab} openPlan={openPlan} openReview={openReview} openLetters={() => openSelf('compass')} />}
          {tab === 'wellbeing' && <Wellbeing done={() => setTab('more')} />}
          {tab === 'review' && reviewWeek && <Review weekStartDate={reviewWeek} done={() => setTab('home')} />}
          {tab === 'plan' && <Plan view={planView} setView={setPlanView} focusDate={focusDate} />}
          {tab === 'checkin' && <CheckIn done={() => setTab('home')} />}
          {tab === 'journal' && <Journal />}
          {tab === 'self' && <Self key={selfKey} initialSection={selfSection} />}
          {tab === 'rhythm' && <Rhythm />}
          {tab === 'more' && <More go={setTab} />}
        </View>
        {tab !== 'checkin' && tab !== 'review' && tab !== 'wellbeing' && !(tab === 'plan' && planView === 'evening') && (
          <View
            style={{ flexDirection: 'row', backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.line, paddingTop: 6, paddingBottom: 4, elevation: 12, shadowColor: t.shadow, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -2 } }}
            accessibilityRole="tablist"
          >
            {NAV.map((n) => {
              const on = tab === n.key;
              return (
                <Pressable
                  key={n.key}
                  onPress={() => setTab(n.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={tr(n.label)}
                  style={{ flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', gap: 2 }}
                >
                  <View style={{ paddingHorizontal: 16, paddingVertical: 3, borderRadius: 999, backgroundColor: on ? t.primarySoft : 'transparent' }}>
                    <Text style={{ fontSize: 20, opacity: on ? 1 : 0.7 }}>{n.icon}</Text>
                  </View>
                  <Text style={[{ fontSize: 12, color: on ? t.primary : t.muted }, ff(on ? 'heavy' : 'semi')]}>{tr(n.label)}</Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </>
    );
  }

  return (
    <SafeAreaView key={data.settings.language ?? 'en'} style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar style="auto" />
      {body}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_400Regular_Italic,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Fraunces_600SemiBold,
  });
  const ready = fontsLoaded || !!fontError;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <DataProvider>
        <LockGate>
          <Shell />
        </LockGate>
      </DataProvider>
    </SafeAreaProvider>
  );
}
