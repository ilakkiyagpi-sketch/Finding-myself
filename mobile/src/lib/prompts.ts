// Reflection prompts drawn from the project's knowledge skills.
// Rule: prefer "what/how" questions over "why" (Eurich, Insight).

export interface PromptGroup {
  key: string;
  label: string;
  prompts: string[];
}

export const PROMPT_GROUPS: PromptGroup[] = [
  {
    key: 'now',
    label: 'Mirror · today',
    prompts: [
      'When did I feel most like myself today? When least?',
      'What did I need today that I didn’t get? What is one small way to get it tomorrow?',
      'What am I feeling right now — can I find a more precise word for it?',
      'What went better today than I expected?',
      'If my best friend described my week to me, what would I tell her?',
      'What drained me most today, and can any of it be shared, skipped or simplified?',
    ],
  },
  {
    key: 'rewind',
    label: 'Rewind · who I was',
    prompts: [
      'Describe a moment when you felt completely, unmistakably yourself. Where were you? What were you doing?',
      'What did a normal Saturday look like before children? What do you miss most — the activity, or the feeling?',
      'What did 20-year-old you believe she would be doing now? What still feels true?',
      'What did you let go of to get here? Which of those do you want back, in some form?',
      'Which activities made you lose track of time as a child?',
      'Tell a hard moment from your life — and then what it taught you or gave you.',
    ],
  },
  {
    key: 'mother',
    label: 'Motherhood & roles',
    prompts: [
      'Which parts of motherhood feel like *me*? Which feel like a costume?',
      'What “should” about being a mother did I inherit? Do I agree with it?',
      'What has motherhood given me — skills, strengths, values — that the old me didn’t have?',
      'Which role takes the most from me right now? Which gives the most back?',
      'Which task do I carry in my head that no one else sees?',
      'What would a boundary sound like that protects my energy and still honours my love?',
    ],
  },
  {
    key: 'future',
    label: 'Compass · my way forward',
    prompts: [
      'What dream did I put on the shelf? Is it still mine, or has it changed shape?',
      'Imagine yourself at 50, living fully as yourself. Describe an ordinary Tuesday.',
      'What is the smallest version of this dream I could start this month?',
      'If no one would judge me, how would I spend a free Sunday?',
      'Which value of mine has been quietest lately? How could it get 10 minutes this week?',
    ],
  },
  {
    key: 'kind',
    label: 'Kindness',
    prompts: [
      'This is hard. Others feel this too. What would I say to a friend feeling this way?',
      'What am I proud of this week that nobody saw?',
      'Can two things be true for me right now? Write both.',
    ],
  },
];

export const ALL_PROMPTS = PROMPT_GROUPS.flatMap((g) => g.prompts);

export function promptOfTheDay(date: string): string {
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ALL_PROMPTS[h % ALL_PROMPTS.length];
}

// ~80 feeling words (emotional granularity: naming a feeling precisely helps regulate it).
export const EMOTIONS: Record<string, string[]> = {
  'pleasant-high': ['joyful', 'proud', 'hopeful', 'playful', 'inspired', 'excited', 'confident', 'energised', 'grateful', 'loved', 'free', 'curious', 'creative', 'alive', 'amused', 'motivated', 'connected', 'capable', 'brave', 'light'],
  'pleasant-low': ['calm', 'content', 'tender', 'relieved', 'peaceful', 'cosy', 'safe', 'rested', 'satisfied', 'gentle', 'patient', 'balanced', 'accepted', 'thoughtful', 'reflective', 'cared for', 'settled', 'quiet', 'warm', 'at ease'],
  'unpleasant-high': ['anxious', 'overwhelmed', 'irritated', 'angry', 'restless', 'frustrated', 'guilty', 'stressed', 'rushed', 'resentful', 'jealous', 'worried', 'pressured', 'touched-out', 'on edge', 'panicky', 'scattered', 'hurt', 'ashamed', 'stretched thin'],
  'unpleasant-low': ['tired', 'sad', 'lonely', 'numb', 'drained', 'disconnected', 'invisible', 'bored', 'hopeless', 'discouraged', 'empty', 'unseen', 'lost', 'disappointed', 'heavy', 'stuck', 'burnt out', 'homesick', 'unmotivated', 'fragile'],
};

/** "What's affecting me" tags for check-ins — the app learns which ones help. */
export const AFFECT_TAGS: { key: string; label: string }[] = [
  { key: 'sleep-good', label: '😴 Slept well' },
  { key: 'sleep-poor', label: '🥱 Poor sleep' },
  { key: 'baby', label: '👶 Baby' },
  { key: 'kids', label: '🧒 Kids' },
  { key: 'partner', label: '💞 Partner' },
  { key: 'family', label: '👵 Family' },
  { key: 'friends', label: '🤝 Friends' },
  { key: 'work', label: '💼 Work' },
  { key: 'study', label: '📚 Study' },
  { key: 'housework', label: '🧺 Housework' },
  { key: 'walk', label: '🚶 Walk / outdoors' },
  { key: 'exercise', label: '🧘 Exercise / yoga' },
  { key: 'metime', label: '🌱 Me-time' },
  { key: 'hobby', label: '🎨 Hobby' },
  { key: 'reading', label: '📖 Reading' },
  { key: 'faith', label: '🙏 Prayer / faith' },
  { key: 'health', label: '🤒 Health' },
  { key: 'periods', label: '🩸 Cycle' },
  { key: 'screens', label: '📱 Too much phone' },
  { key: 'alone', label: '🫥 Alone a lot' },
  { key: 'help', label: '🫶 Got help' },
  { key: 'money', label: '💰 Money' },
];

export const tagLabel = (k: string) => AFFECT_TAGS.find((t) => t.key === k)?.label ?? k;

export const QUADRANTS = [
  { key: 'pleasant-high', label: 'Good & energised', emoji: '🌞' },
  { key: 'pleasant-low', label: 'Good & calm', emoji: '🌤️' },
  { key: 'unpleasant-high', label: 'Hard & wired', emoji: '🌪️' },
  { key: 'unpleasant-low', label: 'Hard & low', emoji: '🌧️' },
] as const;
