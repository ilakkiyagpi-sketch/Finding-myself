import { Platform, Pressable, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useTheme } from './theme';
import { Field, Row, T } from './ui';
import { MONTHS, WEEKDAYS, parseTime } from '../lib/planner';
import { todayStr } from '../lib/dates';

const pad = (n: number) => String(n).padStart(2, '0');

/** Tap to pick a time (native Android clock). Falls back to typing "HH:MM" elsewhere. */
export function TimeField({ label, value, onChange, optional }: { label: string; value?: string; onChange: (v: string | undefined) => void; optional?: boolean }) {
  const t = useTheme();
  if (Platform.OS !== 'android') {
    return <Field label={label} value={value ?? ''} placeholder="HH:MM" onChangeText={(v) => onChange(/^\d{1,2}:\d{2}$/.test(v) ? v.padStart(5, '0') : v || undefined)} />;
  }
  const open = () => {
    const { hour, minute } = parseTime(value, '08:00');
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    DateTimePickerAndroid.open({
      value: d,
      mode: 'time',
      is24Hour: false,
      onChange: (ev, date) => {
        if (ev.type === 'set' && date) onChange(`${pad(date.getHours())}:${pad(date.getMinutes())}`);
      },
    });
  };
  return (
    <View style={{ marginBottom: 14 }}>
      <T bold style={{ marginBottom: 6 }}>{label}</T>
      <Row>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? to12h(value) : 'not set'}`}
          style={{ flex: 1, minHeight: 48, borderWidth: 1, borderColor: t.line, borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: t.bg }}
        >
          <T>{value ? `🕐 ${to12h(value)}` : '🕐 Add a time'}</T>
        </Pressable>
        {optional && value && (
          <Pressable onPress={() => onChange(undefined)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Remove time" style={{ padding: 10 }}>
            <T muted>✕</T>
          </Pressable>
        )}
      </Row>
    </View>
  );
}

export function to12h(hhmm: string) {
  const { hour, minute } = parseTime(hhmm);
  const h = hour % 12 || 12;
  return `${h}:${pad(minute)} ${hour < 12 ? 'am' : 'pm'}`;
}

/** Month grid. `marks` maps YYYY-MM-DD → dot color(s). */
export function MonthGrid({
  year,
  month,
  selected,
  onSelect,
  marks,
}: {
  year: number;
  month: number; // 0-11
  selected?: string;
  onSelect: (date: string) => void;
  marks?: Record<string, string[]>;
}) {
  const t = useTheme();
  const today = todayStr();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  return (
    <View>
      <Row style={{ gap: 0 }}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <T small muted>{w[0]}</T>
          </View>
        ))}
      </Row>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <Row key={r} style={{ gap: 0 }}>
          {cells.slice(r * 7, r * 7 + 7).map((day, i) => {
            if (!day) return <View key={i} style={{ flex: 1, minHeight: 46 }} />;
            const date = `${year}-${pad(month + 1)}-${pad(day)}`;
            const isSel = date === selected;
            const isToday = date === today;
            const dots = marks?.[date] ?? [];
            return (
              <Pressable
                key={i}
                onPress={() => onSelect(date)}
                accessibilityRole="button"
                accessibilityLabel={`${day} ${MONTHS[month]}${dots.length ? `, ${dots.length} item${dots.length > 1 ? 's' : ''}` : ''}`}
                accessibilityState={{ selected: isSel }}
                style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: isSel ? t.primary : 'transparent' }}
              >
                <T bold={isToday} style={{ color: isSel ? t.primaryInk : isToday ? t.primary : t.text }}>
                  {day}
                </T>
                <Row style={{ gap: 2, height: 6 }}>
                  {dots.slice(0, 3).map((c, k) => (
                    <View key={k} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isSel ? t.primaryInk : c }} />
                  ))}
                </Row>
              </Pressable>
            );
          })}
        </Row>
      ))}
    </View>
  );
}
