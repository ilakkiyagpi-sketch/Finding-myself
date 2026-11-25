import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { useStore, normalise } from '../lib/store';
import { backupToDrive, friendlyGoogleError, restoreFromDrive, signedInEmail, signOutGoogle } from '../lib/gdrive';
import { decryptText, encryptText, isEncrypted } from '../lib/crypto';
import { SEASONS, type AppData, type Country } from '../lib/types';
import { Btn, Card, Choice, Field, H, Helplines, LinkBtn, Row, Screen, T, confirmAsync } from '../components/ui';

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

  const serialise = async () => {
    const json = JSON.stringify(data);
    return passphrase ? JSON.stringify(await encryptText(json, passphrase)) : json;
  };

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
    replaceAll(normalise(parsed));
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

  return { busy, status, passphrase, setPassphrase, email, driveBackup, driveRestore, exportFile, importFile, signOut };
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

export default function More() {
  const { data, update, wipe } = useStore();
  const p = data.profile!;

  return (
    <Screen>
      <H>More</H>
      <BackupCard />

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
      </Card>

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
      <T small muted style={{ textAlign: 'center' }}>Finding Myself v0.1 · made with care</T>
    </Screen>
  );
}
