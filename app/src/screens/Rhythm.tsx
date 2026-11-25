import { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { habitDaysInLast, meRole } from '../lib/insights';
import { Card, Slider } from '../components/ui';
import type { Habit, Role } from '../lib/types';

const emptyHabit = (): Habit => ({ id: '', identity: '', anchor: '', minimum: '', normal: '', stretch: '', createdAt: '' });

export default function Rhythm() {
  const { data, update } = useStore();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [roleOpen, setRoleOpen] = useState<string | null>(null);

  const saveHabit = (h: Habit) => {
    update((d) => {
      const exists = d.habits.some((x) => x.id === h.id);
      const item = exists ? h : { ...h, id: uid(), createdAt: new Date().toISOString() };
      return { ...d, habits: exists ? d.habits.map((x) => (x.id === h.id ? item : x)) : [...d.habits, item] };
    });
    setEditing(null);
  };

  const setRole = (id: string, patch: Partial<Role>) => update((d) => ({ ...d, roles: d.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const addRole = () => {
    const name = prompt('Name of the role (e.g. Sister, Volunteer)');
    if (name?.trim())
      update((d) => ({
        ...d,
        roles: [...d.roles, { id: uid(), name: name.trim(), emoji: '⭐', hoursWeek: 0, energyGiven: 5, energyReceived: 5, satisfaction: 5, intention: '' }],
      }));
  };

  if (editing) {
    const f = (k: keyof Habit, label: string, ph: string) => (
      <label className="field">
        <span className="field-label">{label}</span>
        <input value={String(editing[k] ?? '')} placeholder={ph} onChange={(e) => setEditing({ ...editing, [k]: e.target.value })} />
      </label>
    );
    return (
      <div className="screen">
        <header className="screen-head">
          <h1>{editing.id ? 'Edit habit' : 'New tiny habit'}</h1>
          <p className="muted">Every small action is a vote for who you are becoming.</p>
        </header>
        <Card>
          {f('identity', 'I am a woman who…', 'reads')}
          {f('anchor', 'After I… (an existing moment)', 'finish morning chai')}
          {f('minimum', 'Minimum — hardest-day size', 'read 1 page')}
          {f('normal', 'Normal (optional)', 'read 10 minutes')}
          {f('stretch', 'Stretch (optional)', 'read a full chapter')}
        </Card>
        <div className="sticky-actions">
          {editing.id && (
            <button className="btn danger" onClick={() => { update((d) => ({ ...d, habits: d.habits.map((x) => (x.id === editing.id ? { ...x, archived: true } : x)) })); setEditing(null); }}>
              Rest it
            </button>
          )}
          <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn btn-primary" disabled={!editing.identity.trim() || !editing.minimum.trim()} onClick={() => saveHabit(editing)}>Save</button>
        </div>
      </div>
    );
  }

  const roles = data.roles;
  const totalHours = roles.reduce((a, r) => a + r.hoursWeek, 0) || 1;
  const me = meRole(data);

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Rhythm</h1>
        <p className="muted">Tiny habits and the roles you carry.</p>
      </header>

      <Card>
        <div className="card-head">
          <h3>Tiny habits</h3>
          <button className="link" onClick={() => setEditing(emptyHabit())}>+ Add</button>
        </div>
        {data.habits.filter((h) => !h.archived).map((h) => (
          <button key={h.id} className="row-btn" onClick={() => setEditing(h)}>
            <span>
              <b>{h.identity}</b>
              <small className="muted"> · min: {h.minimum}</small>
            </span>
            <small className="muted">{habitDaysInLast(data, h.id)}/21</small>
          </button>
        ))}
        <p className="small muted">Missed a day? Never mind. Just don’t miss twice. 🌱</p>
      </Card>

      <Card>
        <div className="card-head">
          <h3>My roles · hours per week</h3>
          <button className="link" onClick={addRole}>+ Role</button>
        </div>
        {me && me.hoursWeek === 0 && <p className="warn">🌱 “Me” has no time this week. Even 15 minutes is a real start.</p>}
        <div className="bars">
          {roles.map((r) => (
            <div key={r.id} className="bar-row">
              <button className="bar-label" onClick={() => setRoleOpen(roleOpen === r.id ? null : r.id)}>
                {r.emoji} {r.name}
              </button>
              <div className="bar-track">
                <div className={`bar-fill ${r.isMe ? 'me' : ''}`} style={{ width: `${(r.hoursWeek / totalHours) * 100}%` }} />
              </div>
              <span className="bar-val">{r.hoursWeek}h</span>
              {roleOpen === r.id && (
                <div className="role-detail">
                  <Slider label="Hours per week" value={r.hoursWeek} max={100} onChange={(v) => setRole(r.id, { hoursWeek: v })} />
                  <Slider label="Energy it takes" value={r.energyGiven} onChange={(v) => setRole(r.id, { energyGiven: v })} />
                  <Slider label="Energy it gives back" value={r.energyReceived} onChange={(v) => setRole(r.id, { energyReceived: v })} />
                  <Slider label="How satisfied I feel in it" value={r.satisfaction} onChange={(v) => setRole(r.id, { satisfaction: v })} />
                  <label className="field">
                    <span className="field-label">Who I want to be in this role</span>
                    <input value={r.intention} onChange={(e) => setRole(r.id, { intention: e.target.value })} placeholder="present, not perfect" />
                  </label>
                  {!r.isMe && (
                    <button className="link danger" onClick={() => update((d) => ({ ...d, roles: d.roles.filter((x) => x.id !== r.id) }))}>
                      Remove role
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="small muted">Tap a role to set hours and energy. Balance isn’t equal time — it’s conscious choice for this season.</p>
      </Card>

      {roles.length > 1 && (
        <Card>
          <h3>Energy balance</h3>
          {roles.map((r) => {
            const net = r.energyReceived - r.energyGiven;
            return (
              <div key={r.id} className="piece">
                <span>{r.emoji} {r.name}</span>
                <b className={net >= 0 ? 'up' : 'down'}>{net >= 0 ? `gives +${net}` : `takes ${net}`}</b>
              </div>
            );
          })}
          <p className="small muted">Roles that take much more than they give may need sharing, simplifying, or a boundary.</p>
        </Card>
      )}
    </div>
  );
}
