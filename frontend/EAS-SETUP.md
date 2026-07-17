# EAS build + submit — what Fernando has to do

`eas.json` is hand-written because `eas build:configure` needs an interactive login and does not generate the `submit` block anyway. Everything below needs a human at a browser or a terminal prompt.

## Before the first build

**Do not run `eas build` until `frontend/app.json`'s bundleIdentifier is `com.getotterly.app`.** It is, as of commit 310803f. EAS registers that identifier on the App ID during credential setup, silently, and a bundle id is permanent: changing it later means a different app, orphaned installs, ratings from zero, and receipts that cannot be restored across the boundary.

Verify before every first-of-a-kind build, because Emergent's scaffold is what set the old `com.emergent.otterlynext.u9tal9` and a regenerated `app.json` could put it back:

```
grep bundleIdentifier frontend/app.json     # must read com.getotterly.app
```

## 1. Fill in the three placeholders

`eas.json` → `submit.production.ios`:

| Field | Where to find it |
|---|---|
| `appleId` | Your Apple Developer account email. |
| `ascAppId` | App Store Connect → your app → App Information → "Apple ID" (a number, ~10 digits). Only exists after you create the app record. |
| `appleTeamId` | developer.apple.com → Membership → Team ID (10 chars). |

Android's `serviceAccountKeyPath` only matters when you ship to Play. iOS-first, so leave it.

## 2. Log in and build

```
cd frontend
npx eas-cli login
npx eas-cli build --platform ios --profile production
```

EAS will offer to generate credentials. Say yes. It registers the App ID, the distribution certificate, and the provisioning profile.

## 3. Submit to TestFlight

```
npx eas-cli submit --platform ios --profile production
```

## 4. The two things only a real build can answer

Verify these on the FIRST build, not the last. Both fail in ways that need console fixes, so you want the feedback early.

1. **Does a purchase actually grant premium?** This is blocker B2, fixed in code but never observed. Buy in the TestFlight sandbox, then check:
   - RevenueCat dashboard → Customers → the customer shows your real `user_id`, NOT `$RCAnonymousID:...`
   - `GET /api/me/access` returns `premium: true`

   If the customer is anonymous, `identify()` is not being reached before purchase.

2. **Sign in with Apple** (once that ships): the button renders and returns an identityToken. That proves `usesAppleSignIn: true` produced the entitlement AND that EAS enabled the capability on the App ID. If it fails it fails opaquely at sign-in, and the fix is console-side.

## Notes

- `appVersionSource: "remote"` + `autoIncrement` means EAS owns the build number. You never bump it by hand.
- `production` has no `EXPO_PUBLIC_BACKEND_URL` — set it in Emergent's env, not here, so the URL is not baked into a committed file.
- `usesNonExemptEncryption: false` is already in `app.json`. Without it every upload parks on "Missing Compliance".
