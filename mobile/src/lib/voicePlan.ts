// Turns a spoken day plan (English, Tamil or mixed) into plan items with times.
// e.g. "cook lunch at 11, call Amma at 4 pm and then evening walk with the baby"
//   → [{text:"Cook lunch", time:"11:00"}, {text:"Call Amma", time:"16:00"}, {text:"Evening walk with the baby", time:"18:00"}]

export interface SpokenItem {
  text: string;
  time?: string; // "HH:MM"
}

// Where one task ends and the next begins.
const SPLITTERS = [
  /(?:(?<!\d)\.(?!\d)|[;,\n])+/,
  /\s+(?:and then|after that|afterwards|then|also|next|plus)\s+/i,
  /\s+and\s+(?=(?:i\s+|to\s+)?(?:have|need|will|want|must|should|go|call|cook|take|buy|pay|clean|read|study|walk|bath|feed|visit|meet|finish|start|send|book|pick|drop)\b)/i,
  /\s*(?:அப்புறம்|பிறகு|அதன் பிறகு|அப்பறம்|மேலும்|அடுத்து)\s*/,
];

// Leading filler words that aren't part of the task.
const FILLER =
  /^(?:(?:so|okay|ok|um+|uh+|today|in the morning|first(?:ly)?|then|and|also|i\s+(?:have|need|want|will|must|should)\s+to|i'?ll|i\s+will|i\s+have|need\s+to|have\s+to|to)\s+)+/i;

const PART_OF_DAY: { re: RegExp; ampm: 'am' | 'pm'; def: number }[] = [
  { re: /\b(?:early morning|morning)\b|காலை|காலையில்/i, ampm: 'am', def: 9 },
  { re: /\b(?:afternoon|noon|lunch ?time)\b|மதியம்|மத்தியானம்/i, ampm: 'pm', def: 14 },
  { re: /\b(?:evening)\b|சாயங்காலம்|மாலை|மாலையில்/i, ampm: 'pm', def: 18 },
  { re: /\b(?:night|tonight)\b|இரவு|ராத்திரி/i, ampm: 'pm', def: 21 },
];

const pad = (n: number) => String(n).padStart(2, '0');

function to24(h: number, m: number, ampm: string | undefined, partHint?: 'am' | 'pm') {
  let hour = h;
  const ap = ampm?.toLowerCase().replace(/\./g, '');
  if (ap === 'pm' && hour < 12) hour += 12;
  else if (ap === 'am' && hour === 12) hour = 0;
  else if (!ap) {
    if (partHint === 'pm' && hour < 12) hour += 12;
    else if (!partHint && hour >= 1 && hour <= 6) hour += 12; // "at 4" during the day usually means 4 pm
  }
  if (hour > 23 || m > 59) return undefined;
  return `${pad(hour)}:${pad(m)}`;
}

/** Finds a time in one task phrase; returns the time and the phrase without it. */
export function extractTime(phrase: string): SpokenItem {
  let text = ` ${phrase} `;
  let time: string | undefined;
  const part = PART_OF_DAY.find((p) => p.re.test(phrase));

  // English: "at 10", "at 10:30", "10.30 pm", "by 5 pm", "around 3", "at half past 4", "at quarter to 6"
  const half = /\b(?:at\s+|by\s+|around\s+)?half\s+past\s+(\d{1,2})\b/i.exec(text);
  const quarterPast = /\b(?:at\s+|by\s+|around\s+)?quarter\s+past\s+(\d{1,2})\b/i.exec(text);
  const quarterTo = /\b(?:at\s+|by\s+|around\s+)?quarter\s+to\s+(\d{1,2})\b/i.exec(text);
  const en = /\b(?:at|by|around|from|@)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?|o'?clock)?(?=\W)/i.exec(text) ||
    /\b(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?=\W)/i.exec(text);
  // Tamil: "10 மணிக்கு", "காலை 7 மணி", "4.30 மணிக்கு", "5 மணி அரை" (half past)
  const ta = /(\d{1,2})(?:[:.](\d{2}))?\s*மணி(?:க்கு|யளவில்|க்குள்)?(\s*அரை)?/.exec(text);

  if (half) {
    time = to24(Number(half[1]), 30, undefined, part?.ampm);
    text = text.replace(half[0], ' ');
  } else if (quarterPast) {
    time = to24(Number(quarterPast[1]), 15, undefined, part?.ampm);
    text = text.replace(quarterPast[0], ' ');
  } else if (quarterTo) {
    const h = Number(quarterTo[1]) - 1 || 12;
    time = to24(h, 45, undefined, part?.ampm);
    text = text.replace(quarterTo[0], ' ');
  } else if (ta) {
    time = to24(Number(ta[1]), ta[3] ? 30 : Number(ta[2] ?? 0), undefined, part?.ampm);
    text = text.replace(ta[0], ' ');
  } else if (en) {
    const ampm = en[3] && !/o'?clock/i.test(en[3]) ? en[3] : undefined;
    time = to24(Number(en[1]), Number(en[2] ?? 0), ampm, part?.ampm);
    text = text.replace(en[0], ' ');
  } else if (part) {
    time = `${pad(part.def)}:00`; // "in the evening" → a gentle default
  }
  // Drop leftover time words ("in the morning", "காலை") only when they were turned into a time.
  if (time) text = text.replace(/\b(?:in the|this)\s+(?:morning|afternoon|evening|night)\b/i, ' ').replace(/\s(?:காலையில்|காலை|மதியம்|மாலையில்|மாலை|இரவு)\s/, ' ');
  return { text: tidy(text), time };
}

function tidy(s: string) {
  let t = s.replace(/\s+/g, ' ').trim();
  t = t.replace(FILLER, '').replace(/^(?:at|by|around|on)\s+/i, '').replace(/\s+(?:at|by|around|and)$/i, '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

/** Splits what was said into separate tasks, each with an optional time. */
export function parseSpokenPlan(spoken: string): SpokenItem[] {
  let parts = [spoken];
  for (const sp of SPLITTERS) parts = parts.flatMap((p) => p.split(sp));
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 1)
    .map(extractTime)
    .filter((i) => i.text.length > 1);
}
