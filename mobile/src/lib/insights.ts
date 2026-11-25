import { DIMENSIONS, SEASONS, type AppData, type CheckIn, type GraphSnapshot } from './types';
import { tagLabel } from './prompts';
import { daysAgoStr, todayStr } from './dates';

export interface Piece {
  key: string;
  label: string;
  emoji: string;
  past: number;
  present: number;
  desired: number;
  gap: number;
}

export const latestSnapshot = (d: AppData): GraphSnapshot | undefined => d.snapshots[d.snapshots.length - 1];

/** High in the past or in what she wants, low now. */
export function missingPieces(s: GraphSnapshot): Piece[] {
  return DIMENSIONS.map((dim) => {
    const past = s.past[dim.key];
    const present = s.present[dim.key];
    const desired = s.desired[dim.key];
    return { ...dim, past, present, desired, gap: Math.max(past, desired) - present };
  })
    .filter((p) => p.gap >= 3)
    .sort((a, b) => b.gap - a.gap);
}

/** Areas that grew since the past — always shown beside what was lost. */
export function gainedPieces(s: GraphSnapshot): Piece[] {
  return DIMENSIONS.map((dim) => {
    const past = s.past[dim.key];
    const present = s.present[dim.key];
    return { ...dim, past, present, desired: s.desired[dim.key], gap: present - past };
  })
    .filter((p) => p.gap >= 2)
    .sort((a, b) => b.gap - a.gap);
}

/** "18 of the last 21 days" — never a streak that resets to zero. */
export function habitDaysInLast(d: AppData, habitId: string, days = 21): number {
  const since = daysAgoStr(days - 1);
  return new Set(d.habitLogs.filter((l) => l.habitId === habitId && l.date >= since).map((l) => l.date)).size;
}

export function likeMyselfAverage(d: AppData, fromDaysAgo: number, toDaysAgo: number): number | null {
  const from = daysAgoStr(fromDaysAgo);
  const to = daysAgoStr(toDaysAgo);
  const xs = d.checkIns.filter((c) => c.date >= from && c.date <= to).map((c) => c.likeMyself);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function isHeavySeason(d: AppData): boolean {
  return !!d.profile && !!SEASONS.find((s) => s.key === d.profile!.season)?.heavy;
}

export function isToughDay(d: AppData): boolean {
  return d.settings.toughDay === todayStr();
}

export function meRole(d: AppData) {
  return d.roles.find((r) => r.isMe);
}

/** One gentle, rotating sentence for the Then · Now · Next card. */
export function homeInsight(d: AppData): string {
  const options: string[] = [];
  const snap = latestSnapshot(d);
  if (snap) {
    const miss = missingPieces(snap)[0];
    if (miss) options.push(`${miss.emoji} ${miss.label} is waiting for you. What is a 10-minute version of it this week?`);
    const gain = gainedPieces(snap)[0];
    if (gain) options.push(`${gain.emoji} You’ve grown in ${gain.label.toLowerCase()}. That is part of you now, too.`);
  }
  const thisWeek = likeMyselfAverage(d, 6, 0);
  const lastWeek = likeMyselfAverage(d, 13, 7);
  if (thisWeek !== null && lastWeek !== null && thisWeek - lastWeek >= 0.5) {
    options.push(`You’ve felt more like yourself this week (${thisWeek.toFixed(1)} vs ${lastWeek.toFixed(1)}). Notice what helped.`);
  }
  const me = meRole(d);
  if (me && me.hoursWeek === 0) options.push('🌱 “Me” has no time this week yet. Even 15 minutes counts.');

  // Find the emotion she logs most on high "like myself" days
  const good = d.checkIns.filter((c) => c.likeMyself >= 7 && c.mattered.trim());
  if (good.length) {
    const pick = good[good.length - 1];
    options.push(`On a day you felt like yourself, what mattered was: “${pick.mattered.slice(0, 90)}”.`);
  }
  if (!options.length) return 'Small, honest steps. You were never lost — just rearranged.';
  const idx = new Date().getDate() % options.length;
  return options[idx];
}

// ---------- "What helps me" (computed on the phone, from check-ins) ----------
export interface HelpInsight {
  key: string;
  label: string;
  withAvg: number;
  withoutAvg: number;
  days: number;
  text: string;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Tags linked with feeling more (or less) like herself. Needs a few days of data on both sides. */
export function whatHelps(d: AppData, minDays = 3): HelpInsight[] {
  const cs = d.checkIns;
  const keys = [...new Set(cs.flatMap((c) => c.tags ?? []))];
  const out: HelpInsight[] = [];
  for (const k of keys) {
    const withK = cs.filter((c) => c.tags?.includes(k)).map((c) => c.likeMyself);
    const without = cs.filter((c) => !c.tags?.includes(k)).map((c) => c.likeMyself);
    if (withK.length < minDays || without.length < minDays) continue;
    const a = avg(withK);
    const b = avg(without);
    if (Math.abs(a - b) < 1) continue;
    const label = tagLabel(k);
    out.push({
      key: k,
      label,
      withAvg: a,
      withoutAvg: b,
      days: withK.length,
      text:
        a > b
          ? `On days with ${label}, you felt more like yourself (${a.toFixed(1)} vs ${b.toFixed(1)}).`
          : `Days with ${label} tend to be harder (${a.toFixed(1)} vs ${b.toFixed(1)}). Worth noticing, not blaming.`,
    });
  }
  // sleep hours
  const slept = cs.filter((c) => typeof c.sleepHours === 'number') as (CheckIn & { sleepHours: number })[];
  const low = slept.filter((c) => c.sleepHours < 5).map((c) => c.likeMyself);
  const ok = slept.filter((c) => c.sleepHours >= 6).map((c) => c.likeMyself);
  if (low.length >= minDays && ok.length >= minDays && avg(ok) - avg(low) >= 1) {
    out.push({ key: 'sleep-hours', label: '😴 Sleep', withAvg: avg(ok), withoutAvg: avg(low), days: ok.length, text: `After 6+ hours of sleep you feel more like yourself (${avg(ok).toFixed(1)} vs ${avg(low).toFixed(1)} after under 5). Rest is not a luxury.` });
  }
  return out.sort((x, y) => Math.abs(y.withAvg - y.withoutAvg) - Math.abs(x.withAvg - x.withoutAvg));
}

// ---------- "On this day" ----------
export interface Memory {
  when: string; // label, e.g. "1 year ago"
  date: string;
  text: string;
  kind: 'journal' | 'checkin';
}

export function onThisDay(d: AppData, today: string): Memory[] {
  const md = today.slice(5);
  const y = Number(today.slice(0, 4));
  const out: Memory[] = [];
  for (const j of d.journal) {
    const date = j.createdAt.slice(0, 10);
    const jy = Number(date.slice(0, 4));
    if (date.slice(5) === md && jy < y) out.push({ when: `${y - jy} year${y - jy > 1 ? 's' : ''} ago`, date, text: j.text, kind: 'journal' });
  }
  for (const c of d.checkIns) {
    const cy = Number(c.date.slice(0, 4));
    if (c.date.slice(5) === md && cy < y && c.mattered) out.push({ when: `${y - cy} year${y - cy > 1 ? 's' : ''} ago`, date: c.date, text: `You felt ${c.emotion}. What mattered: ${c.mattered}`, kind: 'checkin' });
  }
  // one month ago, if nothing from past years
  if (!out.length) {
    const m = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 2, Number(today.slice(8, 10)));
    const mStr = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
    const j = d.journal.find((x) => x.createdAt.slice(0, 10) === mStr);
    if (j) out.push({ when: 'A month ago today', date: mStr, text: j.text, kind: 'journal' });
  }
  return out;
}
