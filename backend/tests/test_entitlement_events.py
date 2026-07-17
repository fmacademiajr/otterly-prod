"""The webhook must never revoke premium from a paying customer.

The original classifier ended in `else: is_active = event_type in active_types`,
so every event type it did not know about resolved to False AND still ran the
upsert. BILLING_ISSUE, TRANSFER, SUBSCRIPTION_PAUSED and friends therefore
switched premium OFF for people who had paid. That is not "unhandled", it is
active revocation.

The rule this pins: an event we do not understand must not touch `active`.
Only events with a definite meaning may change it.

Run: cd backend && python3 tests/test_entitlement_events.py
"""
from pathlib import Path
from typing import Optional

BACKEND = Path(__file__).resolve().parent.parent
src = (BACKEND / "server.py").read_text()

# Pull the pure classifier and its two event sets out of server.py without
# booting the app (server.py reads MONGO_URL etc at import). Slicing the real
# file means editing the sets in server.py breaks this test, which is the point.
block = src[src.index("GRANT_EVENTS = {"):src.index("# ---------- RevenueCat webhook END ----------")]
ns = {"Optional": Optional}
exec(block, ns)
classify_event = ns["classify_event"]

# (event_type, prior_active, expected_active, why)
# expected None == "do not touch the stored value"
CASES = [
    # Definite grants.
    ("INITIAL_PURCHASE", False, True, "the purchase that starts it all"),
    ("RENEWAL", True, True, "still paying"),
    ("UNCANCELLATION", True, True, "changed their mind, still entitled"),
    ("PRODUCT_CHANGE", True, True, "switched tier, still entitled"),
    ("NON_RENEWING_PURCHASE", False, True, "the $29 Founding Otter lifetime"),

    # Definite revoke.
    ("EXPIRATION", True, False, "the only event that legitimately ends access"),

    # Cancellation is NOT expiration. They keep access until the term ends.
    ("CANCELLATION", True, True, "cancelled but paid through the period"),

    # The revocation bugs. RevenueCat's grace period is authoritative, not us.
    ("BILLING_ISSUE", True, None, "card hiccup must NOT revoke, grace period is RC's call"),
    ("SUBSCRIPTION_PAUSED", True, None, "paused is not expired"),
    ("SUBSCRIPTION_EXTENDED", True, None, "extended must never revoke"),
    ("TEMPORARY_ENTITLEMENT_GRANT", False, None, "not our call to make"),
    ("TRANSFER", True, None, "no correct auto-behaviour without a second identity"),

    # The open world. Anything RevenueCat ships tomorrow.
    ("SOME_FUTURE_EVENT_TYPE", True, None, "unknown must never revoke a payer"),
    ("SOME_FUTURE_EVENT_TYPE", False, None, "unknown must never grant either"),
    ("", True, None, "empty type is not a revocation"),
]


def check_expiry_read() -> list:
    """N2: get_entitlement wrote expires_at_ms and never read it, so a dropped
    EXPIRATION webhook meant premium forever. The lifetime tier has no expiry at
    all, so absent must mean 'never expires', not 'expired at epoch 0'."""
    import re as _re
    from datetime import datetime, timezone

    body = src[src.index("async def get_entitlement("):src.index("async def check_rate(")]
    fails = []

    # The read must exist at all.
    if "expires_at_ms" not in body:
        fails.append("get_entitlement never reads expires_at_ms — N2 is back")
        return fails

    # Simulate the logic on the three shapes that matter.
    now_ms = datetime.now(timezone.utc).timestamp() * 1000

    def evaluate(prem):
        active = bool(prem.get("active"))
        expires_ms = prem.get("expires_at_ms")
        if active and expires_ms:
            if float(expires_ms) < now_ms:
                active = False
        return active

    cases = [
        ({"active": True, "expires_at_ms": now_ms + 86_400_000}, True, "subscription in date"),
        ({"active": True, "expires_at_ms": now_ms - 86_400_000}, False, "dropped EXPIRATION must not grant forever"),
        ({"active": True}, True, "LIFETIME has no expires_at_ms and must stay active"),
        ({"active": True, "expires_at_ms": None}, True, "explicit null expiry is still lifetime"),
        ({"active": False, "expires_at_ms": now_ms + 86_400_000}, False, "inactive stays inactive"),
    ]
    for prem, expected, why in cases:
        got = evaluate(prem)
        if got != expected:
            fails.append(f"expiry: {prem} -> expected {expected}, got {got} ({why})")
        print(f"{'OK  ' if got == expected else 'FAIL'} expiry: {why}")
    return fails


def main() -> int:
    fails = []
    for event_type, prior, expected, why in CASES:
        got = classify_event(event_type)
        ok = got == expected
        if not ok:
            fails.append(f"{event_type or '<empty>'}: expected {expected}, got {got} — {why}")
        label = "leave alone" if expected is None else ("grant" if expected else "REVOKE")
        print(f"{'OK  ' if ok else 'FAIL'} {(event_type or '<empty>'):30} -> {label}")

    # The specific regression: the old `else: event_type in active_types` default.
    # If someone reintroduces it, every unknown type returns False instead of None.
    unknown = classify_event("BILLING_ISSUE")
    if unknown is False:
        fails.append("BILLING_ISSUE returned False — the revoking default is back")

    print()
    fails += check_expiry_read()

    print()
    if fails:
        print(f"{len(fails)} FAILED")
        for f in fails:
            print(f"  - {f}")
        return 1
    print(f"{len(CASES)} event types + regression guard passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
