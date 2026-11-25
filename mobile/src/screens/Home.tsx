import { Image, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore, todayStr } from '../lib/store';
import { habitDaysInLast, homeInsight, isHeavySeason, isToughDay, latestSnapshot, onThisDay } from '../lib/insights';
import { promptOfTheDay } from '../lib/prompts';
import { Btn, Card, Chip, H, LinkBtn, Row, Screen, SectionLabel, T, ff } from '../components/ui';
import { prettyDate } from '../lib/planner';
import { useTheme } from '../components/theme';
import type { HabitLevel } from '../lib/types';
import type { Tab } from '../../App';
import { installedBuild, startUpdate } from '../lib/updates';
import { eventsOn, planFor, planProgress } from '../lib/planner';
import { to12h } from '../components/pickers';
import type { PlanView } from './Plan';
import { useState } from 'react';
import Garden from '../components/Garden';
import StressRelease from '../components/StressRelease';
import { reviewDue } from './Review';
import { tr } from '../lib/i18n';

export default function Home({ go, openPlan, openReview, openLetters }: { go: (t: Tab) => void; openPlan: (v: PlanView, date?: string) => void; openReview: (weekStart: string) => void; openLetters: () => void }) {
  const [calm, setCalm] = useState(false);
  const { data, update } = useStore();
  const t = useTheme();
  const p = data.profile!;
  const today = todayStr();
  const checkedIn = data.checkIns.find((c) => c.date === today);
  const tough = isToughDay(data);
  const heavy = isHeavySeason(data);
  const snap = latestSnapshot(data);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const habits = data.habits.filter((h) => !h.archived);

  const logHabit = (habitId: string, level: HabitLevel) =>
    update((d) => {
      const others = d.habitLogs.filter((l) => !(l.habitId === habitId && l.date === today));
      const existing = d.habitLogs.find((l) => l.habitId === habitId && l.date === today);
      return { ...d, habitLogs: existing?.level === level ? others : [...others, { habitId, date: today, level }] };
    });

  const daysSinceBackup = data.settings.lastBackupAt ? Math.floor((Date.now() - new Date(data.settings.lastBackupAt).getTime()) / 86400000) : null;

  const upd = data.settings.availableUpdate;
  const current = installedBuild();
  const showUpdate = !!upd && current !== null && upd.build > current && data.settings.dismissedUpdateBuild !== upd.build;

  return (
    <Screen>
      {showUpdate && upd && (
        <Card style={{ borderColor: t.desired, borderWidth: 2 }}>
          <H level={3}>A new version is ready 🌱</H>
          <T small muted style={{ marginBottom: 10 }}>
            Build {upd.build} · about {upd.sizeMb} MB (Wi-Fi is best). Your entries stay — Android will say “Update”. A quick backup first is a good habit.
          </T>
          <Row>
            <Btn title="Later" style={{ flex: 1 }} onPress={() => update((d) => ({ ...d, settings: { ...d.settings, dismissedUpdateBuild: upd.build } }))} />
            <Btn primary title="Update" style={{ flex: 1 }} onPress={() => startUpdate(upd)} />
          </Row>
        </Card>
      )}
      <LinearGradient colors={[t.heroFrom, t.heroMid, t.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 26, padding: 20, marginBottom: 18 }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <T style={[{ color: t.heroText, opacity: 0.85 }, ff('semi')]}>{`${tr(greet)},`}</T>
            <T size={30} style={[{ color: t.heroText, lineHeight: 36 }, ff('title')]}>{p.name || 'friend'}</T>
            <T small style={{ color: t.heroText, opacity: 0.8 }}>{prettyDate(today)}</T>
          </View>
          <Image source={require('../../assets/logo-mark.png')} style={{ width: 64, height: 64, borderRadius: 16 }} accessibilityLabel="Finding Myself logo" />
        </Row>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 14 }} />
        <Row style={{ alignItems: 'flex-start' }}>
          {[
            ['THEN', p.wordsWas],
            ['NOW', p.wordsNow],
            ['NEXT', p.wordsWant],
          ].map(([label, words]) => (
            <View key={label as string} style={{ flex: 1 }}>
              <T small style={[{ color: t.heroText, opacity: 0.75, letterSpacing: 1.2, fontSize: 11.5 }, ff('heavy')]}>{tr(label as string)}</T>
              <T style={[{ color: t.heroText }, ff('bold')]}>{(words as string[]).join('\n') || '—'}</T>
            </View>
          ))}
        </Row>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 16, padding: 12, marginTop: 14 }}>
          <T style={{ color: t.heroText }}>{homeInsight(data)}</T>
        </View>
      </LinearGradient>

      <SectionLabel>Today</SectionLabel>
      <TodayPlanCard openPlan={openPlan} />
      <ReviewCard openReview={openReview} />
      <LettersReadyCard openLetters={openLetters} />

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: tough }}
        onPress={() => update((d) => ({ ...d, settings: { ...d.settings, toughDay: tough ? undefined : today } }))}
        style={{
          borderWidth: 1,
          borderStyle: tough ? 'solid' : 'dashed',
          borderColor: tough ? t.accent : t.line,
          backgroundColor: tough ? t.accentSoft : 'transparent',
          borderRadius: 18,
          padding: 14,
          minHeight: 52,
          marginBottom: 14,
        }}
      >
        <T muted={!tough}>{tough ? '🫶 Tough-day mode is on — only the minimum today. That counts.' : '🌧️ Having a tough day? Tap to shrink today to the minimum.'}</T>
      </Pressable>
      {(tough || checkedIn?.quadrant === 'unpleasant-high' || checkedIn?.quadrant === 'unpleasant-low') && (
        <Btn title="🫧 Need a moment? Release some stress" onPress={() => setCalm(true)} style={{ marginBottom: 14 }} />
      )}
      <StressRelease visible={calm} onClose={() => setCalm(false)} />

      <Card>
        <H level={3}>Today’s check-in</H>
        {checkedIn ? (
          <T>
            Done ✓ You felt <T bold>{checkedIn.emotion}</T>, and {checkedIn.likeMyself}/10 like yourself.
          </T>
        ) : (
          <>
            <T muted style={{ marginBottom: 10 }}>One minute. How are you, really?</T>
            <Btn primary title="Check in" onPress={() => go('checkin')} />
          </>
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H level={3}>Tiny habits</H>
          <LinkBtn title="Edit" onPress={() => go('rhythm')} />
        </Row>
        {habits.length === 0 && <T muted>No habit yet. Add one small thing in Rhythm.</T>}
        {habits.map((h, i) => {
          const log = data.habitLogs.find((l) => l.habitId === h.id && l.date === today);
          const onlyMin = tough || (heavy && !h.normal);
          const levels: HabitLevel[] = onlyMin ? ['minimum'] : (['minimum', 'normal', 'stretch'] as HabitLevel[]).filter((l) => l === 'minimum' || h[l]);
          return (
            <View key={h.id} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
              <T bold>I am a woman who {h.identity}</T>
              {!!h.anchor && <T small muted>after {h.anchor}</T>}
              <Row style={{ flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
                {levels.map((l) => (
                  <Chip key={l} label={`${log?.level === l ? '✓ ' : ''}${h[l] || l}`} on={log?.level === l} onPress={() => logHabit(h.id, l)} />
                ))}
              </Row>
              <T small muted>{habitDaysInLast(data, h.id)} of the last 21 days</T>
            </View>
          );
        })}
      </Card>

      <SectionLabel>For you</SectionLabel>
      <Card>
        <H level={3}>A question for today</H>
        <View style={{ backgroundColor: t.accentSoft, borderRadius: 16, padding: 14, marginVertical: 8 }}>
          <T italic size={17}>{promptOfTheDay(today)}</T>
        </View>
        <Btn title="Write about it" onPress={() => go('journal')} />
      </Card>

      <OnThisDayCard />

      <SectionLabel>Growing</SectionLabel>
      <Garden />

      {snap && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <H level={3}>Your self graph</H>
            <LinkBtn title="Open" onPress={() => go('self')} />
          </Row>
          <T small muted>Last scored {new Date(snap.date).toLocaleDateString()}. Re-score monthly to see how you change.</T>
        </Card>
      )}

      {(daysSinceBackup === null || daysSinceBackup >= 7) && (
        <Card>
          <T>☁️ {daysSinceBackup === null ? 'Not backed up yet.' : `Last backup was ${daysSinceBackup} days ago.`} Your journal lives only on this phone.</T>
          <LinkBtn title="Back up to Google Drive" onPress={() => go('more')} />
        </Card>
      )}
    </Screen>
  );
}

function TodayPlanCard({ openPlan }: { openPlan: (v: PlanView, date?: string) => void }) {
  const { data } = useStore();
  const t = useTheme();
  const today = todayStr();
  const plan = planFor(data, today);
  const evs = eventsOn(data.events, today);
  const { done, total } = planProgress(plan);
  const evening = new Date().getHours() >= 17;
  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <H level={3}>☀️ Today’s plan</H>
        {plan && total > 0 && <T muted>{done} of {total}</T>}
      </Row>
      {evs.map((e) => (
        <T key={e.id} small>
          {e.emoji} {e.title}
          {e.time ? ` · ${to12h(e.time)}` : ''}
        </T>
      ))}
      {!plan && (
        <>
          <T muted style={{ marginVertical: 8 }}>{data.settings.planSkippedOn === today ? 'Skipped today — that’s fine.' : 'Two minutes to plan a realistic day.'}</T>
          <Btn primary title="Plan my day" onPress={() => openPlan('today')} />
        </>
      )}
      {plan && (
        <>
          {!!plan.intention && <T style={{ marginVertical: 6 }}>Protecting: <T bold>{plan.intention}</T></T>}
          {total > 0 && (
            <View style={{ height: 10, borderRadius: 5, backgroundColor: t.primarySoft, overflow: 'hidden', marginVertical: 8 }}>
              <View style={{ width: `${(done / total) * 100}%`, height: '100%', backgroundColor: t.desired }} />
            </View>
          )}
          <Row>
            <Btn title="Open my list" onPress={() => openPlan('today')} style={{ flex: 1 }} />
            {!plan.evening && <Btn primary={evening} title="🌙 Evening check" onPress={() => openPlan('evening')} style={{ flex: 1 }} />}
          </Row>
          {plan.evening && <T small muted style={{ marginTop: 6 }}>🌙 Evening check done. Rest well.</T>}
        </>
      )}
    </Card>
  );
}

function OnThisDayCard() {
  const { data } = useStore();
  const mem = onThisDay(data, todayStr());
  if (!mem.length) return null;
  const m = mem[0];
  return (
    <Card>
      <H level={3}>🕰️ On this day</H>
      <T small muted>{m.when}</T>
      <T italic style={{ marginTop: 4 }}>“{m.text.length > 220 ? m.text.slice(0, 220) + '…' : m.text}”</T>
      {mem.length > 1 && <T small muted style={{ marginTop: 6 }}>+ {mem.length - 1} more memor{mem.length > 2 ? 'ies' : 'y'} from this date</T>}
    </Card>
  );
}

function ReviewCard({ openReview }: { openReview: (ws: string) => void }) {
  const { data } = useStore();
  const ws = reviewDue(data);
  if (!ws) return null;
  return (
    <Card>
      <H level={3}>🌿 Sunday review</H>
      <T muted style={{ marginBottom: 8 }}>Five minutes: your wins, what was hard, and one change for next week.</T>
      <Btn primary title="Look back at my week" onPress={() => openReview(ws)} />
    </Card>
  );
}

function LettersReadyCard({ openLetters }: { openLetters: () => void }) {
  const { data } = useStore();
  const ready = data.letters.filter((l) => l.openOn <= todayStr() && !l.openedAt);
  if (!ready.length) return null;
  return (
    <Card>
      <H level={3}>💌 A letter from your past self is ready</H>
      <Btn primary title="Open it" onPress={openLetters} />
    </Card>
  );
}
