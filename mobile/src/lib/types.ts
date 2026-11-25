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
  tags?: string[]; // what's affecting me: 'sleep', 'baby', 'walk', ...
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  createdAt: string;
  prompt?: string;
  text: string;
  photos?: string[]; // file names in the app's media folder
  audio?: { name: string; seconds: number }[];
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

// ---------- Day plan & year planner ----------
export type PlanStatus = 'open' | 'done' | 'partly' | 'moved';

export interface PlanItem {
  id: string;
  text: string;
  time?: string; // "HH:MM"
  role?: string; // role name, e.g. "Mother", "Me"
  status: PlanStatus;
  carriedFrom?: string; // YYYY-MM-DD it was moved from
  carryCount?: number;
}

export interface DayPlan {
  date: string; // YYYY-MM-DD
  intention: string; // "What will I protect today?"
  items: PlanItem[];
  plannedAt: string;
  evening?: { wentWell: string; mine: string; doneAt: string };
}

export interface PlannerEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (first occurrence for yearly events)
  time?: string; // "HH:MM"
  note?: string;
  emoji: string;
  repeatYearly: boolean; // birthdays, anniversaries
  remindOnDay: boolean;
  remindDaysBefore: number[]; // e.g. [1, 7]
}

export interface Settings {
  country: Country;
  googleClientId?: string;
  lastBackupAt?: string;
  toughDay?: string; // YYYY-MM-DD when "tough day" mode is on
  lastUpdateCheck?: string; // ISO time of the last check for a new app version
  availableUpdate?: { build: number; url: string; sizeMb: number; publishedAt: string };
  dismissedUpdateBuild?: number; // "Later" was tapped for this build
  wakeTime: string; // "HH:MM" — morning plan reminder
  eveningTime: string; // "HH:MM" — evening checklist reminder
  remindMorning: boolean;
  remindEvening: boolean;
  eventReminderTime: string; // "HH:MM" for "on the day" / "days before" reminders of all-day events
  planSkippedOn?: string; // YYYY-MM-DD: "not today" tapped on the morning plan
  appLock?: boolean; // fingerprint / device PIN when opening the app
  autoBackup?: boolean; // weekly Google Drive backup when the app opens
  language?: 'en' | 'ta';
}

// ---------- Rewind (life story) ----------
export type SceneType = 'high' | 'low' | 'turning' | 'fullyMe' | 'proud';
export interface Scene {
  id: string;
  type: SceneType;
  text: string;
}
export interface LifeChapter {
  id: string;
  title: string; // "The college dreamer"
  emoji: string;
  fromYear?: number;
  toYear?: number; // undefined = ongoing
  summary: string;
  scenes: Scene[];
  traits: string[]; // who I was then: curious, bold…
  loved: string[]; // passions, places, music, people
  photo?: string; // media file name
}

// ---------- Compass (dreams) & letters ----------
export type DreamOrigin = 'revive' | 'evolve' | 'new';
export type DreamStage = 'seed' | 'sprout' | 'grow';
export interface Dream {
  id: string;
  title: string;
  origin: DreamOrigin;
  stage: DreamStage;
  why: string;
  // WOOP
  outcome: string;
  obstacle: string;
  plan: string; // "If <obstacle>, then I will …"
  steps: { id: string; text: string; done: boolean }[];
  createdAt: string;
}

export interface Letter {
  id: string;
  writtenAt: string;
  openOn: string; // YYYY-MM-DD
  text: string;
  openedAt?: string;
}

// ---------- Mental load ----------
export type Who = 'me' | 'partner' | 'family' | 'shared' | 'paid';
export interface LoadTask {
  id: string;
  name: string;
  notices: Who; // who remembers it needs doing
  plans: Who;
  does: Who;
  action: 'keep' | 'share' | 'simplify' | 'drop';
}

export interface WeeklyReview {
  weekStart: string; // Monday YYYY-MM-DD
  wins: string;
  hard: string;
  adjustment: string;
  doneAt: string;
}

export interface WellbeingCheck {
  date: string; // YYYY-MM-DD
  answers: number[]; // EPDS item scores 0-3
  score: number;
  selfHarm: number; // item 10 score
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
  dayPlans: DayPlan[];
  events: PlannerEvent[];
  chapters: LifeChapter[];
  dreams: Dream[];
  letters: Letter[];
  loadTasks: LoadTask[];
  weeklyReviews: WeeklyReview[];
  wellbeingChecks: WellbeingCheck[];
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
  dayPlans: [],
  events: [],
  chapters: [],
  dreams: [],
  letters: [],
  loadTasks: [],
  weeklyReviews: [],
  wellbeingChecks: [],
  settings: {
    country: 'IN',
    wakeTime: '07:00',
    eveningTime: '21:00',
    remindMorning: true,
    remindEvening: true,
    eventReminderTime: '08:00',
  },
  updatedAt: new Date().toISOString(),
});

export const blankScores = (v = 5): Scores =>
  Object.fromEntries(DIMENSIONS.map((d) => [d.key, v])) as Scores;
