import { useState } from 'react';
import { useStore, uid } from '../lib/store';
import { DIMENSIONS, SEASONS, blankScores, type Role, type Scores, type Season } from '../lib/types';
import { Radar, RadarLegend, Slider } from '../components/ui';

const ROLE_PRESETS: { name: string; emoji: string }[] = [
  { name: 'Mother', emoji: '🤱' },
  { name: 'Partner / Wife', emoji: '💞' },
  { name: 'Daughter', emoji: '👵' },
  { name: 'Daughter-in-law', emoji: '🏡' },
  { name: 'Home-maker', emoji: '🍲' },
  { name: 'Professional', emoji: '💼' },
  { name: 'Student / Learner', emoji: '📖' },
  { name: 'Friend', emoji: '🤝' },
  { name: 'Community', emoji: '🌏' },
];

export default function Onboarding() {
  const { update } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [season, setSeason] = useState<Season>('newborn');
  const [was, setWas] = useState(['', '', '']);
  const [now, setNow] = useState(['', '', '']);
  const [want, setWant] = useState(['', '', '']);
  const [era, setEra] = useState<'present' | 'past' | 'desired'>('present');
  const [scores, setScores] = useState<Record<'past' | 'present' | 'desired', Scores>>({
    past: blankScores(6),
    present: blankScores(5),
    desired: blankScores(7),
  });
  const [roles, setRoles] = useState<string[]>(['Mother']);
  const [identity, setIdentity] = useState('');
  const [anchor, setAnchor] = useState('');
  const [minimum, setMinimum] = useState('');

  const finish = () => {
    const now_ = new Date().toISOString();
    const roleObjs: Role[] = [
      ...ROLE_PRESETS.filter((r) => roles.includes(r.name)).map((r) => ({
        id: uid(),
        name: r.name,
        emoji: r.emoji,
        hoursWeek: 0,
        energyGiven: 5,
        energyReceived: 5,
        satisfaction: 5,
        intention: '',
      })),
      { id: uid(), name: 'Me', emoji: '🌱', hoursWeek: 2, energyGiven: 3, energyReceived: 7, satisfaction: 5, intention: 'Time that is just mine', isMe: true },
    ];
    update((d) => ({
      ...d,
      profile: {
        name: name.trim(),
        season,
        wordsWas: was.map((w) => w.trim()).filter(Boolean),
        wordsNow: now.map((w) => w.trim()).filter(Boolean),
        wordsWant: want.map((w) => w.trim()).filter(Boolean),
        onboardedAt: now_,
      },
      snapshots: [{ id: uid(), date: now_, ...scores }],
      roles: roleObjs,
      habits: identity.trim()
        ? [
            {
              id: uid(),
              identity: identity.trim(),
              anchor: anchor.trim(),
              minimum: minimum.trim() || '2 minutes',
              normal: '',
              stretch: '',
              createdAt: now_,
            },
          ]
        : [],
    }));
  };

  const words = (label: string, val: string[], set: (v: string[]) => void, ph: string[]) => (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="row3">
        {val.map((w, i) => (
          <input
            key={i}
            value={w}
            placeholder={ph[i]}
            onChange={(e) => set(val.map((x, j) => (j === i ? e.target.value : x)))}
            maxLength={20}
          />
        ))}
      </div>
    </div>
  );

  const steps = [
    // 0 — welcome
    <div key="0">
      <div className="hero">🌿</div>
      <h1>Finding Myself</h1>
      <p className="lead">You were never lost. Life rearranged you. Let’s gently find the pieces — and carry them forward, your way.</p>
      <ul className="promise">
        <li>🪞 A mirror and a map — <b>not</b> therapy, not a test.</li>
        <li>🔒 Everything stays on this phone. Backup goes only to <b>your own</b> Google Drive, if you choose.</li>
        <li>🌱 No guilt, no streaks that punish, no comparing.</li>
      </ul>
      <label className="field">
        <span className="field-label">What should I call you?</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoFocus />
      </label>
    </div>,
    // 1 — season
    <div key="1">
      <h2>Which season of life are you in?</h2>
      <p className="muted">The app shrinks plans automatically in heavy seasons. You can change this anytime.</p>
      <div className="choice-list">
        {SEASONS.map((s) => (
          <button key={s.key} className={`choice ${season === s.key ? 'on' : ''}`} onClick={() => setSeason(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
    </div>,
    // 2 — words
    <div key="2">
      <h2>Three words each</h2>
      <p className="muted">Don’t think too long. First words are often the truest.</p>
      {words('Who I was', was, setWas, ['curious', 'bold', 'artsy'])}
      {words('Who I am now', now, setNow, ['tired', 'caring', 'strong'])}
      {words('Who I want to be', want, setWant, ['calm', 'creative', 'free'])}
    </div>,
    // 3 — self graph
    <div key="3">
      <h2>Your self graph</h2>
      <p className="muted">Score each part of life 0–10. Start with <b>now</b>; then do <b>then</b> (before the big change) and <b>want</b>.</p>
      <div className="seg">
        {(['present', 'past', 'desired'] as const).map((e) => (
          <button key={e} className={era === e ? 'on' : ''} onClick={() => setEra(e)}>
            {e === 'present' ? 'Now' : e === 'past' ? 'Then' : 'Want'}
          </button>
        ))}
      </div>
      <Radar past={scores.past} present={scores.present} desired={scores.desired} size={260} />
      <RadarLegend />
      {DIMENSIONS.map((d) => (
        <Slider
          key={d.key}
          label={`${d.emoji} ${d.label}`}
          value={scores[era][d.key]}
          onChange={(v) => setScores((s) => ({ ...s, [era]: { ...s[era], [d.key]: v } }))}
        />
      ))}
    </div>,
    // 4 — roles
    <div key="4">
      <h2>Your roles</h2>
      <p className="muted">Tap all the hats you wear. <b>🌱 Me</b> is always included — it is a real role too.</p>
      <div className="choice-grid">
        {ROLE_PRESETS.map((r) => (
          <button
            key={r.name}
            className={`choice ${roles.includes(r.name) ? 'on' : ''}`}
            onClick={() => setRoles((rs) => (rs.includes(r.name) ? rs.filter((x) => x !== r.name) : [...rs, r.name]))}
          >
            {r.emoji} {r.name}
          </button>
        ))}
        <button className="choice on" disabled>
          🌱 Me
        </button>
      </div>
    </div>,
    // 5 — tiny habit
    <div key="5">
      <h2>One tiny habit for this week</h2>
      <p className="muted">Small enough to do on your hardest day. Anchor it to something that already happens.</p>
      <label className="field">
        <span className="field-label">I am a woman who…</span>
        <input value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="reads / moves / draws / prays / sings" />
      </label>
      <label className="field">
        <span className="field-label">After I… (anchor)</span>
        <input value={anchor} onChange={(e) => setAnchor(e.target.value)} placeholder="put the baby down for the afternoon nap" />
      </label>
      <label className="field">
        <span className="field-label">Minimum version (bad-day size)</span>
        <input value={minimum} onChange={(e) => setMinimum(e.target.value)} placeholder="read 1 page" />
      </label>
      <p className="small muted">You can skip this and add habits later.</p>
    </div>,
  ];

  const last = step === steps.length - 1;
  const canNext = step !== 0 || name.trim().length > 0;

  return (
    <div className="onboarding">
      <div className="progress">
        {steps.map((_, i) => (
          <i key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      {steps[step]}
      <div className="sticky-actions">
        {step > 0 && (
          <button className="btn" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        <button className="btn btn-primary" disabled={!canNext} onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? 'Begin 🌱' : 'Next'}
        </button>
      </div>
    </div>
  );
}
