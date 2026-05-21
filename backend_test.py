"""
Backend tests for the REFERRAL system in /app/backend/server.py.

Covers tests 1-12 from the review request.
Run: python /app/backend_test.py
"""

import os
import sys
import time
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://run-training-hub-1.preview.emergentagent.com",
).rstrip("/")
if not BASE_URL.endswith("/api"):
    BASE_URL = BASE_URL + "/api"

ADMIN_EMAIL = "admin@runhub.com"
ADMIN_PASSWORD = "admin123"

# Counters
passed = 0
failed = 0
failures = []
created_user_ids = []


def _log(ok: bool, name: str, detail: str = ""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  PASS {name}")
    else:
        failed += 1
        failures.append(f"{name} :: {detail}")
        print(f"  FAIL {name} :: {detail}")


def assert_true(cond, name, detail=""):
    _log(bool(cond), name, detail if not cond else "")


def assert_eq(actual, expected, name):
    _log(actual == expected, name, f"expected={expected!r} got={actual!r}")


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register_user(email, password, name, referral_code=None, dob="1995-06-15"):
    body = {
        "email": email,
        "password": password,
        "name": name,
        "date_of_birth": dob,
        "accepted_terms": True,
        "accepted_privacy": True,
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "terms_version": "2026-04-21",
        "privacy_version": "2026-04-21",
    }
    if referral_code is not None:
        body["referral_code"] = referral_code
    return requests.post(f"{BASE_URL}/auth/register", json=body, timeout=30)


def login(email, password):
    return requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=30)


def main():
    print(f"\n=== REFERRAL TEST SUITE ===\nBase URL: {BASE_URL}\n")

    print("[Setup] Admin login")
    r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert_eq(r.status_code, 200, "Admin login 200")
    admin_token = r.json().get("token")
    assert_true(bool(admin_token), "Admin token present")

    ts = int(time.time())

    # === Test 1 ===
    print("\n[Test 1] Code auto-generation on register")
    email_a = f"alice_ref_{ts}@runhub.com"
    r = register_user(email_a, "Passw0rd!2026", "Alice Referrer")
    assert_eq(r.status_code, 200, "Register User A 200")
    data_a = r.json()
    token_a = data_a["token"]
    user_a = data_a["user"]
    user_a_id = user_a["user_id"]
    created_user_ids.append(user_a_id)
    code_a_from_reg = user_a.get("referral_code")
    assert_true(bool(code_a_from_reg), "User A referral_code set on register")

    r = requests.get(f"{BASE_URL}/referrals/me", headers=auth_headers(token_a), timeout=30)
    assert_eq(r.status_code, 200, "GET /referrals/me 200")
    me_a = r.json()
    code_a = me_a.get("code")
    assert_true(code_a == code_a_from_reg, f"code matches reg payload (reg={code_a_from_reg} me={code_a})")
    assert_true(isinstance(code_a, str) and code_a.startswith("RH"), "code starts with RH")
    assert_eq(len(code_a or ""), 8, "code length is 8")
    body = (code_a or "")[2:]
    forbidden = set("IO01")
    assert_true(all(c not in forbidden for c in body), f"code body has no I/O/0/1: {body}")
    sl = me_a.get("share_link")
    assert_true(isinstance(sl, str) and sl.startswith("http"), f"share_link starts with http: {sl}")
    assert_true(code_a in (sl or ""), "share_link contains code")
    assert_eq(me_a.get("deep_link"), f"runhub://r/{code_a}", "deep_link format")
    assert_eq(me_a.get("invited_total"), 0, "invited_total=0")
    assert_eq(me_a.get("qualified"), 0, "qualified=0")
    assert_eq(me_a.get("pending"), 0, "pending=0")
    assert_eq(me_a.get("rewards_count"), 0, "rewards_count=0")
    assert_eq(me_a.get("friends"), [], "friends=[]")

    # === Test 2 ===
    print("\n[Test 2] Lookup endpoint (public)")
    r = requests.get(f"{BASE_URL}/referrals/lookup/{code_a}", timeout=30)
    assert_eq(r.status_code, 200, "Lookup valid code (no auth) 200")
    lk = r.json()
    assert_eq(lk.get("code"), code_a, "Lookup returns code")
    assert_eq(lk.get("referrer_name"), "Alice Referrer", "referrer_name = Alice Referrer")
    r = requests.get(f"{BASE_URL}/referrals/lookup/{code_a.lower()}", timeout=30)
    assert_eq(r.status_code, 200, "Lookup lowercase 200")
    assert_eq(r.json().get("code"), code_a, "Lookup lowercase -> uppercase")
    r = requests.get(f"{BASE_URL}/referrals/lookup/RHINVALID", timeout=30)
    assert_eq(r.status_code, 404, "Lookup invalid -> 404")

    # === Test 3 ===
    print("\n[Test 3] Register with valid referral_code (User B)")
    email_b = f"bob_ref_{ts}@runhub.com"
    r = register_user(email_b, "Passw0rd!2026", "Bob Referred", referral_code=code_a)
    assert_eq(r.status_code, 200, "Register User B 200")
    data_b = r.json()
    token_b = data_b["token"]
    user_b_id = data_b["user"]["user_id"]
    created_user_ids.append(user_b_id)
    r = requests.get(f"{BASE_URL}/auth/me", headers=auth_headers(token_b), timeout=30)
    assert_eq(r.status_code, 200, "GET /auth/me B 200")
    me_b = r.json()
    assert_true("password_hash" not in me_b, "password_hash NOT in /auth/me")
    r = requests.get(f"{BASE_URL}/referrals/me", headers=auth_headers(token_a), timeout=30)
    me_a2 = r.json()
    assert_eq(me_a2.get("invited_total"), 1, "A invited_total=1")
    assert_eq(me_a2.get("pending"), 1, "A pending=1")
    assert_eq(me_a2.get("qualified"), 0, "A qualified=0")
    friends_a = me_a2.get("friends") or []
    assert_eq(len(friends_a), 1, "A friends list has 1")
    if friends_a:
        assert_eq(friends_a[0].get("rewarded"), False, "B not yet rewarded")

    # === Test 4 ===
    print("\n[Test 4] Register with invalid referral_code (User C)")
    email_c = f"carol_ref_{ts}@runhub.com"
    r = register_user(email_c, "Passw0rd!2026", "Carol NoRef", referral_code="RHINVALID")
    assert_eq(r.status_code, 200, "Register C invalid code 200")
    data_c = r.json()
    user_c_id = data_c["user"]["user_id"]
    created_user_ids.append(user_c_id)
    assert_true(data_c["user"].get("referred_by_user_id") in (None, ""),
                f"C has no referred_by_user_id (got {data_c['user'].get('referred_by_user_id')})")
    r = requests.get(f"{BASE_URL}/referrals/me", headers=auth_headers(token_a), timeout=30)
    me_a3 = r.json()
    assert_eq(me_a3.get("invited_total"), 1, "A invited_total still 1 (C not counted)")

    # === Test 5 ===
    print("\n[Test 5] POST /referrals/redeem (User D)")
    email_d = f"dan_ref_{ts}@runhub.com"
    r = register_user(email_d, "Passw0rd!2026", "Dan Late")
    assert_eq(r.status_code, 200, "Register D 200")
    data_d = r.json()
    token_d = data_d["token"]
    user_d_id = data_d["user"]["user_id"]
    created_user_ids.append(user_d_id)
    r = requests.post(f"{BASE_URL}/referrals/redeem", json={"code": code_a},
                      headers=auth_headers(token_d), timeout=30)
    assert_eq(r.status_code, 200, "D redeem A code 200")
    redeem_resp = r.json()
    assert_eq(redeem_resp.get("ok"), True, "redeem ok=true")
    assert_eq(redeem_resp.get("referrer_name"), "Alice Referrer", "redeem returns referrer name")
    r = requests.get(f"{BASE_URL}/referrals/me", headers=auth_headers(token_a), timeout=30)
    me_a4 = r.json()
    assert_eq(me_a4.get("invited_total"), 2, "A invited_total=2 after D redeem")

    # === Test 6 ===
    print("\n[Test 6] Redeem error cases")
    r = requests.post(f"{BASE_URL}/referrals/redeem", json={"code": ""},
                      headers=auth_headers(token_d), timeout=30)
    assert_eq(r.status_code, 400, "Empty code -> 400")
    # 6b invalid code (fresh user)
    email_d2 = f"dan2_ref_{ts}@runhub.com"
    r = register_user(email_d2, "Passw0rd!2026", "Dan Two")
    token_d2 = r.json()["token"]
    user_d2_id = r.json()["user"]["user_id"]
    created_user_ids.append(user_d2_id)
    r = requests.post(f"{BASE_URL}/referrals/redeem", json={"code": "RHINVALID"},
                      headers=auth_headers(token_d2), timeout=30)
    assert_eq(r.status_code, 404, "Invalid code -> 404")
    # 6c D re-redeem
    r = requests.post(f"{BASE_URL}/referrals/redeem", json={"code": code_a},
                      headers=auth_headers(token_d), timeout=30)
    assert_eq(r.status_code, 400, "D re-redeem -> 400")
    det = (r.json() or {}).get("detail", "")
    assert_true("gia" in det.lower() or "già" in det.lower(), f"already-used msg: {det}")
    # 6d A self-redeem
    r = requests.post(f"{BASE_URL}/referrals/redeem", json={"code": code_a},
                      headers=auth_headers(token_a), timeout=30)
    assert_eq(r.status_code, 400, "A self-redeem -> 400")
    det = (r.json() or {}).get("detail", "")
    assert_true("tuo codice" in det.lower(), f"own code msg: {det}")
    # 6e User E - workout first, then redeem
    email_e = f"emma_ref_{ts}@runhub.com"
    r = register_user(email_e, "Passw0rd!2026", "Emma EarlyRunner")
    token_e = r.json()["token"]
    user_e_id = r.json()["user"]["user_id"]
    created_user_ids.append(user_e_id)
    w_body = {
        "title": "Quick walk",
        "activity_type": "walk",
        "duration_seconds": 300,
        "distance_km": 1.0,
        "pace_min_per_km": 5.0,
        "calories": 50,
        "locations": [
            {"lat": 45.0, "lng": 9.0, "timestamp": 1730000000000},
            {"lat": 45.001, "lng": 9.001, "timestamp": 1730000005000},
            {"lat": 45.002, "lng": 9.002, "timestamp": 1730000010000},
        ],
    }
    r = requests.post(f"{BASE_URL}/workouts/complete", json=w_body, headers=auth_headers(token_e), timeout=30)
    assert_eq(r.status_code, 200, "E completes 1 workout 200")
    r = requests.post(f"{BASE_URL}/referrals/redeem", json={"code": code_a},
                      headers=auth_headers(token_e), timeout=30)
    assert_eq(r.status_code, 400, "E redeem after workout -> 400")
    det = (r.json() or {}).get("detail", "")
    assert_true("prima della prima corsa" in det.lower(), f"first-run msg: {det}")

    # === Test 7 ===
    print("\n[Test 7] Reward trigger on B first GPS workout")
    r = requests.get(f"{BASE_URL}/referrals/me", headers=auth_headers(token_a), timeout=30)
    me_a_before = r.json()
    qualified_before = me_a_before.get("qualified", 0)

    body_b_run = {
        "title": "First Run",
        "activity_type": "run",
        "duration_seconds": 600,
        "distance_km": 1.0,
        "locations": [
            {"lat": 45.0, "lng": 9.0, "timestamp": 1730000000000},
            {"lat": 45.001, "lng": 9.001, "timestamp": 1730000005000},
            {"lat": 45.002, "lng": 9.002, "timestamp": 1730000010000},
            {"lat": 45.003, "lng": 9.003, "timestamp": 1730000015000},
        ],
    }
    r = requests.post(f"{BASE_URL}/workouts/complete", json=body_b_run,
                      headers=auth_headers(token_b), timeout=30)
    assert_eq(r.status_code, 200, "B first GPS workout 200")
    w_doc = r.json()
    assert_eq(w_doc.get("referral_reward_granted"), True, "referral_reward_granted=true")

    r = requests.get(f"{BASE_URL}/referrals/me", headers=auth_headers(token_a), timeout=30)
    me_a5 = r.json()
    assert_eq(me_a5.get("qualified"), qualified_before + 1, f"A qualified increased (from {qualified_before})")
    assert_eq(me_a5.get("rewards_count"), 1, "A rewards_count=1")
    bonus_until = me_a5.get("bonus_premium_until")
    assert_true(bool(bonus_until), f"A bonus_premium_until set: {bonus_until}")
    try:
        b_dt = datetime.fromisoformat(str(bonus_until).replace("Z", "+00:00"))
        if b_dt.tzinfo is None:
            b_dt = b_dt.replace(tzinfo=timezone.utc)
        delta_days = (b_dt - datetime.now(timezone.utc)).total_seconds() / 86400.0
        assert_true(28.5 <= delta_days <= 31.5, f"bonus ~30d from now: {delta_days:.2f}d")
    except Exception as e:
        assert_true(False, "parse bonus_until", str(e))
    fb_entries = [f for f in (me_a5.get("friends") or []) if f.get("rewarded")]
    assert_true(len(fb_entries) >= 1, f"A.friends has a rewarded entry: {me_a5.get('friends')}")
    eff_tier = me_a5.get("current_tier_effective")
    assert_eq(eff_tier, "performance", "user_tier(A)=performance via current_tier_effective")

    # === Test 8 ===
    print("\n[Test 8] No double-reward (B 2nd workout)")
    bonus_until_before_t8 = bonus_until
    body_b_run2 = dict(body_b_run)
    body_b_run2["title"] = "Second Run"
    body_b_run2["locations"] = [
        {"lat": 46.0, "lng": 9.0, "timestamp": 1730100000000},
        {"lat": 46.001, "lng": 9.001, "timestamp": 1730100005000},
        {"lat": 46.002, "lng": 9.002, "timestamp": 1730100010000},
        {"lat": 46.003, "lng": 9.003, "timestamp": 1730100015000},
    ]
    r = requests.post(f"{BASE_URL}/workouts/complete", json=body_b_run2,
                      headers=auth_headers(token_b), timeout=30)
    assert_eq(r.status_code, 200, "B 2nd workout 200")
    w_doc2 = r.json()
    assert_true(not w_doc2.get("referral_reward_granted"),
                f"no reward on 2nd workout (got={w_doc2.get('referral_reward_granted')})")
    r = requests.get(f"{BASE_URL}/referrals/me", headers=auth_headers(token_a), timeout=30)
    me_a6 = r.json()
    assert_eq(me_a6.get("rewards_count"), 1, "A rewards_count still 1")
    assert_eq(me_a6.get("bonus_premium_until"), bonus_until_before_t8, "bonus unchanged")

    # === Test 9 ===
    print("\n[Test 9] Below threshold (User F dist=0.2)")
    email_f = f"frank_ref_{ts}@runhub.com"
    r = register_user(email_f, "Passw0rd!2026", "Frank Short", referral_code=code_a)
    assert_eq(r.status_code, 200, "Register F with A code 200")
    token_f = r.json()["token"]
    user_f_id = r.json()["user"]["user_id"]
    created_user_ids.append(user_f_id)
    bonus_before_f = me_a6.get("bonus_premium_until")
    rewards_before_f = me_a6.get("rewards_count")
    body_f = {
        "title": "Tiny walk",
        "activity_type": "walk",
        "duration_seconds": 120,
        "distance_km": 0.2,
        "locations": [
            {"lat": 45.0, "lng": 9.0, "timestamp": 1731000000000},
            {"lat": 45.001, "lng": 9.001, "timestamp": 1731000005000},
            {"lat": 45.002, "lng": 9.002, "timestamp": 1731000010000},
        ],
    }
    r = requests.post(f"{BASE_URL}/workouts/complete", json=body_f, headers=auth_headers(token_f), timeout=30)
    assert_eq(r.status_code, 200, "F sub-threshold workout 200")
    f_doc = r.json()
    assert_true(not f_doc.get("referral_reward_granted"),
                f"no reward for dist<0.5 (got={f_doc.get('referral_reward_granted')})")
    r = requests.get(f"{BASE_URL}/referrals/me", headers=auth_headers(token_a), timeout=30)
    me_a7 = r.json()
    assert_eq(me_a7.get("rewards_count"), rewards_before_f, "A rewards_count unchanged after F")
    assert_eq(me_a7.get("bonus_premium_until"), bonus_before_f, "A bonus unchanged after F")

    # === Test 10 ===
    print("\n[Test 10] Stacked rewards (User G)")
    email_g = f"gina_ref_{ts}@runhub.com"
    r = register_user(email_g, "Passw0rd!2026", "Gina Stacker", referral_code=code_a)
    assert_eq(r.status_code, 200, "Register G with A code 200")
    token_g = r.json()["token"]
    user_g_id = r.json()["user"]["user_id"]
    created_user_ids.append(user_g_id)
    body_g_run = {
        "title": "Gina first run",
        "activity_type": "run",
        "duration_seconds": 700,
        "distance_km": 1.2,
        "locations": [
            {"lat": 47.0, "lng": 9.0, "timestamp": 1732000000000},
            {"lat": 47.001, "lng": 9.001, "timestamp": 1732000005000},
            {"lat": 47.002, "lng": 9.002, "timestamp": 1732000010000},
            {"lat": 47.003, "lng": 9.003, "timestamp": 1732000015000},
        ],
    }
    r = requests.post(f"{BASE_URL}/workouts/complete", json=body_g_run, headers=auth_headers(token_g), timeout=30)
    assert_eq(r.status_code, 200, "G qualifying workout 200")
    g_doc = r.json()
    assert_eq(g_doc.get("referral_reward_granted"), True, "G triggers reward")
    r = requests.get(f"{BASE_URL}/referrals/me", headers=auth_headers(token_a), timeout=30)
    me_a8 = r.json()
    assert_eq(me_a8.get("rewards_count"), 2, "A rewards_count=2")
    new_bonus = me_a8.get("bonus_premium_until")
    try:
        new_b_dt = datetime.fromisoformat(str(new_bonus).replace("Z", "+00:00"))
        if new_b_dt.tzinfo is None:
            new_b_dt = new_b_dt.replace(tzinfo=timezone.utc)
        prev_b_dt = datetime.fromisoformat(str(bonus_until_before_t8).replace("Z", "+00:00"))
        if prev_b_dt.tzinfo is None:
            prev_b_dt = prev_b_dt.replace(tzinfo=timezone.utc)
        diff = (new_b_dt - prev_b_dt).total_seconds() / 86400.0
        assert_true(28.5 <= diff <= 31.5,
                    f"bonus +30d on top of prev: diff={diff:.2f}d (new={new_bonus} prev={bonus_until_before_t8})")
        delta_from_now = (new_b_dt - datetime.now(timezone.utc)).total_seconds() / 86400.0
        assert_true(58 <= delta_from_now <= 62,
                    f"bonus ~60d from now (stacked): {delta_from_now:.2f}d")
    except Exception as e:
        assert_true(False, "parse stacked bonus", str(e))

    # === Test 11 ===
    print("\n[Test 11] Backward compat (no referral_code)")
    email_h = f"henry_bc_{ts}@runhub.com"
    body = {
        "email": email_h,
        "password": "Passw0rd!2026",
        "name": "Henry Standard",
        "date_of_birth": "1990-01-01",
        "accepted_terms": True,
        "accepted_privacy": True,
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "terms_version": "2026-04-21",
        "privacy_version": "2026-04-21",
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=body, timeout=30)
    assert_eq(r.status_code, 200, "Register without referral_code 200")
    h = r.json()["user"]
    user_h_id = h["user_id"]
    created_user_ids.append(user_h_id)
    code_h = h.get("referral_code")
    assert_true(isinstance(code_h, str) and code_h.startswith("RH") and len(code_h) == 8,
                f"H auto-gen referral_code valid: {code_h}")
    assert_true(h.get("referred_by_user_id") in (None, ""),
                f"H referred_by_user_id None (got {h.get('referred_by_user_id')})")

    print("\n[Test 12] (covered by Test 6d self-redeem -> 400)")

    # === Cleanup ===
    print(f"\n[Cleanup] Deleting {len(created_user_ids)} test users")
    for uid in created_user_ids:
        try:
            r = requests.delete(f"{BASE_URL}/admin/users/{uid}", headers=auth_headers(admin_token), timeout=30)
            if r.status_code == 200:
                print(f"  deleted {uid}")
            else:
                print(f"  could not delete {uid}: {r.status_code} {r.text[:120]}")
        except Exception as e:
            print(f"  delete error for {uid}: {e}")

    total = passed + failed
    print("\n" + "=" * 60)
    print(f"RESULTS: {passed}/{total} assertions passed, {failed} failed")
    if failures:
        print("\nFAILURES:")
        for f in failures:
            print(f"  - {f}")
    print("=" * 60)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
