import { DIMENSIONS, SEASONS, type AppData, type GraphSnapshot } from './types';
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
