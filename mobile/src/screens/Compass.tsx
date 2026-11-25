import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore, todayStr, uid } from '../lib/store';
import { MONTHS, addDays, prettyDate } from '../lib/planner';
import { Btn, Card, Chip, Field, H, LinkBtn, Row, Segmented, T, confirmAsync } from '../components/ui';
import { MonthGrid } from '../components/pickers';
import { useTheme } from '../components/theme';
import type { Dream, DreamOrigin, DreamStage, Letter } from '../lib/types';

const ORIGINS: { key: DreamOrigin; label: string; hint: string }[] = [
  { key: 'revive', label: '🔁 Revive', hint: 'An old dream I put on the shelf' },
  { key: 'evolve', label: '🦋 Evolve', hint: 'An old dream in a new shape' },
  { key: 'new', label: '✨ New', hint: 'Something I want now' },
];
const STAGES: { key: DreamStage; label: string; hint: string }[] = [
  { key: 'seed', label: '🌰 Seed', hint: '~15 min a week — heavy season' },
  { key: 'sprout', label: '🌱 Sprout', hint: 'A little most weeks' },
  { key: 'grow', label: '🌳 Grow', hint: 'Real time and focus' },
];

export default function Compass() {
  const [view, setView] = useState<'dreams' | 'letters'>('dreams');
  return (
    <View>
      <H level={2}>🧭 Compass — my way forward</H>
      <T muted style={{ marginBottom: 8 }}>Dreams sized for this season of life. Nothing is abandoned — some just wait as seeds.</T>
      <Segmented<'dreams' | 'letters'>
        options={[
          { key: 'dreams', label: '🌱 Dreams' },
          { key: 'letters', label: '💌 Letters to future me' },
        ]}
        value={view}
        onChange={setView}
      />
      {view === 'dreams' ? <Dreams /> : <Letters />}
    </View>
  );
}

// ---------------- Dreams ----------------
function Dreams() {
  const { data } = useStore();
  const [editing, setEditing] = useState<Dream | null>(null);
  if (editing) return <DreamEditor initial={editing} close={() => setEditing(null)} />;
  const blank = (): Dream => ({ id: '', title: '', origin: 'revive', stage: 'seed', why: '', outcome: '', obstacle: '', plan: '', steps: [], createdAt: '' });

  return (
    <View>
      {data.dreams.length === 0 && (
        <Card>
          <T>What dream did you put on the shelf? Is it still yours, or has it changed shape?</T>
        </Card>
      )}
      {data.dreams.map((d) => {
        const done = d.steps.filter((s) => s.done).length;
        return (
          <Pressable key={d.id} onPress={() => setEditing(d)} accessibilityRole="button">
            <Card>
              <T small muted>
                {ORIGINS.find((o) => o.key === d.origin)?.label} · {STAGES.find((s) => s.key === d.stage)?.label}
              </T>
              <T bold size={17}>{d.title}</T>
              {!!d.why && <T muted>{d.why}</T>}
              {d.steps.length > 0 && <T small style={{ marginTop: 4 }}>Steps: {done} of {d.steps.length}{d.steps.find((s) => !s.done) ? ` · next: ${d.steps.find((s) => !s.done)!.text}` : ' 🎉'}</T>}
            </Card>
          </Pressable>
        );
      })}
      <Btn primary title="+ Add a dream" onPress={() => setEditing(blank())} />
    </View>
  );
}

function DreamEditor({ initial, close }: { initial: Dream; close: () => void }) {
  const { update } = useStore();
  const t = useTheme();
  const [d, setD] = useState<Dream>(initial);
  const [step, setStep] = useState('');
  const save = () => {
    const item = { ...d, id: d.id || uid(), createdAt: d.createdAt || new Date().toISOString(), title: d.title.trim() };
    update((x) => ({ ...x, dreams: [...x.dreams.filter((y) => y.id !== item.id), item] }));
    close();
  };
  const remove = async () => {
    if (await confirmAsync('Let this dream go?', 'It will be deleted.', 'Delete', true)) {
      update((x) => ({ ...x, dreams: x.dreams.filter((y) => y.id !== d.id) }));
      close();
    }
  };
  return (
    <View>
      <H>{d.id ? 'My dream' : 'New dream'}</H>
      <Card>
        <Field label="The dream" value={d.title} onChangeText={(title) => setD({ ...d, title })} placeholder="Paint again · Finish my degree · Start a small bakery" />
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          {ORIGINS.map((o) => (
            <Chip key={o.key} label={o.label} on={d.origin === o.key} onPress={() => setD({ ...d, origin: o.key })} />
          ))}
        </Row>
        <T small muted style={{ marginBottom: 8 }}>{ORIGINS.find((o) => o.key === d.origin)?.hint}</T>
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          {STAGES.map((s) => (
            <Chip key={s.key} label={s.label} on={d.stage === s.key} onPress={() => setD({ ...d, stage: s.key })} />
          ))}
        </Row>
        <T small muted style={{ marginBottom: 8 }}>{STAGES.find((s) => s.key === d.stage)?.hint}</T>
        <Field label="Why it matters to me" multiline value={d.why} onChangeText={(why) => setD({ ...d, why })} placeholder="When I paint, I feel like me again." />
      </Card>
      <Card>
        <H level={3}>A simple plan (wish → outcome → obstacle → plan)</H>
        <Field label="Best outcome — how would it feel?" multiline value={d.outcome} onChangeText={(outcome) => setD({ ...d, outcome })} placeholder="A small painting on our wall that I made." />
        <Field label="My main inner obstacle" multiline value={d.obstacle} onChangeText={(obstacle) => setD({ ...d, obstacle })} placeholder="Feeling guilty taking time for myself." />
        <Field label="If that happens, then I will…" multiline value={d.plan} onChangeText={(plan) => setD({ ...d, plan })} placeholder="…remind myself that a happier me is a better mother, and paint for just 10 minutes." />
      </Card>
      <Card>
        <H level={3}>Tiny next steps</H>
        {d.steps.map((s) => (
          <Row key={s.id} style={{ minHeight: 46, borderTopWidth: 1, borderTopColor: t.line }}>
            <Pressable
              onPress={() => setD({ ...d, steps: d.steps.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)) })}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.done }}
              style={{ flexDirection: 'row', flex: 1, alignItems: 'center', gap: 10 }}
            >
              <T size={20}>{s.done ? '✅' : '⬜'}</T>
              <T style={s.done ? { textDecorationLine: 'line-through', opacity: 0.6 } : undefined}>{s.text}</T>
            </Pressable>
            <LinkBtn title="✕" onPress={() => setD({ ...d, steps: d.steps.filter((x) => x.id !== s.id) })} />
          </Row>
        ))}
        <Row style={{ alignItems: 'flex-start', marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Field value={step} onChangeText={setStep} placeholder="Buy a small sketchbook" />
          </View>
          <Btn
            title="Add"
            disabled={!step.trim()}
            onPress={() => {
              setD({ ...d, steps: [...d.steps, { id: uid(), text: step.trim(), done: false }] });
              setStep('');
            }}
          />
        </Row>
        <T small muted>Smaller than feels useful. That’s the point.</T>
      </Card>
      <Row style={{ marginBottom: 20 }}>
        {!!d.id && <Btn danger title="Delete" onPress={remove} style={{ flex: 1 }} />}
        <Btn title="Cancel" onPress={close} style={{ flex: 1 }} />
        <Btn primary title="Save" disabled={!d.title.trim()} onPress={save} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}

// ---------------- Letters (time capsule) ----------------
const OPEN_IN = [
  { label: '1 month', days: 30 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
  { label: '5 years', days: 365 * 5 },
];

function Letters() {
  const { data, update } = useStore();
  const t = useTheme();
  const today = todayStr();
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState('');
  const [openOn, setOpenOn] = useState(addDays(today, 365));
  const [ym, setYm] = useState({ y: Number(openOn.slice(0, 4)), m: Number(openOn.slice(5, 7)) - 1 });
  const [reading, setReading] = useState<string | null>(null);

  const save = () => {
    const l: Letter = { id: uid(), writtenAt: new Date().toISOString(), openOn, text: text.trim() };
    update((d) => ({ ...d, letters: [...d.letters, l] }));
    setText('');
    setWriting(false);
  };
  const open = (l: Letter) => {
    if (!l.openedAt) update((d) => ({ ...d, letters: d.letters.map((x) => (x.id === l.id ? { ...x, openedAt: new Date().toISOString() } : x)) }));
    setReading(reading === l.id ? null : l.id);
  };

  if (writing) {
    const shift = (n: number) => setYm(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 }));
    return (
      <View>
        <Card>
          <T muted style={{ marginBottom: 8 }}>Write to the woman you’re becoming. Tell her what today is like, what you hope for her, what you want her to remember.</T>
          <Field multiline value={text} onChangeText={setText} placeholder="Dear me, …" style={{ minHeight: 220 }} />
        </Card>
        <Card>
          <H level={3}>🔒 Seal it until…</H>
          <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {OPEN_IN.map((o) => {
              const d = addDays(today, o.days);
              return (
                <Chip
                  key={o.label}
                  label={o.label}
                  on={openOn === d}
                  onPress={() => {
                    setOpenOn(d);
                    setYm({ y: Number(d.slice(0, 4)), m: Number(d.slice(5, 7)) - 1 });
                  }}
                />
              );
            })}
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Btn title="‹" onPress={() => shift(-1)} />
            <T bold>{MONTHS[ym.m]} {ym.y}</T>
            <Btn title="›" onPress={() => shift(1)} />
          </Row>
          <MonthGrid year={ym.y} month={ym.m} selected={openOn} onSelect={(d) => d > today && setOpenOn(d)} />
          <T style={{ marginTop: 8 }}>Opens on {prettyDate(openOn)}. You’ll get a reminder that day.</T>
        </Card>
        <Row style={{ marginBottom: 20 }}>
          <Btn title="Cancel" onPress={() => setWriting(false)} style={{ flex: 1 }} />
          <Btn primary title="Seal letter 💌" disabled={!text.trim()} onPress={save} style={{ flex: 1 }} />
        </Row>
      </View>
    );
  }

  const letters = [...data.letters].sort((a, b) => a.openOn.localeCompare(b.openOn));
  return (
    <View>
      {letters.length === 0 && (
        <Card>
          <T>A letter sealed today, opened in a year. Future-you will be glad to hear from you.</T>
        </Card>
      )}
      {letters.map((l) => {
        const ready = l.openOn <= today;
        return (
          <Card key={l.id} style={ready && !l.openedAt ? { borderColor: t.accent, borderWidth: 2 } : undefined}>
            <T small muted>Written {new Date(l.writtenAt).toLocaleDateString()}</T>
            {ready ? (
              <>
                <T bold>{l.openedAt ? '💌 Opened' : '💌 Ready to open!'}</T>
                {reading === l.id && <T style={{ marginTop: 6 }}>{l.text}</T>}
                <LinkBtn title={reading === l.id ? 'Close' : 'Open letter'} onPress={() => open(l)} />
              </>
            ) : (
              <T bold>🔒 Sealed until {prettyDate(l.openOn)}</T>
            )}
          </Card>
        );
      })}
      <Btn primary title="✍️ Write a letter to future me" onPress={() => setWriting(true)} />
    </View>
  );
}
