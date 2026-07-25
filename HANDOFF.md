# Otterly Prod — Session Handoff

Session date: 2026-07-25. App Store submission completed and submitted.

## What happened this session

### Reviewer auth sign-in path

Added hardcoded reviewer credentials so the Apple reviewer can sign in without a real Apple ID. The app uses Sign in with Apple exclusively; App Store Connect requires username/password fields. Solution:

- **`frontend/src/auth/reviewer.ts`** — new file, hardcoded credentials: `reviewer` / `otterly-review-2026`
- **`frontend/src/auth/AuthProvider.tsx`** — added `enableReviewerMode()` to the auth context. Sets a fake user (`reviewer@otterly-test.app / Apple Reviewer`) and flips status to "authed". Same pattern as the screenshot demo mode.
- **`frontend/app/(tabs)/you.tsx`** — below the sign-in card, added a small "Reviewer access" link that expands to an inline username/password form. On submit, checks credentials and activates reviewer mode.

Credentials are hardcoded and visible in the source. Change them by editing `reviewer.ts` before any build that goes to review.

### Screenshot demo mode (for automation)

Added a dev-only auth bypass in `AuthProvider.tsx` (gated on `__DEV__`). When AsyncStorage key `otterly.demo_user` is set to a JSON user object, the app skips real auth and enters demo mode.

Added mock data in `api.ts` — when `__DEV__` is true, all API methods return realistic canned data (a task "Take the bins out" with 3 shrunk steps, a 4-message Room conversation, a 4/7 streak, etc.).

This is how the App Store screenshots were captured: pre-set AsyncStorage, launched the app, it rendered fully populated UI.

### 5 App Store screenshots captured

At `~/Desktop/Otterly Screenshots/`:
- `1-Next-home-1242x2688.png` — Next tab with "Stand up and stretch" task card
- `2-Shrinker-steps-1242x2688.png` — Shrinker showing step breakdown
- `3-Room-conversation-1242x2688.png` — Room with chat messages
- `4-Braindump-inbox-1242x2688.png` — Inbox with task list
- `5-You-streak-1242x2688.png` — You tab with 4/7 streak display

Also at 1320x2868 originals in the same folder.

### 3 App Preview videos

New Remotion project at `~/code/otterly-previews/`. Three MP4s at 886x1920, H.264, 30fps:
- `preview-1-shrinker.mp4` (20s) — Task typing in, 3 shrunk steps appear with checkmarks
- `preview-2-room.mp4` (19s) — Otter + 4 chat bubbles appearing
- `preview-3-streak.mp4` (15s) — 7 circles, first 4 fill teal, "You showed up 4 of 7 days"

### EAS Build #13

Production build with reviewer auth included. Build number 13, version 1.0.0.
Uploaded via altool to App Store Connect. Delivery UUID: `403a8927-2fa3-4ac2-a260-7b47c151ba2f`.

On the `ios/` directory: it was removed from git tracking (`git rm -r --cached ios/`) and added to `.gitignore`. EAS Build generates it on the server. Don't commit it.

### app.json change

`runtimeVersion` was changed from `{"policy": "appVersion"}` to the plain string `"1.0.0"`. This was required because after `expo prebuild` the project enters bare workflow, which doesn't support the policy object syntax.

### App Store Connect submission details

- **Age rating**: 4+
- **Privacy Policy URL**: https://getotterly.com/privacy
- **Categories**: Productivity (primary), Health & Fitness (secondary)
- **Pricing**: Free
- **Build**: 1.0.0, build 13
- **Reviewer credentials**: Username `reviewer`, Password `otterly-review-2026`

### Known issue: Expo Go warning during EAS Build

EAS CLI prints a warning: "Detected that your app uses Expo Go for development." This is because:
1. No `expo-dev-client` in dependencies
2. `ios/` is gitignored (removed from git this session)

The production binary is correct despite the warning. To silence it, add `expo-dev-client` to `package.json` dependencies.

## Files changed

| File | Change |
|---|---|
| `frontend/src/auth/reviewer.ts` | **New** — hardcoded reviewer credentials |
| `frontend/src/auth/AuthProvider.tsx` | Added `enableReviewerMode` + demo mode bootstrap (gated on __DEV__) |
| `frontend/src/lib/api.ts` | Added mock data layer (28 lines, gated on __DEV__) |
| `frontend/app/(tabs)/you.tsx` | Added "Reviewer access" link + inline form (+105 lines) |
| `frontend/app.json` | `runtimeVersion` changed from object to string |
| `frontend/.gitignore` | Added `ios/` |

## Refs

- App Store Connect app id: `6792152908`
- Apple Team ID: `F3A9UX332N`
- EAS project: `@fmacademiajr/otterly`
- RevenueCat production key: `appl_jbEmeBpYJfRMIFdMOWofDhGfVYq`
- VPS: `root@72.62.251.188` (Hostinger, hostname `srv1300387`)
- Growth dashboard: `https://growth.getotterly.com`
- Otterly backend (production): `https://api.getotterly.com`

## What's pending

- Voucher code — mint from production shell when review asks for it
- expo-dev-client — add to dependencies after submission (optional, developer DX)
- If Apple rejects for a non-Apple-ID sign-in path being confusing, remove the "Reviewer access" link and change approach
