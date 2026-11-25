import { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { gainedPieces, latestSnapshot, missingPieces } from '../lib/insights';
import { DIMENSIONS, type Scores } from '../lib/types';
import { Card, Radar, RadarLegend, Slider, Sparkline } from '../components/ui';

export default function Self() {
  const { data, update } = useStore();
  const snap = latestSnapshot(data);
  const [rescoring, setRescoring] = useState(false);
  const [present, setPresent] = useState<Scores | null>(null);
  const [desired, setDesired] = useState<Scores | null>(null);

  if (!snap) return <div className="screen"><p>No self graph yet.</p></div>;

  const first = data.snapshots[0];
  const missing = missingPieces(snap);
  const gained = gainedPieces(snap);
  const trend = [...data.checkIns].sort((a, b) => a.date.localeCompare(b.date)).slice(-30).map((c) => c.likeMyself);

  const startRescore = () => {
    setPresent({ ...snap.present });
    setDesired({ ...snap.desired });
    setRescoring(true);
  };

  const saveRescore = () => {
    if (!present || !desired) return;
    update((d) => ({ ...d, snapshots: [...d.snapshots, { id: uid(), date: new Date().toISOString(), past: snap.past, present, desired }] }));
    setRescoring(false);
  };

  if (rescoring && present && desired) {
    return (
      <div className="screen">
        <header className="screen-head">
          <h1>Re-score</h1>
          <p className="muted">How is each part of life <b>now</b>? (Then stays as you remembered it.)</p>
        </header>
        <Radar past={snap.past} present={present} desired={desired} />
        <RadarLegend />
        <Card>
          {DIMENSIONS.map((d) => (
            <Slider key={d.key} label={`${d.emoji} ${d.label} — now`} value={present[d.key]} onChange={(v) => setPresent({ ...present, [d.key]: v })} />
          ))}
        </Card>
        <Card>
          <h3>Has what you want changed?</h3>
          {DIMENSIONS.map((d) => (
            <Slider key={d.key} label={`${d.emoji} ${d.label} — want`} value={desired[d.key]} onChange={(v) => setDesired({ ...desired, [d.key]: v })} />
          ))}
        </Card>
        <div className="sticky-actions">
          <button className="btn" onClick={() => setRescoring(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveRescore}>Save snapshot</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>My self graph</h1>
        <p className="muted">Then · Now · Want — {data.snapshots.length} snapshot{data.snapshots.length > 1 ? 's' : ''}</p>
      </header>
      <Card>
        <Radar past={snap.past} present={snap.present} desired={snap.desired} />
        <RadarLegend />
        <button className="btn btn-wide" onClick={startRescore}>Re-score now (monthly)</button>
      </Card>

      <Card>
        <h3>🧩 Missing pieces</h3>
        <p className="muted small">Strong before or wanted now, but quiet today.</p>
        {missing.length === 0 && <p>No big gaps right now. 🌿</p>}
        {missing.map((m) => (
          <div key={m.key} className="piece">
            <span>{m.emoji} {m.label}</span>
            <span className="muted small">then {m.past} · now {m.present} · want {m.desired}</span>
          </div>
        ))}
      </Card>

      <Card>
        <h3>🌱 What you’ve gained</h3>
        <p className="muted small">Life took some things — and gave others. These are you, too.</p>
        {gained.length === 0 && <p className="muted">Nothing scored higher than before yet — look again next month.</p>}
        {gained.map((g) => (
          <div key={g.key} className="piece">
            <span>{g.emoji} {g.label}</span>
            <span className="muted small">then {g.past} → now {g.present}</span>
          </div>
        ))}
      </Card>

      <Card>
        <h3>🪞 Feeling like myself</h3>
        <p className="muted small">From your daily check-ins (last 30).</p>
        <Sparkline values={trend} />
      </Card>

      {data.snapshots.length > 1 && (
        <Card>
          <h3>📈 How you’ve changed</h3>
          <p className="muted small">Since {new Date(first.date).toLocaleDateString()}</p>
          {DIMENSIONS.map((d) => {
            const delta = snap.present[d.key] - first.present[d.key];
            if (!delta) return null;
            return (
              <div key={d.key} className="piece">
                <span>{d.emoji} {d.label}</span>
                <b className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '+' : ''}{delta}</b>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
