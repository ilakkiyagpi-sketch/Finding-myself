import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore, todayStr, uid } from '../lib/store';
import { AFFECT_TAGS, EMOTIONS, QUADRANTS } from '../lib/prompts';
import { needsSupport } from '../lib/safety';
import { Btn, Card, Chip, Chips, Field, H, Row, Screen, Slider, T, useSupportSheet } from '../components/ui';
import { useTheme } from '../components/theme';
import type { Quadrant } from '../lib/types';

export default function CheckIn({ done }: { done: () => void }) {
  const { data, update } = useStore();
  const t = useTheme();
  const today = todayStr();
  const existing = data.checkIns.find((c) => c.date === today);
  const [quadrant, setQuadrant] = useState<Quadrant | null>(existing?.quadrant ?? null);
  const [emotion, setEmotion] = useState(existing?.emotion ?? '');
  const [sleep, setSleep] = useState(existing?.sleepHours ?? 6);
  const [likeMyself, setLikeMyself] = useState(existing?.likeMyself ?? 5);
  const [mattered, setMattered] = useState(existing?.mattered ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const toggleTag = (k: string) => setTags((ts) => (ts.includes(k) ? ts.filter((x) => x !== k) : [...ts, k]));
  const support = useSupportSheet(done);

  const save = () => {
    if (!quadrant) return;
    update((d) => ({
      ...d,
      checkIns: [
        ...d.checkIns.filter((c) => c.date !== today),
        { id: existing?.id ?? uid(), date: today, quadrant, emotion: emotion || quadrant, sleepHours: sleep, likeMyself, mattered: mattered.trim(), tags, createdAt: new Date().toISOString() },
      ],
    }));
    if (needsSupport(mattered)) support.open();
    else done();
  };

  return (
    <Screen
      footer={
        <>
          <Btn title="Later" onPress={done} style={{ flex: 1 }} />
          <Btn primary title="Save" disabled={!quadrant} onPress={save} style={{ flex: 1 }} />
        </>
      }
    >
      <H>Check in</H>
      <T muted style={{ marginBottom: 12 }}>One minute. No right answers.</T>

      <Card>
        <H level={3}>Right now I feel…</H>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
          {QUADRANTS.map((q) => {
            const on = quadrant === q.key;
            return (
              <Pressable
                key={q.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setQuadrant(q.key);
                  setEmotion('');
                }}
                style={{
                  width: '48%',
                  minHeight: 86,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: on ? t.primary : t.line,
                  backgroundColor: on ? t.primarySoft : t.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <T size={28}>{q.emoji}</T>
                <T bold>{q.label}</T>
              </Pressable>
            );
          })}
        </View>
        {quadrant && (
          <>
            <T small muted style={{ marginTop: 10 }}>Can you find a more precise word? Naming it helps calm it.</T>
            <Chips options={EMOTIONS[quadrant]} value={emotion} onChange={setEmotion} />
          </>
        )}
      </Card>

      <Card>
        <H level={3}>What’s affecting me today?</H>
        <T small muted>Tap any. Over time the app shows you what helps.</T>
        <Row style={{ flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {AFFECT_TAGS.map((tg) => (
            <Chip key={tg.key} label={tg.label} on={tags.includes(tg.key)} onPress={() => toggleTag(tg.key)} />
          ))}
        </Row>
      </Card>

      <Card>
        <Slider label="😴 Sleep last night (hours)" value={sleep} min={0} max={12} step={0.5} onChange={setSleep} />
        <Slider label="🪞 How much like myself did I feel today?" value={likeMyself} onChange={setLikeMyself} hint="0 = a stranger to myself · 10 = completely me" />
      </Card>

      <Card>
        <Field
          label="One thing that mattered today"
          multiline
          value={mattered}
          onChangeText={setMattered}
          placeholder="Baby laughed at the window. I had chai alone for 10 minutes."
        />
      </Card>
      {support.sheet}
    </Screen>
  );
}
