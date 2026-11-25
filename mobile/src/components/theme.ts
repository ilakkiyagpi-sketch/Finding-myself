import { useColorScheme } from 'react-native';

// Palette drawn from the logo: deep plum → rose → apricot, warm cream, a touch of gold.
const light = {
  bg: '#FAF6F2',
  surface: '#FFFFFF',
  text: '#2A1F33',
  muted: '#7B6F86',
  line: '#ECE3EC',
  primary: '#5E3B7E',
  primaryInk: '#FFFFFF',
  primarySoft: '#F2EAF8',
  accent: '#E08F76',
  accentSoft: '#FCEBE4',
  gold: '#F4B942',
  past: '#B98A6A',
  present: '#6E4A92',
  desired: '#3F9B8A',
  warn: '#C0662A',
  danger: '#B3423A',
  up: '#2E8B5B',
  heroFrom: '#4B2E6B',
  heroMid: '#8C4A7E',
  heroTo: '#D9896F',
  heroText: '#FFF6EE',
  shadow: '#4B2E6B',
};

const dark: typeof light = {
  bg: '#15111A',
  surface: '#211A29',
  text: '#F3EEF6',
  muted: '#A89DB3',
  line: '#30283A',
  primary: '#C9A9E8',
  primaryInk: '#1A1320',
  primarySoft: '#2E2440',
  accent: '#EBA18A',
  accentSoft: '#3A2A2A',
  gold: '#F4C15E',
  past: '#D1A77F',
  present: '#C9A9E8',
  desired: '#7CC7B3',
  warn: '#E6A15A',
  danger: '#E57A70',
  up: '#6FCF97',
  heroFrom: '#3A2354',
  heroMid: '#6E3A63',
  heroTo: '#A8644F',
  heroText: '#FFF6EE',
  shadow: '#000000',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

// Fonts: Fraunces (warm serif) for titles, Nunito (soft, rounded) for everything else.
// Tamil uses the phone's own Tamil font, which renders Tamil script best.
export const FONTS = {
  title: 'Fraunces_600SemiBold',
  body: 'Nunito_400Regular',
  semi: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  heavy: 'Nunito_800ExtraBold',
  italic: 'Nunito_400Regular_Italic',
};
