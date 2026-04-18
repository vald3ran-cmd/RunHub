"""
Backend tests for RunHub Admin Panel endpoints.
Tests the /api/admin/users GET and DELETE endpoints plus auth regression.
"""
import os
import sys
import time
import json
import requests

BASE_URL = "https://run-training-hub-1.preview.emergentagent.com/api"

ADMIN_EMAIL = "admin@runhub.com"
ADMIN_PASSWORD = "admin123"

# Use a unique timestamp for generated test users
TS = int(time.time())

results = []

def log(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    results.append((name, ok, detail))
    print(f"[{status}] {name}  {detail}")

def login(email, password):
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password}, timeout=30)
    return r

def register(email, password, name):
    r = requests.post(f"{BASE_URL}/auth/register", json={"email": email, "password": password, "name": name}, timeout=30)
    return r


def main():
    # ---- 1. Login as admin ----
    r = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if r.status_code != 200:
        log("1. Admin login", False, f"status={r.status_code} body={r.text[:200]}")
        print("\nCannot continue without admin login. Aborting.")
        sys.exit(1)
    data = r.json()
    admin_token = data.get("token")
    admin_user = data.get("user", {})
    ok1 = bool(admin_token) and admin_user.get("role") == "admin"
    log("1. Admin login - 200 + token + role=admin", ok1,
        f"role={admin_user.get('role')}, tier={admin_user.get('tier')}, token_present={bool(admin_token)}")

    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # ---- 2. GET /api/auth/me ----
    r = requests.get(f"{BASE_URL}/auth/me", headers=admin_headers, timeout=30)
    me = r.json() if r.status_code == 200 else {}
    ok2 = r.status_code == 200 and me.get("role") == "admin"
    log("2. GET /auth/me has role=admin", ok2, f"status={r.status_code} role={me.get('role')}")

    # ---- 3. GET /api/admin/users ----
    r = requests.get(f"{BASE_URL}/admin/users", headers=admin_headers, timeout=30)
    ok3 = r.status_code == 200
    admin_list = []
    issue3 = ""
    if ok3:
        admin_list = r.json()
        if not isinstance(admin_list, list):
            ok3 = False
            issue3 = "response not a list"
        else:
            required_fields = ["user_id", "email", "name", "workout_count"]
            missing_tier_users = []
            for u in admin_list:
                for f in required_fields:
                    if f not in u:
                        ok3 = False
                        issue3 = f"user {u.get('email')} missing field '{f}'"
                        break
                if "tier" not in u:
                    missing_tier_users.append(u.get("email"))
                if "password_hash" in u:
                    ok3 = False
                    issue3 = "password_hash exposed!"
                    break
                if not ok3:
                    break
            if missing_tier_users and ok3:
                # Minor: legacy users missing tier — log but don't fail
                issue3 = f"Minor: {len(missing_tier_users)} user(s) missing 'tier' field: {missing_tier_users}"
    else:
        issue3 = f"status={r.status_code} body={r.text[:200]}"
    log("3. GET /admin/users - 200, list, required fields, no password_hash", ok3,
        f"count={len(admin_list)} {issue3}")

    # ---- 4. GET /api/admin/users without auth ----
    r = requests.get(f"{BASE_URL}/admin/users", timeout=30)
    # No cookies either — requests won't send cookies unless set. But since backend also checks cookie.
    ok4 = r.status_code == 401
    log("4. GET /admin/users without auth - 401", ok4, f"status={r.status_code} body={r.text[:120]}")

    # ---- Register a normal user for non-admin tests ----
    normal_email = f"marco.rossi.{TS}@example.com"
    normal_password = "Prova1234!"
    r = register(normal_email, normal_password, "Marco Rossi")
    if r.status_code != 200:
        # maybe already exists; try login
        r2 = login(normal_email, normal_password)
        if r2.status_code != 200:
            log("Register normal user", False, f"register={r.status_code} login={r2.status_code}")
            sys.exit(1)
        normal_token = r2.json().get("token")
    else:
        normal_token = r.json().get("token")
    normal_headers = {"Authorization": f"Bearer {normal_token}"}

    # ---- 5. GET /api/admin/users with non-admin token -> 403 ----
    r = requests.get(f"{BASE_URL}/admin/users", headers=normal_headers, timeout=30)
    ok5 = r.status_code == 403 and "admin" in r.text.lower()
    log("5. GET /admin/users as non-admin - 403", ok5, f"status={r.status_code} body={r.text[:200]}")

    # ---- 6. DELETE admin itself ----
    # Find admin user_id from list
    admin_uid = None
    for u in admin_list:
        if u.get("email") == ADMIN_EMAIL:
            admin_uid = u.get("user_id")
            break
    if not admin_uid:
        admin_uid = admin_user.get("user_id")

    r = requests.delete(f"{BASE_URL}/admin/users/{admin_uid}", headers=admin_headers, timeout=30)
    ok6 = r.status_code == 400 and "admin" in r.text.lower()
    log("6. DELETE admin self - 400 'Impossibile eliminare un admin'", ok6,
        f"status={r.status_code} body={r.text[:200]}")

    # ---- 7. Register deletable user, then DELETE ----
    del_email = f"delete_me_{TS}@test.com"
    del_password = "DelMe1234!"
    r = register(del_email, del_password, "Da Eliminare")
    if r.status_code != 200:
        log("7a. Register deletable user", False, f"status={r.status_code} body={r.text[:200]}")
    else:
        # get user_id via admin list
        r2 = requests.get(f"{BASE_URL}/admin/users", headers=admin_headers, timeout=30)
        del_uid = None
        if r2.status_code == 200:
            for u in r2.json():
                if u.get("email") == del_email:
                    del_uid = u.get("user_id")
                    break
        if not del_uid:
            log("7. DELETE test user - cascade", False, f"Could not find {del_email} in admin list")
        else:
            r3 = requests.delete(f"{BASE_URL}/admin/users/{del_uid}", headers=admin_headers, timeout=30)
            ok7a = r3.status_code == 200
            body7 = r3.json() if ok7a else {}
            ok7a = ok7a and body7.get("ok") is True and body7.get("deleted_user_id") == del_uid and body7.get("email") == del_email
            log("7a. DELETE test user - 200 + correct payload", ok7a,
                f"status={r3.status_code} body={body7}")

            # Verify no longer in list
            r4 = requests.get(f"{BASE_URL}/admin/users", headers=admin_headers, timeout=30)
            still_present = any(u.get("user_id") == del_uid for u in r4.json()) if r4.status_code == 200 else True
            log("7b. Deleted user no longer in /admin/users", not still_present,
                f"still_present={still_present}")

    # ---- 8. DELETE nonexistent ----
    r = requests.delete(f"{BASE_URL}/admin/users/user_doesnotexist_xyz123", headers=admin_headers, timeout=30)
    ok8 = r.status_code == 404 and "trovato" in r.text.lower()
    log("8. DELETE nonexistent - 404 'Utente non trovato'", ok8,
        f"status={r.status_code} body={r.text[:200]}")

    # ---- 9. DELETE with non-admin token ----
    r = requests.delete(f"{BASE_URL}/admin/users/{admin_uid}", headers=normal_headers, timeout=30)
    ok9 = r.status_code == 403
    log("9. DELETE as non-admin - 403", ok9, f"status={r.status_code} body={r.text[:200]}")

    # ---- Regression: POST /api/auth/register works (already used above) ----
    reg_email = f"sanity_{TS}@example.com"
    r = register(reg_email, "Sanity1234!", "Sanity Check")
    okR1 = r.status_code == 200 and bool(r.json().get("token"))
    log("R1. POST /auth/register works", okR1, f"status={r.status_code}")

    # ---- Regression: GET /api/plans with admin token ----
    r = requests.get(f"{BASE_URL}/plans", headers=admin_headers, timeout=30)
    okR2 = r.status_code == 200
    plans_data = r.json() if okR2 else {}
    okR2 = okR2 and isinstance(plans_data.get("predefined"), list) and len(plans_data["predefined"]) > 0
    log("R2. GET /plans with admin token returns list", okR2,
        f"status={r.status_code} predefined_count={len(plans_data.get('predefined', []))}")

    # ---- Summary ----
    print("\n" + "=" * 70)
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    print(f"SUMMARY: {passed}/{total} passed")
    for name, ok, detail in results:
        mark = "OK" if ok else "FAIL"
        print(f"  [{mark}] {name}")

    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
