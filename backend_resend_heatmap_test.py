"""
RunHub backend tests for Resend email (password reset, email verification, welcome)
and Heatmap (/api/stats/routes).
"""
import os
import sys
import time
import json
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get(
    "BACKEND_URL",
    "https://run-training-hub-1.preview.emergentagent.com",
).rstrip("/") + "/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

ADMIN_EMAIL = "admin@runhub.com"
ADMIN_PASSWORD = "admin123"

_PASS = 0
_FAIL = 0
_FAILURES = []


def check(name, cond, detail=""):
    global _PASS, _FAIL
    if cond:
        _PASS += 1
        print(f"  PASS  {name}")
    else:
        _FAIL += 1
        _FAILURES.append(f"{name} :: {detail}")
        print(f"  FAIL  {name} :: {detail}")


def section(title):
    print(f"\n=== {title} ===")


def main():
    print(f"BASE_URL = {BASE_URL}")
    print(f"MONGO_URL = {MONGO_URL}, DB = {DB_NAME}")
    mongo = MongoClient(MONGO_URL)
    db = mongo[DB_NAME]

    cleanup_user_ids = []

    # ---------- 1. Forgot password silent-success ----------
    section("1. POST /auth/forgot-password silent success")
    r = requests.post(f"{BASE_URL}/auth/forgot-password", json={"email": ADMIN_EMAIL}, timeout=15)
    check("forgot-password admin -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")
    try:
        check("forgot-password admin body ok:true", r.json().get("ok") is True, r.text)
    except Exception as e:
        check("forgot-password admin body json", False, str(e))

    r = requests.post(f"{BASE_URL}/auth/forgot-password", json={"email": "nonexistent_9999@x.com"}, timeout=15)
    check("forgot-password nonexistent -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")
    try:
        check("forgot-password nonexistent body ok:true", r.json().get("ok") is True, r.text)
    except Exception as e:
        check("forgot-password nonexistent body json", False, str(e))

    # ---------- 2. Reset password validation ----------
    section("2. POST /auth/reset-password validation")
    r = requests.post(
        f"{BASE_URL}/auth/reset-password",
        json={"email": ADMIN_EMAIL, "code": "999999", "new_password": "short"},
        timeout=15,
    )
    check("reset-password short password -> 400", r.status_code == 400, f"got {r.status_code} {r.text}")
    check(
        "reset-password short password detail",
        "troppo corta" in r.text.lower() or "too short" in r.text.lower(),
        r.text,
    )

    r = requests.post(
        f"{BASE_URL}/auth/reset-password",
        json={"email": ADMIN_EMAIL, "code": "999999", "new_password": "longenough"},
        timeout=15,
    )
    check("reset-password invalid code -> 400", r.status_code == 400, f"got {r.status_code} {r.text}")
    check(
        "reset-password invalid code detail",
        "codice non valido" in r.text.lower() or "scadut" in r.text.lower(),
        r.text,
    )

    r = requests.post(
        f"{BASE_URL}/auth/reset-password",
        json={"email": ADMIN_EMAIL},
        timeout=15,
    )
    check("reset-password missing fields -> 422", r.status_code == 422, f"got {r.status_code} {r.text}")

    # ---------- 3. Verify email endpoints ----------
    section("3. verify-email endpoints")
    r = requests.post(
        f"{BASE_URL}/auth/verify-email/send",
        json={"email": "nonexistent@x.com"},
        timeout=15,
    )
    check("verify-email/send nonexistent -> 200 (silent)", r.status_code == 200, f"got {r.status_code} {r.text}")
    try:
        check("verify-email/send body ok:true", r.json().get("ok") is True, r.text)
    except Exception:
        check("verify-email/send body json", False, r.text)

    r = requests.post(
        f"{BASE_URL}/auth/verify-email/confirm",
        json={"email": ADMIN_EMAIL, "code": "000000"},
        timeout=15,
    )
    check("verify-email/confirm invalid code -> 400", r.status_code == 400, f"got {r.status_code} {r.text}")
    check(
        "verify-email/confirm detail",
        "codice non valido" in r.text.lower() or "scadut" in r.text.lower(),
        r.text,
    )

    # ---------- 4. End-to-end OTP flow ----------
    section("4. E2E OTP password reset flow (read DB)")

    def _get_latest_otp(email: str, purpose: str):
        # Poll briefly — OTP is created synchronously before email task, so should be instant
        for _ in range(10):
            rec = db.otp_codes.find_one(
                {"email": email.lower(), "purpose": purpose, "consumed": False},
                sort=[("created_at", -1)],
            )
            if rec:
                return rec
            time.sleep(0.3)
        return None

    # Trigger forgot-password for admin
    r = requests.post(f"{BASE_URL}/auth/forgot-password", json={"email": ADMIN_EMAIL}, timeout=15)
    check("E2E trigger forgot-password -> 200", r.status_code == 200, r.text)

    rec = _get_latest_otp(ADMIN_EMAIL, "reset_password")
    check("E2E OTP found in DB", rec is not None, "no otp_codes entry found for admin/reset_password")
    if rec:
        code = rec["code"]
        print(f"    OTP code for admin: {code}")
        new_pw = "newpass123"
        r = requests.post(
            f"{BASE_URL}/auth/reset-password",
            json={"email": ADMIN_EMAIL, "code": code, "new_password": new_pw},
            timeout=15,
        )
        check("E2E reset-password valid -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")
        try:
            check("E2E reset-password body ok:true", r.json().get("ok") is True, r.text)
        except Exception:
            check("E2E reset-password body json", False, r.text)

        # Try login with new password
        r = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": ADMIN_EMAIL, "password": new_pw},
            timeout=15,
        )
        check("E2E login with new password -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")

        # Now restore: forgot -> read code -> reset back to admin123
        r = requests.post(f"{BASE_URL}/auth/forgot-password", json={"email": ADMIN_EMAIL}, timeout=15)
        check("E2E restore forgot-password -> 200", r.status_code == 200, r.text)
        rec2 = _get_latest_otp(ADMIN_EMAIL, "reset_password")
        check("E2E restore OTP found", rec2 is not None, "")
        if rec2:
            code2 = rec2["code"]
            r = requests.post(
                f"{BASE_URL}/auth/reset-password",
                json={"email": ADMIN_EMAIL, "code": code2, "new_password": ADMIN_PASSWORD},
                timeout=15,
            )
            check("E2E restore reset-password -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")

            r = requests.post(
                f"{BASE_URL}/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=15,
            )
            check("E2E login with original admin123 -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")

    # Need admin token for later tests
    r = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    admin_token = None
    if r.status_code == 200:
        admin_token = r.json().get("token")
    check("Admin login for subsequent tests", admin_token is not None, r.text if r.status_code != 200 else "")

    admin_headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}

    # ---------- 5. Heatmap endpoint ----------
    section("5. GET /stats/routes heatmap")
    r = requests.get(f"{BASE_URL}/stats/routes", timeout=15)
    check("stats/routes without auth -> 401", r.status_code == 401, f"got {r.status_code} {r.text}")

    r = requests.get(f"{BASE_URL}/stats/routes", headers=admin_headers, timeout=20)
    check("stats/routes with admin -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")
    if r.status_code == 200:
        data = r.json()
        check("stats/routes returns array", isinstance(data, list), f"type={type(data)}")
        print(f"    Admin has {len(data) if isinstance(data, list) else 'N/A'} routes")
        if isinstance(data, list) and data:
            first = data[0]
            check("route has session_id", "session_id" in first, str(first.keys()))
            check("route has distance_km", "distance_km" in first, str(first.keys()))
            check("route has coords list", isinstance(first.get("coords"), list), str(first.keys()))
            if isinstance(first.get("coords"), list) and first["coords"]:
                c = first["coords"][0]
                check("coord has lat/lng", "lat" in c and "lng" in c, str(c))
        else:
            # Create a session for admin to populate the heatmap (optional)
            print("    No routes for admin — creating a synthetic session to validate schema")
            session_payload = {
                "workout_id": "wk_heatmap_test",
                "plan_id": None,
                "title": "Heatmap test run",
                "duration_seconds": 1200,
                "distance_km": 3.2,
                "avg_pace_min_per_km": 6.0,
                "calories": 220,
                "locations": [
                    {"lat": 45.4642 + i * 0.0005, "lng": 9.1900 + i * 0.0005, "timestamp": 1700000000000 + i * 1000}
                    for i in range(20)
                ],
            }
            rc = requests.post(
                f"{BASE_URL}/workouts/complete",
                json=session_payload,
                headers=admin_headers,
                timeout=15,
            )
            check("Seed workout session -> 200", rc.status_code == 200, rc.text)
            r2 = requests.get(f"{BASE_URL}/stats/routes", headers=admin_headers, timeout=15)
            check("stats/routes after seed -> 200 non-empty", r2.status_code == 200 and isinstance(r2.json(), list) and len(r2.json()) >= 1, r2.text[:300])
            if r2.status_code == 200 and r2.json():
                first = r2.json()[0]
                check("route schema after seed session_id", "session_id" in first, str(first))
                check("route schema after seed coords[0] lat/lng",
                      first.get("coords") and "lat" in first["coords"][0] and "lng" in first["coords"][0],
                      str(first.get("coords", [None])[:1]))

    # ---------- 6. Welcome email on register ----------
    section("6. Register new user (welcome email is fire-and-forget)")
    ts = int(time.time())
    new_email = f"emailtest_{ts}@test.com"
    r = requests.post(
        f"{BASE_URL}/auth/register",
        json={"email": new_email, "password": "SecurePass!2026", "name": "Email Test User"},
        timeout=20,
    )
    check("Register new user -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")
    if r.status_code == 200:
        body = r.json()
        check("Register returns token", bool(body.get("token")), str(body.keys()))
        check("Register returns user with user_id", bool(body.get("user", {}).get("user_id")), str(body.get("user", {}).keys()))
        uid = body.get("user", {}).get("user_id")
        if uid:
            cleanup_user_ids.append(uid)

    # ---------- 7. Regression smoke tests ----------
    section("7. Regression smoke tests")
    r = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    check("Regression admin login -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")

    r = requests.get(f"{BASE_URL}/plans", headers=admin_headers, timeout=15)
    check("Regression GET /plans -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")

    r = requests.get(f"{BASE_URL}/admin/users", headers=admin_headers, timeout=15)
    check("Regression GET /admin/users -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")

    r = requests.get(f"{BASE_URL}/social/feed", headers=admin_headers, timeout=15)
    check("Regression GET /social/feed -> 200", r.status_code == 200, f"got {r.status_code} {r.text}")

    # ---------- Cleanup ----------
    section("Cleanup: delete test users")
    for uid in cleanup_user_ids:
        rc = requests.delete(f"{BASE_URL}/admin/users/{uid}", headers=admin_headers, timeout=15)
        check(f"DELETE /admin/users/{uid} -> 200", rc.status_code == 200, f"got {rc.status_code} {rc.text}")

    # ---------- Summary ----------
    print(f"\n{'='*60}\nTOTAL: {_PASS} passed, {_FAIL} failed")
    if _FAILURES:
        print("\nFailures:")
        for f in _FAILURES:
            print(f"  - {f}")
    return 0 if _FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
