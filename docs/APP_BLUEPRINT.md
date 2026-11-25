# Finding Myself — App Blueprint (the "bone")

> A companion that helps a woman — especially a mother carrying many roles —
> **rewind** who she was, **see** who she is now, **find the missing pieces**,
> **balance** her roles, and **run toward her own dream in her own way**.

Knowledge behind every module lives in `.claude/skills/` (see `docs/READING_LIST.md`).

---

## 1. The core loop

```
   REWIND ──► MIRROR ──► MISSING PIECES ──► COMPASS ──► RHYTHM
  (past me)  (present)   (gap + self graph)  (future)   (daily routine)
      ▲                                                     │
      └──────────── REFLECT weekly / monthly ◄──────────────┘
```

Past → Present → Gap → Future → Daily action → Reflection → (updates the graph) → repeat.

---

## 2. Modules

### 2.1 Rewind — "Who I was"  *(skill: narrative-identity-life-story)*
- **Life chapters timeline** (name 4–8 chapters of your life).
- **Key scenes**: high point, low point, turning point, "fully me" moment.
- **Then-Me profile** per chapter: traits, passions, skills, people, places, songs, clothes, proud deeds.
- Photo / voice-note memories attached to chapters.
- AI extracts **qualities** (curious, brave, playful) — not just activities.

### 2.2 Mirror — "Who I am now"  *(skills: self-awareness-reflection, emotional-psychology-foundations)*
- 60-second daily check-in: mood (precise word), energy, sleep, body, "one thing that mattered".
- Journal (free-write / guided prompt / voice).
- Now-Me profile (same fields as Then-Me so they can be compared).
- Values card sort + strengths (re-taken every few months).

### 2.3 Missing Pieces & Self Graph — "What changed"  *(skill: values-strengths-purpose)*
- 12 self-dimensions scored **Past / Present / Desired** (creativity, learning, body, solitude, friendships, partnership, work/ambition, meaning, independence, joy, rest, self-expression).
- **Radar chart** (then vs now vs desired) and **line graph over time** — the "changed graph".
- Auto-detected **missing pieces** = high in past or desired, low now.
- **Gained pieces** too (what motherhood/life gave her) — balance loss with growth.

### 2.4 Roles Balancer — "All my hats"  *(skill: roles-balance-burnout)*
- Role inventory incl. **Me** as a role.
- Hours, energy given/received, satisfaction per role → **role wheel**.
- Fair-Play-style load map (conception / planning / execution) → share, simplify, drop.
- Boundary script builder; monthly burnout check; stress-cycle quick menu.

### 2.5 Compass — "Where I'm going, my way"  *(skill: future-self-dreams)*
- Dream inventory tagged *revive / evolve / new*; seed → sprout → grow sizing.
- WOOP card per dream; Odyssey plans (3 possible 5-year lives).
- Letters from future me; monthly tiny experiment.

### 2.6 Rhythm — Routine Analyser + Setter  *(skill: habits-routines-design)*
- **Analyser**: quick time log or calendar import → load ratio (others / self / shared), energy curve, values-alignment score, missing rest types.
- **Setter**: identity-based tiny habits anchored to existing moments; Minimum / Normal / Stretch levels; **season mode** (newborn, toddler, school, festival, sick week); weekly 168-hour view with a protected *Me* block.
- No streak-shame: "never miss twice", "welcome back".

### 2.7 Companion (AI) — "Talk it through"
- Conversational reflection partner powered by an LLM (e.g. Claude API) with the skill files as its knowledge/system guidance.
- Has memory of her chapters, values, roles, dreams (with her permission).
- Produces **weekly letter** ("This week you felt most yourself when…") and **monthly self-graph review**.
- Always routed through **safety layer** *(skill: wellbeing-safety-guardrails)*.

### 2.8 Safety & Privacy layer (cross-cutting)
- Crisis keyword/intent detection → resources screen.
- Optional EPDS screener; never diagnostic.
- Encryption, app lock, locked entries, discreet notifications, export & delete.

---

## 3. Onboarding flow (first 10 minutes)
1. Welcome + promise ("not therapy, a mirror and a map") + privacy.
2. Her current season (pregnant / newborn / young kids / school-age / other; working / at home / both).
3. Pick 3 words for *who I was*, 3 for *who I am now*, 3 for *who I want to be*.
4. Quick self-graph (12 sliders × present; past & desired optional).
5. Roles list.
6. One tiny habit for this week + one protected Me block.
→ Home screen shows her first "Then · Now · Next" card.

## 4. Home screen
- **Then · Now · Next** card (rotating insight).
- Today's check-in button.
- Today's tiny habit (minimum version visible).
- Mini self-graph sparkline.
- "Talk to companion" button.

---

## 5. Data model (first draft)

```
User(id, name, language, country, season, created_at)
LifeChapter(id, user_id, title, start, end, summary, order)
Scene(id, chapter_id, type[high|low|turning|fully_me|earliest], text, media[])
SelfTrait(id, user_id, kind[trait|passion|skill|value|strength|dream],
          label, era[past|present|desired], chapter_id?, intensity)
DimensionScore(id, user_id, dimension, era, score, recorded_at)   -> Self Graph
CheckIn(id, user_id, date, affect_valence, affect_energy, emotion_word,
        sleep_h, body_note, mattered_text)
JournalEntry(id, user_id, created_at, mode, text_encrypted, locked, tags[])
Role(id, user_id, name, hours_week, energy_given, energy_received, satisfaction, intention)
Task(id, user_id, role_id, name, conception, planning, execution, owner, action[keep|share|simplify|drop])
TimeLog(id, user_id, start, end, category, role_id, energy, for_whom[self|others|shared])
Habit(id, user_id, identity_statement, anchor, minimum, normal, stretch, season_rules)
HabitLog(id, habit_id, date, level_done)
Dream(id, user_id, title, origin[revive|evolve|new], stage[seed|sprout|grow],
      wish, outcome, obstacle, plan)
Letter(id, user_id, type[future_me|weekly_ai|past_me], text, open_at)
Insight(id, user_id, source, text, created_at, accepted)
```

## 6. Suggested tech stack
| Layer | Recommendation | Why |
|---|---|---|
| App | **React Native + Expo** (one codebase, Android + iOS; web later) | Most target users are on Android phones |
| Backend | **Supabase** (Postgres + Auth + Storage + Row Level Security) | Fast to build, relational data fits the model |
| AI | **Claude API** via a server function; skill files compiled into system prompts | Never call the AI directly from the phone with a key |
| Charts | Victory Native / react-native-svg | Radar + line self-graph |
| Security | Client-side encryption for journal text; biometric lock | Journals are highly sensitive |
| i18n | English + Tamil/Hindi from day one | Reflection is deepest in one's mother tongue |

## 7. Build phases
- **MVP (v0.1)**: Onboarding, daily check-in, journal with prompts, Rewind chapters, Self Graph (then/now/desired), one tiny habit, safety layer.
- **v0.2**: Roles Balancer, Routine Analyser (manual time log), weekly AI letter.
- **v0.3**: Compass (dreams, WOOP, future letters), season mode, calendar import.
- **v1.0**: AI companion chat with memory, monthly review, multi-language, export.
- Later: partner "Fair Play" sharing, community circles (opt-in), therapist hand-off/export.

## 8. Success measures (for her, not for engagement)
- She can name her top values and 3 "missing pieces".
- Self-graph gap shrinks on chosen dimensions over 3 months.
- Me-time per week rises from baseline.
- Self-reported "I feel like myself" (0–10) increases.
