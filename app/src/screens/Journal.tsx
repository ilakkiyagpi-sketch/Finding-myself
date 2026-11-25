import { useState } from 'react';
import { useStore, todayStr, uid } from '../lib/store';
import { PROMPT_GROUPS, promptOfTheDay } from '../lib/prompts';
import { needsSupport } from '../lib/safety';
import { Card, useSupportSheet } from '../components/ui';

export default function Journal() {
  const { data, update } = useStore();
  const [writing, setWriting] = useState(false);
  const [prompt, setPrompt] = useState<string | undefined>(promptOfTheDay(todayStr()));
  const [group, setGroup] = useState(PROMPT_GROUPS[0].key);
  const [text, setText] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const support = useSupportSheet();

  const save = () => {
    if (!text.trim()) return;
    update((d) => ({ ...d, journal: [...d.journal, { id: uid(), createdAt: new Date().toISOString(), prompt, text: text.trim() }] }));
    if (needsSupport(text)) support.open();
    setText('');
    setWriting(false);
  };

  const remove = (id: string) => {
    if (confirm('Delete this entry? This cannot be undone.')) update((d) => ({ ...d, journal: d.journal.filter((j) => j.id !== id) }));
  };

  if (writing) {
    const g = PROMPT_GROUPS.find((x) => x.key === group)!;
    return (
      <div className="screen">
        <header className="screen-head">
          <h1>Write</h1>
        </header>
        <Card>
          <div className="seg scroll">
            {PROMPT_GROUPS.map((x) => (
              <button key={x.key} className={group === x.key ? 'on' : ''} onClick={() => setGroup(x.key)}>
                {x.label}
              </button>
            ))}
          </div>
          <div className="prompt-list">
            <button className={`chip ${!prompt ? 'on' : ''}`} onClick={() => setPrompt(undefined)}>
              ✍️ Free write
            </button>
            {g.prompts.map((p) => (
              <button key={p} className={`chip ${prompt === p ? 'on' : ''}`} onClick={() => setPrompt(p)}>
                {p}
              </button>
            ))}
          </div>
        </Card>
        {prompt && <p className="prompt">{prompt}</p>}
        <textarea className="journal-text" rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write freely. No one else will read this." autoFocus />
        <div className="sticky-actions">
          <button className="btn" onClick={() => setWriting(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={!text.trim()} onClick={save}>
            Save
          </button>
        </div>
      </div>
    );
  }

  const entries = [...data.journal].reverse();
  return (
    <div className="screen">
      <header className="screen-head">
        <h1>Journal</h1>
        <p className="muted">Private. Ask “what” more than “why”.</p>
      </header>
      <button className="btn btn-primary btn-wide" onClick={() => setWriting(true)}>
        ✍️ New entry
      </button>
      {entries.length === 0 && <p className="muted center">Your words will live here.</p>}
      {entries.map((j) => (
        <Card key={j.id}>
          <button className="entry" onClick={() => setOpenId(openId === j.id ? null : j.id)}>
            <small className="muted">{new Date(j.createdAt).toLocaleString()}</small>
            {j.prompt && <b className="entry-prompt">{j.prompt}</b>}
            <p className={openId === j.id ? '' : 'clamp'}>{j.text}</p>
          </button>
          {openId === j.id && (
            <button className="link danger" onClick={() => remove(j.id)}>
              Delete
            </button>
          )}
        </Card>
      ))}
      {support.sheet}
    </div>
  );
}
