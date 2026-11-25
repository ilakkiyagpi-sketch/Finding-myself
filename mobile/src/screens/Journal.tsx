import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useStore, todayStr, uid } from '../lib/store';
import { PROMPT_GROUPS, promptOfTheDay } from '../lib/prompts';
import { needsSupport } from '../lib/safety';
import { Btn, Card, Chip, Field, H, LinkBtn, Screen, Segmented, T, confirmAsync, useSupportSheet } from '../components/ui';
import { useTheme } from '../components/theme';

export default function Journal() {
  const { data, update } = useStore();
  const t = useTheme();
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

  const remove = async (id: string) => {
    if (await confirmAsync('Delete this entry?', 'This cannot be undone.', 'Delete', true))
      update((d) => ({ ...d, journal: d.journal.filter((j) => j.id !== id) }));
  };

  if (writing) {
    const g = PROMPT_GROUPS.find((x) => x.key === group)!;
    return (
      <Screen
        footer={
          <>
            <Btn title="Cancel" onPress={() => setWriting(false)} style={{ flex: 1 }} />
            <Btn primary title="Save" disabled={!text.trim()} onPress={save} style={{ flex: 1 }} />
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
        <Field multiline value={text} onChangeText={setText} placeholder="Write freely. No one else will read this." style={{ minHeight: 260, fontSize: 17 }} autoFocus />
      </Screen>
    );
  }

  const entries = [...data.journal].reverse();
  return (
    <Screen>
      <H>Journal</H>
      <T muted style={{ marginBottom: 12 }}>Private. Ask “what” more than “why”.</T>
      <Btn primary wide title="✍️ New entry" onPress={() => setWriting(true)} style={{ marginBottom: 14 }} />
      {entries.length === 0 && <T muted style={{ textAlign: 'center' }}>Your words will live here.</T>}
      {entries.map((j) => {
        const open = openId === j.id;
        return (
          <Card key={j.id}>
            <Pressable onPress={() => setOpenId(open ? null : j.id)} accessibilityRole="button">
              <T small muted>{new Date(j.createdAt).toLocaleString()}</T>
              {j.prompt && <T bold small>{j.prompt}</T>}
              <T style={{ marginTop: 4 }}>{open ? j.text : j.text.length > 180 ? j.text.slice(0, 180) + '…' : j.text}</T>
            </Pressable>
            {open && <LinkBtn danger title="Delete" onPress={() => remove(j.id)} />}
          </Card>
        );
      })}
      {support.sheet}
    </Screen>
  );
}
