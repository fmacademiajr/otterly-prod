# Otterly — PRD (Emergent build)

## Product

Otterly is a calm, Philippines-first ADHD task-starter mobile app. Anti-overwhelm is the wedge: the home screen never shows a task list; it shows **one** micro-step to do next. AI (Claude Sonnet 4.6 via Emergent LLM key) breaks tasks into 3–10 tappable micro-steps, and a warm "Sit-With-Me" companion sits with you while you work.

Inspired by the upstream repo https://github.com/fmacademiajr/otterly (Bun monorepo + Supabase + LiveKit). This build faithfully reimplements the same product in the Emergent stack (Expo + FastAPI + MongoDB) with the anti-overwhelm angle pulled to the front.

## Design system

Strictly honors `DESIGN.md` from the upstream repo:
- Colors: teal hero `#5E8B82`, sand accent `#D4A24F`, calm neutrals. Not purple. Not cartoon.
- Type: Fraunces (display serif) + DM Sans (body/numeric); General Sans deferred to a bundled asset later.
- Motion: fade only, no bounce.
- Flat: 1px hairline borders, no drop shadows.

## Screens

- **Onboarding (3 screens):** welcome → first shrink → name & reminder.
- **Next tab (home):** ONE micro-step, energy pill (low/medium/good), Start + "Not this" + "I'm too tired".
- **Inbox tab:** quick add + Braindump (AI splits paragraph → tasks).
- **Room tab:** text-based Sit-With-Me AI body-double, low-stim.
- **You tab:** forgiving 7-day streak (soft ripple, no fire), settings (name, reminder, dark mode).
- **Shrinker (modal route `/shrink/[id]`):** difficulty slider (easy/med/hard), 3–10 micro-steps, per-step 5/10/25-min timer, one-tap re-shrink.

## Backend

FastAPI + MongoDB. All routes under `/api/*`.

- `POST /api/tasks`, `GET /api/tasks`, `DELETE /api/tasks/{id}`
- `POST /api/tasks/{id}/shrink` — AI breaks into micro-steps
- `PATCH /api/steps/{id}` — toggle done (logs activity)
- `POST /api/next` — AI-picked next micro-step (energy-aware)
- `POST /api/braindump` — AI splits text → task titles
- `POST /api/room/message`, `GET /api/room/history/{sid}` — Sit-With-Me
- `GET /api/streak` — forgiving 7-day rolling stats

## LLM

Emergent Universal Key. Model: `anthropic/claude-sonnet-4-6`. Non-streaming (small responses). Prompts hard-coded to non-shame / calm ADHD-friendly tone; crisis line included in Room system prompt.

## Anti-overwhelm principles

1. One thing on the home screen — never a list.
2. Progress = micro-steps done, not tasks completed.
3. Energy gates the next pick.
4. Every screen has a soft way out.
5. No fire streaks, no XP loops.

## Deferred vs. upstream

- Real-time video/audio body-double rooms (LiveKit) — deferred; Room is text-only.
- Voice-input STT — deferred.
- Auth (Supabase) — deferred; v1 is device-local.
- Push notifications + lifecycle messages — deferred.
- RevenueCat paywall — deferred.
- Crisis flow full-screen route with legal-reviewed content — deferred (safe copy in Room system prompt only).
- Fontshare General Sans — DM Sans substituted for body font pending bundled asset.

## Success metric

North star copied from upstream PRD: WATSBDS — Weekly Active Task-Shrinkers Who Also Started A Sit-With-Me Session.
