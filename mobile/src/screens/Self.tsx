import { useState } from 'react';
import { View } from 'react-native';
import { useStore, uid } from '../lib/store';
import { gainedPieces, latestSnapshot, missingPieces } from '../lib/insights';
import { DIMENSIONS, type Scores } from '../lib/types';
import { Btn, Card, H, Radar, RadarLegend, Row, Screen, Slider, Sparkline, T } from '../components/ui';
import { useTheme } from '../components/theme';

function PieceRow({ left, right, color }: { left: string; right: string; color?: string }) {
  const t = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.line, flexWrap: 'wrap' }}>
      <T>{left}</T>
      <T small={!color} muted={!color} bold={!!color} style={color ? { color } : undefined}>
        {right}
      </T>
    </Row>
  );
}

export default function Self() {
  const { data, update } = useStore();
  const t = useTheme();
  const snap = latestSnapshot(data);
  const [present, setPresent] = useState<Scores | null>(null);
  const [desired, setDesired] = useState<Scores | null>(null);

  if (!snap) return <Screen><T>No self graph yet.</T></Screen>;

  if (present && desired) {
    const save = () => {
      update((d) => ({ ...d, snapshots: [...d.snapshots, { id: uid(), date: new Date().toISOString(), past: snap.past, present, desired }] }));
      setPresent(null);
      setDesired(null);
    };
    return (
      <Screen
        footer={
          <>
            <Btn title="Cancel" onPress={() => { setPresent(null); setDesired(null); }} style={{ flex: 1 }} />
            <Btn primary title="Save snapshot" onPress={save} style={{ flex: 1 }} />
          </>
        }
      >
        <H>Re-score</H>
        <T muted>How is each part of life now? (Then stays as you remembered it.)</T>
        <Radar past={snap.past} present={present} desired={desired} />
        <RadarLegend />
        <Card>
          {DIMENSIONS.map((d) => (
            <Slider key={d.key} label={`${d.emoji} ${d.label} — now`} value={present[d.key]} onChange={(v) => setPresent({ ...present, [d.key]: v })} />
          ))}
        </Card>
        <Card>
          <H level={3}>Has what you want changed?</H>
          {DIMENSIONS.map((d) => (
            <Slider key={d.key} label={`${d.emoji} ${d.label} — want`} value={desired[d.key]} onChange={(v) => setDesired({ ...desired, [d.key]: v })} />
          ))}
        </Card>
      </Screen>
    );
  }

  const first = data.snapshots[0];
  const missing = missingPieces(snap);
  const gained = gainedPieces(snap);
  const trend = [...data.checkIns].sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map((c) => c.likeMyself);

  return (
    <Screen>
      <H>My self graph</H>
      <T muted style={{ marginBottom: 12 }}>Then · Now · Want — {data.snapshots.length} snapshot{data.snapshots.length > 1 ? 's' : ''}</T>
      <Card>
        <Radar past={snap.past} present={snap.present} desired={snap.desired} />
        <RadarLegend />
        <Btn title="Re-score now (monthly)" onPress={() => { setPresent({ ...snap.present }); setDesired({ ...snap.desired }); }} />
      </Card>

      <Card>
        <H level={3}>🧩 Missing pieces</H>
        <T small muted>Strong before or wanted now, but quiet today.</T>
        {missing.length === 0 && <T style={{ marginTop: 8 }}>No big gaps right now. 🌿</T>}
        {missing.map((m) => (
          <PieceRow key={m.key} left={`${m.emoji} ${m.label}`} right={`then ${m.past} · now ${m.present} · want ${m.desired}`} />
        ))}
      </Card>

      <Card>
        <H level={3}>🌱 What you’ve gained</H>
        <T small muted>Life took some things — and gave others. These are you, too.</T>
        {gained.length === 0 && <T muted style={{ marginTop: 8 }}>Nothing scored higher than before yet — look again next month.</T>}
        {gained.map((g) => (
          <PieceRow key={g.key} left={`${g.emoji} ${g.label}`} right={`then ${g.past} → now ${g.present}`} />
        ))}
      </Card>

      <Card>
        <H level={3}>🪞 Feeling like myself</H>
        <T small muted>From your daily check-ins (last 30).</T>
        <View style={{ marginTop: 8 }}>
          <Sparkline values={trend} />
        </View>
      </Card>

      {data.snapshots.length > 1 && (
        <Card>
          <H level={3}>📈 How you’ve changed</H>
          <T small muted>Since {new Date(first.date).toLocaleDateString()}</T>
          {DIMENSIONS.map((d) => {
            const delta = snap.present[d.key] - first.present[d.key];
            if (!delta) return null;
            return <PieceRow key={d.key} left={`${d.emoji} ${d.label}`} right={`${delta > 0 ? '+' : ''}${delta}`} color={delta > 0 ? t.up : t.warn} />;
          })}
        </Card>
      )}
    </Screen>
  );
}
