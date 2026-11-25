import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore, todayStr, uid } from '../lib/store';
import {
  EVENT_EMOJIS,
  MONTHS,
  REMIND_BEFORE_OPTIONS,
  addDays,
  carriedInto,
  eventsOn,
  planFor,
  planProgress,
  prettyDate,
  relativeDay,
  upcoming,
  upsertPlan,
  yearsSince,
} from '../lib/planner';
import { Btn, Card, Chip, Choice, Field, H, LinkBtn, Row, Screen, Segmented, T, confirmAsync } from '../components/ui';
import { MonthGrid, TimeField, to12h } from '../components/pickers';
import { useTheme } from '../components/theme';
import type { DayPlan, PlanItem, PlanStatus, PlannerEvent } from '../lib/types';
import Dictate from '../components/Dictate';
import { parseSpokenPlan } from '../lib/voicePlan';

const byTime = (a: PlanItem, b: PlanItem) => (a.time ?? '99').localeCompare(b.time ?? '99');

export type PlanView = 'today' | 'evening' | 'year';

export default function Plan({ view, setView, focusDate }: { view: PlanView; setView: (v: PlanView) => void; focusDate?: string }) {
  if (view === 'evening') return <Evening done={() => setView('today')} />;
  return (
    <Screen>
      <Segmented<'today' | 'year'>
        options={[
          { key: 'today', label: '☀️ Today' },
          { key: 'year', label: '📅 Year planner' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'today' ? <Today openEvening={() => setView('evening')} openYear={() => setView('year')} /> : <Year initialDate={focusDate} />}
    </Screen>
  );
}

// ======================= TODAY =======================

function EventsTodayCard({ date, openYear }: { date: string; openYear: () => void }) {
  const { data } = useStore();
  const evs = eventsOn(data.events, date);
  const soon = upcoming(data.events, addDays(date, 1), 7);
  if (!evs.length && !soon.length) return null;
  return (
    <Card>
      {evs.length > 0 && (
        <>
          <H level={3}>On your planner today</H>
          {evs.map((e) => (
            <T key={e.id} style={{ marginVertical: 2 }}>
              {e.emoji} <T bold>{e.title}</T>
              {e.time ? `  ·  ${to12h(e.time)}` : ''}
            </T>
          ))}
        </>
      )}
      {soon.length > 0 && (
        <>
          <T small muted style={{ marginTop: evs.length ? 10 : 0 }}>Coming up this week</T>
          {soon.slice(0, 4).map((o) => (
            <T key={o.event.id + o.date} small>
              {o.event.emoji} {o.event.title} · {relativeDay(o.date)}
            </T>
          ))}
        </>
      )}
      <LinkBtn title="Open year planner" onPress={openYear} />
    </Card>
  );
}

function Today({ openEvening, openYear }: { openEvening: () => void; openYear: () => void }) {
  const { data, update } = useStore();
  const today = todayStr();
  const plan = planFor(data, today);
  return (
    <View>
      <H>{prettyDate(today)}</H>
      <EventsTodayCard date={today} openYear={openYear} />
      {plan ? <Checklist plan={plan} openEvening={openEvening} /> : <PlanForm />}
      {!plan && data.settings.planSkippedOn !== today && (
        <LinkBtn title="Not today — skip planning" onPress={() => update((d) => ({ ...d, settings: { ...d.settings, planSkippedOn: today } }))} />
      )}
    </View>
  );
}

function RolePicker({ value, onChange }: { value?: string; onChange: (r?: string) => void }) {
  const { data } = useStore();
  return (
    <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
      {data.roles.map((r) => (
        <Chip key={r.id} label={`${r.emoji} ${r.name}`} on={value === r.name} onPress={() => onChange(value === r.name ? undefined : r.name)} />
      ))}
    </Row>
  );
}

function ItemAdder({ onAdd }: { onAdd: (items: PlanItem[]) => void }) {
  const [text, setText] = useState('');
  const [time, setTime] = useState<string | undefined>();
  const [role, setRole] = useState<string | undefined>();
  const [more, setMore] = useState(false);
  const [heard, setHeard] = useState('');
  const add = () => {
    if (!text.trim()) return;
    onAdd([{ id: uid(), text: text.trim(), time, role, status: 'open' }]);
    setText('');
    setTime(undefined);
    setRole(undefined);
  };
  const fromVoice = (spoken: string) => {
    const items = parseSpokenPlan(spoken);
    if (!items.length) return;
    onAdd(items.map((i) => ({ id: uid(), text: i.text, time: i.time, status: 'open' as PlanStatus })));
    setHeard(`Added ${items.length} from your voice: ${items.map((i) => (i.time ? `${i.text} (${to12h(i.time)})` : i.text)).join(' · ')}. Check the times, and tap ✕ on anything I misheard.`);
  };
  return (
    <View>
      <Dictate
        label="🎤 Speak your plan"
        hint="Say it naturally — e.g. “Cook lunch at 11, call Amma at 4 pm, then evening walk with the baby.”"
        onText={fromVoice}
      />
      {!!heard && <T small muted style={{ marginBottom: 8 }}>{heard}</T>}
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field value={text} onChangeText={setText} placeholder="Add something to today…" onSubmitEditing={add} returnKeyType="done" accessibilityLabel="New plan item" />
        </View>
        <Btn title="Add" disabled={!text.trim()} onPress={add} />
      </Row>
      {!more ? (
        <LinkBtn title="+ time / role" onPress={() => setMore(true)} />
      ) : (
        <>
          <TimeField label="Time (optional)" value={time} onChange={setTime} optional />
          <RolePicker value={role} onChange={setRole} />
        </>
      )}
    </View>
  );
}

function ItemLine({ item, right }: { item: PlanItem; right?: React.ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      <T style={item.status === 'done' ? { textDecorationLine: 'line-through', opacity: 0.6 } : undefined}>{item.text}</T>
      <T small muted>
        {[item.time && to12h(item.time), item.role, item.carriedFrom && `from ${relativeDay(item.carriedFrom).toLowerCase()}`].filter(Boolean).join(' · ')}
      </T>
      {right}
    </View>
  );
}

function PlanForm() {
  const { data, update } = useStore();
  const t = useTheme();
  const today = todayStr();
  const carried = useMemo(() => carriedInto(data, today), [data, today]);
  const [bring, setBring] = useState<Record<string, boolean>>(() => Object.fromEntries(carried.map((c) => [c.id, (c.carryCount ?? 0) < 3])));
  const [intention, setIntention] = useState('');
  const [items, setItems] = useState<PlanItem[]>([]);

  const save = () => {
    const brought: PlanItem[] = carried
      .filter((c) => bring[c.id])
      .map((c) => ({ ...c, id: uid(), status: 'open' as PlanStatus, carriedFrom: c.carriedFrom ?? data.dayPlans.find((p) => p.items.includes(c))?.date, carryCount: (c.carryCount ?? 0) + 1 }));
    const plan: DayPlan = {
      date: today,
      intention: intention.trim(),
      items: [...brought, ...items].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')),
      plannedAt: new Date().toISOString(),
    };
    update((d) => upsertPlan(d, plan));
  };

  return (
    <Card>
      <H level={2}>Plan my day ☀️</H>
      <T muted style={{ marginBottom: 12 }}>Two minutes. Only what’s realistic — with the baby, the house and everything else.</T>
      <Field label="What will I protect today?" value={intention} onChangeText={setIntention} placeholder="20 minutes of reading during the nap" />

      {carried.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <T bold style={{ marginBottom: 6 }}>From yesterday</T>
          {carried.map((c) => (
            <Pressable key={c.id} onPress={() => setBring((b) => ({ ...b, [c.id]: !b[c.id] }))} accessibilityRole="checkbox" accessibilityState={{ checked: !!bring[c.id] }} style={{ minHeight: 48, paddingVertical: 6 }}>
              <Row>
                <T size={22}>{bring[c.id] ? '☑️' : '⬜'}</T>
                <ItemLine
                  item={c}
                  right={(c.carryCount ?? 0) >= 3 ? <T small style={{ color: t.warn }}>Moved {c.carryCount} times — keep it, or let it go?</T> : undefined}
                />
              </Row>
            </Pressable>
          ))}
        </View>
      )}

      <T bold style={{ marginBottom: 6 }}>Today’s list</T>
      {items.map((i) => (
        <Row key={i.id} style={{ minHeight: 44 }}>
          <T>•</T>
          <ItemLine item={i} />
          <LinkBtn title="✕" onPress={() => setItems((xs) => xs.filter((x) => x.id !== i.id))} />
        </Row>
      ))}
      <ItemAdder onAdd={(add) => setItems((xs) => [...xs, ...add].sort(byTime))} />
      <Btn primary title="Save my plan" disabled={!items.length && !Object.values(bring).some(Boolean) && !intention.trim()} onPress={save} style={{ marginTop: 8 }} />
    </Card>
  );
}

function Checklist({ plan, openEvening }: { plan: DayPlan; openEvening: () => void }) {
  const { update } = useStore();
  const t = useTheme();
  const { done, total } = planProgress(plan);
  const setItems = (items: PlanItem[]) => update((d) => upsertPlan(d, { ...plan, items }));
  const toggle = (id: string) => setItems(plan.items.map((i) => (i.id === id ? { ...i, status: i.status === 'done' ? 'open' : 'done' } : i)));
  const hour = new Date().getHours();

  return (
    <>
      {!!plan.intention && (
        <Card style={{ backgroundColor: t.primarySoft }}>
          <T small muted>TODAY I PROTECT</T>
          <T bold size={17}>{plan.intention}</T>
        </Card>
      )}
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H level={3}>My day</H>
          <T muted>{total ? `${done} of ${total}` : ''}</T>
        </Row>
        {plan.items.length === 0 && <T muted>Nothing listed — that’s allowed.</T>}
        {plan.items.map((i) => (
          <Pressable key={i.id} onPress={() => toggle(i.id)} accessibilityRole="checkbox" accessibilityState={{ checked: i.status === 'done' }} style={{ minHeight: 52, paddingVertical: 6, borderTopWidth: 1, borderTopColor: t.line }}>
            <Row>
              <T size={22}>{i.status === 'done' ? '✅' : i.status === 'partly' ? '🌗' : i.status === 'moved' ? '➡️' : '⬜'}</T>
              <ItemLine item={i} />
              <LinkBtn title="✕" onPress={() => setItems(plan.items.filter((x) => x.id !== i.id))} />
            </Row>
          </Pressable>
        ))}
        <View style={{ marginTop: 8 }}>
          <ItemAdder onAdd={(add) => setItems([...plan.items, ...add].sort(byTime))} />
        </View>
      </Card>
      {plan.evening ? (
        <Card>
          <T>🌙 Evening check done. {plan.evening.wentWell ? `Went well: “${plan.evening.wentWell}”` : ''}</T>
          <LinkBtn title="Edit evening check" onPress={openEvening} />
        </Card>
      ) : (
        <Btn primary={hour >= 17} title="🌙 Evening check — tick my day" onPress={openEvening} />
      )}
    </>
  );
}

// ======================= EVENING =======================

function Evening({ done }: { done: () => void }) {
  const { data, update } = useStore();
  const t = useTheme();
  const today = todayStr();
  const plan = planFor(data, today);
  const [status, setStatus] = useState<Record<string, PlanStatus>>(() => Object.fromEntries((plan?.items ?? []).map((i) => [i.id, i.status])));
  const [wentWell, setWentWell] = useState(plan?.evening?.wentWell ?? '');
  const [mine, setMine] = useState(plan?.evening?.mine ?? '');

  const save = () => {
    const base: DayPlan = plan ?? { date: today, intention: '', items: [], plannedAt: new Date().toISOString() };
    update((d) =>
      upsertPlan(d, {
        ...base,
        // anything left unticked moves to tomorrow
        items: base.items.map((i) => ({ ...i, status: status[i.id] === 'open' ? 'moved' : status[i.id] ?? i.status })),
        evening: { wentWell: wentWell.trim(), mine: mine.trim(), doneAt: new Date().toISOString() },
      }),
    );
    done();
  };

  const opts: { key: PlanStatus; label: string }[] = [
    { key: 'done', label: '✅ Done' },
    { key: 'partly', label: '🌗 Partly' },
    { key: 'moved', label: '➡️ Tomorrow' },
  ];

  return (
    <Screen
      footer={
        <>
          <Btn title="Back" onPress={done} style={{ flex: 1 }} />
          <Btn primary title="Save my evening" onPress={save} style={{ flex: 1 }} />
        </>
      }
    >
      <H>Evening check 🌙</H>
      <T muted style={{ marginBottom: 12 }}>No failing here — things are done, partly done, or moved.</T>
      <Card>
        {!plan?.items.length && <T muted>You didn’t list anything today. Just the two questions below.</T>}
        {plan?.items.map((i) => (
          <View key={i.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.line }}>
            <ItemLine item={i} />
            <Row style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {opts.map((o) => (
                <Chip key={o.key} label={o.label} on={status[i.id] === o.key} onPress={() => setStatus((s) => ({ ...s, [i.id]: o.key }))} />
              ))}
            </Row>
          </View>
        ))}
        {!!plan?.items.length && <T small muted style={{ marginTop: 8 }}>Anything not ticked moves to tomorrow.</T>}
      </Card>
      <Card>
        <Field label="What went well today?" value={wentWell} onChangeText={setWentWell} multiline placeholder="Baby napped well; I finished the chapter." />
        <Field label="Which part of today was mine?" value={mine} onChangeText={setMine} multiline placeholder="Ten quiet minutes with tea on the balcony." />
      </Card>
    </Screen>
  );
}

// ======================= YEAR =======================

function Year({ initialDate }: { initialDate?: string }) {
  const { data } = useStore();
  const t = useTheme();
  const start = initialDate ?? todayStr();
  const [ym, setYm] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const [selected, setSelected] = useState(start);
  const [editing, setEditing] = useState<PlannerEvent | null>(null);

  const marks = useMemo(() => {
    const out: Record<string, string[]> = {};
    const first = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-01`;
    for (const o of upcoming(data.events, first, 31)) (out[o.date] ??= []).push(t.primary);
    return out;
  }, [data.events, ym, t.primary]);

  if (editing) return <EventEditor initial={editing} close={() => setEditing(null)} />;

  const shift = (n: number) => setYm(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 }));
  const dayEvents = eventsOn(data.events, selected);
  const next = upcoming(data.events, todayStr(), 60);
  const blank = (date: string): PlannerEvent => ({ id: '', title: '', date, emoji: '📅', repeatYearly: false, remindOnDay: true, remindDaysBefore: [1] });

  return (
    <View>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Btn title="‹" onPress={() => shift(-1)} />
          <H level={3}>{MONTHS[ym.m]} {ym.y}</H>
          <Btn title="›" onPress={() => shift(1)} />
        </Row>
        <MonthGrid year={ym.y} month={ym.m} selected={selected} onSelect={setSelected} marks={marks} />
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H level={3}>{prettyDate(selected)}</H>
          <LinkBtn title="+ Add" onPress={() => setEditing(blank(selected))} />
        </Row>
        {dayEvents.length === 0 && <T muted>Nothing planned.</T>}
        {dayEvents.map((e) => <EventRow key={e.id} e={e} date={selected} onPress={() => setEditing(e)} />)}
      </Card>

      <Card>
        <H level={3}>Coming up (60 days)</H>
        {next.length === 0 && <T muted>Add birthdays, appointments, school days, festivals — you’ll be reminded on the day and before.</T>}
        {next.map((o) => (
          <EventRow key={o.event.id + o.date} e={o.event} date={o.date} showDate onPress={() => setEditing(o.event)} />
        ))}
      </Card>
      <Btn primary title="+ New event" onPress={() => setEditing(blank(selected))} />
    </View>
  );
}

function EventRow({ e, date, onPress, showDate }: { e: PlannerEvent; date: string; onPress: () => void; showDate?: boolean }) {
  const t = useTheme();
  const yrs = yearsSince(e, date);
  const reminders = [e.remindOnDay && 'on the day', ...e.remindDaysBefore.map((n) => REMIND_BEFORE_OPTIONS.find((o) => o.days === n)?.label ?? `${n} days before`)].filter(Boolean);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ minHeight: 52, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.line }}>
      <Row>
        <T size={22}>{e.emoji}</T>
        <View style={{ flex: 1 }}>
          <T bold>
            {e.title}
            {yrs ? ` · ${yrs} yrs` : ''}
          </T>
          <T small muted>
            {[showDate && `${relativeDay(date)} · ${prettyDate(date, false)}`, e.time && to12h(e.time), e.repeatYearly && 'every year', reminders.length ? `🔔 ${reminders.join(', ')}` : '🔕'].filter(Boolean).join(' · ')}
          </T>
        </View>
      </Row>
    </Pressable>
  );
}

function EventEditor({ initial, close }: { initial: PlannerEvent; close: () => void }) {
  const { update } = useStore();
  const [e, setE] = useState<PlannerEvent>(initial);
  const [ym, setYm] = useState({ y: Number(initial.date.slice(0, 4)), m: Number(initial.date.slice(5, 7)) - 1 });
  const shift = (n: number) => setYm(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 }));

  const save = () => {
    const item = { ...e, title: e.title.trim(), id: e.id || uid() };
    update((d) => ({ ...d, events: [...d.events.filter((x) => x.id !== item.id), item] }));
    close();
  };
  const remove = async () => {
    if (await confirmAsync('Delete this event?', e.title, 'Delete', true)) {
      update((d) => ({ ...d, events: d.events.filter((x) => x.id !== e.id) }));
      close();
    }
  };
  const toggleBefore = (n: number) =>
    setE((x) => ({ ...x, remindDaysBefore: x.remindDaysBefore.includes(n) ? x.remindDaysBefore.filter((k) => k !== n) : [...x.remindDaysBefore, n].sort((a, b) => a - b) }));

  return (
    <View>
      <H>{e.id ? 'Edit event' : 'New event'}</H>
      <Card>
        <Field label="What is it?" value={e.title} onChangeText={(v) => setE({ ...e, title: v })} placeholder="Amma’s check-up · Baby’s vaccine · Anniversary" />
        <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          {EVENT_EMOJIS.map((em) => (
            <Chip key={em} label={em} on={e.emoji === em} onPress={() => setE({ ...e, emoji: em })} />
          ))}
        </Row>
      </Card>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Btn title="‹" onPress={() => shift(-1)} />
          <T bold>{MONTHS[ym.m]} {ym.y}</T>
          <Btn title="›" onPress={() => shift(1)} />
        </Row>
        <MonthGrid year={ym.y} month={ym.m} selected={e.date} onSelect={(date) => setE({ ...e, date })} />
        <T style={{ marginTop: 8 }}>📅 {prettyDate(e.date)}</T>
        <View style={{ height: 10 }} />
        <TimeField label="Time (optional)" value={e.time} onChange={(time) => setE({ ...e, time })} optional />
        <Choice label={e.repeatYearly ? '🔁 Repeats every year' : 'Repeat every year? (birthdays, anniversaries)'} on={e.repeatYearly} onPress={() => setE({ ...e, repeatYearly: !e.repeatYearly })} />
      </Card>
      <Card>
        <H level={3}>🔔 Remind me</H>
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          <Chip label={e.time ? 'On the day (1 hour before)' : 'On the day'} on={e.remindOnDay} onPress={() => setE({ ...e, remindOnDay: !e.remindOnDay })} />
          {REMIND_BEFORE_OPTIONS.map((o) => (
            <Chip key={o.days} label={o.label} on={e.remindDaysBefore.includes(o.days)} onPress={() => toggleBefore(o.days)} />
          ))}
        </Row>
        <Field label="Note (optional)" value={e.note ?? ''} onChangeText={(note) => setE({ ...e, note })} placeholder="Carry the vaccination card" />
      </Card>
      <Row>
        {!!e.id && <Btn danger title="Delete" onPress={remove} style={{ flex: 1 }} />}
        <Btn title="Cancel" onPress={close} style={{ flex: 1 }} />
        <Btn primary title="Save" disabled={!e.title.trim()} onPress={save} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}
