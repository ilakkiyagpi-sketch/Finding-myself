import { View } from 'react-native';
import { useStore } from '../lib/store';
import { Card, H, Row, T } from './ui';
import type { AppData } from '../lib/types';

// A garden that grows with care and never wilts. Every small act of care adds to it.
const STAGES = ['🌱', '🌿', '🪴'];
const BLOOMS = ['🌸', '🌻', '🌷', '🌼', '🪷', '🌺'];
const PER_STAGE = 3;

export function careCount(d: AppData) {
  return (
    d.checkIns.length +
    new Set(d.habitLogs.map((l) => l.habitId + l.date)).size +
    d.dayPlans.filter((p) => p.evening).length +
    d.journal.length +
    d.weeklyReviews.length * 3 +
    d.letters.length * 2 +
    d.chapters.reduce((a, c) => a + 1 + c.scenes.length, 0) +
    d.dreams.reduce((a, x) => a + 1 + x.steps.filter((s) => s.done).length, 0)
  );
}

export default function Garden() {
  const { data } = useStore();
  const n = careCount(data);
  const perPlant = PER_STAGE * (STAGES.length + 1);
  const full = Math.floor(n / perPlant);
  const rest = n % perPlant;
  const growing = Math.floor(rest / PER_STAGE);
  const plants = [...Array.from({ length: full }, (_, i) => BLOOMS[i % BLOOMS.length])];
  if (n > 0) plants.push(growing < STAGES.length ? STAGES[growing] : BLOOMS[full % BLOOMS.length]);
  const toNext = PER_STAGE - (rest % PER_STAGE);

  return (
    <Card>
      <H level={3}>🏡 My garden</H>
      {n === 0 ? (
        <T muted>Every check-in, habit, evening tick or journal entry plants something here.</T>
      ) : (
        <>
          <Row style={{ flexWrap: 'wrap', gap: 4, marginVertical: 6 }}>
            {plants.slice(-40).map((p, i) => (
              <T key={i} size={26}>{p}</T>
            ))}
          </Row>
          <T small muted>
            {full} flower{full === 1 ? '' : 's'} grown from {n} small acts of care. {toNext} more to help the next one grow.
          </T>
        </>
      )}
      <View style={{ height: 4 }} />
      <T small muted>Nothing here ever wilts. On hard weeks it simply waits for you.</T>
    </Card>
  );
}
