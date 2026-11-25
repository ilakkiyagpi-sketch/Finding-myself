import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useStore, todayStr } from '../lib/store';
import { addDays } from '../lib/planner';
import { Btn, Card, H, Helplines, Row, Screen, T } from '../components/ui';
import { useTheme } from '../components/theme';
import type { AppData, WellbeingCheck } from '../lib/types';

// Edinburgh Postnatal Depression Scale (EPDS).
// Source: Cox, J.L., Holden, J.M., & Sagovsky, R. (1987). Detection of postnatal depression:
// Development of the 10-item Edinburgh Postnatal Depression Scale. British Journal of
// Psychiatry, 150, 782–786. Reproduced with citation as the authors permit.
// Each option lists [text, score].
const ITEMS: { q: string; options: [string, number][] }[] = [
  { q: 'I have been able to laugh and see the funny side of things', options: [['As much as I always could', 0], ['Not quite so much now', 1], ['Definitely not so much now', 2], ['Not at all', 3]] },
  { q: 'I have looked forward with enjoyment to things', options: [['As much as I ever did', 0], ['Rather less than I used to', 1], ['Definitely less than I used to', 2], ['Hardly at all', 3]] },
  { q: 'I have blamed myself unnecessarily when things went wrong', options: [['Yes, most of the time', 3], ['Yes, some of the time', 2], ['Not very often', 1], ['No, never', 0]] },
  { q: 'I have been anxious or worried for no good reason', options: [['No, not at all', 0], ['Hardly ever', 1], ['Yes, sometimes', 2], ['Yes, very often', 3]] },
  { q: 'I have felt scared or panicky for no very good reason', options: [['Yes, quite a lot', 3], ['Yes, sometimes', 2], ['No, not much', 1], ['No, not at all', 0]] },
  { q: 'Things have been getting on top of me', options: [['Yes, most of the time I haven’t been able to cope at all', 3], ['Yes, sometimes I haven’t been coping as well as usual', 2], ['No, most of the time I have coped quite well', 1], ['No, I have been coping as well as ever', 0]] },
  { q: 'I have been so unhappy that I have had difficulty sleeping', options: [['Yes, most of the time', 3], ['Yes, sometimes', 2], ['Not very often', 1], ['No, not at all', 0]] },
  { q: 'I have felt sad or miserable', options: [['Yes, most of the time', 3], ['Yes, quite often', 2], ['Not very often', 1], ['No, not at all', 0]] },
  { q: 'I have been so unhappy that I have been crying', options: [['Yes, most of the time', 3], ['Yes, quite often', 2], ['Only occasionally', 1], ['No, never', 0]] },
  { q: 'The thought of harming myself has occurred to me', options: [['Yes, quite often', 3], ['Sometimes', 2], ['Hardly ever', 1], ['Never', 0]] },
];

function meaning(c: WellbeingCheck) {
  if (c.selfHarm > 0) return { level: 'urgent' as const, text: 'You shared that thoughts of harming yourself have come up. Please talk to someone today — a doctor, a helpline, or a person you trust. You deserve support right now.' };
  if (c.score >= 13) return { level: 'high' as const, text: 'Your answers suggest you may be going through a hard time that a doctor can really help with. This is common after having a baby, and it is treatable. Please consider showing this summary to your doctor or midwife soon.' };
  if (c.score >= 10) return { level: 'mid' as const, text: 'Your answers suggest some signs worth talking about. Consider mentioning how you’ve been feeling to your doctor, and check in again in two weeks.' };
  return { level: 'low' as const, text: 'Your answers don’t suggest signs of depression right now. If things change, you can take this again anytime — and talking to someone is always allowed.' };
}

function summaryHtml(d: AppData, c: WellbeingCheck) {
  const from = addDays(c.date, -14);
  const cis = d.checkIns.filter((x) => x.date >= from && x.date <= c.date);
  const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '—');
  const sleep = avg(cis.map((x) => x.sleepHours ?? NaN).filter((x) => !Number.isNaN(x)));
  const like = avg(cis.map((x) => x.likeMyself));
  const feelings = Object.entries(cis.reduce<Record<string, number>>((m, x) => ({ ...m, [x.emotion]: (m[x.emotion] ?? 0) + 1 }), {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([e, n]) => `${e} (${n})`)
    .join(', ');
  const rows = ITEMS.map((it, i) => `<tr><td>${i + 1}. ${it.q}</td><td>${it.options.find((o) => o[1] === c.answers[i])?.[0] ?? ''}</td><td style="text-align:center">${c.answers[i]}</td></tr>`).join('');
  return `<html><head><meta charset="utf-8"><style>
    body{font-family:sans-serif;color:#222;padding:24px;font-size:13px} h1{font-size:20px;margin:0 0 4px} h2{font-size:15px;margin:18px 0 6px}
    table{border-collapse:collapse;width:100%} td,th{border:1px solid #ccc;padding:6px;vertical-align:top} th{background:#f3eef6;text-align:left}
    .muted{color:#666;font-size:11px} .score{font-size:18px;font-weight:bold}
  </style></head><body>
  <h1>Wellbeing summary</h1>
  <div class="muted">${d.profile?.name ?? ''} · prepared ${c.date} with the Finding Myself app · shared by choice</div>
  <h2>Edinburgh Postnatal Depression Scale (past 7 days)</h2>
  <div class="score">Total score: ${c.score} / 30${c.selfHarm > 0 ? ' · Item 10 (self-harm thoughts) answered positively' : ''}</div>
  <table><tr><th>Question</th><th>Answer</th><th>Score</th></tr>${rows}</table>
  <h2>Daily check-ins, last 14 days</h2>
  <p>Check-ins: ${cis.length} · average sleep: ${sleep} h · average “felt like myself”: ${like} / 10<br/>Most common feelings: ${feelings || '—'}</p>
  <p class="muted">The EPDS is a screening questionnaire, not a diagnosis (Cox, Holden & Sagovsky, 1987, Br J Psychiatry 150:782–786). Please interpret with a clinician.</p>
  </body></html>`;
}

export default function Wellbeing({ done }: { done: () => void }) {
  const { data, update } = useStore();
  const t = useTheme();
  const [answers, setAnswers] = useState<(number | null)[]>(Array(ITEMS.length).fill(null));
  const [result, setResult] = useState<WellbeingCheck | null>(null);
  const [msg, setMsg] = useState('');
  const complete = answers.every((a) => a !== null);
  const history = [...data.wellbeingChecks].sort((a, b) => b.date.localeCompare(a.date));

  const submit = () => {
    const a = answers as number[];
    const c: WellbeingCheck = { date: todayStr(), answers: a, score: a.reduce((x, y) => x + y, 0), selfHarm: a[9] };
    update((d) => ({ ...d, wellbeingChecks: [...d.wellbeingChecks.filter((x) => x.date !== c.date), c] }));
    setResult(c);
  };

  const sharePdf = async (c: WellbeingCheck) => {
    try {
      setMsg('Preparing PDF…');
      const { uri } = await Print.printToFileAsync({ html: summaryHtml(data, c) });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share wellbeing summary' });
      setMsg('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  if (result) {
    const m = meaning(result);
    return (
      <Screen footer={<Btn primary title="Done" onPress={done} style={{ flex: 1 }} />}>
        <H>Thank you for checking in 💛</H>
        <Card style={m.level === 'urgent' || m.level === 'high' ? { borderColor: t.warn, borderWidth: 2 } : undefined}>
          <T bold size={18}>Score: {result.score} / 30</T>
          <T style={{ marginTop: 6 }}>{m.text}</T>
          {(m.level === 'urgent' || m.level === 'high') && <Helplines />}
        </Card>
        {Platform.OS !== 'web' && <Btn title="📄 Make a PDF summary for my doctor" onPress={() => sharePdf(result)} />}
        {!!msg && <T small muted style={{ marginTop: 6 }}>{msg}</T>}
        <T small muted style={{ marginTop: 12 }}>This is a screening questionnaire, not a diagnosis. Only you decide who sees it.</T>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Btn title="Back" onPress={done} style={{ flex: 1 }} />
          <Btn primary title="See my result" disabled={!complete} onPress={submit} style={{ flex: 1 }} />
        </>
      }
    >
      <H>Wellbeing check</H>
      <T muted style={{ marginBottom: 12 }}>
        Ten questions doctors use after a baby arrives (the Edinburgh scale). Think about the <T bold>past 7 days</T>, not just today. Optional and private — it suggests, never diagnoses.
      </T>
      {ITEMS.map((it, i) => (
        <Card key={i}>
          <T bold style={{ marginBottom: 6 }}>{i + 1}. {it.q}</T>
          {it.options.map(([label, score]) => {
            const on = answers[i] === score;
            return (
              <Pressable
                key={label}
                onPress={() => setAnswers((a) => a.map((x, j) => (j === i ? score : x)))}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={{ minHeight: 46, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, marginVertical: 2, backgroundColor: on ? t.primarySoft : 'transparent', borderWidth: 1, borderColor: on ? t.primary : t.line }}
              >
                <Row>
                  <T>{on ? '🔘' : '⚪'}</T>
                  <T style={{ flex: 1 }}>{label}</T>
                </Row>
              </Pressable>
            );
          })}
        </Card>
      ))}
      {history.length > 0 && (
        <Card>
          <H level={3}>Earlier checks</H>
          {history.slice(0, 6).map((c) => (
            <Row key={c.date} style={{ justifyContent: 'space-between', minHeight: 40 }}>
              <T>{c.date}</T>
              <T bold>{c.score} / 30</T>
              {Platform.OS !== 'web' && <Btn title="PDF" onPress={() => sharePdf(c)} />}
            </Row>
          ))}
        </Card>
      )}
      {!!msg && <T small muted>{msg}</T>}
      <View style={{ height: 8 }} />
      <T small muted>Cox, Holden & Sagovsky (1987), British Journal of Psychiatry 150:782–786.</T>
    </Screen>
  );
}
