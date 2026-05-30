"""Backend test for the AI Coach background job + polling refactor.

Target: PUBLIC URL https://run-training-hub-1.preview.emergentagent.com/api
to specifically verify the previous 502 ingress timeout is gone.
"""
import time
import requests

BASE = "https://run-training-hub-1.preview.emergentagent.com/api"

ITALIAN_WORDS = [
    "settimana", "settimane", "corsa", "principiante", "allenamento",
    "riscaldamento", "sessione", "obiettivo", "lento", "veloce",
    "intervallo", "recupero", "facile"
]

ADMIN_EMAIL = "admin@runhub.com"
ADMIN_PASSWORD = "admin123"
ELITE_EMAIL = "applereview@runhub.com"
ELITE_PASSWORD = "RunHubReview2026!"
FREE_EMAIL = "testfree@runhub.com"
FREE_PASSWORD = "test123"

results = []
failures = []


def record(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    line = f"[{status}] {name}" + (f" :: {detail}" if detail else "")
    print(line, flush=True)
    results.append((name, ok, detail))
    if not ok:
        failures.append(line)


def login(email, password):
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": password}, timeout=30)
    if r.status_code != 200:
        return None, r
    j = r.json()
    return j.get("access_token") or j.get("token"), r


def main():
    admin_token, r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        record("login admin", False, f"status={r.status_code} body={r.text[:200]}")
        return
    record("login admin", True)

    seed_r = requests.post(f"{BASE}/admin/seed-test-users",
                           headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
    record("admin seed-test-users", seed_r.status_code == 200,
           f"status={seed_r.status_code} body={seed_r.text[:200]}")

    elite_token, r = login(ELITE_EMAIL, ELITE_PASSWORD)
    record("login elite (applereview)", elite_token is not None,
           f"status={r.status_code if not elite_token else 200}")
    if not elite_token:
        return

    free_token, r = login(FREE_EMAIL, FREE_PASSWORD)
    record("login free (testfree)", free_token is not None,
           f"status={r.status_code if not free_token else 200}")
    if not free_token:
        return

    # ===========================================================
    # A) POST /api/plans/ai-generate
    # ===========================================================
    print("\n=== A) POST /api/plans/ai-generate ===")

    r = requests.post(f"{BASE}/plans/ai-generate", json={
        "level": "beginner", "goal": "Run 5K", "days_per_week": 3,
        "duration_weeks": 4, "available_minutes": 30, "locale": "en"
    }, timeout=15)
    record("A.1 POST ai-generate no auth -> 401", r.status_code == 401,
           f"status={r.status_code} body={r.text[:200]}")

    r = requests.post(f"{BASE}/plans/ai-generate", json={
        "level": "beginner", "goal": "Run 5K", "days_per_week": 3,
        "duration_weeks": 4, "available_minutes": 30, "locale": "en"
    }, headers={"Authorization": f"Bearer {free_token}"}, timeout=15)
    record("A.2 POST ai-generate free tier -> 403", r.status_code == 403,
           f"status={r.status_code} body={r.text[:200]}")

    t0 = time.time()
    try:
        r = requests.post(f"{BASE}/plans/ai-generate", json={
            "level": "beginner", "goal": "Run 5K", "days_per_week": 3,
            "duration_weeks": 4, "available_minutes": 30, "locale": "en"
        }, headers={"Authorization": f"Bearer {elite_token}"}, timeout=20)
        elapsed = time.time() - t0
    except requests.RequestException as e:
        elapsed = time.time() - t0
        record("A.3 POST ai-generate elite", False,
               f"REQUEST EXCEPTION after {elapsed:.1f}s: {e}")
        return

    record("A.3a POST ai-generate NOT 502 (ingress timeout GONE)", r.status_code != 502,
           f"status={r.status_code} elapsed={elapsed:.2f}s body={r.text[:300]}")
    record("A.3b POST ai-generate returns < 5s (background pattern)", elapsed < 5.0,
           f"elapsed={elapsed:.2f}s status={r.status_code}")
    record("A.3c POST ai-generate status 200/202", r.status_code in (200, 202),
           f"status={r.status_code} body={r.text[:300]}")

    if r.status_code not in (200, 202):
        print("FATAL: cannot proceed without job_id")
        return

    body = r.json()
    job_id = body.get("job_id")
    record("A.3d response has job_id starting with aij_",
           isinstance(job_id, str) and job_id.startswith("aij_"),
           f"job_id={job_id}")
    record("A.3e response status=pending", body.get("status") == "pending",
           f"status={body.get('status')}")
    polling_url = body.get("polling_url")
    record("A.3f polling_url present and references job_id",
           isinstance(polling_url, str) and "/plans/ai-generate/status/" in polling_url
           and (job_id or "") in polling_url,
           f"polling_url={polling_url}")

    # ===========================================================
    # C) Authorization edge cases
    # ===========================================================
    print("\n=== C) Authorization edge cases ===")

    r = requests.get(f"{BASE}/plans/ai-generate/status/aij_nonexistent_123",
                     headers={"Authorization": f"Bearer {elite_token}"}, timeout=15)
    record("C.1 GET status nonexistent -> 404", r.status_code == 404,
           f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 404:
        try:
            detail = r.json().get("detail", "")
        except Exception:
            detail = ""
        record("C.1b detail mentions 'Job non trovato'", "Job non trovato" in detail,
               f"detail={detail}")

    r = requests.get(f"{BASE}/plans/ai-generate/status/{job_id}",
                     headers={"Authorization": f"Bearer {free_token}"}, timeout=15)
    record("C.2 GET status with non-owner token -> 403", r.status_code == 403,
           f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 403:
        try:
            detail = r.json().get("detail", "")
        except Exception:
            detail = ""
        record("C.2b detail mentions 'proprietario'", "proprietario" in detail.lower(),
               f"detail={detail}")

    r = requests.get(f"{BASE}/plans/ai-generate/status/{job_id}", timeout=15)
    record("C.3 GET status without auth -> 401", r.status_code == 401,
           f"status={r.status_code} body={r.text[:200]}")

    # ===========================================================
    # B) Polling endpoint
    # ===========================================================
    print("\n=== B) Polling status endpoint ===")

    r = requests.get(f"{BASE}/plans/ai-generate/status/{job_id}",
                     headers={"Authorization": f"Bearer {elite_token}"}, timeout=15)
    record("B.1a immediate poll -> 200", r.status_code == 200,
           f"status={r.status_code} body={r.text[:200]}")
    if r.status_code == 200:
        body = r.json()
        s = body.get("status")
        record("B.1b initial status in {pending,running,done}",
               s in ("pending", "running", "done"),
               f"status={s}")
        record("B.1c has elapsed_seconds (int)", isinstance(body.get("elapsed_seconds"), int),
               f"elapsed_seconds={body.get('elapsed_seconds')}")
        record("B.1d has estimated_total_seconds=90",
               body.get("estimated_total_seconds") == 90,
               f"estimated_total_seconds={body.get('estimated_total_seconds')}")

    print("Polling for completion (up to 180s)...")
    seen_statuses = set()
    plan_id = None
    final_status = None
    error_detail = None
    deadline = time.time() + 180
    poll_interval = 3
    last_status_print = None
    while time.time() < deadline:
        try:
            r = requests.get(f"{BASE}/plans/ai-generate/status/{job_id}",
                             headers={"Authorization": f"Bearer {elite_token}"}, timeout=20)
        except requests.RequestException as e:
            print(f"  poll exception: {e}")
            time.sleep(poll_interval)
            continue
        if r.status_code != 200:
            print(f"  unexpected poll status {r.status_code}: {r.text[:200]}")
            time.sleep(poll_interval)
            continue
        body = r.json()
        s = body.get("status")
        seen_statuses.add(s)
        if s != last_status_print:
            print(f"  [{int(body.get('elapsed_seconds',0)):03d}s] status={s} "
                  f"plan_id={body.get('plan_id')} err={body.get('error_detail')}")
            last_status_print = s
        if s == "done":
            plan_id = body.get("plan_id")
            final_status = s
            break
        if s == "error":
            error_detail = body.get("error_detail")
            final_status = s
            break
        time.sleep(poll_interval)

    record("B.2a polling reached terminal state", final_status in ("done", "error"),
           f"final_status={final_status} seen={seen_statuses}")
    record("B.2b status reached 'done'", final_status == "done",
           f"final_status={final_status} error_detail={error_detail}")
    record("B.2c saw 'running' or 'done' transition",
           "running" in seen_statuses or "done" in seen_statuses,
           f"seen={seen_statuses}")

    if final_status == "done" and plan_id:
        record("B.2d plan_id starts with 'pl_'",
               isinstance(plan_id, str) and plan_id.startswith("pl_"),
               f"plan_id={plan_id}")
        r = requests.get(f"{BASE}/plans/{plan_id}",
                         headers={"Authorization": f"Bearer {elite_token}"}, timeout=20)
        plan = None
        if r.status_code == 200:
            try:
                plan = r.json()
            except Exception:
                plan = None
            record("B.2e GET /plans/{plan_id} -> 200", True, f"got plan")
        else:
            r2 = requests.get(f"{BASE}/plans",
                              headers={"Authorization": f"Bearer {elite_token}"}, timeout=20)
            if r2.status_code == 200:
                try:
                    plan = next((p for p in r2.json()
                                 if p.get("plan_id") == plan_id or p.get("id") == plan_id), None)
                except Exception:
                    plan = None
            record("B.2e GET /plans/{plan_id} -> 200", plan is not None,
                   f"direct GET status={r.status_code}; fallback list found={plan is not None}")

        if isinstance(plan, dict):
            title = (plan.get("title") or "").lower()
            description = (plan.get("description") or "").lower()
            it_in_title = [w for w in ITALIAN_WORDS if w in title]
            it_in_desc = [w for w in ITALIAN_WORDS if w in description]
            record("B.2f plan title is English (no IT words)", len(it_in_title) == 0,
                   f"title='{plan.get('title')}' italian_matches={it_in_title}")
            record("B.2g plan description is English (no IT words)", len(it_in_desc) == 0,
                   f"italian_matches={it_in_desc} desc[:200]='{plan.get('description','')[:200]}'")
            record("B.2h plan.is_ai_generated == true", plan.get("is_ai_generated") is True,
                   f"is_ai_generated={plan.get('is_ai_generated')}")
            workouts = plan.get("workouts") or []
            record("B.2i plan.workouts has >= 6 items", len(workouts) >= 6,
                   f"workouts_count={len(workouts)}")

    # ===========================================================
    # D) Smoke for already-green endpoints
    # ===========================================================
    print("\n=== D) Smoke for previously-green endpoints ===")

    r = requests.put(f"{BASE}/users/me/locale",
                     headers={"Authorization": f"Bearer {free_token}"},
                     json={"locale": "en"}, timeout=15)
    record("D.1 PUT /users/me/locale 'en' -> 200", r.status_code == 200,
           f"status={r.status_code} body={r.text[:200]}")

    r = requests.post(f"{BASE}/notifications/test",
                      headers={"Authorization": f"Bearer {free_token}"},
                      json={}, timeout=15)
    record("D.2 POST /notifications/test reachable (200 or 400, NOT 500)",
           r.status_code in (200, 400),
           f"status={r.status_code} body={r.text[:200]}")

    print("\n" + "=" * 60)
    print(f"TOTAL: {sum(1 for _, ok, _ in results if ok)}/{len(results)} PASS")
    if failures:
        print("\nFAILURES:")
        for f in failures:
            print(f"  {f}")


if __name__ == "__main__":
    main()
