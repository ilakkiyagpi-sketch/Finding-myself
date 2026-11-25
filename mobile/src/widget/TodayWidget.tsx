import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { eventsOn, planFor, planProgress } from '../lib/planner';
import { todayStr } from '../lib/dates';
import type { AppData } from '../lib/types';

type Hex = `#${string}`;
const C = {
  light: { bg: '#FBF7F2' as Hex, text: '#2E2733' as Hex, muted: '#7A7180' as Hex, chip: '#EFE6F4' as Hex, accent: '#7A5C8E' as Hex },
  dark: { bg: '#27222C' as Hex, text: '#F1EBF3' as Hex, muted: '#A99FB0' as Hex, chip: '#3A3047' as Hex, accent: '#B89BD0' as Hex },
};

function Button({ label, uri, c }: { label: string; uri: string; c: (typeof C)['light'] }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri }}
      style={{ flex: 1, height: 40, backgroundColor: c.chip, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
    >
      <TextWidget text={label} style={{ fontSize: 14, color: c.text, fontWeight: '600' }} />
    </FlexWidget>
  );
}

export function TodayWidget({ data, dark }: { data: AppData | null; dark?: boolean }) {
  const c = dark ? C.dark : C.light;
  const today = todayStr();
  const plan = data ? planFor(data, today) : undefined;
  const { done, total } = planProgress(plan);
  const next = plan?.items.find((i) => i.status === 'open');
  const evs = data ? eventsOn(data.events, today) : [];
  const checkedIn = !!data?.checkIns.some((x) => x.date === today);

  const line1 = !data?.profile
    ? 'Open the app to begin 🌿'
    : plan
      ? total
        ? `${done} of ${total} done${next ? ` · next: ${next.text}` : ' 🎉'}`
        : plan.intention || 'Planned. Be gentle with yourself.'
      : 'Plan your day — two minutes';
  const line2 = evs.length ? evs.map((e) => `${e.emoji} ${e.title}`).join(' · ') : checkedIn ? '🪞 Checked in today ✓' : '🪞 How are you, really?';

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: c.bg, borderRadius: 22, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text="Finding Myself 🌿" style={{ fontSize: 13, color: c.accent, fontWeight: '700' }} />
        <TextWidget text={line1} maxLines={1} truncate="END" style={{ fontSize: 16, color: c.text, fontWeight: '600', marginTop: 4 }} />
        <TextWidget text={line2} maxLines={1} truncate="END" style={{ fontSize: 13, color: c.muted, marginTop: 2 }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'row', flexGap: 8, marginTop: 8 }}>
        <Button label="☀️ Plan" uri="findingmyself://plan" c={c} />
        <Button label="🪞 Check in" uri="findingmyself://checkin" c={c} />
        <Button label="✍️ Write" uri="findingmyself://journal" c={c} />
      </FlexWidget>
    </FlexWidget>
  );
}
