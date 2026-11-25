import { useState, type ReactNode } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import RNSlider from '@react-native-community/slider';
import Svg, { G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { useTheme } from './theme';
import { DIMENSIONS, type Scores } from '../lib/types';
import { HELPLINES } from '../lib/safety';
import { useStore } from '../lib/store';
import { tr } from '../lib/i18n';

// ---------- Text ----------
export function T({
  children,
  muted,
  small,
  bold,
  size,
  style,
  italic,
}: {
  children: ReactNode;
  muted?: boolean;
  small?: boolean;
  bold?: boolean;
  size?: number;
  italic?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Text
      style={[
        { color: muted ? t.muted : t.text, fontSize: size ?? (small ? 13.5 : 16), lineHeight: (size ?? (small ? 13.5 : 16)) * 1.45 },
        bold && { fontWeight: '700' },
        italic && { fontStyle: 'italic' },
        style,
      ]}
    >
      {typeof children === 'string' ? tr(children) : children}
    </Text>
  );
}

export function H({ children, level = 1 }: { children: ReactNode; level?: 1 | 2 | 3 }) {
  const size = level === 1 ? 28 : level === 2 ? 21 : 17;
  return (
    <T bold size={size} style={{ marginBottom: 6, lineHeight: size * 1.25 }}>
      {children}
    </T>
  );
}

// ---------- Layout ----------
export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer && <View style={[s.footer, { backgroundColor: t.bg, borderTopColor: t.line }]}>{footer}</View>}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[s.card, { backgroundColor: t.surface, borderColor: t.line }, style]}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>{children}</View>;
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.line, marginVertical: 8 }} />;
}

// ---------- Controls (all ≥ 48dp tall) ----------
export function Btn({
  title,
  onPress,
  primary,
  danger,
  disabled,
  style,
  wide,
}: {
  title: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  wide?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: primary ? t.primary : t.surface, borderColor: primary ? t.primary : t.line },
        wide && { alignSelf: 'stretch' },
        (disabled || pressed) && { opacity: disabled ? 0.45 : 0.8 },
        style,
      ]}
    >
      <Text style={{ color: primary ? t.primaryInk : danger ? t.danger : t.text, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>{tr(title)}</Text>
    </Pressable>
  );
}

export function LinkBtn({ title, onPress, danger }: { title: string; onPress: () => void; danger?: boolean }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10} style={{ paddingVertical: 8, minHeight: 40, justifyContent: 'center' }}>
      <Text style={{ color: danger ? t.danger : t.primary, fontWeight: '700', fontSize: 15.5 }}>{tr(title)}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={onPress}
      style={[s.chip, { borderColor: on ? t.primary : t.line, backgroundColor: on ? t.primarySoft : t.bg }]}
    >
      <Text style={{ color: t.text, fontWeight: on ? '700' : '400', fontSize: 15 }}>{tr(label)}</Text>
    </Pressable>
  );
}

export function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.wrap}>
      {options.map((o) => (
        <Chip key={o} label={o} on={value === o} onPress={() => onChange(o)} />
      ))}
    </View>
  );
}

export function Choice({ label, on, onPress, disabled, style }: { label: string; on?: boolean; onPress: () => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      disabled={disabled}
      onPress={onPress}
      style={[s.choice, { borderColor: on ? t.primary : t.line, backgroundColor: on ? t.primarySoft : t.surface }, style]}
    >
      <Text style={{ color: t.text, fontWeight: on ? '700' : '400', fontSize: 16 }}>{tr(label)}</Text>
    </Pressable>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.seg, { backgroundColor: t.primarySoft }]}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[s.segBtn, value === o.key && { backgroundColor: t.surface, elevation: 1 }]}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === o.key }}
        >
          <Text style={{ color: t.text, fontWeight: '700' }}>{tr(o.label)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label?: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <T bold style={{ marginBottom: 6 }}>{label}</T>}
      <TextInput
        placeholderTextColor={t.muted}
        {...props}
        placeholder={props.placeholder ? tr(props.placeholder) : undefined}
        style={[
          s.input,
          { color: t.text, borderColor: t.line, backgroundColor: t.bg },
          props.multiline && { minHeight: 96, textAlignVertical: 'top' },
          props.style,
        ]}
      />
      {hint && <T small muted>{hint}</T>}
    </View>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T style={{ flex: 1 }}>{label}</T>
        <T bold>{String(value)}</T>
      </Row>
      <RNSlider
        accessibilityLabel={label}
        style={{ height: 40 }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={(v: number) => onChange(Math.round(v / step) * step)}
        minimumTrackTintColor={t.primary}
        maximumTrackTintColor={t.line}
        thumbTintColor={t.primary}
      />
      {hint && <T small muted>{hint}</T>}
    </View>
  );
}

// ---------- Charts ----------
export function Radar({ past, present, desired, size = 300 }: { past?: Scores; present: Scores; desired?: Scores; size?: number }) {
  const t = useTheme();
  const n = DIMENSIONS.length;
  const c = size / 2;
  const r = size / 2 - 34;
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + (Math.cos(a) * r * v) / 10, c + (Math.sin(a) * r * v) / 10];
  };
  const poly = (sc: Scores) => DIMENSIONS.map((d, i) => pt(i, sc[d.key]).join(',')).join(' ');
  return (
    <View style={{ alignItems: 'center' }} accessibilityLabel="Self graph: then, now and want">
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[2, 4, 6, 8, 10].map((v) => (
          <Polygon key={v} points={DIMENSIONS.map((_, i) => pt(i, v).join(',')).join(' ')} fill="none" stroke={t.line} strokeWidth={1} />
        ))}
        {DIMENSIONS.map((d, i) => {
          const [x, y] = pt(i, 10);
          const [lx, ly] = pt(i, 11.7);
          return (
            <G key={d.key}>
              <Line x1={c} y1={c} x2={x} y2={y} stroke={t.line} strokeWidth={1} />
              <SvgText x={lx} y={ly + 6} textAnchor="middle" fontSize={16}>
                {d.emoji}
              </SvgText>
            </G>
          );
        })}
        {desired && <Polygon points={poly(desired)} fill="none" stroke={t.desired} strokeWidth={2} />}
        {past && <Polygon points={poly(past)} fill="none" stroke={t.past} strokeWidth={2} strokeDasharray="5,4" />}
        <Polygon points={poly(present)} fill={t.present} fillOpacity={0.28} stroke={t.present} strokeWidth={2.5} />
      </Svg>
    </View>
  );
}

export function RadarLegend() {
  const t = useTheme();
  const item = (color: string, label: string, dashed?: boolean) => (
    <Row style={{ gap: 6 }}>
      <View style={{ width: 18, borderTopWidth: 3, borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }} />
      <T small muted>{label}</T>
    </Row>
  );
  return (
    <Row style={{ justifyContent: 'center', gap: 18, marginVertical: 8 }}>
      {item(t.past, 'Then', true)}
      {item(t.present, 'Now')}
      {item(t.desired, 'Want')}
    </Row>
  );
}

export function Sparkline({ values, max = 10 }: { values: number[]; max?: number }) {
  const t = useTheme();
  if (values.length < 2) return <T small muted>A few more check-ins and your line will appear here.</T>;
  const w = 300;
  const h = 70;
  const step = w / (values.length - 1);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(h - (v / max) * (h - 8) - 4).toFixed(1)}`).join(' ');
  return (
    <Svg width="100%" height={80} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <Path d={d} fill="none" stroke={t.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ---------- Safety ----------
export function Helplines() {
  const { data } = useStore();
  return (
    <View style={{ gap: 10, marginVertical: 10 }}>
      {HELPLINES[data.settings.country].map((h) => (
        <Row key={h.number + h.name}>
          <Btn primary title={`📞 ${h.number}`} onPress={() => Linking.openURL(`tel:${h.number.replace(/[^0-9+]/g, '')}`)} style={{ minWidth: 150 }} />
          <View style={{ flex: 1 }}>
            <T bold>{h.name}</T>
            <T small muted>{h.note}</T>
          </View>
        </Row>
      ))}
    </View>
  );
}

/** Shown when text suggests she may be in crisis. Coaching pauses; care comes first. */
export function SupportSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { backgroundColor: t.surface }]}>
          <ScrollView>
            <H level={2}>You matter. You don’t have to carry this alone.</H>
            <T>
              What you wrote sounds really heavy. Your words are saved privately. Right now, it may help to talk to someone — a person you trust, a
              doctor, or a free helpline. Feelings like these are more common than people say, especially after having a baby, and help works.
            </T>
            <Helplines />
            <T small muted style={{ marginBottom: 12 }}>
              This app is a companion, not therapy or a medical service.
            </T>
            <Btn title="Close" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function useSupportSheet(onClosed?: () => void) {
  const [visible, setVisible] = useState(false);
  return {
    open: () => setVisible(true),
    sheet: (
      <SupportSheet
        visible={visible}
        onClose={() => {
          setVisible(false);
          onClosed?.();
        }}
      />
    ),
  };
}

// ---------- Dialogs ----------
export function confirmAsync(title: string, message: string, ok = 'OK', destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: ok, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }),
  );
}

export const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 14 },
  btn: { minHeight: 48, paddingHorizontal: 18, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { minHeight: 42, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  choice: { minHeight: 54, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  seg: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 14, marginVertical: 8 },
  segBtn: { minHeight: 42, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  footer: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20, maxHeight: '90%' },
});
