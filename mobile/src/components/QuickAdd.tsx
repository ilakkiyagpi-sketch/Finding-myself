import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useStore, todayStr, uid } from '../lib/store';
import { parseSpokenPlan } from '../lib/voicePlan';
import { planFor, upsertPlan } from '../lib/planner';
import { needsSupport } from '../lib/safety';
import { setDraft, useDraft } from '../lib/drafts';
import { Btn, Field, H, T, ff, useSupportSheet } from './ui';
import { useTheme } from './theme';
import { to12h } from './pickers';
import Dictate from './Dictate';
import type { PlanItem } from '../lib/types';

/** Floating ➕ — capture a plan, a thought or a feeling from any screen, by voice or typing. */
export function QuickAddButton({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Quick add: speak or type a plan, thought or feeling"
      style={({ pressed }) => ({
        position: 'absolute',
        right: 18,
        bottom: 78,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: t.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: t.shadow,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={[{ color: t.primaryInk, fontSize: 30, lineHeight: 34 }, ff('bold')]}>+</Text>
    </Pressable>
  );
}

export default function QuickAdd({ visible, autoListen, onClose, openCheckIn }: { visible: boolean; autoListen?: boolean; onClose: () => void; openCheckIn: () => void }) {
  const { data, update } = useStore();
  const t = useTheme();
  const textD = useDraft('quick.text', '');
  const text = textD.value;
  const [msg, setMsg] = useState('');
  const support = useSupportSheet(onClose);
  const parsed = text.trim() ? parseSpokenPlan(text) : [];
  const looksLikePlan = parsed.some((p) => p.time);

  const done = (m: string) => {
    textD.clear();
    setMsg(m);
    setTimeout(() => {
      setMsg('');
      onClose();
    }, 900);
  };

  const toPlan = () => {
    const today = todayStr();
    const items: PlanItem[] = parsed.map((p) => ({ id: uid(), text: p.text, time: p.time, status: 'open' }));
    if (!items.length) return;
    update((d) => {
      const existing = planFor(d, today);
      const plan = existing ?? { date: today, intention: '', items: [], plannedAt: new Date().toISOString() };
      return upsertPlan(d, { ...plan, items: [...plan.items, ...items].sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99')) });
    });
    done(`✅ Added ${items.length} to today’s plan`);
  };
  const toJournal = () => {
    update((d) => ({ ...d, journal: [...d.journal, { id: uid(), createdAt: new Date().toISOString(), text: text.trim() }] }));
    if (needsSupport(text)) {
      textD.clear();
      support.open();
    } else done('✅ Saved to your journal');
  };
  const toCheckIn = () => {
    setDraft(`checkin.${todayStr()}.mattered`, text.trim());
    textD.clear();
    onClose();
    openCheckIn();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close quick add" />
        <View style={{ backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <H level={2}>Quick add</H>
            <T muted style={{ marginBottom: 6 }}>Speak or type — a plan, a thought, or how you feel.</T>
            {visible && (
              <Dictate
                label="🎤 Speak"
                autoStart={autoListen}
                hint="Listening… e.g. “Call Amma at 4 pm, then evening walk.”"
                onText={(spoken) => textD.setValue((cur) => (cur.trim() ? `${cur.trimEnd()} ${spoken}` : spoken))}
              />
            )}
            <Field multiline value={text} onChangeText={textD.setValue} placeholder="Type here…" style={{ minHeight: 90 }} />
            {looksLikePlan && (
              <View style={{ backgroundColor: t.primarySoft, borderRadius: 14, padding: 10, marginBottom: 10 }}>
                <T small muted>Looks like plans:</T>
                {parsed.map((p, i) => (
                  <T key={i} small>• {p.time ? `${to12h(p.time)} — ` : ''}{p.text}</T>
                ))}
              </View>
            )}
            {!!msg && <T bold style={{ color: t.desired, marginBottom: 8 }}>{msg}</T>}
            <View style={{ gap: 8 }}>
              <Btn primary={looksLikePlan || !text.trim()} title="☀️ Add to today’s plan" disabled={!parsed.length} onPress={toPlan} />
              <Btn primary={!looksLikePlan && !!text.trim()} title="✍️ Save to journal" disabled={!text.trim()} onPress={toJournal} />
              <Btn title="🪞 It’s how I feel — check in" disabled={!text.trim()} onPress={toCheckIn} />
              <Btn title="Close" onPress={onClose} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      {support.sheet}
    </Modal>
  );
}
