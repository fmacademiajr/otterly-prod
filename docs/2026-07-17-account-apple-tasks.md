# Account deletion + Sign in with Apple — task plan

Branch: `account-and-apple-auth` (off `main` @ ec8a1ae).

## Global Constraints

These bind every task. Violating one is a defect regardless of what a task says.

1. **`owner` is dual-namespace.** It is either a bare `user_id` (signed-in) or the string `dev:<device_id>` (anonymous). Applied at `server.py:198`, reconstructed at `:378`.
2. **Collection key map — using the wrong key SILENTLY NO-OPS.** The doc simply has no such field, so the query matches nothing and reports success.
   - `owner`-keyed (5): `tasks`, `steps`, `activity`, `room_messages`, `rate_counters`
   - `user_id`-keyed (3): `users`, `entitlements`, `user_sessions`
   - `webhook_events`: `event_id` only. No person key. Unreachable per-user. Holds only an event id + timestamp, no PII (`server.py:465-468`). Deliberate.
3. **The backend never mints a session token today.** `server.py:343` reuses Emergent's. The Apple path must mint its own (`secrets.token_urlsafe(32)`). Do NOT change the Emergent path — it is the only auth that works.
4. **`db.user_sessions.expires_at` must be a native `datetime`**, not an ISO string. The TTL index at `:973` depends on it. `db.users.created_at` is an ISO string. They differ on purpose.
5. **Never break the anonymous→signed-in migration** (`server.py:377-382`).
6. **House style for user-facing copy**: short sentences, active voice, no em dashes, no semicolons, no markdown asterisks, no exclamation marks. Warm, brief, no shame.
7. **PyJWT 2.13.0 and cryptography 49.0.0 are already in `backend/requirements.txt`.** Do not add a JWT dependency.
8. Backend deps live in `backend/.venv` (`./.venv/bin/python`). Frontend: `./node_modules/.bin/tsc --noEmit`. 3 pre-existing tsc errors in `src/lib/identity.ts` and `src/theme/ThemeProvider.tsx` are NOT yours to fix.
9. Existing test pattern: `backend/tests/test_safety_referral.py:11-16` reads `server.py` and `exec`s a slice, to avoid needing `MONGO_URL` at import. `test_referral_wiring.py` stubs `emergentintegrations` and boots the real module. Reuse whichever fits; do not invent a third pattern.

---

## Task 1 — `DELETE /api/account` backend

Blocker B3. App Store Guideline 5.1.1(v): an app that creates accounts must let users delete them. Otterly creates accounts (`server.py:354-361`, reachable from `you.tsx:110`) and the only teardown is `/auth/logout`, which deletes one session row.

**Add to `backend/server.py`, near `/auth/logout` (`:399-404`):**

```python
OWNER_COLLECTIONS = ("tasks", "steps", "activity", "room_messages", "rate_counters")
USER_ID_COLLECTIONS = ("entitlements", "user_sessions")   # `users` deleted last, separately
# webhook_events: keyed on event_id only. No person key, unreachable per-user.
#   Holds event_id + a timestamp (:465-468) — the RC payload is never stored.
#   No PII, nothing to delete. Deliberate, not an oversight.


@api.delete("/account")
async def delete_account(
    user: UserProfile = Depends(require_user),
    x_device_id: Optional[str] = Header(default=None),
):
    uid = user.user_id
    owners = [uid] + ([f"dev:{x_device_id}"] if x_device_id else [])
    deleted = {}
    try:
        for name in OWNER_COLLECTIONS:
            deleted[name] = (await db[name].delete_many({"owner": {"$in": owners}})).deleted_count
        for name in USER_ID_COLLECTIONS:
            deleted[name] = (await db[name].delete_many({"user_id": uid})).deleted_count
        deleted["users"] = (await db.users.delete_many({"user_id": uid})).deleted_count
    except Exception:
        logger.exception("account delete partial user_id=%s deleted=%s", uid, deleted)
        raise HTTPException(500, "delete didn't finish — please try again")
    logger.info("account deleted user_id=%s deleted=%s", uid, deleted)
    return {"ok": True, "deleted": deleted}
```

**Why each choice, do not "improve" these:**
- `db[name]` string indirection, not `db.tasks` unrolled: it lets the test assert the map against the same tuple the endpoint iterates. Hand-unrolled calls cannot be checked for drift.
- `require_user`, NOT `resolve_owner`: deletion must never be reachable by device id alone.
- `delete_many` on `user_sessions` (logout uses `delete_one` at `:401`): kills every device's session. That is the point.
- **Order is load-bearing**: owner-group, then user_id-group, then `users` LAST. `users` first would orphan everything behind an unreachable identity. Sessions die before `users`, so a partial failure leaves the user signed out but able to sign in again and retry.
- **No transaction.** Mongo here is not necessarily a replica set, so `start_session`/`with_transaction` would raise at runtime on a standalone. `delete_many` is idempotent, so retry is the substitute.
- **The device id is required for correctness, not a nicety.** `resolve_owner:197` silently falls through to anonymous when a session is expired, and sessions hard-expire at 7 days with no refresh (`:364`). So every signed-in user starts writing tasks, braindumps and Room transcripts under `dev:<id>` again on day 8, and migration only ever runs at sign-in. Those rows are mental-health-adjacent free text. Squarely PII.
- Accepted risk, note it in the docstring: an unproven `device_id` claim lets a caller delete another device's anonymous rows. Identical trust level to the existing migration at `:377`, already logged as post-launch. Refusing the header would leave real PII behind, which is worse.

**Test — `backend/tests/test_account_delete.py`:**
Follow `test_safety_referral.py:11-16`'s read-and-exec-a-slice pattern (no `MONGO_URL` needed):
- Assert `OWNER_COLLECTIONS` == exactly the 5 named above.
- Assert `USER_ID_COLLECTIONS` == exactly the 2 named above.
- Assert the union of both plus `{"users", "webhook_events"}` == all 9 collections. This is the guard that catches a future collection added to `server.py` and not to the delete map.
- Then, with the `test_referral_wiring.py` stub-and-boot pattern: call `delete_account` against a fake db that records every `(collection, filter)` pair. Assert `entitlements` is queried by `user_id` and NOT by `owner`, and that `users` is deleted LAST. **A test that would still pass if the endpoint used `owner` on `entitlements` has not tested anything.**

**Acceptance:** `cd backend && ./.venv/bin/python tests/test_account_delete.py` passes. Prove it has teeth: temporarily swap `entitlements` into `OWNER_COLLECTIONS` and confirm the test fails.

---

## Task 2 — Account deletion frontend

**`frontend/src/lib/api.ts`** — beside the other auth calls (~`:169-177`).

**THE TRAP:** `buildHeaders()` (`:69-81`) sends `Authorization` Bearer **XOR** `X-Device-Id`, never both. A signed-in delete would therefore carry no device id, and Task 1's `dev:` purge would silently no-op. `req()` merges `opts.headers` over the built ones (`:93`), so pass it explicitly:

```ts
deleteAccount: async () =>
  req<{ ok: boolean; deleted: Record<string, number> }>("/api/account", {
    method: "DELETE",
    headers: { "X-Device-Id": await identity.getDeviceId() },  // Bearer survives the merge
  }),
```
That merge order is load-bearing. Getting it wrong reproduces the exact silent no-op Task 1 is designed against.

**`frontend/src/lib/identity.ts`** — no `clearDeviceId` exists. Add beside `clearUser` (`:90`):

```ts
async reset() {
  await secureDelete(TOKEN_KEY);
  await storage.setItem(USER_KEY, null);
  await storage.removeItem(DEVICE_KEY);   // getDeviceId() mints a fresh uuid next call
},
```
Dropping `otterly.deviceId` matters: keeping it means the post-deletion anonymous session writes under the SAME `dev:` owner the deleted account used. A privacy leak across the deletion boundary.

**`frontend/src/auth/AuthProvider.tsx`** — beside `signOut` (`:130`), added to the context type (`:9-15`) and the provider value (`:142`):

```ts
const deleteAccount = useCallback(async () => {
  await api.deleteAccount();          // throws → caller shows error, token kept for retry
  await identity.reset();
  await storage.removeItem("otterly.userName");
  await storage.removeItem("otterly.reminderTime");
  setUser(null);
  setStatus("anonymous");
}, []);
```
Only clear local state on success. Clearing the token after a failed delete strands the account with no way to retry.

**`frontend/app/(tabs)/you.tsx`** — a row inside the settings group, after Dark mode (`:198`, group closes `:199`). Reuse `styles.row` / `styles.rowLabel` / `styles.divider`. `ChevronRight` is already imported (`:13`). Only render when `status === "authed"`.

**The confirm — `Alert.alert` is a NO-OP on React Native Web.** It logs a warning and never renders. Expo web is the only harness that exists, so a bare `Alert.alert` is both untestable and silently broken on the web build. Branch on `Platform.OS === "web"` → `window.confirm`, else `Alert.alert` with a destructive action.

**COPY (house style), three load-bearing requirements:**
- State scope and permanence: what is removed, and that it cannot be undone.
- **An active subscription is NOT cancelled by deletion.** Apple requires this be said. Point to Settings, Apple ID, Subscriptions.
- **Tell Apple sign-in users they can revoke access** at Settings, their name, Sign in with Apple, Otterly. Show it unconditionally rather than plumbing `apple_sub` to the client — it reads as a no-op for Google users. This line is what lets us skip programmatic token revocation (see Task 4).

**Acceptance:** `./node_modules/.bin/tsc --noEmit` adds no new errors. `./node_modules/.bin/eslint` clean on touched files.

---

## Task 3 — `db.users` index migration + `UserProfile.email` optional

Prerequisite for Apple. Ship as its own commit so a revert is surgical.

**THE BOMB.** `_startup_indexes` (`:966-982`) is ONE `try` wrapping thirteen sequential `create_index` calls, and the `except` only logs a warning. `db.users.create_index("email", unique=True)` is line 969. Calling `create_index("email", unique=True, partialFilterExpression=...)` against the existing `email_1` raises `IndexOptionsConflict` (code 85) — which aborts every index AFTER it. That silently loses `user_sessions.session_token` uniqueness, the `expires_at` TTL, `rate_counters` uniqueness, and `webhook_events` idempotency. Silent loss of every uniqueness and expiry guarantee in the database.

**ROOT-CAUSE FIX, REQUIRED (Fernando's call).** The email index is only the trigger. The real defect is that thirteen `create_index` calls share one `try`, so ANY future index change can silently disable every index below it. Fix the class, not the instance: drive the block from a list and give EACH index its own try/except, so one failure can never cascade. Log each failure by name — the current code cannot even tell you which index it lost.

Shape (adapt, do not copy blindly):
```python
INDEX_SPECS = [
    ("users", "email", dict(unique=True, partialFilterExpression={"email": {"$type": "string"}})),
    ("users", "apple_sub", dict(unique=True, sparse=True)),
    ("users", "user_id", dict(unique=True)),
    ...  # every existing index, unchanged in meaning
]

@app.on_event("startup")
async def _startup_indexes():
    try:
        await db.users.drop_index("email_1")   # one-time migration off the plain-unique index
    except Exception:
        pass                                    # absent on every boot after the first
    for coll, keys, opts in INDEX_SPECS:
        try:
            await db[coll].create_index(keys, **opts)
        except Exception as e:
            logger.warning("index %s on %s failed: %s", keys, coll, e)
```
Compound-key indexes (`tasks`, `steps`, `activity`, `rate_counters`, `room_messages`) keep their list-of-tuples key form. Do not change any index's meaning — only how failures are contained.

**Test both halves:**
1. **No mongod needed:** assert every index in `INDEX_SPECS` is created inside its own try/except, i.e. one failure cannot abort the rest. The cheapest honest version: monkeypatch `db[coll].create_index` to raise on the FIRST spec, run `_startup_indexes()`, and assert the remaining specs were still attempted. That is the bomb, tested, with no database.
2. **Live test, needs Docker (not currently running):** write `backend/tests/test_indexes_live.py` and SKIP it with a clear reason when no mongod is reachable at `MONGO_URL`. When Docker is up it seeds the OLD plain-unique email index, runs `_startup_indexes()` twice, and asserts the full catalogue survived. Do not fake this with mongomock — it will not reproduce `IndexOptionsConflict` and would be false confidence.

The drop must come FIRST and must be in its OWN try/except:

```python
@app.on_event("startup")
async def _startup_indexes():
    # One-time migration off the plain-unique email index. ISOLATED try/except by
    # necessity: on the second boot email_1 is already gone and drop_index raises
    # OperationFailure. Inside the block below, that raise would abort every index
    # after it, silently.
    try:
        await db.users.drop_index("email_1")
    except Exception:
        pass
    try:
        await db.users.create_index(
            "email", unique=True,
            partialFilterExpression={"email": {"$type": "string"}},
        )
        await db.users.create_index("apple_sub", unique=True, sparse=True)
        ...  # rest unchanged
```

**Why partial, not sparse, on email:** Mongo unique indexes treat missing/null as a value, so two users with `email: null` violate uniqueness. `sparse` does not save you if you ever store an explicit `None`. The partial filter only indexes docs where email is a string. Consequence: the Apple path must OMIT the email key entirely when absent, never write `email: None`.

**`apple_sub` uses plain `sparse=True`** — correct, because we never write `apple_sub: None`; the key is simply absent for Google-only users.

**`UserProfile` (`:162-166`) declares `email: str`, required.** An Apple user with no email makes `UserProfile(**user)` raise at `:220` on EVERY authenticated request. Change to `email: str = ""`.

**Test — `backend/tests/test_indexes.py`:** needs a real mongod. If one is not available, say so in your report and write the test anyway, skipped with a clear reason. Steps: seed the OLD plain-unique `email` index, run `_startup_indexes()` twice (the second run proves the drop's absent-index raise is isolated), then assert the FULL catalogue survived: partial email index present, `apple_sub` present, `user_sessions.session_token` unique present, `expires_at` TTL present, `rate_counters` unique present.

**Acceptance:** run the test against the code BEFORE your change and confirm it fails on the TTL assert. That failure is the bomb, demonstrated. Then make it pass.

---

## Task 4 — `POST /api/auth/apple`

Blocker B5. App Store Guideline 4.8. `signIn()` (`AuthProvider.tsx:106`) only opens Emergent's Google flow, and `you.tsx:118` renders the literal "Sign in with Google", so the 4.8 exemption for a developer's own sign-in system cannot be claimed. Purchases sit behind `status === "authed"` (`paywall.tsx:85`), so a blocked reviewer cannot test IAP either — a second rejection under 2.1.

**DECISION, already made — do not revisit:** we do NOT store Apple tokens. We verify the `identityToken` only. No `authorizationCode`, no `/auth/token` exchange, no ES256 client secret, no refresh token. Apple's TN3194 requires programmatic revocation only if you HAVE the tokens; without them, Apple's documented path is to delete the data and tell the user to revoke manually — which Task 2's copy does. This drops the `.p8` key off the launch critical path entirely.

**Constants near `EMERGENT_SESSION_DATA_URL` (`:63`):**
```python
APPLE_BUNDLE_ID = os.environ.get("APPLE_BUNDLE_ID", "com.getotterly.app")
APPLE_ISSUER = "https://appleid.apple.com"
_apple_jwks = jwt.PyJWKClient(f"{APPLE_ISSUER}/auth/keys")   # PyJWKClient caches internally
```
Add `import secrets` and `import jwt`.

**Extract the migration helper** — replaces the inline block at `:377-382`. Both auth paths must call it; two copies will drift.
```python
async def migrate_device_data(device_id: Optional[str], user_id: str):
    if not device_id:
        return
    old = f"dev:{device_id}"
    for coll in (db.tasks, db.steps, db.activity, db.room_messages):
        await coll.update_many({"owner": old}, {"$set": {"owner": user_id}})
```
`rate_counters` is deliberately NOT migrated: caps are per-day per-owner, and resetting on sign-in hands out a free extra day.

**The endpoint.** Model:
```python
class AppleAuthRequest(BaseModel):
    identity_token: str
    device_id: Optional[str] = None
    full_name: Optional[str] = Field(default=None, max_length=100)  # first authorization only
```

Verify with `jwt.decode(..., algorithms=["RS256"], audience=APPLE_BUNDLE_ID, issuer=APPLE_ISSUER)` — exp/iat are verified by default. Catch `jwt.PyJWTError` → 401. Never catch bare `Exception` around the decode; that is how signature checks get silently skipped.

**Identity rules — each of these is a trap:**
- **Key on `sub`, never email.** Apple returns email only on the FIRST authorization. An email-keyed path 400s on every re-auth.
- **`email_verified` arrives as bool `true` OR string `"true"`.** Handle both.
- **Merge, do not fork**, when `apple_sub` is unknown but a VERIFIED email matches an existing user: set `apple_sub` on that user. `entitlements` is keyed on `user_id`, so forking strands a paid subscription and hands you a refund plus a fresh 5.1.1 complaint. Merging also matches the Emergent path, which already merges on email implicitly (`:346`).
- **Only merge when the email is present AND verified.** An unverified email must never merge — that is textbook account-linking takeover.
- Private-relay addresses (`*@privaterelay.appleid.com`) never collide with a Google email, so they fork automatically. No special case needed.
- **`full_name` arrives on the first authorization only.** Never overwrite an existing name with the `None` of every later sign-in.
- **OMIT the `email` key entirely when absent.** Never `email: None` — Task 3's partial index depends on it.
- Mint `secrets.token_urlsafe(32)`. `expires_at` a native `datetime`, `timedelta(days=7)`, matching `:364`. Use `insert_one` (the token is random, so an upsert always inserts anyway, and one row per sign-in is correct multi-device behaviour — the TTL reaps them).
- Call `migrate_device_data(payload.device_id, user_id)`.
- Return the same shape `auth_session` does (`:384-391`).

**Test — `backend/tests/test_apple_auth.py`:** mint RS256 tokens locally with `cryptography` and monkeypatch `_apple_jwks.get_signing_key_from_jwt`. No Apple, no device, no network. Cases, all required:
- happy path → 200, session_token present
- **re-auth with NO email in claims → 200, SAME user_id, name intact** (the core trap)
- full_name on first call only → name survives the second call
- `aud` wrong → 401 (proves audience is checked)
- `iss` wrong → 401 (proves issuer is checked)
- `exp` in the past → 401
- token signed by a DIFFERENT key → 401 (proves the signature is checked)
- `email_verified` false with a matching email → does NOT merge (takeover guard)
- `email_verified` "true" with a matching email → merges to the same user_id
- two Apple users, neither with email → both insert, no duplicate-key (proves Task 3's partial index)

The `aud`/`iss`/wrong-key cases are what make this a security test rather than a smoke test. Without them you have not tested that verification happens at all.

**Acceptance:** all cases pass. `./.venv/bin/python tests/test_apple_auth.py`. Also assert the Emergent path is untouched: `server_token = data.get("session_token") or payload.session_token` still present at `:343`, and `migrate_device_data` is called exactly twice in the file.

---

## Task 5 — Sign in with Apple, frontend

**Install:** `cd frontend && npx expo install expo-apple-authentication` — let Expo resolve the SDK-54 version. Do not pin a guessed version.

**`frontend/app.json`:**
- `ios.usesAppleSignIn: true` — the documented Expo key. It writes `com.apple.developer.applesignin` into the entitlements at prebuild AND tells EAS to enable the capability on the App ID. Do NOT hand-write `ios.entitlements`; that gets the first half only and fails at signing.
- Add `"expo-apple-authentication"` to the plugins array (`:37-52`).

**`api.ts`:** `appleAuth(identity_token, device_id?, full_name?)` → `POST /api/auth/apple`.

**`AuthProvider.tsx`:** `signInWithApple()` calling `AppleAuthentication.signInAsync({ requestedScopes: [FULL_NAME, EMAIL] })`. Join `fullName.givenName` + `familyName` (populated on first authorization only). Then the same tail as `signIn`: `identity.setToken`, `identity.setUser`, `setUser`, `setStatus("authed")` — that path is what makes B2's RevenueCat `logIn` effect fire on the new `user_id`.

**`you.tsx:108-126`** is currently ONE hardcoded `TouchableOpacity`. Restructure into a provider list:
- Apple's HIG requires their official button. Use `AppleAuthentication.AppleAuthenticationButton`, not a hand-rolled one. `buttonStyle` WHITE on dark, BLACK on light.
- Gate on `AppleAuthentication.isAvailableAsync()` — false on web, Android, and iOS < 13. That guard is what keeps the button off the Expo-web harness and off Android, where it must not appear.
- The literal "Sign in with Google" STAYS on the Google row. It is accurate. What unblocks 4.8 is Apple being present and equally prominent, not deleting the word Google.
- Move the "Sync across devices. Required to purchase." subtitle (`:121-123`) to sit under BOTH buttons — it now describes the group, not the Google row.

**Also fix, while here:** `signIn` (`:106`) has no try/catch and `you.tsx:110` is a bare `onPress={signIn}`, so a failed exchange is an unhandled rejection with zero user feedback. Wrap both handlers. **Apple adds a case that MUST be swallowed: `e.code === "ERR_REQUEST_CANCELED"` fires every time the user taps cancel.** Surfacing that as an error is a bug a reviewer will hit on their first try.

**Acceptance:** tsc adds no new errors; eslint clean. Note in your report that the Apple button cannot be exercised on web by design, so this task's UI is unverifiable until a TestFlight build.
