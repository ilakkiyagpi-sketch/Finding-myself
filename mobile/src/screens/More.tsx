import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useStore, normalise } from '../lib/store';
import { backupToDrive, friendlyGoogleError, restoreFromDrive, signedInEmail, signOutGoogle } from '../lib/gdrive';
import { decryptText, isEncrypted } from '../lib/crypto';
import { buildBackup, rememberedPassphrase, setRememberedPassphrase } from '../lib/backup';
import { importMedia } from '../lib/media';
import { unlock } from '../components/Lock';
import { SEASONS, type AppData, type Country } from '../lib/types';
import { Btn, Card, Choice, Field, H, Helplines, LinkBtn, Row, Screen, T, confirmAsync } from '../components/ui';
import { checkForUpdate, installedBuild, startUpdate } from '../lib/updates';
import { TimeField } from '../components/pickers';
import { notificationsAllowed, setupNotifications, syncNotifications } from '../lib/notify';
import type { Tab } from '../../App';

const isAppData = (x: unknown): x is AppData =>
  typeof x === 'object' && x !== null && (x as AppData).version === 1 && Array.isArray((x as AppData).checkIns);

/** Shared by More and by the first-run "restore" path. */
export function useBackup() {
  const { data, update, replaceAll } = useStore();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    signedInEmail().then(setEmail).catch(() => {});
  }, []);

  useEffect(() => {
    rememberedPassphrase().then((p) => p && setPassphrase((cur) => cur || p));
  }, []);

  const serialise = () => buildBackup(data, passphrase);

  const restoreFrom = async (raw: string): Promise<boolean> => {
    let parsed: unknown = JSON.parse(raw);
    if (isEncrypted(parsed)) {
      if (!passphrase) throw new Error('This backup is protected. Type your backup passphrase above, then tap Restore again.');
      try {
        parsed = JSON.parse(await decryptText(parsed, passphrase));
      } catch {
        throw new Error('Wrong passphrase — the backup could not be opened.');
      }
    }
    if (!isAppData(parsed)) throw new Error('This is not a Finding Myself backup.');
    if (!(await confirmAsync('Restore backup?', 'This replaces everything currently on this phone with the backup.', 'Restore', true))) return false;
    const { media, ...rest } = parsed as AppData & { media?: Record<string, string> };
    await importMedia(media);
    replaceAll(normalise(rest));
    return true;
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    setStatus(label);
    try {
      await fn();
    } catch (e) {
      setStatus('⚠️ ' + friendlyGoogleError(e));
    } finally {
      setBusy(false);
    }
  };

  const driveBackup = () =>
    run(passphrase ? 'Encrypting and backing up…' : 'Backing up…', async () => {
      const { at, email: who } = await backupToDrive(await serialise());
      setEmail(who);
      update((d) => ({ ...d, settings: { ...d.settings, lastBackupAt: at } }));
      setStatus(`✅ Backed up to ${who}'s Google Drive.`);
    });

  const driveRestore = () =>
    run('Looking for your backup…', async () => {
      const res = await restoreFromDrive();
      if (!res) throw new Error('No backup found in this Google account yet.');
      setEmail(res.email);
      setStatus('Opening backup…');
      if (await restoreFrom(res.content)) setStatus(`✅ Restored backup from ${new Date(res.modifiedTime).toLocaleString()}.`);
      else setStatus('');
    });

  const exportFile = () =>
    run('Preparing file…', async () => {
      const name = `finding-myself-${new Date().toISOString().slice(0, 10)}.json`;
      const f = new File(Paths.cache, name);
      if (f.exists) f.delete();
      f.create();
      await f.write(await serialise());
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Save your backup file' });
      setStatus('✅ Backup file ready.');
    });

  const importFile = () =>
    run('Choose a backup file…', async () => {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', '*/*'], copyToCacheDirectory: true });
      if (res.canceled) return setStatus('');
      const raw = await new File(res.assets[0].uri).text();
      if (await restoreFrom(raw)) setStatus('✅ Restored from file.');
      else setStatus('');
    });

  const signOut = () =>
    run('Signing out…', async () => {
      await signOutGoogle();
      setEmail(null);
      setStatus('Signed out of Google.');
    });

  const toggleAuto = () =>
    run('', async () => {
      const on = !data.settings.autoBackup;
      if (on) {
        if (!data.settings.lastBackupAt) throw new Error('Do one “Back up now” first, so Google is connected.');
        await setRememberedPassphrase(passphrase || null);
      } else await setRememberedPassphrase(null);
      update((d) => ({ ...d, settings: { ...d.settings, autoBackup: on } }));
      setStatus(on ? `✅ Weekly automatic backup is on${passphrase ? ' (with your passphrase, kept in the phone’s secure keystore)' : ''}.` : 'Automatic backup is off.');
    });

  return { busy, status, passphrase, setPassphrase, email, driveBackup, driveRestore, exportFile, importFile, signOut, toggleAuto };
}

export function BackupCard({ firstRun }: { firstRun?: boolean }) {
  const { data } = useStore();
  const b = useBackup();
  const [offline, setOffline] = useState(false);
  const last = data.settings.lastBackupAt;
  const days = last ? Math.floor((Date.now() - new Date(last).getTime()) / 86400000) : null;

  return (
    <Card>
      <H level={3}>☁️ Google Drive backup</H>
      <T small muted>Saved in a hidden app folder in your own Google Drive. The app can only see its own backup file — not your other files.</T>
      {!firstRun && (
        <T small style={{ marginVertical: 6 }}>
          Last backup: <T small bold>{last ? new Date(last).toLocaleString() : 'never'}</T>
          {days !== null && days >= 7 ? `  · it’s been ${days} days` : ''}
        </T>
      )}
      {b.email && <T small muted>Google account: {b.email}</T>}
      <View style={{ height: 8 }} />
      <Field
        label="Backup passphrase (optional, recommended)"
        value={b.passphrase}
        onChangeText={b.setPassphrase}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Locks the backup before it leaves your phone"
        hint="If you use one, you’ll need it to restore. If it’s forgotten, nobody can recover the backup."
      />
      <Row>
        {!firstRun && <Btn primary title="Back up now" disabled={b.busy} onPress={b.driveBackup} style={{ flex: 1 }} />}
        <Btn primary={firstRun} title={firstRun ? 'Restore from Google Drive' : 'Restore'} disabled={b.busy} onPress={b.driveRestore} style={{ flex: 1 }} />
      </Row>
      {!firstRun && (
        <View style={{ marginTop: 10 }}>
          <Choice
            label={data.settings.autoBackup ? '🔁 Automatic weekly backup: on' : '🔁 Back up automatically every week'}
            on={!!data.settings.autoBackup}
            onPress={b.toggleAuto}
          />
        </View>
      )}
      {!!b.status && <T bold style={{ marginTop: 10 }}>{b.status}</T>}
      <Row style={{ justifyContent: 'space-between' }}>
        <LinkBtn title={offline ? 'Hide offline options' : 'Offline options'} onPress={() => setOffline(!offline)} />
        {b.email && !firstRun && <LinkBtn title="Sign out of Google" onPress={b.signOut} />}
      </Row>
      {offline && (
        <Row>
          {!firstRun && <Btn title="Save backup file" disabled={b.busy} onPress={b.exportFile} style={{ flex: 1 }} />}
          <Btn title="Restore from file" disabled={b.busy} onPress={b.importFile} style={{ flex: 1 }} />
        </Row>
      )}
      {Platform.OS === 'web' && <T small muted style={{ marginTop: 8 }}>(Google backup works in the installed Android app.)</T>}
    </Card>
  );
}

function UpdateCard() {
  const { update } = useStore();
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const current = installedBuild();
  if (current === null) return null; // web preview / development

  const check = async () => {
    setBusy(true);
    setStatus('Checking…');
    try {
      const u = await checkForUpdate();
      update((d) => ({ ...d, settings: { ...d.settings, lastUpdateCheck: new Date().toISOString(), availableUpdate: u ?? undefined, dismissedUpdateBuild: undefined } }));
      if (!u) setStatus('✅ You have the latest version.');
      else {
        setStatus(`Build ${u.build} is available (about ${u.sizeMb} MB). Opening download…`);
        await startUpdate(u);
      }
    } catch {
      setStatus('⚠️ Couldn’t check right now. Are you online?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <H level={3}>📲 App updates</H>
      <T small muted style={{ marginBottom: 8 }}>
        You have build {current}. New versions install on top of this one — your entries stay.
      </T>
      <Btn title="Check for updates" disabled={busy} onPress={check} />
      {!!status && <T bold style={{ marginTop: 10 }}>{status}</T>}
    </Card>
  );
}

function LockCard() {
  const { data, update } = useStore();
  const [msg, setMsg] = useState('');
  if (Platform.OS === 'web') return null;
  const toggle = async () => {
    const on = !data.settings.appLock;
    if (on) {
      const r = await unlock('Confirm to turn on the app lock');
      if (!r.ok) return setMsg(r.reason);
    }
    update((d) => ({ ...d, settings: { ...d.settings, appLock: on } }));
    setMsg(on ? '✅ The app will ask for your fingerprint or screen lock when it opens.' : 'App lock is off.');
  };
  return (
    <Card>
      <H level={3}>🔐 App lock</H>
      <T small muted style={{ marginBottom: 8 }}>Keeps your journal private if someone else picks up your phone.</T>
      <Choice label={data.settings.appLock ? 'Fingerprint / screen lock: on' : 'Lock with fingerprint / screen lock'} on={!!data.settings.appLock} onPress={toggle} />
      {!!msg && <T bold style={{ marginTop: 8 }}>{msg}</T>}
    </Card>
  );
}

function RemindersCard() {
  const { data, update } = useStore();
  const s = data.settings;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    notificationsAllowed().then(setAllowed);
  }, []);
  const set = (patch: Partial<typeof s>) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  if (Platform.OS === 'web') return null;
  return (
    <Card>
      <H level={3}>🔔 Daily rhythm & reminders</H>
      {allowed === false && (
        <>
          <T style={{ marginBottom: 8 }}>Notifications are off for this app, so reminders can’t reach you.</T>
          <Btn
            primary
            title="Allow notifications"
            onPress={async () => {
              const ok = await setupNotifications();
              setAllowed(ok);
              if (ok) syncNotifications(data);
              else Linking.openSettings();
            }}
          />
          <View style={{ height: 12 }} />
        </>
      )}
      <Choice label={s.remindMorning ? '☀️ Morning plan reminder: on' : '☀️ Morning plan reminder: off'} on={s.remindMorning} onPress={() => set({ remindMorning: !s.remindMorning })} />
      {s.remindMorning && <View style={{ marginTop: 8 }}><TimeField label="I usually wake up at" value={s.wakeTime} onChange={(v) => v && set({ wakeTime: v })} /></View>}
      <View style={{ height: 8 }} />
      <Choice label={s.remindEvening ? '🌙 Evening checklist reminder: on' : '🌙 Evening checklist reminder: off'} on={s.remindEvening} onPress={() => set({ remindEvening: !s.remindEvening })} />
      {s.remindEvening && <View style={{ marginTop: 8 }}><TimeField label="Evening check at" value={s.eveningTime} onChange={(v) => v && set({ eveningTime: v })} /></View>}
      <View style={{ height: 8 }} />
      <TimeField label="Planner reminders (all-day events) at" value={s.eventReminderTime} onChange={(v) => v && set({ eventReminderTime: v })} />
      <T small muted>Events with a time also remind you 1 hour before. Reminders work offline.</T>
    </Card>
  );
}

export default function More({ go }: { go: (t: Tab) => void }) {
  const { data, update, wipe } = useStore();
  const p = data.profile!;

  return (
    <Screen>
      <H>More</H>
      <Btn title="🌱 Rhythm — tiny habits & my roles" onPress={() => go('rhythm')} style={{ marginBottom: 14 }} />
      <RemindersCard />
      <BackupCard />

      <Card>
        <H level={3}>Language / மொழி</H>
        <Row style={{ gap: 8 }}>
          <Choice label="English" on={(data.settings.language ?? 'en') === 'en'} onPress={() => update((d) => ({ ...d, settings: { ...d.settings, language: 'en' } }))} style={{ flex: 1 }} />
          <Choice label="தமிழ்" on={data.settings.language === 'ta'} onPress={() => update((d) => ({ ...d, settings: { ...d.settings, language: 'ta' } }))} style={{ flex: 1 }} />
        </Row>
        <T small muted style={{ marginTop: 6 }}>Tamil covers the screens you use every day; the rest is being translated.</T>
      </Card>

      <Card>
        <H level={3}>🌙 Night mode</H>
        <T small muted style={{ marginBottom: 8 }}>Very dim, warm colours from 9:30 pm to 6 am — easier on your eyes during night feeds.</T>
        <Row style={{ gap: 8 }}>
          <Choice label="Automatic" on={(data.settings.nightMode ?? 'auto') === 'auto'} onPress={() => update((d) => ({ ...d, settings: { ...d.settings, nightMode: 'auto' } }))} style={{ flex: 1 }} />
          <Choice label="Off" on={data.settings.nightMode === 'off'} onPress={() => update((d) => ({ ...d, settings: { ...d.settings, nightMode: 'off' } }))} style={{ flex: 1 }} />
        </Row>
      </Card>

      <Card>
        <H level={3}>🌿 My season & profile</H>
        <Field label="Name" value={p.name} onChangeText={(v) => update((d) => ({ ...d, profile: { ...d.profile!, name: v } }))} />
        <T bold style={{ marginBottom: 6 }}>Season of life</T>
        <View style={{ gap: 8, marginBottom: 14 }}>
          {SEASONS.map((s) => (
            <Choice key={s.key} label={s.label} on={p.season === s.key} onPress={() => update((d) => ({ ...d, profile: { ...d.profile!, season: s.key } }))} />
          ))}
        </View>
        <T bold style={{ marginBottom: 6 }}>Country (for helplines)</T>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {(
            [
              ['IN', 'India'],
              ['US', 'USA'],
              ['UK', 'UK'],
              ['OTHER', 'Other'],
            ] as [Country, string][]
          ).map(([k, label]) => (
            <Choice key={k} label={label} on={data.settings.country === k} onPress={() => update((d) => ({ ...d, settings: { ...d.settings, country: k } }))} />
          ))}
        </Row>
      </Card>

      <Card>
        <H level={3}>💛 If things feel too heavy</H>
        <T small muted>This app is a companion, not therapy. Please reach out — you deserve support.</T>
        <Helplines />
        <Btn title="📝 Take the wellbeing check (EPDS, 2 minutes)" onPress={() => go('wellbeing')} />
      </Card>

      <LockCard />

      <Card>
        <H level={3}>🔒 Your data</H>
        <T small muted style={{ marginBottom: 10 }}>
          Stored only on this phone, in the app’s private folder. No ads, no tracking, nothing sold, nothing used to train AI. Uninstalling the app deletes it — keep a backup.
        </T>
        <Btn
          danger
          title="Delete everything on this phone"
          onPress={async () => {
            if (
              (await confirmAsync('Delete all data?', 'Back up first if you want to keep it.', 'Continue', true)) &&
              (await confirmAsync('Are you sure?', 'This cannot be undone.', 'Delete everything', true))
            )
              await wipe();
          }}
        />
      </Card>
      <UpdateCard />
      <T small muted style={{ textAlign: 'center' }}>Finding Myself v0.1{installedBuild() ? ` · build ${installedBuild()}` : ''} · made with care</T>
    </Screen>
  );
}
