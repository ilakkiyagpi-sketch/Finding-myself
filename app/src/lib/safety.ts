import type { Country } from './types';

// Phrases that should pause coaching and show support resources.
// Deliberately broad: a false positive costs one gentle screen; a miss costs far more.
const CRISIS_PATTERNS: RegExp[] = [
  /\b(kill|hurt|harm)(ing)?\s+(my\s*self|myself)\b/i,
  /\bsuicid/i,
  /\bend\s+(my|it\s+all|my\s+life)\b/i,
  /\b(want|wish)\s+(to\s+)?(die|be\s+dead|disappear\s+forever)\b/i,
  /\bdon'?t\s+want\s+to\s+(live|be\s+alive|wake\s+up)\b/i,
  /\bno\s+(point|reason)\s+(in\s+)?(living|to\s+live)\b/i,
  /\bbetter\s+off\s+without\s+me\b/i,
  /\bself[-\s]?harm/i,
  /\bcut(ting)?\s+myself\b/i,
  /\b(hurt|harm|shake|kill)(ing)?\s+(my|the)\s+(baby|child|kid|son|daughter)\b/i,
  /\bnot\s+safe\s+at\s+home\b/i,
  /\b(he|she|they)\s+(hits?|beats?)\s+me\b/i,
  /தற்கொலை/, // Tamil: suicide
  /आत्महत्या/, // Hindi: suicide
];

export function needsSupport(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => p.test(text));
}

export interface Helpline {
  name: string;
  number: string;
  note: string;
}

// Verify these numbers before each public release.
export const HELPLINES: Record<Country, Helpline[]> = {
  IN: [
    { name: 'Tele-MANAS (Govt. of India, 24×7, free)', number: '14416', note: 'Mental health support in many Indian languages incl. Tamil' },
    { name: 'Tele-MANAS (toll-free)', number: '1-800-891-4416', note: 'Same service, alternate number' },
    { name: 'Emergency', number: '112', note: 'If you or your child are in immediate danger' },
  ],
  US: [
    { name: '988 Suicide & Crisis Lifeline', number: '988', note: 'Call or text, 24×7' },
    { name: 'Postpartum Support International', number: '1-800-944-4773', note: 'Perinatal mood support' },
    { name: 'Emergency', number: '911', note: 'Immediate danger' },
  ],
  UK: [
    { name: 'Samaritans', number: '116 123', note: 'Free, 24×7' },
    { name: 'Emergency', number: '999', note: 'Immediate danger' },
  ],
  OTHER: [{ name: 'Local emergency services', number: '112', note: 'Works in many countries' }],
};
