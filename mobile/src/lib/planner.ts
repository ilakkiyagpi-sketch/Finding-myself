import { todayStr } from './dates';
import type { AppData, DayPlan, PlanItem, PlannerEvent } from './types';

// ---------- Date helpers (local time, YYYY-MM-DD strings) ----------
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return todayStr(d);
};
export const parseTime = (t: string | undefined, fallback = '08:00') => {
  const [h, m] = (t || fallback).split(':').map(Number);
  return { hour: Number.isFinite(h) ? h : 8, minute: Number.isFinite(m) ? m : 0 };
};
export const at = (date: string, time: string) => {
  const d = parseDate(date);
  const { hour, minute } = parseTime(time);
  d.setHours(hour, minute, 0, 0);
  return d;
};
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function prettyDate(s: string, withWeekday = true) {
  const d = parseDate(s);
  const wd = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  return `${withWeekday ? wd + ', ' : ''}${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`;
}

export function relativeDay(s: string) {
  const today = todayStr();
  if (s === today) return 'Today';
  if (s === addDays(today, 1)) return 'Tomorrow';
  const diff = Math.round((parseDate(s).getTime() - parseDate(today).getTime()) / 86400000);
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
}

// ---------- Events ----------
/** The date this event happens in a given year (yearly events), or its own date. */
export function occurrenceInYear(e: PlannerEvent, year: number): string | null {
  if (!e.repeatYearly) return e.date.startsWith(String(year)) ? e.date : null;
  if (Number(e.date.slice(0, 4)) > year) return null;
  let md = e.date.slice(5);
  // 29 Feb birthdays fall on 28 Feb in non-leap years
  if (md === '02-29' && !(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0))) md = '02-28';
  return `${year}-${md}`;
}

export function eventsOn(events: PlannerEvent[], date: string): PlannerEvent[] {
  const y = Number(date.slice(0, 4));
  return events
    .filter((e) => occurrenceInYear(e, y) === date)
    .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
}

export interface Occurrence {
  event: PlannerEvent;
  date: string;
}

/** All occurrences from `from` (inclusive) for `days` days, sorted. */
export function upcoming(events: PlannerEvent[], from: string, days: number): Occurrence[] {
  const end = addDays(from, days);
  const y0 = Number(from.slice(0, 4));
  const out: Occurrence[] = [];
  for (const e of events) {
    for (let y = y0; y <= Number(end.slice(0, 4)); y++) {
      const d = occurrenceInYear(e, y);
      if (d && d >= from && d < end) out.push({ event: e, date: d });
    }
  }
  return out.sort((a, b) => (a.date + (a.event.time ?? '99')).localeCompare(b.date + (b.event.time ?? '99')));
}

export function yearsSince(e: PlannerEvent, date: string): number | null {
  if (!e.repeatYearly) return null;
  const n = Number(date.slice(0, 4)) - Number(e.date.slice(0, 4));
  return n > 0 ? n : null;
}

// ---------- Day plans ----------
export const planFor = (d: AppData, date: string): DayPlan | undefined => d.dayPlans.find((p) => p.date === date);

/** Items moved forward to `date` that aren't in its plan yet (from the most recent earlier plan). */
export function carriedInto(d: AppData, date: string): PlanItem[] {
  const prev = [...d.dayPlans].filter((p) => p.date < date).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!prev) return [];
  return prev.items.filter((i) => i.status === 'moved' || (i.status === 'open' && !prev.evening));
}

export function planProgress(p?: DayPlan) {
  if (!p || !p.items.length) return { done: 0, total: 0 };
  return {
    done: p.items.filter((i) => i.status === 'done').length + p.items.filter((i) => i.status === 'partly').length * 0.5,
    total: p.items.length,
  };
}

export function upsertPlan(d: AppData, plan: DayPlan): AppData {
  return { ...d, dayPlans: [...d.dayPlans.filter((p) => p.date !== plan.date), plan].sort((a, b) => a.date.localeCompare(b.date)) };
}

export const REMIND_BEFORE_OPTIONS = [
  { days: 1, label: '1 day before' },
  { days: 2, label: '2 days before' },
  { days: 3, label: '3 days before' },
  { days: 7, label: '1 week before' },
  { days: 14, label: '2 weeks before' },
  { days: 30, label: '1 month before' },
];

export const EVENT_EMOJIS = ['📅', '🎂', '💍', '🏥', '👶', '🎓', '✈️', '🪔', '🙏', '💼', '📝', '💊', '🏫', '🛒', '💰', '🌱'];
