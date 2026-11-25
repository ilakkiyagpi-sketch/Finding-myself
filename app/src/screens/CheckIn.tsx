import { useState } from 'react';
import { useStore, todayStr, uid } from '../lib/store';
import { EMOTIONS, QUADRANTS } from '../lib/prompts';
import { needsSupport } from '../lib/safety';
import { Card, Chips, Slider, SupportSheet } from '../components/ui';
import type { Quadrant } from '../lib/types';

export default function CheckIn({ done }: { done: () => void }) {
  const { data, update } = useStore();
  const today = todayStr();
  const existing = data.checkIns.find((c) => c.date === today);
  const [quadrant, setQuadrant] = useState<Quadrant | null>(existing?.quadrant ?? null);
  const [emotion, setEmotion] = useState(existing?.emotion ?? '');
  const [sleep, setSleep] = useState(existing?.sleepHours ?? 6);
  const [likeMyself, setLikeMyself] = useState(existing?.likeMyself ?? 5);
  const [mattered, setMattered] = useState(existing?.mattered ?? '');
  const [showSupport, setShowSupport] = useState(false);

  const save = () => {
    if (!quadrant) return;
    update((d) => ({
      ...d,
      checkIns: [
        ...d.checkIns.filter((c) => c.date !== today),
        { id: existing?.id ?? uid(), date: today, quadrant, emotion: emotion || quadrant, sleepHours: sleep, likeMyself, mattered: mattered.trim(), createdAt: new Date().toISOString() },
      ],
    }));
    if (needsSupport(mattered)) setShowSupport(true);
    else done();
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Check in</h1>
        <p className="muted">One minute. No right answers.</p>
      </header>

      <Card>
        <h3>Right now I feel…</h3>
        <div className="quad">
          {QUADRANTS.map((q) => (
            <button
              key={q.key}
              className={`quad-btn ${quadrant === q.key ? 'on' : ''}`}
              onClick={() => {
                setQuadrant(q.key);
                setEmotion('');
              }}
            >
              <span className="quad-emoji">{q.emoji}</span>
              {q.label}
            </button>
          ))}
        </div>
        {quadrant && (
          <>
            <p className="muted small">Can you find a more precise word? Naming it helps calm it.</p>
            <Chips options={EMOTIONS[quadrant]} value={emotion} onChange={setEmotion} />
          </>
        )}
      </Card>

      <Card>
        <Slider label="😴 Sleep last night (hours)" value={sleep} min={0} max={12} step={0.5} onChange={setSleep} />
        <Slider
          label="🪞 How much like myself did I feel today?"
          value={likeMyself}
          onChange={setLikeMyself}
          hint="0 = a stranger to myself · 10 = completely me"
        />
      </Card>

      <Card>
        <label className="field">
          <span className="field-label">One thing that mattered today</span>
          <textarea rows={3} value={mattered} onChange={(e) => setMattered(e.target.value)} placeholder="Baby laughed at the window. I had chai alone for 10 minutes." />
        </label>
      </Card>

      <div className="sticky-actions">
        <button className="btn" onClick={done}>
          Later
        </button>
        <button className="btn btn-primary" disabled={!quadrant} onClick={save}>
          Save
        </button>
      </div>
      {showSupport && <SupportSheet onClose={done} />}
    </div>
  );
}
