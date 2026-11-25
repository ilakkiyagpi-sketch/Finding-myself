import { useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { useStore, uid } from '../lib/store';
import { addPhoto, deleteMedia, mediaUri } from '../lib/media';
import { Btn, Card, Chip, Field, H, LinkBtn, Row, T, confirmAsync } from '../components/ui';
import { useTheme } from '../components/theme';
import type { LifeChapter, Scene, SceneType } from '../lib/types';

const SCENES: { type: SceneType; label: string; prompt: string }[] = [
  { type: 'fullyMe', label: '✨ Fully me', prompt: 'A moment you felt completely, unmistakably yourself. Where were you? What were you doing?' },
  { type: 'high', label: '🌞 High point', prompt: 'The best moment of this chapter.' },
  { type: 'low', label: '🌧️ Low point', prompt: 'A hard moment — and what it taught you or gave you.' },
  { type: 'turning', label: '🔀 Turning point', prompt: 'When something changed in how you saw yourself or life.' },
  { type: 'proud', label: '🏅 Proud deed', prompt: 'Something you did that you’re proud of.' },
];
const sceneMeta = (t: SceneType) => SCENES.find((s) => s.type === t)!;

const CHAPTER_EMOJIS = ['🌱', '🎒', '📚', '🎓', '💼', '✈️', '💍', '🏡', '🤰', '👶', '🌻', '🔥', '🌊', '🦋', '🌙', '⭐'];

const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export default function Rewind() {
  const { data } = useStore();
  const t = useTheme();
  const [editing, setEditing] = useState<LifeChapter | null>(null);
  const chapters = [...data.chapters].sort((a, b) => (a.fromYear ?? 0) - (b.fromYear ?? 0));

  if (editing) return <ChapterEditor initial={editing} close={() => setEditing(null)} />;

  const blank = (): LifeChapter => ({ id: '', title: '', emoji: '🌱', summary: '', scenes: [], traits: [], loved: [] });
  const allTraits = [...new Set(chapters.flatMap((c) => c.traits))];
  const fullyMe = chapters.flatMap((c) => c.scenes.filter((s) => s.type === 'fullyMe').map((s) => ({ c, s })));

  return (
    <View>
      <H level={2}>⏪ Rewind — my life story</H>
      <T muted style={{ marginBottom: 12 }}>
        Split your life into chapters and name them. Not to go back — to bring the best of who you were forward.
      </T>

      {chapters.length === 0 && (
        <Card style={{ backgroundColor: t.primarySoft }}>
          <T>If your life were a book, what would the chapter titles be? e.g. “The curious schoolgirl”, “College dreamer”, “First job in the city”, “Becoming Amma”.</T>
        </Card>
      )}

      {chapters.map((c, i) => (
        <Pressable key={c.id} onPress={() => setEditing(c)} accessibilityRole="button">
          <Row style={{ alignItems: 'stretch', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 36 }}>
              <T size={26}>{c.emoji}</T>
              {i < chapters.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: t.line, marginVertical: 4 }} />}
            </View>
            <Card style={{ flex: 1 }}>
              <T small muted>
                {c.fromYear ?? '?'} – {c.toYear ?? 'now'}
              </T>
              <T bold size={17}>{c.title}</T>
              {!!c.summary && <T muted style={{ marginTop: 2 }}>{c.summary}</T>}
              {c.traits.length > 0 && <T small style={{ marginTop: 6 }}>I was: {c.traits.join(', ')}</T>}
              {c.scenes.length > 0 && <T small muted>{c.scenes.length} key moment{c.scenes.length > 1 ? 's' : ''}</T>}
            </Card>
          </Row>
        </Pressable>
      ))}
      <Btn primary title="+ Add a chapter" onPress={() => setEditing(blank())} style={{ marginBottom: 14 }} />

      {allTraits.length > 0 && (
        <Card>
          <H level={3}>🧬 Qualities that run through my story</H>
          <T small muted style={{ marginBottom: 6 }}>These were yours then. They’re still in you — maybe waiting.</T>
          <Row style={{ flexWrap: 'wrap', gap: 6 }}>
            {allTraits.map((tr) => (
              <Chip key={tr} label={tr} onPress={() => {}} />
            ))}
          </Row>
        </Card>
      )}
      {fullyMe.length > 0 && (
        <Card>
          <H level={3}>✨ Moments I was fully me</H>
          {fullyMe.map(({ c, s }) => (
            <T key={s.id} style={{ marginVertical: 4 }}>
              {c.emoji} <T italic>“{s.text}”</T>
            </T>
          ))}
          <T small muted style={{ marginTop: 6 }}>What did these moments have in common? That’s a clue to your essential self.</T>
        </Card>
      )}
    </View>
  );
}

function ChapterEditor({ initial, close }: { initial: LifeChapter; close: () => void }) {
  const { update } = useStore();
  const t = useTheme();
  const [c, setC] = useState<LifeChapter>(initial);
  const [traits, setTraits] = useState(initial.traits.join(', '));
  const [loved, setLoved] = useState(initial.loved.join(', '));
  const [sceneType, setSceneType] = useState<SceneType>('fullyMe');
  const [sceneText, setSceneText] = useState('');
  const [err, setErr] = useState('');

  const save = () => {
    const item: LifeChapter = { ...c, id: c.id || uid(), title: c.title.trim(), traits: splitList(traits), loved: splitList(loved) };
    update((d) => ({ ...d, chapters: [...d.chapters.filter((x) => x.id !== item.id), item] }));
    close();
  };
  const remove = async () => {
    if (await confirmAsync('Delete this chapter?', c.title, 'Delete', true)) {
      if (c.photo) deleteMedia([c.photo]);
      update((d) => ({ ...d, chapters: d.chapters.filter((x) => x.id !== c.id) }));
      close();
    }
  };
  const addScene = () => {
    if (!sceneText.trim()) return;
    const s: Scene = { id: uid(), type: sceneType, text: sceneText.trim() };
    setC({ ...c, scenes: [...c.scenes, s] });
    setSceneText('');
  };
  const year = (v: string) => (v.trim() ? Number(v.replace(/\D/g, '').slice(0, 4)) || undefined : undefined);

  return (
    <View>
      <H>{c.id ? 'Edit chapter' : 'New chapter'}</H>
      <Card>
        <Field label="Chapter title" value={c.title} onChangeText={(title) => setC({ ...c, title })} placeholder="The college dreamer" />
        <Row style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {CHAPTER_EMOJIS.map((e) => (
            <Chip key={e} label={e} on={c.emoji === e} onPress={() => setC({ ...c, emoji: e })} />
          ))}
        </Row>
        <Row>
          <View style={{ flex: 1 }}>
            <Field label="From (year)" keyboardType="number-pad" value={c.fromYear ? String(c.fromYear) : ''} onChangeText={(v) => setC({ ...c, fromYear: year(v) })} placeholder="2012" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="To (blank = now)" keyboardType="number-pad" value={c.toYear ? String(c.toYear) : ''} onChangeText={(v) => setC({ ...c, toYear: year(v) })} placeholder="2016" />
          </View>
        </Row>
        <Field label="In a few lines" multiline value={c.summary} onChangeText={(summary) => setC({ ...c, summary })} placeholder="Hostel life, late-night talks, painting the corridor walls…" />
        {Platform.OS !== 'web' && (
          <>
            {c.photo ? (
              <View>
                <Image source={{ uri: mediaUri(c.photo) }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 14 }} accessibilityLabel="Chapter photo" />
                <LinkBtn danger title="Remove photo" onPress={() => { deleteMedia([c.photo!]); setC({ ...c, photo: undefined }); }} />
              </View>
            ) : (
              <Btn
                title="🖼️ Add a photo from this time"
                onPress={async () => {
                  try {
                    const n = await addPhoto('library');
                    if (n) setC({ ...c, photo: n });
                  } catch (e) {
                    setErr(e instanceof Error ? e.message : String(e));
                  }
                }}
              />
            )}
            {!!err && <T small muted>{err}</T>}
          </>
        )}
      </Card>

      <Card>
        <H level={3}>Then-Me</H>
        <Field label="Who was I? (traits, comma separated)" value={traits} onChangeText={setTraits} placeholder="curious, bold, funny, artsy" />
        <Field label="What did I love? (passions, places, music, people)" value={loved} onChangeText={setLoved} placeholder="sketching, Ilaiyaraaja songs, beach walks, Divya" />
      </Card>

      <Card>
        <H level={3}>Key moments</H>
        {c.scenes.map((s) => (
          <View key={s.id} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: t.line }}>
            <T small bold>{sceneMeta(s.type).label}</T>
            <T>{s.text}</T>
            <LinkBtn danger title="Remove" onPress={() => setC({ ...c, scenes: c.scenes.filter((x) => x.id !== s.id) })} />
          </View>
        ))}
        <Row style={{ flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
          {SCENES.map((s) => (
            <Chip key={s.type} label={s.label} on={sceneType === s.type} onPress={() => setSceneType(s.type)} />
          ))}
        </Row>
        <T small muted italic style={{ marginBottom: 6 }}>{sceneMeta(sceneType).prompt}</T>
        <Field multiline value={sceneText} onChangeText={setSceneText} placeholder="Write the moment…" />
        <Btn title="Add moment" disabled={!sceneText.trim()} onPress={addScene} />
      </Card>

      <Row style={{ marginBottom: 20 }}>
        {!!c.id && <Btn danger title="Delete" onPress={remove} style={{ flex: 1 }} />}
        <Btn title="Cancel" onPress={close} style={{ flex: 1 }} />
        <Btn primary title="Save" disabled={!c.title.trim()} onPress={save} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}
