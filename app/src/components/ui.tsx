import { useState, type ReactNode } from 'react';
import { DIMENSIONS, type Scores } from '../lib/types';
import { HELPLINES } from '../lib/safety';
import { useStore } from '../lib/store';

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  hint,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="slider">
      <span className="slider-head">
        <span>{label}</span>
        <b>{value}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

/** Radar chart: past (dashed), present (filled), desired (outline). */
export function Radar({ past, present, desired, size = 300 }: { past?: Scores; present: Scores; desired?: Scores; size?: number }) {
  const n = DIMENSIONS.length;
  const c = size / 2;
  const r = size / 2 - 34;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * (r * v) / 10, c + Math.sin(a) * (r * v) / 10];
  };
  const poly = (s: Scores) => DIMENSIONS.map((d, i) => pt(i, s[d.key]).join(',')).join(' ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="radar" role="img" aria-label="Self graph: past, present and desired">
      {[2, 4, 6, 8, 10].map((v) => (
        <polygon key={v} points={DIMENSIONS.map((_, i) => pt(i, v).join(',')).join(' ')} className="radar-grid" />
      ))}
      {DIMENSIONS.map((d, i) => {
        const [x, y] = pt(i, 10);
        const [lx, ly] = pt(i, 11.6);
        return (
          <g key={d.key}>
            <line x1={c} y1={c} x2={x} y2={y} className="radar-grid" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="16">
              {d.emoji}
            </text>
          </g>
        );
      })}
      {desired && <polygon points={poly(desired)} className="radar-desired" />}
      {past && <polygon points={poly(past)} className="radar-past" />}
      <polygon points={poly(present)} className="radar-present" />
    </svg>
  );
}

export function RadarLegend() {
  return (
    <div className="legend">
      <span><i className="sw sw-past" /> Then</span>
      <span><i className="sw sw-present" /> Now</span>
      <span><i className="sw sw-desired" /> Want</span>
    </div>
  );
}

export function Sparkline({ values, max = 10 }: { values: number[]; max?: number }) {
  if (values.length < 2) return <p className="muted small">A few more check-ins and your line will appear here.</p>;
  const w = 300;
  const h = 70;
  const step = w / (values.length - 1);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(h - (v / max) * (h - 8) - 4).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" role="img" aria-label="Feeling like myself over time">
      <path d={d} className="spark-line" />
    </svg>
  );
}

/** Shown when text suggests she may be in crisis. Coaching pauses; care comes first. */
export function SupportSheet({ onClose }: { onClose: () => void }) {
  const { data } = useStore();
  const lines = HELPLINES[data.settings.country];
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true" aria-labelledby="support-title">
      <div className="sheet">
        <h2 id="support-title">You matter. You don’t have to carry this alone.</h2>
        <p>
          What you wrote sounds really heavy. Your words are saved privately. Right now, it may help to talk to someone —
          a person you trust, a doctor, or a free helpline. Feelings like these are more common than people say, especially
          after having a baby, and help works.
        </p>
        <ul className="helplines">
          {lines.map((h) => (
            <li key={h.number + h.name}>
              <a className="btn btn-primary" href={`tel:${h.number.replace(/[^0-9+]/g, '')}`}>
                📞 {h.number}
              </a>
              <div>
                <b>{h.name}</b>
                <small className="muted">{h.note}</small>
              </div>
            </li>
          ))}
        </ul>
        <p className="small muted">This app is a companion, not therapy or a medical service.</p>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export function useSupportSheet() {
  const [open, setOpen] = useState(false);
  return {
    open: () => setOpen(true),
    sheet: open ? <SupportSheet onClose={() => setOpen(false)} /> : null,
  };
}

export function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o} className={`chip ${value === o ? 'on' : ''}`} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
