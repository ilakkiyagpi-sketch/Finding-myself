// Local reminders (no internet or server needed): morning plan, evening checklist,
// and year-planner events (on the day + N days before).
// Strategy: whenever data changes, cancel everything and reschedule the next weeks.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { todayStr } from './dates';
import { addDays, at, eventsOn, parseTime, prettyDate, upcoming, yearsSince } from './planner';
import type { AppData } from './types';

export type NotifyTarget = { screen: 'plan' | 'evening' | 'year'; date?: string };

const CHANNEL = 'gentle-reminders';
const MORNING_DAYS = 45; // per-day morning messages list that day's events
const EVENT_WINDOW_DAYS = 400;
const MAX_EVENT_NOTIFS = 300; // Android allows ~500 pending alarms per app

let ready = false;

export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (!ready) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Gentle reminders',
        description: 'Morning plan, evening checklist and planner reminders',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    ready = true;
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function notificationsAllowed(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return (await Notifications.getPermissionsAsync()).granted;
}

function schedule(when: Date, title: string, body: string, data: NotifyTarget) {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
  });
}

let syncing: Promise<void> | null = null;
let queued: AppData | null = null;

/** Rebuilds all scheduled reminders from the data. Safe to call often (calls are coalesced). */
export function syncNotifications(d: AppData): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  queued = d;
  if (!syncing) {
    syncing = (async () => {
      while (queued) {
        const data = queued;
        queued = null;
        try {
          await rebuild(data);
        } catch (e) {
          console.warn('Reminder sync failed', e);
        }
      }
      syncing = null;
    })();
  }
  return syncing;
}

async function rebuild(d: AppData) {
  if (!(await notificationsAllowed())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!d.profile) return;
  const s = d.settings;
  const now = Date.now();
  const today = todayStr();
  const name = d.profile.name || 'friend';

  // Morning: one per day so it can list that day's events.
  if (s.remindMorning) {
    for (let i = 0; i < MORNING_DAYS; i++) {
      const date = addDays(today, i);
      const when = at(date, s.wakeTime);
      if (when.getTime() <= now) continue;
      if (i === 0 && d.dayPlans.some((p) => p.date === date)) continue; // already planned today
      const evs = eventsOn(d.events, date);
      const body = evs.length
        ? `Today: ${evs.map((e) => `${e.emoji} ${e.title}${e.time ? ' ' + e.time : ''}`).join(' · ')}. What else is your plan?`
        : 'What’s your plan for today? Two minutes, just for you.';
      await schedule(when, `Good morning, ${name} 🌿`, body, { screen: 'plan', date });
    }
  }

  // Evening: daily repeating checklist reminder.
  if (s.remindEvening) {
    const { hour, minute } = parseTime(s.eveningTime, '21:00');
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Time to tick your day ✓', body: 'What got done, what moves to tomorrow — and what went well?', data: { screen: 'evening' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
    });
  }

  // Year planner events.
  let count = 0;
  for (const o of upcoming(d.events, today, EVENT_WINDOW_DAYS)) {
    if (count >= MAX_EVENT_NOTIFS) break;
    const e = o.event;
    const yrs = yearsSince(e, o.date);
    const label = `${e.emoji} ${e.title}${yrs ? ` (${yrs} yrs)` : ''}`;
    if (e.remindOnDay) {
      // Timed events: remind 1 hour before (or at reminder time if earlier); all-day: at reminder time.
      let when = at(o.date, s.eventReminderTime);
      if (e.time) {
        const t = at(o.date, e.time);
        const hourBefore = new Date(t.getTime() - 60 * 60 * 1000);
        when = hourBefore < when ? hourBefore : when;
      }
      if (when.getTime() > now) {
        await schedule(when, `Today: ${label}`, e.time ? `At ${e.time}${e.note ? ' · ' + e.note : ''}` : e.note || 'On your planner today.', { screen: 'year', date: o.date });
        count++;
      }
    }
    for (const n of e.remindDaysBefore) {
      const when = at(addDays(o.date, -n), s.eventReminderTime);
      if (when.getTime() <= now) continue;
      await schedule(
        when,
        `${n === 1 ? 'Tomorrow' : `In ${n} days`}: ${label}`,
        `${prettyDate(o.date)}${e.time ? ' at ' + e.time : ''}${e.note ? ' · ' + e.note : ''}`,
        { screen: 'year', date: o.date },
      );
      count++;
    }
  }
}

/** Subscribes to taps on reminders; also delivers the tap that opened the app. */
export function onReminderTap(cb: (t: NotifyTarget) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  const handle = (r: Notifications.NotificationResponse | null) => {
    const data = r?.notification.request.content.data as NotifyTarget | undefined;
    if (data?.screen) cb(data);
  };
  handle(Notifications.getLastNotificationResponse());
  Notifications.clearLastNotificationResponse();
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
