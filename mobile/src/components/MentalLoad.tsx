import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore, uid } from '../lib/store';
import { Btn, Card, Chip, Field, H, LinkBtn, Row, T } from './ui';
import { useTheme } from './theme';
import type { LoadTask, Who } from '../lib/types';

// Inspired by the idea that every household task has three parts: noticing it needs doing,
// planning it, and doing it. The invisible parts are usually carried by one person.
const PRESETS = [
  'Meals & groceries', 'Baby’s doctor & vaccines', 'Night wakings', 'Laundry', 'Cleaning', 'Bills & payments',
  'Gifts & family occasions', 'School / daycare', 'Parents’ health follow-ups', 'Guests & hosting', 'Festivals & poojas',
  'Household repairs', 'Kids’ clothes & sizes', 'Medicines & refills', 'Weekend plans',
];
const WHO: { key: Who; label: string }[] = [
  { key: 'me', label: 'Me' },
  { key: 'partner', label: 'Partner' },
  { key: 'shared', label: 'Shared' },
  { key: 'family', label: 'Family' },
  { key: 'paid', label: 'Paid help' },
];
const ACTIONS: { key: LoadTask['action']; label: string }[] = [
  { key: 'keep', label: '✔️ Keep' },
  { key: 'share', label: '🤝 Share' },
  { key: 'simplify', label: '✂️ Simplify' },
  { key: 'drop', label: '🗑️ Drop' },
];
const nextWho = (w: Who) => WHO[(WHO.findIndex((x) => x.key === w) + 1) % WHO.length].key;
const whoLabel = (w: Who) => WHO.find((x) => x.key === w)!.label;

export default function MentalLoad() {
  const { data, update } = useStore();
  const t = useTheme();
  const [open, setOpen] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const tasks = data.loadTasks;
  const setTask = (id: string, patch: Partial<LoadTask>) => update((d) => ({ ...d, loadTasks: d.loadTasks.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const add = (name: string) => update((d) => ({ ...d, loadTasks: [...d.loadTasks, { id: uid(), name, notices: 'me', plans: 'me', does: 'me', action: 'keep' }] }));

  const mine = (k: 'notices' | 'plans' | 'does') => tasks.filter((x) => x[k] === 'me').length;
  const unused = PRESETS.filter((p) => !tasks.some((x) => x.name === p));

  return (
    <Card>
      <H level={3}>🧠 My mental load</H>
      <T small muted style={{ marginBottom: 8 }}>
        Every task has three parts: noticing it needs doing, planning it, and doing it. The first two are invisible — and heavy.
      </T>
      {tasks.length > 0 && (
        <View style={{ backgroundColor: t.primarySoft, borderRadius: 12, padding: 10, marginBottom: 8 }}>
          <T>
            I notice <T bold>{mine('notices')}</T>, plan <T bold>{mine('plans')}</T> and do <T bold>{mine('does')}</T> of {tasks.length} jobs.
          </T>
          {mine('notices') >= Math.max(3, tasks.length * 0.7) && <T small style={{ marginTop: 4 }}>That’s a lot to hold in one head. Which one could someone else fully own — noticing included?</T>}
        </View>
      )}
      {tasks.map((x) => (
        <View key={x.id} style={{ borderTopWidth: 1, borderTopColor: t.line, paddingVertical: 6 }}>
          <Pressable onPress={() => setOpen(open === x.id ? null : x.id)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T bold style={{ flex: 1 }}>{x.name}</T>
              <T small muted>{ACTIONS.find((a) => a.key === x.action)?.label}</T>
            </Row>
            <T small muted>
              notices: {whoLabel(x.notices)} · plans: {whoLabel(x.plans)} · does: {whoLabel(x.does)}
            </T>
          </Pressable>
          {open === x.id && (
            <View style={{ marginTop: 6 }}>
              {(['notices', 'plans', 'does'] as const).map((k) => (
                <Row key={k} style={{ marginBottom: 6 }}>
                  <T style={{ width: 84 }}>{k === 'notices' ? 'Notices' : k === 'plans' ? 'Plans' : 'Does'}</T>
                  <Chip label={whoLabel(x[k])} on onPress={() => setTask(x.id, { [k]: nextWho(x[k]) })} />
                  <T small muted>tap to change</T>
                </Row>
              ))}
              <Row style={{ flexWrap: 'wrap', gap: 6 }}>
                {ACTIONS.map((a) => (
                  <Chip key={a.key} label={a.label} on={x.action === a.key} onPress={() => setTask(x.id, { action: a.key })} />
                ))}
              </Row>
              <LinkBtn danger title="Remove" onPress={() => update((d) => ({ ...d, loadTasks: d.loadTasks.filter((y) => y.id !== x.id) }))} />
            </View>
          )}
        </View>
      ))}
      {unused.length > 0 && (
        <>
          <T small muted style={{ marginTop: 8 }}>Tap to add common jobs:</T>
          <Row style={{ flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
            {unused.slice(0, 15).map((p) => (
              <Chip key={p} label={`+ ${p}`} onPress={() => add(p)} />
            ))}
          </Row>
        </>
      )}
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field value={custom} onChangeText={setCustom} placeholder="Another job…" />
        </View>
        <Btn title="Add" disabled={!custom.trim()} onPress={() => { add(custom.trim()); setCustom(''); }} />
      </Row>
    </Card>
  );
}
