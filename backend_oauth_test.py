"""
Backend tests for Google/Apple Sign In + regression smoke tests.
Target: REACT_APP/EXPO_PUBLIC_BACKEND_URL + /api
"""
import os
import time
import json
import requests

BASE_URL = "https://run-training-hub-1.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@runhub.com"
ADMIN_PASSWORD = "admin123"


def _print(ok, label, detail=""):
    icon = "PASS" if ok else "FAIL"
    print(f"[{icon}] {label} {('— ' + detail) if detail else ''}")
    return ok


def main():
    results = []

    # 1) POST /api/auth/google with invalid token -> expect 401
    r = requests.post(f"{BASE_URL}/auth/google", json={"id_token": "invalid"}, timeout=30)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text}
    ok = r.status_code == 401 and isinstance(body, dict) and "detail" in body and "Token Google non valido" in str(body.get("detail", ""))
    results.append(_print(ok, "POST /auth/google invalid -> 401 'Token Google non valido'",
                          f"status={r.status_code} body={body}"))

    # 2) POST /api/auth/apple with invalid token -> expect 401
    r = requests.post(f"{BASE_URL}/auth/apple", json={"identity_token": "invalid"}, timeout=30)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text}
    ok = r.status_code == 401 and isinstance(body, dict) and "detail" in body and "Token Apple non valido" in str(body.get("detail", ""))
    results.append(_print(ok, "POST /auth/apple invalid -> 401 'Token Apple non valido'",
                          f"status={r.status_code} body={body}"))

    # 3a) Missing fields on /auth/google -> 422
    r = requests.post(f"{BASE_URL}/auth/google", json={}, timeout=30)
    ok = r.status_code == 422
    results.append(_print(ok, "POST /auth/google empty body -> 422", f"status={r.status_code}"))

    # 3b) Missing fields on /auth/apple -> 422
    r = requests.post(f"{BASE_URL}/auth/apple", json={}, timeout=30)
    ok = r.status_code == 422
    results.append(_print(ok, "POST /auth/apple empty body -> 422", f"status={r.status_code}"))

    # 4) Payload structure verified in cases above (detail field); also ensure 422 uses JSON
    r = requests.post(f"{BASE_URL}/auth/google", json={}, timeout=30)
    try:
        body = r.json()
        is_json = True
    except Exception:
        is_json = False
        body = {}
    ok = is_json and "detail" in body
    results.append(_print(ok, "422 responses are JSON with 'detail' field", f"body={body}"))

    # 5) Regression tests
    # Admin login
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    ok = r.status_code == 200
    admin_token = None
    admin_user = None
    if ok:
        data = r.json()
        admin_token = data.get("token")
        admin_user = data.get("user") or {}
        ok = bool(admin_token) and admin_user.get("role") == "admin"
    results.append(_print(ok, "POST /auth/login admin -> 200 + token + role=admin",
                          f"status={r.status_code} role={admin_user.get('role') if admin_user else None}"))

    # Register new test user
    ts = int(time.time())
    new_email = f"giulia.runner_{ts}@runhub.com"
    r = requests.post(f"{BASE_URL}/auth/register", json={
        "email": new_email,
        "password": "SecurePass!2026",
        "name": "Giulia Rossi"
    }, timeout=30)
    ok = r.status_code == 200
    new_user_data = r.json() if ok else {}
    new_user_id = (new_user_data.get("user") or {}).get("user_id")
    results.append(_print(ok, f"POST /auth/register {new_email} -> 200",
                          f"status={r.status_code} user_id={new_user_id}"))

    # GET /auth/me with admin token
    headers = {"Authorization": f"Bearer {admin_token}"} if admin_token else {}
    r = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=30)
    me_body = r.json() if r.status_code == 200 else {}
    ok = r.status_code == 200 and me_body.get("role") == "admin"
    results.append(_print(ok, "GET /auth/me admin -> 200 role=admin",
                          f"status={r.status_code} role={me_body.get('role')}"))

    # GET /admin/users
    r = requests.get(f"{BASE_URL}/admin/users", headers=headers, timeout=30)
    ok = r.status_code == 200 and isinstance(r.json(), list)
    results.append(_print(ok, "GET /admin/users admin -> 200",
                          f"status={r.status_code} count={len(r.json()) if ok else 'n/a'}"))

    # GET /plans (requires auth — use admin token)
    r = requests.get(f"{BASE_URL}/plans", headers=headers, timeout=30)
    ok = r.status_code == 200
    plans_payload = r.json() if ok else {}
    # The endpoint returns {predefined: [...], custom: [...], user_tier:...}
    pre_count = len(plans_payload.get("predefined", [])) if isinstance(plans_payload, dict) else 0
    ok = ok and pre_count > 0
    results.append(_print(ok, "GET /plans -> 200 with plans list",
                          f"status={r.status_code} predefined_count={pre_count}"))

    # GET /social/feed with admin token -> 200
    r = requests.get(f"{BASE_URL}/social/feed", headers=headers, timeout=30)
    ok = r.status_code == 200
    results.append(_print(ok, "GET /social/feed admin -> 200", f"status={r.status_code}"))

    # GET /social/leaderboard?period=weekly&metric=km
    r = requests.get(f"{BASE_URL}/social/leaderboard?period=weekly&metric=km", headers=headers, timeout=30)
    ok = r.status_code == 200
    results.append(_print(ok, "GET /social/leaderboard?period=weekly&metric=km admin -> 200",
                          f"status={r.status_code}"))

    # Cleanup: delete the test user we registered
    if new_user_id and admin_token:
        r = requests.delete(f"{BASE_URL}/admin/users/{new_user_id}", headers=headers, timeout=30)
        _print(r.status_code == 200, f"Cleanup delete {new_email}", f"status={r.status_code}")

    total = len(results)
    passed = sum(1 for x in results if x)
    print(f"\nRESULT: {passed}/{total} checks passed")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
