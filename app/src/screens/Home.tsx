import { useStore, todayStr } from '../lib/store';
import { habitDaysInLast, homeInsight, isHeavySeason, isToughDay, latestSnapshot } from '../lib/insights';
import { promptOfTheDay } from '../lib/prompts';
import { Card } from '../components/ui';
import type { HabitLevel } from '../lib/types';
import type { Tab } from '../App';

export default function Home({ go }: { go: (t: Tab) => void }) {
  const { data, update } = useStore();
  const p = data.profile!;
  const today = todayStr();
  const checkedIn = data.checkIns.find((c) => c.date === today);
  const tough = isToughDay(data);
  const heavy = isHeavySeason(data);
  const snap = latestSnapshot(data);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const logHabit = (habitId: string, level: HabitLevel) =>
    update((d) => {
      const others = d.habitLogs.filter((l) => !(l.habitId === habitId && l.date === today));
      const existing = d.habitLogs.find((l) => l.habitId === habitId && l.date === today);
      return { ...d, habitLogs: existing?.level === level ? others : [...others, { habitId, date: today, level }] };
    });

  const toggleTough = () =>
    update((d) => ({ ...d, settings: { ...d.settings, toughDay: tough ? undefined : today } }));

  return (
    <div className="screen">
      <header className="screen-head">
        <p className="muted">{greet},</p>
        <h1>{p.name || 'friend'} 🌿</h1>
      </header>

      <Card className="tnn">
        <div className="tnn-row">
          <div>
            <small>Then</small>
            <b>{p.wordsWas.join(' · ') || '—'}</b>
          </div>
          <div>
            <small>Now</small>
            <b>{p.wordsNow.join(' · ') || '—'}</b>
          </div>
          <div>
            <small>Next</small>
            <b>{p.wordsWant.join(' · ') || '—'}</b>
          </div>
        </div>
        <p className="tnn-insight">{homeInsight(data)}</p>
      </Card>

      <button className={`tough ${tough ? 'on' : ''}`} onClick={toggleTough}>
        {tough ? '🫶 Tough-day mode is on — only the minimum today. That counts.' : '🌧️ Having a tough day? Tap to shrink today to the minimum.'}
      </button>

      <Card>
        <h3>Today’s check-in</h3>
        {checkedIn ? (
          <p>
            Done ✓ You felt <b>{checkedIn.emotion}</b>, and {checkedIn.likeMyself}/10 like yourself.
          </p>
        ) : (
          <>
            <p className="muted">One minute. How are you, really?</p>
            <button className="btn btn-primary btn-wide" onClick={() => go('checkin')}>
              Check in
            </button>
          </>
        )}
      </Card>

      <Card>
        <div className="card-head">
          <h3>Tiny habits</h3>
          <button className="link" onClick={() => go('rhythm')}>
            Edit
          </button>
        </div>
        {data.habits.filter((h) => !h.archived).length === 0 && <p className="muted">No habit yet. Add one small thing in Rhythm.</p>}
        {data.habits
          .filter((h) => !h.archived)
          .map((h) => {
            const log = data.habitLogs.find((l) => l.habitId === h.id && l.date === today);
            const showOnlyMin = tough || (heavy && !h.normal);
            const levels: HabitLevel[] = showOnlyMin ? ['minimum'] : (['minimum', 'normal', 'stretch'] as HabitLevel[]).filter((l) => l === 'minimum' || h[l]);
            return (
              <div key={h.id} className="habit">
                <p>
                  <b>I am a woman who {h.identity}</b>
                  {h.anchor && <small className="muted"> · after {h.anchor}</small>}
                </p>
                <div className="habit-levels">
                  {levels.map((l) => (
                    <button key={l} className={`chip ${log?.level === l ? 'on' : ''}`} onClick={() => logHabit(h.id, l)}>
                      {log?.level === l ? '✓ ' : ''}
                      {h[l] || l}
                    </button>
                  ))}
                </div>
                <small className="muted">{habitDaysInLast(data, h.id)} of the last 21 days</small>
              </div>
            );
          })}
      </Card>

      <Card>
        <h3>A question for today</h3>
        <p className="prompt">{promptOfTheDay(today)}</p>
        <button className="btn" onClick={() => go('journal')}>
          Write about it
        </button>
      </Card>

      {snap && (
        <Card>
          <div className="card-head">
            <h3>Your self graph</h3>
            <button className="link" onClick={() => go('self')}>
              Open
            </button>
          </div>
          <p className="muted small">Last scored {new Date(snap.date).toLocaleDateString()}. Re-score monthly to see how you change.</p>
        </Card>
      )}
    </div>
  );
}
