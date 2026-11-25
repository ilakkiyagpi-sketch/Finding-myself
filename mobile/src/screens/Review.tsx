import { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../lib/store';
import { addDays, parseDate, planProgress } from '../lib/planner';
import { todayStr } from '../lib/dates';
import { Btn, Card, Field, H, Row, Screen, T } from '../components/ui';
import type { AppData } from '../lib/types';

/** Monday of the week containing `date`. */
export function weekStart(date: string) {
  const d = parseDate(date);
  return addDays(date, -((d.getDay() + 6) % 7));
}

/** Show the Sunday review card Sat–Mon if this week's review isn't done. */
export function reviewDue(d: AppData): string | null {
  const today = todayStr();
  const dow = parseDate(today).getDay(); // 0 Sun … 6 Sat
  if (![0, 1, 6].includes(dow)) return null;
  const ws = dow === 1 ? weekStart(addDays(today, -1)) : weekStart(today); // Monday reviews last week
  return d.weeklyReviews.some((r) => r.weekStart === ws) ? null : ws;
}

export function weekSummary(d: AppData, ws: string) {
  const we = addDays(ws, 7);
  const inWeek = (date: string) => date >= ws && date < we;
  const cis = d.checkIns.filter((c) => inWeek(c.date));
  const likeAvg = cis.length ? cis.reduce((a, c) => a + c.likeMyself, 0) / cis.length : null;
  const best = [...cis].sort((a, b) => b.likeMyself - a.likeMyself)[0];
  const plans = d.dayPlans.filter((p) => inWeek(p.date));
  const prog = plans.reduce((acc, p) => {
    const x = planProgress(p);
    return { done: acc.done + x.done, total: acc.total + x.total };
  }, { done: 0, total: 0 });
  const wins = plans.map((p) => p.evening?.wentWell).filter(Boolean) as string[];
  const mine = plans.map((p) => p.evening?.mine).filter(Boolean) as string[];
  const habitDays = new Set(d.habitLogs.filter((l) => inWeek(l.date)).map((l) => l.date)).size;
  const journal = d.journal.filter((j) => inWeek(j.createdAt.slice(0, 10))).length;
  return { checkIns: cis.length, likeAvg, best, plansMade: plans.length, prog, wins, mine, habitDays, journal };
}

export default function Review({ weekStartDate, done }: { weekStartDate: string; done: () => void }) {
  const { data, update } = useStore();
  const s = weekSummary(data, weekStartDate);
  const existing = data.weeklyReviews.find((r) => r.weekStart === weekStartDate);
  const [wins, setWins] = useState(existing?.wins ?? s.wins.slice(0, 3).join('\n'));
  const [hard, setHard] = useState(existing?.hard ?? '');
  const [adjustment, setAdjustment] = useState(existing?.adjustment ?? '');
  const last = [...data.weeklyReviews].filter((r) => r.weekStart < weekStartDate).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];

  const save = () => {
    update((d) => ({
      ...d,
      weeklyReviews: [...d.weeklyReviews.filter((r) => r.weekStart !== weekStartDate), { weekStart: weekStartDate, wins: wins.trim(), hard: hard.trim(), adjustment: adjustment.trim(), doneAt: new Date().toISOString() }],
    }));
    done();
  };

  const stat = (label: string, value: string) => (
    <View style={{ width: '48%', marginBottom: 10 }}>
      <T small muted>{label}</T>
      <T bold size={20}>{value}</T>
    </View>
  );

  return (
    <Screen
      footer={
        <>
          <Btn title="Later" onPress={done} style={{ flex: 1 }} />
          <Btn primary title="Save my week" onPress={save} style={{ flex: 1 }} />
        </>
      }
    >
      <H>Sunday review 🌿</H>
      <T muted style={{ marginBottom: 12 }}>Week of {parseDate(weekStartDate).toLocaleDateString()}. Five minutes to look back kindly and choose one change.</T>

      <Card>
        <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {stat('Felt like myself (avg)', s.likeAvg === null ? '—' : `${s.likeAvg.toFixed(1)} / 10`)}
          {stat('Check-ins', String(s.checkIns))}
          {stat('Days planned', String(s.plansMade))}
          {stat('Plan items done', s.prog.total ? `${s.prog.done} of ${s.prog.total}` : '—')}
          {stat('Habit days', String(s.habitDays))}
          {stat('Journal entries', String(s.journal))}
        </Row>
        {s.best && <T small>🌞 Best day: {parseDate(s.best.date).toLocaleDateString(undefined, { weekday: 'long' })} — you felt {s.best.emotion}{s.best.mattered ? `; “${s.best.mattered}”` : ''}</T>}
        {s.mine.length > 0 && <T small style={{ marginTop: 6 }}>🌱 Moments that were yours: {s.mine.slice(0, 3).join(' · ')}</T>}
      </Card>

      {last?.adjustment && (
        <Card>
          <T small muted>LAST WEEK YOU CHOSE</T>
          <T bold>{last.adjustment}</T>
          <T small muted>How did it go? Keep it, tweak it, or let it go.</T>
        </Card>
      )}

      <Card>
        <Field label="🏅 Wins this week (big or tiny)" multiline value={wins} onChangeText={setWins} placeholder="Baby rolled over; I walked three times; I asked for help." />
        <Field label="🌧️ What was hard?" multiline value={hard} onChangeText={setHard} placeholder="No sleep on Wednesday; guests all weekend." />
        <Field label="🔧 One change for next week" value={adjustment} onChangeText={setAdjustment} placeholder="Ask Appa to take the baby out on Saturday morning." />
      </Card>
    </Screen>
  );
}
