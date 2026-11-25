import { useEffect, useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { Btn, H, T } from './ui';
import { useTheme } from './theme';

// Ways to complete the body's stress cycle (Nagoski, "Burnout") — the stressor may remain,
// but the stress in the body can be released.
const WAYS = [
  { emoji: '🌬️', title: 'Breathe slowly', text: 'Breathe in for 4, out for 6 — a long out-breath tells your body it is safe. Try the guided breath above.' },
  { emoji: '🚶', title: 'Move for 5 minutes', text: 'Walk, sway with the baby, stretch, dance to one song. Movement is the most reliable way out.' },
  { emoji: '🤗', title: 'A 20-second hug', text: 'A long hug (or holding your child, or your own arms crossed) slows the heart.' },
  { emoji: '😂', title: 'A real laugh', text: 'Call the friend who makes you laugh, or watch one silly video. Belly laughs count.' },
  { emoji: '😢', title: 'Let yourself cry', text: 'Tears are a release, not a failure. Five minutes in the bathroom is allowed.' },
  { emoji: '🎨', title: 'Make something', text: 'Doodle, hum, cook something with care, write three lines. Creative acts close the loop.' },
  { emoji: '💬', title: 'Kind contact', text: 'A warm word with someone — a neighbour, a shopkeeper, your mother on the phone.' },
];

function Breath() {
  const t = useTheme();
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const cycle = tick % 10; // 4 in, 6 out
  const rounds = Math.floor(tick / 10);
  useEffect(() => {
    if (rounds >= 6) setRunning(false);
  }, [rounds]);
  const inhale = cycle < 4;
  const scale = inhale ? 0.6 + (cycle / 4) * 0.4 : 1 - ((cycle - 4) / 6) * 0.4;
  return (
    <View style={{ alignItems: 'center', marginVertical: 12 }}>
      <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 160 * scale, height: 160 * scale, borderRadius: 80, backgroundColor: t.primarySoft, borderWidth: 2, borderColor: t.primary }} />
      </View>
      {running ? (
        <T bold size={18}>{inhale ? `Breathe in… ${4 - cycle}` : `Breathe out… ${10 - cycle}`}</T>
      ) : (
        <T muted>{rounds >= 6 ? 'Well done. Notice how your body feels.' : 'Six slow breaths, about one minute.'}</T>
      )}
      <View style={{ height: 8 }} />
      <Btn
        primary={!running}
        title={running ? 'Stop' : '🌬️ Breathe with me'}
        onPress={() => {
          if (!running) setTick(0);
          setRunning(!running);
        }}
      />
    </View>
  );
}

export default function StressRelease({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '92%' }}>
          <ScrollView>
            <H level={2}>🫧 A moment for you</H>
            <T muted style={{ marginBottom: 8 }}>The problem may still be there — but the stress in your body can be let out. Pick one.</T>
            <Breath />
            {WAYS.map((w) => (
              <View key={w.title} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.line }}>
                <T bold>{w.emoji} {w.title}</T>
                <T small muted>{w.text}</T>
              </View>
            ))}
            <View style={{ height: 12 }} />
            <Btn title="Close" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
