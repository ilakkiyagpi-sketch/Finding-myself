---
name: emotional-psychology-foundations
description: Foundational psychology for the app — emotions, memory and the "remembering self", trauma-informed care, attachment and family patterns, cognitive biases. Use when designing mood tracking, emotion vocabulary, memory/"rewind" features, insights generation, or when the AI explains why the user feels a certain way.
---

# Emotional & Psychological Foundations

## Source books

| Book | Author (year) | Key idea to use |
|---|---|---|
| *How Emotions Are Made* | Lisa Feldman Barrett (2017) | Emotions are constructed by the brain from body signals + context. **Emotional granularity** (precise emotion words) improves regulation. Body budget: sleep, food, movement affect mood. |
| *Emotional Agility* | Susan David (2016) | Don't get hooked by thoughts/feelings; show up, step out ("I'm having the thought that…"), walk your why (values), move on with tiny tweaks. |
| *Thinking, Fast and Slow* | Daniel Kahneman (2011) | **Experiencing self vs remembering self**: memory is shaped by peaks and endings (peak–end rule), not averages. Explains why the past can feel brighter or darker than it was — important for the Rewind module. |
| *The Body Keeps the Score* | Bessel van der Kolk (2014) | Trauma lives in the body; body-based practices (yoga, movement, rhythm) help. Implies the app should be trauma-informed. |
| *The Myth of Normal* | Gabor Maté (2022) | Many "disorders" are adaptations to stress and disconnection; authenticity vs attachment trade-off — people suppress their authentic self to keep belonging. |
| *Adult Children of Emotionally Immature Parents* | Lindsay C. Gibson (2015) | Childhood roles and self-suppression can resurface when becoming a parent; recognising this frees the true self. |
| *Attached* | Amir Levine & Rachel Heller (2010) | Attachment styles (secure, anxious, avoidant) shape relationships with partner and child. |
| *Mindset* | Carol Dweck (2006) | Growth vs fixed mindset. |
| *The Upward Spiral* | Alex Korb (2015) | Small actions (gratitude, movement, sleep, decisions) shift brain circuits out of low mood. |
| *Feeling Good* | David D. Burns (1980) | CBT: cognitive distortions (all-or-nothing, mind reading, "should" statements). Mothers' guilt is often "should"-driven. |

## Design implications
- **Mood tracker** uses a two-step model: core affect (pleasant/unpleasant × energy high/low) → then pick a precise word (granularity).
- **Body budget check:** sleep hours, water/food, movement, sunlight alongside mood.
- **Rewind bias note:** remind gently that memory is selective; the "old me" may be idealised (peak–end). The goal is to extract *qualities* (curiosity, courage, playfulness), not to go back in time.
- **Defusion language:** AI reflects "You're noticing the thought that you're a bad mother" rather than agreeing/disagreeing.
- **Distortion spotter:** optional gentle labels on journal entries ("This sounds like an all-or-nothing thought — want to look at it?"). Off by default.
- **Trauma-informed:** user controls depth; content warnings before deep past exploration; ability to skip, pause, lock entries.
