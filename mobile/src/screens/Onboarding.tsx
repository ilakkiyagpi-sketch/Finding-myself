import { useState } from 'react';
import { View } from 'react-native';
import { useStore, uid } from '../lib/store';
import { DIMENSIONS, SEASONS, blankScores, type Role, type Scores, type Season } from '../lib/types';
import { Btn, Chip, Choice, Field, H, Radar, RadarLegend, Row, Screen, Segmented, Slider, T } from '../components/ui';
import { useTheme } from '../components/theme';

const ROLE_PRESETS: { name: string; emoji: string }[] = [
  { name: 'Mother', emoji: '🤱' },
  { name: 'Partner / Wife', emoji: '💞' },
  { name: 'Daughter', emoji: '👵' },
  { name: 'Daughter-in-law', emoji: '🏡' },
  { name: 'Home-maker', emoji: '🍲' },
  { name: 'Professional', emoji: '💼' },
  { name: 'Student / Learner', emoji: '📖' },
  { name: 'Friend', emoji: '🤝' },
  { name: 'Community', emoji: '🌏' },
];

type Era = 'present' | 'past' | 'desired';

export default function Onboarding({ onRestore }: { onRestore: () => void }) {
  const { data, update } = useStore();
  const lang = data.settings.language ?? 'en';
  const setLanguage = (l: 'en' | 'ta') => update((d) => ({ ...d, settings: { ...d.settings, language: l } }));
  const t = useTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [season, setSeason] = useState<Season>('newborn');
  const [was, setWas] = useState(['', '', '']);
  const [now, setNow] = useState(['', '', '']);
  const [want, setWant] = useState(['', '', '']);
  const [era, setEra] = useState<Era>('present');
  const [scores, setScores] = useState<Record<Era, Scores>>({ past: blankScores(6), present: blankScores(5), desired: blankScores(7) });
  const [roles, setRoles] = useState<string[]>(['Mother']);
  const [identity, setIdentity] = useState('');
  const [anchor, setAnchor] = useState('');
  const [minimum, setMinimum] = useState('');

  const finish = () => {
    const ts = new Date().toISOString();
    const roleObjs: Role[] = [
      ...ROLE_PRESETS.filter((r) => roles.includes(r.name)).map((r) => ({
        id: uid(), name: r.name, emoji: r.emoji, hoursWeek: 0, energyGiven: 5, energyReceived: 5, satisfaction: 5, intention: '',
      })),
      { id: uid(), name: 'Me', emoji: '🌱', hoursWeek: 2, energyGiven: 3, energyReceived: 7, satisfaction: 5, intention: 'Time that is just mine', isMe: true },
    ];
    update((d) => ({
      ...d,
      profile: {
        name: name.trim(),
        season,
        wordsWas: was.map((w) => w.trim()).filter(Boolean),
        wordsNow: now.map((w) => w.trim()).filter(Boolean),
        wordsWant: want.map((w) => w.trim()).filter(Boolean),
        onboardedAt: ts,
      },
      snapshots: [{ id: uid(), date: ts, ...scores }],
      roles: roleObjs,
      habits: identity.trim()
        ? [{ id: uid(), identity: identity.trim(), anchor: anchor.trim(), minimum: minimum.trim() || '2 minutes', normal: '', stretch: '', createdAt: ts }]
        : [],
    }));
  };

  const words = (label: string, val: string[], set: (v: string[]) => void, ph: string[]) => (
    <View style={{ marginBottom: 10 }}>
      <T bold style={{ marginBottom: 6 }}>{label}</T>
      <Row style={{ gap: 8 }}>
        {val.map((w, i) => (
          <View key={i} style={{ flex: 1 }}>
            <Field value={w} placeholder={ph[i]} maxLength={20} onChangeText={(v) => set(val.map((x, j) => (j === i ? v : x)))} accessibilityLabel={`${label} ${i + 1}`} />
          </View>
        ))}
      </Row>
    </View>
  );

  const steps = [
    <View key="0">
      <Row style={{ justifyContent: 'flex-end', gap: 6 }}>
        <Chip label="English" on={lang === 'en'} onPress={() => setLanguage('en')} />
        <Chip label="தமிழ்" on={lang === 'ta'} onPress={() => setLanguage('ta')} />
      </Row>
      <T size={56}>🌿</T>
      <H>Finding Myself</H>
      <T size={18} style={{ marginBottom: 14 }}>You were never lost. Life rearranged you. Let’s gently find the pieces — and carry them forward, your way.</T>
      <T style={{ marginBottom: 8 }}>🪞 A mirror and a map — not therapy, not a test.</T>
      <T style={{ marginBottom: 8 }}>🔒 Everything stays on this phone. Backup goes only to your own Google Drive, if you choose.</T>
      <T style={{ marginBottom: 18 }}>🌱 No guilt, no streaks that punish, no comparing.</T>
      <Field label="What should I call you?" value={name} onChangeText={setName} placeholder="Your name" />
      <Btn title="I already have a backup — restore it" onPress={onRestore} />
    </View>,
    <View key="1">
      <H level={2}>Which season of life are you in?</H>
      <T muted style={{ marginBottom: 12 }}>The app shrinks plans automatically in heavy seasons. You can change this anytime.</T>
      <View style={{ gap: 10 }}>
        {SEASONS.map((s) => (
          <Choice key={s.key} label={s.label} on={season === s.key} onPress={() => setSeason(s.key)} />
        ))}
      </View>
    </View>,
    <View key="2">
      <H level={2}>Three words each</H>
      <T muted style={{ marginBottom: 12 }}>Don’t think too long. First words are often the truest.</T>
      {words('Who I was', was, setWas, ['curious', 'bold', 'artsy'])}
      {words('Who I am now', now, setNow, ['tired', 'caring', 'strong'])}
      {words('Who I want to be', want, setWant, ['calm', 'creative', 'free'])}
    </View>,
    <View key="3">
      <H level={2}>Your self graph</H>
      <T muted>Score each part of life 0–10. Start with Now; then Then (before the big change) and Want.</T>
      <Segmented<Era>
        options={[{ key: 'present', label: 'Now' }, { key: 'past', label: 'Then' }, { key: 'desired', label: 'Want' }]}
        value={era}
        onChange={setEra}
      />
      <Radar past={scores.past} present={scores.present} desired={scores.desired} size={260} />
      <RadarLegend />
      {DIMENSIONS.map((d) => (
        <Slider key={d.key} label={`${d.emoji} ${d.label}`} value={scores[era][d.key]} onChange={(v) => setScores((s) => ({ ...s, [era]: { ...s[era], [d.key]: v } }))} />
      ))}
    </View>,
    <View key="4">
      <H level={2}>Your roles</H>
      <T muted style={{ marginBottom: 12 }}>Tap all the hats you wear. 🌱 Me is always included — it is a real role too.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {ROLE_PRESETS.map((r) => (
          <Choice
            key={r.name}
            style={{ width: '48%' }}
            label={`${r.emoji} ${r.name}`}
            on={roles.includes(r.name)}
            onPress={() => setRoles((rs) => (rs.includes(r.name) ? rs.filter((x) => x !== r.name) : [...rs, r.name]))}
          />
        ))}
        <Choice style={{ width: '48%' }} label="🌱 Me" on disabled onPress={() => {}} />
      </View>
    </View>,
    <View key="5">
      <H level={2}>One tiny habit for this week</H>
      <T muted style={{ marginBottom: 12 }}>Small enough to do on your hardest day. Anchor it to something that already happens.</T>
      <Field label="I am a woman who…" value={identity} onChangeText={setIdentity} placeholder="reads / moves / draws / prays / sings" />
      <Field label="After I… (anchor)" value={anchor} onChangeText={setAnchor} placeholder="put the baby down for the afternoon nap" />
      <Field label="Minimum version (bad-day size)" value={minimum} onChangeText={setMinimum} placeholder="read 1 page" />
      <T small muted>You can skip this and add habits later.</T>
    </View>,
  ];

  const last = step === steps.length - 1;
  return (
    <Screen
      footer={
        <>
          {step > 0 && <Btn title="Back" onPress={() => setStep(step - 1)} style={{ flex: 1 }} />}
          <Btn primary title={last ? 'Begin 🌱' : 'Next'} disabled={step === 0 && !name.trim()} onPress={() => (last ? finish() : setStep(step + 1))} style={{ flex: 1 }} />
        </>
      }
    >
      <Row style={{ gap: 6, marginBottom: 20 }}>
        {steps.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= step ? t.primary : t.line }} />
        ))}
      </Row>
      {steps[step]}
    </Screen>
  );
}
