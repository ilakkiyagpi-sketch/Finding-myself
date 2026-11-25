import { useMemo, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useStore, todayStr, uid } from '../lib/store';
import { PROMPT_GROUPS, promptOfTheDay } from '../lib/prompts';
import { needsSupport } from '../lib/safety';
import { addPhoto, deleteMedia, keepRecording, mediaUri } from '../lib/media';
import { Btn, Card, Chip, Field, H, LinkBtn, Row, Screen, Segmented, T, confirmAsync, useSupportSheet } from '../components/ui';
import { useTheme } from '../components/theme';
import type { JournalEntry } from '../lib/types';

const hashtags = (text: string) => [...new Set((text.match(/#[\p{L}\p{N}_-]+/gu) ?? []).map((h) => h.toLowerCase()))];
const native = Platform.OS !== 'web';

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function VoicePlayer({ name, seconds, onRemove }: { name: string; seconds: number; onRemove?: () => void }) {
  const t = useTheme();
  const player = useAudioPlayer(mediaUri(name));
  const st = useAudioPlayerStatus(player);
  const toggle = () => {
    if (st.playing) player.pause();
    else {
      if (st.didJustFinish || (st.duration && st.currentTime >= st.duration - 0.2)) player.seekTo(0);
      player.play();
    }
  };
  return (
    <Row style={{ backgroundColor: t.primarySoft, borderRadius: 14, padding: 6, marginVertical: 4 }}>
      <Btn title={st.playing ? '⏸' : '▶️'} onPress={toggle} />
      <T style={{ flex: 1 }}>🎙️ Voice note · {st.playing ? `${fmt(st.currentTime)} / ` : ''}{fmt(seconds)}</T>
      {onRemove && <LinkBtn danger title="✕" onPress={onRemove} />}
    </Row>
  );
}

function Recorder({ onDone }: { onDone: (name: string, seconds: number) => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const st = useAudioRecorderState(recorder, 250);
  const [err, setErr] = useState('');
  const start = async () => {
    setErr('');
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return setErr('Microphone permission is needed for voice notes.');
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  };
  const stop = async () => {
    const secs = st.durationMillis / 1000;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (recorder.uri) onDone(await keepRecording(recorder.uri), secs);
  };
  return (
    <View>
      {st.isRecording ? (
        <Btn primary title={`⏹ Stop · ${fmt(st.durationMillis / 1000)}`} onPress={stop} />
      ) : (
        <Btn title="🎙️ Voice note" onPress={start} />
      )}
      {!!err && <T small muted>{err}</T>}
    </View>
  );
}

function Photo({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <View style={{ marginVertical: 4 }}>
      <Image source={{ uri: mediaUri(name) }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} resizeMode="cover" accessibilityLabel="Journal photo" />
      {onRemove && <LinkBtn danger title="Remove photo" onPress={onRemove} />}
    </View>
  );
}

function Writer({ close }: { close: () => void }) {
  const { update } = useStore();
  const t = useTheme();
  const [prompt, setPrompt] = useState<string | undefined>(promptOfTheDay(todayStr()));
  const [group, setGroup] = useState(PROMPT_GROUPS[0].key);
  const [text, setText] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [audio, setAudio] = useState<{ name: string; seconds: number }[]>([]);
  const [err, setErr] = useState('');
  const support = useSupportSheet(close);
  const g = PROMPT_GROUPS.find((x) => x.key === group)!;
  const canSave = !!text.trim() || photos.length > 0 || audio.length > 0;

  const save = () => {
    const entry: JournalEntry = { id: uid(), createdAt: new Date().toISOString(), prompt, text: text.trim(), photos, audio };
    update((d) => ({ ...d, journal: [...d.journal, entry] }));
    if (needsSupport(text)) support.open();
    else close();
  };
  const cancel = async () => {
    if (canSave && !(await confirmAsync('Discard this entry?', 'What you wrote will not be saved.', 'Discard', true))) return;
    deleteMedia([...photos, ...audio.map((a) => a.name)]);
    close();
  };
  const pick = async (src: 'camera' | 'library') => {
    try {
      setErr('');
      const n = await addPhoto(src);
      if (n) setPhotos((p) => [...p, n]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Screen
      footer={
        <>
          <Btn title="Cancel" onPress={cancel} style={{ flex: 1 }} />
          <Btn primary title="Save" disabled={!canSave} onPress={save} style={{ flex: 1 }} />
        </>
      }
    >
      <H>Write</H>
      <Segmented options={PROMPT_GROUPS.map((x) => ({ key: x.key, label: x.label }))} value={group} onChange={setGroup} />
      <View style={{ gap: 8, marginBottom: 12 }}>
        <Chip label="✍️ Free write" on={!prompt} onPress={() => setPrompt(undefined)} />
        {g.prompts.map((p) => (
          <Chip key={p} label={p} on={prompt === p} onPress={() => setPrompt(p)} />
        ))}
      </View>
      {prompt && (
        <View style={{ borderLeftWidth: 3, borderLeftColor: t.accent, paddingLeft: 12, marginBottom: 12 }}>
          <T italic size={17}>{prompt}</T>
        </View>
      )}
      <Field multiline value={text} onChangeText={setText} placeholder="Write freely. No one else will read this. Add #tags if you like." style={{ minHeight: 220, fontSize: 17 }} />
      {photos.map((p) => (
        <Photo key={p} name={p} onRemove={() => { deleteMedia([p]); setPhotos((xs) => xs.filter((x) => x !== p)); }} />
      ))}
      {audio.map((a) => (
        <VoicePlayer key={a.name} name={a.name} seconds={a.seconds} onRemove={() => { deleteMedia([a.name]); setAudio((xs) => xs.filter((x) => x.name !== a.name)); }} />
      ))}
      {native && (
        <Row style={{ flexWrap: 'wrap', marginTop: 8 }}>
          <Btn title="📷 Camera" onPress={() => pick('camera')} />
          <Btn title="🖼️ Photo" onPress={() => pick('library')} />
          <Recorder onDone={(name, seconds) => setAudio((xs) => [...xs, { name, seconds }])} />
        </Row>
      )}
      {!!err && <T small muted style={{ marginTop: 6 }}>{err}</T>}
      {support.sheet}
    </Screen>
  );
}

export default function Journal() {
  const { data, update } = useStore();
  const [writing, setWriting] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of data.journal) for (const h of hashtags(j.text)) counts.set(h, (counts.get(h) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  }, [data.journal]);

  if (writing) return <Writer close={() => setWriting(false)} />;

  const remove = async (j: JournalEntry) => {
    if (await confirmAsync('Delete this entry?', 'This cannot be undone.', 'Delete', true)) {
      deleteMedia([...(j.photos ?? []), ...(j.audio ?? []).map((a) => a.name)]);
      update((d) => ({ ...d, journal: d.journal.filter((x) => x.id !== j.id) }));
    }
  };

  const needle = q.trim().toLowerCase();
  const entries = [...data.journal]
    .reverse()
    .filter((j) => (!needle || j.text.toLowerCase().includes(needle) || j.prompt?.toLowerCase().includes(needle)) && (!tag || hashtags(j.text).includes(tag)));

  return (
    <Screen>
      <H>Journal</H>
      <T muted style={{ marginBottom: 12 }}>Private. Ask “what” more than “why”.</T>
      <Btn primary wide title="✍️ New entry" onPress={() => setWriting(true)} style={{ marginBottom: 14 }} />
      {data.journal.length > 3 && <Field value={q} onChangeText={setQ} placeholder="🔍 Search my journal" accessibilityLabel="Search journal" />}
      {allTags.length > 0 && (
        <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {allTags.slice(0, 12).map((h) => (
            <Chip key={h} label={h} on={tag === h} onPress={() => setTag(tag === h ? null : h)} />
          ))}
        </Row>
      )}
      {data.journal.length === 0 && <T muted style={{ textAlign: 'center' }}>Your words will live here.</T>}
      {data.journal.length > 0 && entries.length === 0 && <T muted style={{ textAlign: 'center' }}>Nothing matches.</T>}
      {entries.map((j) => {
        const open = openId === j.id;
        const media = (j.photos?.length ?? 0) + (j.audio?.length ?? 0);
        return (
          <Card key={j.id}>
            <Pressable onPress={() => setOpenId(open ? null : j.id)} accessibilityRole="button">
              <T small muted>
                {new Date(j.createdAt).toLocaleString()}
                {!open && media ? `  ·  ${j.photos?.length ? '🖼️' : ''}${j.audio?.length ? '🎙️' : ''}` : ''}
              </T>
              {j.prompt && <T bold small>{j.prompt}</T>}
              {!!j.text && <T style={{ marginTop: 4 }}>{open ? j.text : j.text.length > 180 ? j.text.slice(0, 180) + '…' : j.text}</T>}
            </Pressable>
            {open && native && (
              <>
                {j.photos?.map((p) => <Photo key={p} name={p} />)}
                {j.audio?.map((a) => <VoicePlayer key={a.name} name={a.name} seconds={a.seconds} />)}
              </>
            )}
            {open && <LinkBtn danger title="Delete" onPress={() => remove(j)} />}
          </Card>
        );
      })}
    </Screen>
  );
}
