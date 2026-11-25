import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore, uid } from '../lib/store';
import { habitDaysInLast, meRole } from '../lib/insights';
import { Btn, Card, Field, H, LinkBtn, Row, Screen, Slider, T } from '../components/ui';
import { useTheme } from '../components/theme';
import type { Habit, Role } from '../lib/types';

const emptyHabit = (): Habit => ({ id: '', identity: '', anchor: '', minimum: '', normal: '', stretch: '', createdAt: '' });

export default function Rhythm() {
  const { data, update } = useStore();
  const t = useTheme();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [roleOpen, setRoleOpen] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');

  const setRole = (id: string, patch: Partial<Role>) => update((d) => ({ ...d, roles: d.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  if (editing) {
    const save = () => {
      update((d) => {
        const exists = d.habits.some((x) => x.id === editing.id);
        const item = exists ? editing : { ...editing, id: uid(), createdAt: new Date().toISOString() };
        return { ...d, habits: exists ? d.habits.map((x) => (x.id === item.id ? item : x)) : [...d.habits, item] };
      });
      setEditing(null);
    };
    const rest = () => {
      update((d) => ({ ...d, habits: d.habits.map((x) => (x.id === editing.id ? { ...x, archived: true } : x)) }));
      setEditing(null);
    };
    const f = (k: 'identity' | 'anchor' | 'minimum' | 'normal' | 'stretch', label: string, ph: string) => (
      <Field label={label} value={editing[k]} placeholder={ph} onChangeText={(v) => setEditing({ ...editing, [k]: v })} />
    );
    return (
      <Screen
        footer={
          <>
            {!!editing.id && <Btn danger title="Rest it" onPress={rest} style={{ flex: 1 }} />}
            <Btn title="Cancel" onPress={() => setEditing(null)} style={{ flex: 1 }} />
            <Btn primary title="Save" disabled={!editing.identity.trim() || !editing.minimum.trim()} onPress={save} style={{ flex: 1 }} />
          </>
        }
      >
        <H>{editing.id ? 'Edit habit' : 'New tiny habit'}</H>
        <T muted style={{ marginBottom: 12 }}>Every small action is a vote for who you are becoming.</T>
        <Card>
          {f('identity', 'I am a woman who…', 'reads')}
          {f('anchor', 'After I… (an existing moment)', 'finish morning chai')}
          {f('minimum', 'Minimum — hardest-day size', 'read 1 page')}
          {f('normal', 'Normal (optional)', 'read 10 minutes')}
          {f('stretch', 'Stretch (optional)', 'read a full chapter')}
        </Card>
      </Screen>
    );
  }

  const roles = data.roles;
  const total = roles.reduce((a, r) => a + r.hoursWeek, 0) || 1;
  const me = meRole(data);
  const habits = data.habits.filter((h) => !h.archived);

  return (
    <Screen>
      <H>Rhythm</H>
      <T muted style={{ marginBottom: 12 }}>Tiny habits and the roles you carry.</T>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <H level={3}>Tiny habits</H>
          <LinkBtn title="+ Add" onPress={() => setEditing(emptyHabit())} />
        </Row>
        {habits.map((h) => (
          <Pressable key={h.id} onPress={() => setEditing(h)} accessibilityRole="button" style={{ minHeight: 52, paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.line }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <T bold>{h.identity}</T>
                <T small muted>min: {h.minimum}</T>
              </View>
              <T small muted>{habitDaysInLast(data, h.id)}/21</T>
            </Row>
          </Pressable>
        ))}
        <T small muted style={{ marginTop: 6 }}>Missed a day? Never mind. Just don’t miss twice. 🌱</T>
      </Card>

      <Card>
        <H level={3}>My roles · hours per week</H>
        {me && me.hoursWeek === 0 && <T style={{ color: t.warn, marginBottom: 8 }}>🌱 “Me” has no time this week. Even 15 minutes is a real start.</T>}
        {roles.map((r) => (
          <View key={r.id}>
            <Pressable onPress={() => setRoleOpen(roleOpen === r.id ? null : r.id)} accessibilityRole="button" style={{ minHeight: 46, justifyContent: 'center' }}>
              <Row>
                <T bold style={{ width: 140 }} >{`${r.emoji} ${r.name}`}</T>
                <View style={{ flex: 1, height: 12, borderRadius: 6, backgroundColor: t.primarySoft, overflow: 'hidden' }}>
                  <View style={{ width: `${(r.hoursWeek / total) * 100}%`, height: '100%', backgroundColor: r.isMe ? t.desired : t.primary, borderRadius: 6 }} />
                </View>
                <T muted style={{ width: 40, textAlign: 'right' }}>{r.hoursWeek}h</T>
              </Row>
            </Pressable>
            {roleOpen === r.id && (
              <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.line }}>
                <Slider label="Hours per week" value={r.hoursWeek} max={100} onChange={(v) => setRole(r.id, { hoursWeek: v })} />
                <Slider label="Energy it takes" value={r.energyGiven} onChange={(v) => setRole(r.id, { energyGiven: v })} />
                <Slider label="Energy it gives back" value={r.energyReceived} onChange={(v) => setRole(r.id, { energyReceived: v })} />
                <Slider label="How satisfied I feel in it" value={r.satisfaction} onChange={(v) => setRole(r.id, { satisfaction: v })} />
                <Field label="Who I want to be in this role" value={r.intention} onChangeText={(v) => setRole(r.id, { intention: v })} placeholder="present, not perfect" />
                {!r.isMe && <LinkBtn danger title="Remove role" onPress={() => update((d) => ({ ...d, roles: d.roles.filter((x) => x.id !== r.id) }))} />}
              </View>
            )}
          </View>
        ))}
        <Row style={{ marginTop: 10, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Field value={newRole} onChangeText={setNewRole} placeholder="Add a role (e.g. Sister)" />
          </View>
          <Btn
            title="Add"
            disabled={!newRole.trim()}
            onPress={() => {
              update((d) => ({ ...d, roles: [...d.roles, { id: uid(), name: newRole.trim(), emoji: '⭐', hoursWeek: 0, energyGiven: 5, energyReceived: 5, satisfaction: 5, intention: '' }] }));
              setNewRole('');
            }}
          />
        </Row>
        <T small muted>Tap a role to set hours and energy. Balance isn’t equal time — it’s conscious choice for this season.</T>
      </Card>

      {roles.length > 1 && (
        <Card>
          <H level={3}>Energy balance</H>
          {roles.map((r) => {
            const net = r.energyReceived - r.energyGiven;
            return (
              <Row key={r.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.line }}>
                <T>{`${r.emoji} ${r.name}`}</T>
                <T bold style={{ color: net >= 0 ? t.up : t.warn }}>{net >= 0 ? `gives +${net}` : `takes ${net}`}</T>
              </Row>
            );
          })}
          <T small muted style={{ marginTop: 6 }}>Roles that take much more than they give may need sharing, simplifying, or a boundary.</T>
        </Card>
      )}
    </Screen>
  );
}
