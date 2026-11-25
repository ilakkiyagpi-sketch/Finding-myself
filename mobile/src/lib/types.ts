export type Era = 'past' | 'present' | 'desired';

export const DIMENSIONS = [
  { key: 'creativity', label: 'Creativity & play', emoji: '🎨' },
  { key: 'learning', label: 'Learning & curiosity', emoji: '📚' },
  { key: 'body', label: 'Body & health', emoji: '🌿' },
  { key: 'solitude', label: 'Solitude & inner life', emoji: '🕯️' },
  { key: 'friends', label: 'Friendships & belonging', emoji: '🤝' },
  { key: 'partner', label: 'Partnership & intimacy', emoji: '💞' },
  { key: 'work', label: 'Work & ambition', emoji: '💼' },
  { key: 'meaning', label: 'Meaning & spirituality', emoji: '✨' },
  { key: 'independence', label: 'Independence', emoji: '🦋' },
  { key: 'joy', label: 'Joy & fun', emoji: '🌻' },
  { key: 'rest', label: 'Rest', emoji: '🌙' },
  { key: 'expression', label: 'Self-expression', emoji: '👗' },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]['key'];
export type Scores = Record<DimensionKey, number>;

export type Season = 'pregnant' | 'newborn' | 'toddler' | 'school' | 'teen' | 'other';
export const SEASONS: { key: Season; label: string; heavy: boolean }[] = [
  { key: 'pregnant', label: 'Expecting a baby', heavy: false },
  { key: 'newborn', label: 'Baby under 1 year', heavy: true },
  { key: 'toddler', label: 'Toddler (1–3 years)', heavy: true },
  { key: 'school', label: 'School-age children', heavy: false },
  { key: 'teen', label: 'Older children / teens', heavy: false },
  { key: 'other', label: 'Something else', heavy: false },
];

export interface Profile {
  name: string;
  season: Season;
  wordsWas: string[];
  wordsNow: string[];
  wordsWant: string[];
  onboardedAt: string;
}

export interface GraphSnapshot {
  id: string;
  date: string; // ISO
  past: Scores;
  present: Scores;
  desired: Scores;
}

export type Quadrant = 'pleasant-high' | 'pleasant-low' | 'unpleasant-high' | 'unpleasant-low';

export interface CheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  quadrant: Quadrant;
  emotion: string;
  sleepHours?: number;
  likeMyself: number; // 0-10: "how much like yourself did you feel today?"
  mattered: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  createdAt: string;
  prompt?: string;
  text: string;
}

export type HabitLevel = 'minimum' | 'normal' | 'stretch';

export interface Habit {
  id: string;
  identity: string; // "I am a woman who reads"
  anchor: string; // "After the morning walk"
  minimum: string;
  normal: string;
  stretch: string;
  createdAt: string;
  archived?: boolean;
}

export interface HabitLog {
  habitId: string;
  date: string; // YYYY-MM-DD
  level: HabitLevel;
}

export interface Role {
  id: string;
  name: string;
  emoji: string;
  hoursWeek: number;
  energyGiven: number; // 0-10
  energyReceived: number; // 0-10
  satisfaction: number; // 0-10
  intention: string;
  isMe?: boolean;
}

export type Country = 'IN' | 'US' | 'UK' | 'OTHER';

export interface Settings {
  country: Country;
  googleClientId?: string;
  lastBackupAt?: string;
  toughDay?: string; // YYYY-MM-DD when "tough day" mode is on
}

export interface AppData {
  version: 1;
  profile?: Profile;
  snapshots: GraphSnapshot[];
  checkIns: CheckIn[];
  journal: JournalEntry[];
  habits: Habit[];
  habitLogs: HabitLog[];
  roles: Role[];
  settings: Settings;
  updatedAt: string;
}

export const emptyData = (): AppData => ({
  version: 1,
  snapshots: [],
  checkIns: [],
  journal: [],
  habits: [],
  habitLogs: [],
  roles: [],
  settings: { country: 'IN' },
  updatedAt: new Date().toISOString(),
});

export const blankScores = (v = 5): Scores =>
  Object.fromEntries(DIMENSIONS.map((d) => [d.key, v])) as Scores;
