import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { backupToDrive, defaultClientId, restoreFromDrive } from '../lib/gdrive';
import { decryptText, encryptText, isEncrypted } from '../lib/crypto';
import { HELPLINES } from '../lib/safety';
import { SEASONS, type AppData, type Country, type Season } from '../lib/types';
import { Card } from '../components/ui';

function parseBackup(raw: string): unknown {
  return JSON.parse(raw);
}

function isAppData(x: unknown): x is AppData {
  return typeof x === 'object' && x !== null && (x as AppData).version === 1 && Array.isArray((x as AppData).checkIns);
}

export default function More() {
  const { data, update, replaceAll, wipe } = useStore();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const clientId = data.settings.googleClientId || defaultClientId();

  const serialise = async () => {
    const json = JSON.stringify(data);
    return passphrase ? JSON.stringify(await encryptText(json, passphrase)) : json;
  };

  const restoreFrom = async (raw: string) => {
    let parsed = parseBackup(raw);
    if (isEncrypted(parsed)) {
      const pass = passphrase || prompt('This backup is protected. Enter your backup passphrase:') || '';
      try {
        parsed = JSON.parse(await decryptText(parsed, pass));
      } catch {
        throw new Error('Wrong passphrase — backup could not be opened.');
      }
    }
    if (!isAppData(parsed)) throw new Error('This file is not a Finding Myself backup.');
    if (!confirm('Replace everything on this phone with the backup?')) return false;
    replaceAll(parsed);
    return true;
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setStatus('');
    try {
      await fn();
    } catch (e) {
      setStatus('⚠️ ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };

  const driveBackup = () =>
    run(async () => {
      if (!clientId) throw new Error('Google backup is not configured yet (missing Client ID).');
      const at = await backupToDrive(clientId, await serialise());
      update((d) => ({ ...d, settings: { ...d.settings, lastBackupAt: at } }));
      setStatus('✅ Backed up to your Google Drive.');
    });

  const driveRestore = () =>
    run(async () => {
      if (!clientId) throw new Error('Google backup is not configured yet (missing Client ID).');
      const res = await restoreFromDrive(clientId);
      if (!res) throw new Error('No backup found in this Google account yet.');
      if (await restoreFrom(res.content)) setStatus(`✅ Restored backup from ${new Date(res.modifiedTime).toLocaleString()}.`);
    });

  const exportFile = () =>
    run(async () => {
      const blob = new Blob([await serialise()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `finding-myself-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus('✅ Backup file saved.');
    });

  const importFile = (file: File) =>
    run(async () => {
      if (await restoreFrom(await file.text())) setStatus('✅ Restored from file.');
    });

  const p = data.profile!;
  const daysSinceBackup = data.settings.lastBackupAt ? Math.floor((Date.now() - new Date(data.settings.lastBackupAt).getTime()) / 86400000) : null;

  return (
    <div className="screen">
      <header className="screen-head">
        <h1>More</h1>
      </header>

      <Card>
        <h3>☁️ Google Drive backup</h3>
        <p className="small muted">
          Saved in a hidden app folder in <b>your</b> Google Drive. The app can only see its own backup file — not your other files.
        </p>
        <p className="small">
          Last backup: <b>{data.settings.lastBackupAt ? `${new Date(data.settings.lastBackupAt).toLocaleString()}` : 'never'}</b>
          {daysSinceBackup !== null && daysSinceBackup >= 7 && <span className="warn"> · it’s been {daysSinceBackup} days</span>}
        </p>
        <label className="field">
          <span className="field-label">Backup passphrase (optional, recommended)</span>
          <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} placeholder="Encrypts the backup before it leaves your phone" autoComplete="new-password" />
          <small className="muted">If you use one, you’ll need it to restore. If it’s forgotten, nobody can recover it.</small>
        </label>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={busy} onClick={driveBackup}>Back up now</button>
          <button className="btn" disabled={busy} onClick={driveRestore}>Restore</button>
        </div>
        {status && <p className="status">{status}</p>}
        <button className="link small" onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? 'Hide' : 'Offline'} options</button>
        {showAdvanced && (
          <div className="advanced">
            <div className="btn-row">
              <button className="btn" disabled={busy} onClick={exportFile}>Save backup file</button>
              <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>Restore from file</button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            <label className="field">
              <span className="field-label">Google OAuth Client ID (developer setting)</span>
              <input
                value={data.settings.googleClientId ?? ''}
                placeholder={defaultClientId() ? 'Using built-in ID' : 'xxxx.apps.googleusercontent.com'}
                onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, googleClientId: e.target.value.trim() || undefined } }))}
              />
            </label>
          </div>
        )}
      </Card>

      <Card>
        <h3>🌿 My season & profile</h3>
        <label className="field">
          <span className="field-label">Name</span>
          <input value={p.name} onChange={(e) => update((d) => ({ ...d, profile: { ...d.profile!, name: e.target.value } }))} />
        </label>
        <label className="field">
          <span className="field-label">Season of life</span>
          <select value={p.season} onChange={(e) => update((d) => ({ ...d, profile: { ...d.profile!, season: e.target.value as Season } }))}>
            {SEASONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Country (for helplines)</span>
          <select value={data.settings.country} onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, country: e.target.value as Country } }))}>
            <option value="IN">India</option>
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="OTHER">Other</option>
          </select>
        </label>
      </Card>

      <Card>
        <h3>💛 If things feel too heavy</h3>
        <p className="small muted">This app is a companion, not therapy. Please reach out — you deserve support.</p>
        <ul className="helplines">
          {HELPLINES[data.settings.country].map((h) => (
            <li key={h.number + h.name}>
              <a className="btn" href={`tel:${h.number.replace(/[^0-9+]/g, '')}`}>📞 {h.number}</a>
              <div><b>{h.name}</b><small className="muted">{h.note}</small></div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3>🔒 Your data</h3>
        <p className="small muted">Stored only on this phone. No ads, no tracking, nothing sold, nothing used to train AI.</p>
        <button
          className="btn danger"
          onClick={async () => {
            if (confirm('Delete ALL data on this phone? Back up first if you want to keep it.') && confirm('Are you sure? This cannot be undone.')) await wipe();
          }}
        >
          Delete everything on this phone
        </button>
      </Card>
      <p className="center small muted">Finding Myself v0.1 · made with care</p>
    </div>
  );
}
