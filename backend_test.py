"""
Backend tests for RunHub Social Feed endpoints.
Tests all /api/social/* endpoints + regression on admin/plans.
"""
import os
import sys
import time
import requests

BASE_URL = os.environ.get(
    "BACKEND_URL",
    "https://run-training-hub-1.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@runhub.com"
ADMIN_PASSWORD = "admin123"

TS = int(time.time())
ALICE_EMAIL = f"alice_{TS}@test.com"
ALICE_PWD = "alice123"
ALICE_NAME = "Alice Runner"
BOB_EMAIL = f"bob_{TS}@test.com"
BOB_PWD = "bob123"
BOB_NAME = "Bob Sprinter"

results = []

def log(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    results.append((name, ok, detail))
    print(f"[{status}] {name}  {detail}")

def post(path, token=None, json_body=None, params=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.post(f"{API}{path}", headers=h, json=json_body, params=params, timeout=30)

def get(path, token=None, params=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.get(f"{API}{path}", headers=h, params=params, timeout=30)

def delete(path, token=None, params=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return requests.delete(f"{API}{path}", headers=h, params=params, timeout=30)


def safe_detail(r):
    try:
        return (r.json().get("detail") or "").lower()
    except Exception:
        return ""


def main():
    print(f"Testing against: {API}")

    # ------------- SETUP -------------
    r = post("/auth/login", json_body={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        log("admin_login", False, f"status={r.status_code} body={r.text[:200]}")
        print_summary()
        sys.exit(1)
    admin_tok = r.json()["token"]
    admin_uid = r.json()["user"]["user_id"]
    log("admin_login", True, f"uid={admin_uid}")

    r = post("/auth/register", json_body={"email": ALICE_EMAIL, "password": ALICE_PWD, "name": ALICE_NAME})
    log("register_alice", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        print(r.text); print_summary(); sys.exit(1)
    alice_tok = r.json()["token"]
    alice_uid = r.json()["user"]["user_id"]

    r = post("/auth/register", json_body={"email": BOB_EMAIL, "password": BOB_PWD, "name": BOB_NAME})
    log("register_bob", r.status_code == 200, f"status={r.status_code}")
    if r.status_code != 200:
        print(r.text); print_summary(); sys.exit(1)
    bob_tok = r.json()["token"]
    bob_uid = r.json()["user"]["user_id"]

    alice_session_id = None
    try:
        # ------------- 2. Friend request happy path -------------
        r = post("/social/friends/request", token=alice_tok, json_body={"email": BOB_EMAIL})
        ok = r.status_code == 200 and r.json().get("ok") is True and r.json().get("friendship_id")
        log("alice_sends_request_to_bob", ok, f"status={r.status_code} body={r.text[:200]}")
        if not ok:
            return
        friendship_id = r.json()["friendship_id"]
        tgt = r.json().get("target") or {}
        log("request_returns_target_user",
            tgt.get("user_id") == bob_uid,
            f"target.user_id={tgt.get('user_id')}")

        r = get("/social/friends/requests", token=bob_tok)
        lst = r.json() if r.status_code == 200 else []
        ok = r.status_code == 200 and any(
            x.get("friendship_id") == friendship_id and x.get("from", {}).get("user_id") == alice_uid
            for x in lst
        )
        log("bob_sees_incoming_request", ok, f"count={len(lst)}")

        r = get("/social/friends/outgoing", token=alice_tok)
        lst = r.json() if r.status_code == 200 else []
        ok = r.status_code == 200 and any(
            x.get("friendship_id") == friendship_id and x.get("to", {}).get("user_id") == bob_uid
            for x in lst
        )
        log("alice_sees_outgoing_request", ok, f"count={len(lst)}")

        r = post(f"/social/friends/respond/{friendship_id}", token=alice_tok, params={"action": "accept"})
        ok = r.status_code == 400 and "tua richiesta" in safe_detail(r)
        log("alice_cannot_accept_own_request_400", ok, f"status={r.status_code} body={r.text[:200]}")

        r = post(f"/social/friends/respond/{friendship_id}", token=bob_tok, params={"action": "accept"})
        ok = r.status_code == 200 and r.json().get("status") == "accepted"
        log("bob_accepts_request", ok, f"status={r.status_code} body={r.text[:200]}")

        r = get("/social/friends", token=alice_tok)
        ok = r.status_code == 200 and any(
            x.get("user_id") == bob_uid and "total_km" in x and "total_runs" in x
            for x in r.json()
        )
        log("alice_friends_list_has_bob_with_stats", ok, f"body={r.text[:300]}")

        r = get("/social/friends", token=bob_tok)
        ok = r.status_code == 200 and any(
            x.get("user_id") == alice_uid and "total_km" in x and "total_runs" in x
            for x in r.json()
        )
        log("bob_friends_list_has_alice_with_stats", ok, f"body={r.text[:300]}")

        # ------------- 3. Friend edge cases -------------
        r = post("/social/friends/request", token=alice_tok, json_body={"email": ALICE_EMAIL})
        ok = r.status_code == 400 and "te stesso" in safe_detail(r)
        log("self_request_400", ok, f"status={r.status_code} body={r.text[:200]}")

        r = post("/social/friends/request", token=alice_tok, json_body={"email": BOB_EMAIL})
        ok = r.status_code == 400 and ("gia" in safe_detail(r) or "già" in safe_detail(r))
        log("already_friends_400", ok, f"status={r.status_code} body={r.text[:200]}")

        r = post("/social/friends/request", token=alice_tok, json_body={"email": "noexist_xyz999@example.com"})
        log("nonexistent_email_404", r.status_code == 404, f"status={r.status_code} body={r.text[:200]}")

        # ------------- 4. Search -------------
        r = get("/social/users/search", token=alice_tok, params={"q": "bob"})
        lst = r.json() if r.status_code == 200 else []
        ok = r.status_code == 200 and any(
            x.get("user_id") == bob_uid and x.get("relation") == "friend" for x in lst
        )
        log("alice_search_bob_relation_friend", ok, f"count={len(lst)} body={r.text[:300]}")

        r = get("/social/users/search", token=alice_tok, params={"q": "a"})
        ok = r.status_code == 200 and r.json() == []
        log("search_single_char_empty", ok, f"status={r.status_code} body={r.text[:200]}")

        r = get("/social/users/search", token=admin_tok, params={"q": f"alice_{TS}"})
        lst = r.json() if r.status_code == 200 else []
        ok = r.status_code == 200 and any(
            x.get("user_id") == alice_uid and x.get("relation") == "none" for x in lst
        )
        log("admin_search_alice_relation_none", ok, f"count={len(lst)} body={r.text[:300]}")

        # ------------- 5. Feed -------------
        payload = {
            "workout_id": "wk_b1",
            "plan_id": "pl_beginner_5k",
            "title": "Test Run",
            "duration_seconds": 600,
            "distance_km": 2.0,
            "avg_pace_min_per_km": 5.0,
            "calories": 150.0,
            "locations": [],
        }
        r = post("/workouts/complete", token=alice_tok, json_body=payload)
        ok = r.status_code == 200 and r.json().get("session_id", "").startswith("ws_")
        log("alice_completes_workout", ok, f"status={r.status_code} body={r.text[:200]}")
        if not ok:
            return
        alice_session_id = r.json()["session_id"]

        r = get("/social/feed", token=bob_tok)
        lst = r.json() if r.status_code == 200 else []
        ok = r.status_code == 200 and any(
            f.get("session_id") == alice_session_id and f.get("user", {}).get("user_id") == alice_uid
            for f in lst
        )
        log("bob_feed_includes_alice_session", ok, f"count={len(lst)}")

        r = get("/social/feed", token=admin_tok)
        lst = r.json() if r.status_code == 200 else []
        ok = r.status_code == 200 and not any(
            f.get("session_id") == alice_session_id for f in lst
        )
        log("admin_feed_excludes_alice_session", ok, f"count={len(lst)}")

        # ------------- 6. Likes -------------
        r = post(f"/social/workouts/{alice_session_id}/like", token=bob_tok)
        ok = r.status_code == 200 and r.json().get("likes_count") == 1
        log("bob_likes_alice_session", ok, f"status={r.status_code} body={r.text[:200]}")

        r = get("/social/feed", token=bob_tok)
        lst = r.json() if r.status_code == 200 else []
        entry = next((f for f in lst if f.get("session_id") == alice_session_id), None)
        ok = entry is not None and entry.get("liked_by_me") is True and entry.get("likes_count") == 1
        log("bob_feed_shows_liked_by_me", ok, f"entry_likes={entry.get('likes_count') if entry else None}")

        r = post(f"/social/workouts/{alice_session_id}/like", token=bob_tok)
        ok = r.status_code == 200 and r.json().get("already_liked") is True
        log("bob_like_idempotent", ok, f"body={r.text[:200]}")

        r = post(f"/social/workouts/{alice_session_id}/like", token=admin_tok)
        log("admin_like_forbidden_403", r.status_code == 403, f"status={r.status_code} body={r.text[:200]}")

        r = delete(f"/social/workouts/{alice_session_id}/like", token=bob_tok)
        ok = r.status_code == 200 and r.json().get("likes_count") == 0
        log("bob_unlikes_alice_session", ok, f"body={r.text[:200]}")

        # ------------- 7. Comments -------------
        r = post(f"/social/workouts/{alice_session_id}/comments", token=bob_tok, json_body={"text": "Bravo!"})
        ok = r.status_code == 200 and r.json().get("comment_id", "").startswith("cm_")
        log("bob_adds_comment", ok, f"body={r.text[:200]}")
        comment_id = r.json().get("comment_id") if ok else None

        r = post(f"/social/workouts/{alice_session_id}/comments", token=bob_tok, json_body={"text": ""})
        log("empty_comment_400", r.status_code == 400, f"status={r.status_code}")

        r = get(f"/social/workouts/{alice_session_id}/comments", token=bob_tok)
        lst = r.json() if r.status_code == 200 else []
        ok = r.status_code == 200 and any(
            c.get("comment_id") == comment_id and c.get("user_name") and c.get("text") == "Bravo!"
            for c in lst
        )
        log("comments_list_includes_bobs", ok, f"count={len(lst)}")

        r = post(f"/social/workouts/{alice_session_id}/comments", token=admin_tok, json_body={"text": "hi"})
        log("admin_comment_forbidden_403", r.status_code == 403, f"status={r.status_code}")

        if comment_id:
            r = delete(f"/social/comments/{comment_id}", token=bob_tok)
            log("bob_deletes_own_comment", r.status_code == 200, f"status={r.status_code}")

        r = post(f"/social/workouts/{alice_session_id}/comments", token=bob_tok, json_body={"text": "Great pace!"})
        cid2 = r.json().get("comment_id") if r.status_code == 200 else None
        log("bob_adds_second_comment", cid2 is not None, f"status={r.status_code}")
        if cid2:
            r = delete(f"/social/comments/{cid2}", token=alice_tok)
            log("alice_session_owner_deletes_comment", r.status_code == 200, f"status={r.status_code}")

        # ------------- 8. Leaderboard -------------
        r = get("/social/leaderboard", token=alice_tok, params={"period": "weekly", "metric": "km"})
        body = r.json() if r.status_code == 200 else {}
        entries = body.get("entries", [])
        alice_in = any(e.get("user_id") == alice_uid and e.get("is_me") is True for e in entries)
        bob_in = any(e.get("user_id") == bob_uid for e in entries)
        log("leaderboard_weekly_km",
            r.status_code == 200 and alice_in,
            f"alice_present={alice_in} bob_present={bob_in} entries={len(entries)}")

        r = get("/social/leaderboard", token=alice_tok, params={"period": "monthly", "metric": "runs"})
        log("leaderboard_monthly_runs", r.status_code == 200, f"status={r.status_code}")

        r = get("/social/leaderboard", token=alice_tok, params={"period": "invalid", "metric": "km"})
        log("leaderboard_invalid_period_400", r.status_code == 400, f"status={r.status_code}")

        r = get("/social/leaderboard", token=alice_tok, params={"period": "weekly", "metric": "invalid"})
        log("leaderboard_invalid_metric_400", r.status_code == 400, f"status={r.status_code}")

        # ------------- 9. Unfriend -------------
        r = delete(f"/social/friends/{bob_uid}", token=alice_tok)
        log("alice_unfriends_bob", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")

        r = get("/social/friends", token=alice_tok)
        ok = r.status_code == 200 and r.json() == []
        log("alice_friends_empty_after_unfriend", ok, f"body={r.text[:200]}")

        # ------------- 10. Regression -------------
        r = get("/admin/users", token=admin_tok)
        log("regression_admin_users", r.status_code == 200 and isinstance(r.json(), list),
            f"status={r.status_code} count={len(r.json()) if r.status_code==200 else 'n/a'}")

        r = get("/plans", token=alice_tok)
        log("regression_plans", r.status_code == 200, f"status={r.status_code}")

    finally:
        r = delete(f"/admin/users/{alice_uid}", token=admin_tok)
        log("cleanup_delete_alice", r.status_code == 200, f"status={r.status_code}")
        r = delete(f"/admin/users/{bob_uid}", token=admin_tok)
        log("cleanup_delete_bob", r.status_code == 200, f"status={r.status_code}")

    print_summary()


def print_summary():
    print("\n=============== SUMMARY ===============")
    passed = sum(1 for _, ok, _ in results if ok)
    failed = [r for r in results if not r[1]]
    print(f"Total: {len(results)}  Passed: {passed}  Failed: {len(failed)}")
    if failed:
        print("\nFAILED:")
        for name, _, detail in failed:
            print(f"  - {name} :: {detail}")
    sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
