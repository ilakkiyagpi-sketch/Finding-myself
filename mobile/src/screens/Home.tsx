import { Pressable, View } from 'react-native';
import { useStore, todayStr } from '../lib/store';
import { habitDaysInLast, homeInsight, isHeavySeason, isToughDay, latestSnapshot } from '../lib/insights';
import { promptOfTheDay } from '../lib/prompts';
import { Btn, Card, Chip, H, LinkBtn, Row, Screen, T } from '../components/ui';
import { useTheme } from '../components/theme';
import type { HabitLevel } from '../lib/types';
import type { Tab } from '../../App';
import { installedBuild, startUpdate } from '../lib/updates';

export default function Home({ go }: { go: (t: Tab) => void }) {
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
      <T muted>{greet},</T>
      <H>{p.name || 'friend'} 🌿</H>

      <Card style={{ backgroundColor: t.primarySoft }}>
        <Row style={{ alignItems: 'flex-start', marginBottom: 10 }}>
          {[
            ['THEN', p.wordsWas],
            ['NOW', p.wordsNow],
            ['NEXT', p.wordsWant],
          ].map(([label, words]) => (
            <View key={label as string} style={{ flex: 1 }}>
              <T small muted>{label as string}</T>
              <T bold>{(words as string[]).join(' · ') || '—'}</T>
            </View>
          ))}
        </Row>
        <T>{homeInsight(data)}</T>
      </Card>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: tough }}
        onPress={() => update((d) => ({ ...d, settings: { ...d.settings, toughDay: tough ? undefined : today } }))}
        style={{
          borderWidth: 1,
          borderStyle: tough ? 'solid' : 'dashed',
          borderColor: tough ? t.accent : t.line,
          borderRadius: 18,
          padding: 14,
          minHeight: 52,
          marginBottom: 14,
        }}
      >
        <T muted={!tough}>{tough ? '🫶 Tough-day mode is on — only the minimum today. That counts.' : '🌧️ Having a tough day? Tap to shrink today to the minimum.'}</T>
      </Pressable>

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

      <Card>
        <H level={3}>A question for today</H>
        <View style={{ borderLeftWidth: 3, borderLeftColor: t.accent, paddingLeft: 12, marginVertical: 8 }}>
          <T italic size={17}>{promptOfTheDay(today)}</T>
        </View>
        <Btn title="Write about it" onPress={() => go('journal')} />
      </Card>

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
