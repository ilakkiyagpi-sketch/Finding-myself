---
name: wellbeing-safety-guardrails
description: Safety, ethics and privacy rules for a self-reflection app for mothers — perinatal mental health screening signals, crisis handling, non-clinical boundaries, data privacy. MUST be consulted when building any AI companion behaviour, mood/journal analysis, notifications, or data storage.
---

# Wellbeing, Safety & Ethics Guardrails

## Non-negotiables
1. **The app is not therapy and not a diagnosis tool.** Say so clearly in onboarding and when relevant.
2. **Crisis detection:** if a journal entry or chat mentions self-harm, suicidal thoughts, harming the baby, or feeling unsafe at home, the AI stops coaching and shows a calm, caring message plus local crisis resources (configurable by country). Never ignore, never lecture.
   - India: Tele-MANAS **14416** / 1-800-891-4416; emergency **112**.
   - US: **988** Suicide & Crisis Lifeline; Postpartum Support International helpline 1-800-944-4773.
   - UK: Samaritans **116 123**.
   - Keep this list in a config file and verify numbers before release.
3. **Perinatal mood signals:** persistent low mood > 2 weeks, inability to sleep even when baby sleeps, intrusive frightening thoughts, loss of interest, feeling detached from baby, panic. Gently encourage speaking to a doctor/mental health professional. A validated screener like the **Edinburgh Postnatal Depression Scale (EPDS)** may be offered *optionally* with clear explanation; results suggest, never diagnose.
4. **Postpartum psychosis** (confusion, hallucinations, paranoia soon after birth) is an emergency → urgent care message.

## Tone & ethics
- No shame, no comparison with other mothers, no toxic positivity.
- Respect cultural and family context; never push her to leave/confront family — support her own choices.
- Avoid assuming a partner, gender of partner, or family structure.
- She owns the narrative: AI suggests, never labels her personality definitively.

## Privacy (journals are deeply sensitive)
- Encrypt at rest; prefer end-to-end or on-device encryption for journal text.
- App lock (PIN/biometric); hidden/locked entries.
- No selling or ad-targeting with personal data. Clear export & delete-everything.
- AI processing: send minimum necessary context; do not use entries for training; disclose the AI provider.
- Shared-device awareness (children/partners may use the phone): discreet notifications ("Time for you 🌿", not "Log your depression score").

## Notifications
- Gentle, few, user-scheduled. No guilt ("You missed 5 days!"). Use "Welcome back".
