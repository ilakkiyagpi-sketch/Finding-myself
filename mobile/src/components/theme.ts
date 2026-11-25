import { useColorScheme } from 'react-native';

const light = {
  bg: '#fbf7f2',
  surface: '#ffffff',
  text: '#2e2733',
  muted: '#7a7180',
  line: '#ece4dc',
  primary: '#7a5c8e',
  primaryInk: '#ffffff',
  primarySoft: '#efe6f4',
  accent: '#e4a46a',
  past: '#b08968',
  present: '#7a5c8e',
  desired: '#4f9d8a',
  warn: '#b5651d',
  danger: '#b3423a',
  up: '#2f8a5b',
};

const dark: typeof light = {
  bg: '#1c1820',
  surface: '#27222c',
  text: '#f1ebf3',
  muted: '#a99fb0',
  line: '#3a3340',
  primary: '#b89bd0',
  primaryInk: '#1c1820',
  primarySoft: '#3a3047',
  accent: '#e4a46a',
  past: '#d1a77f',
  present: '#b89bd0',
  desired: '#7cc7b3',
  warn: '#e6a15a',
  danger: '#e57a70',
  up: '#6fcf97',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
