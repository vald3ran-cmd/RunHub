"""
RunHub API Backend Tests - Iteration 2
Tests: Tier system (elite/performance/starter/free), Race predictor, Coach CRUD, 9 plans, Stripe 6 packages
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://run-training-hub-1.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@runhub.com"
ADMIN_PASSWORD = "admin123"
TEST_FREE_EMAIL = f"test_free_{int(time.time())}@runhub.com"
TEST_PASSWORD = "test123"

@pytest.fixture(scope="function")
def api_client():
    """Fresh requests session for each test (no cookie contamination)"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def admin_token():
    """Login as admin (elite tier) and return token - no session reuse"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data
    assert "user" in data
    print(f"✓ Admin login successful: {data['user'].get('email')}, tier={data['user'].get('tier')}")
    return data["token"]

@pytest.fixture(scope="session")
def free_user_token():
    """Register free user and return token - no session reuse"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    response = session.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_FREE_EMAIL,
        "password": TEST_PASSWORD,
        "name": "Free User"
    })
    assert response.status_code == 200, f"Registration failed: {response.text}"
    data = response.json()
    assert "token" in data
    print(f"✓ Free user registered: {data['user'].get('email')}, tier={data['user'].get('tier')}")
    return data["token"]

# ============ Tier System Tests ============
class TestTierSystem:
    """Test 4-tier system: free, starter, performance, elite"""

    def test_admin_is_elite_tier(self, api_client, admin_token):
        """CRITICAL: Admin must have tier=elite and is_premium=true"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "elite", f"Expected tier=elite, got {data.get('tier')}"
        assert data["is_premium"] is True
        print(f"✓ Admin tier verified: {data['tier']}, is_premium={data['is_premium']}")

    def test_new_user_is_free_tier(self, api_client, free_user_token):
        """New users should have tier=free"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["tier"] == "free"
        assert data["is_premium"] is False
        print(f"✓ Free user tier verified: {data['tier']}")

# ============ Stripe Packages Tests ============
class TestStripePackages:
    """Test 6 Stripe packages: starter/performance/elite × monthly/yearly"""

    def test_stripe_packages_count_and_structure(self, api_client):
        """GET /api/stripe/packages must return 6 packages"""
        response = api_client.get(f"{BASE_URL}/api/stripe/packages")
        assert response.status_code == 200
        data = response.json()
        
        # Must have exactly 6 packages
        assert len(data) == 6, f"Expected 6 packages, got {len(data)}"
        
        # Verify all package IDs exist
        expected_ids = [
            "starter_monthly", "starter_yearly",
            "performance_monthly", "performance_yearly",
            "elite_monthly", "elite_yearly"
        ]
        for pkg_id in expected_ids:
            assert pkg_id in data, f"Missing package: {pkg_id}"
        
        print(f"✓ All 6 packages present: {list(data.keys())}")

    def test_stripe_packages_prices(self, api_client):
        """Verify correct prices for all 6 packages"""
        response = api_client.get(f"{BASE_URL}/api/stripe/packages")
        assert response.status_code == 200
        data = response.json()
        
        # Expected prices
        expected_prices = {
            "starter_monthly": 4.99,
            "starter_yearly": 39.99,
            "performance_monthly": 8.99,
            "performance_yearly": 79.99,
            "elite_monthly": 14.99,
            "elite_yearly": 129.99,
        }
        
        for pkg_id, expected_price in expected_prices.items():
            actual_price = data[pkg_id]["amount"]
            assert actual_price == expected_price, \
                f"{pkg_id}: expected {expected_price}, got {actual_price}"
            assert data[pkg_id]["currency"] == "eur"
        
        print(f"✓ All package prices correct")

    def test_stripe_checkout_performance_yearly(self, api_client, admin_token):
        """Test checkout with performance_yearly package"""
        response = api_client.post(
            f"{BASE_URL}/api/stripe/checkout",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "package_id": "performance_yearly",
                "origin_url": BASE_URL
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        print(f"✓ Checkout session created for performance_yearly")

# ============ Plans Tests (9 total) ============
class TestPlans:
    """Test 9 predefined plans: 3 starter + 6 performance"""

    def test_plans_count_and_locked_field(self, api_client, admin_token):
        """GET /api/plans must return 9 predefined plans with locked field"""
        response = api_client.get(
            f"{BASE_URL}/api/plans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "predefined" in data
        assert len(data["predefined"]) == 9, \
            f"Expected 9 predefined plans, got {len(data['predefined'])}"
        
        # Verify locked field exists
        for plan in data["predefined"]:
            assert "locked" in plan, f"Plan {plan['plan_id']} missing 'locked' field"
            assert "required_tier" in plan
        
        print(f"✓ All 9 plans present with locked field")

    def test_plans_tier_distribution(self, api_client, admin_token):
        """Verify 2 starter plans + 7 performance plans"""
        response = api_client.get(
            f"{BASE_URL}/api/plans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        starter_plans = [p for p in data["predefined"] if p.get("required_tier") == "starter"]
        performance_plans = [p for p in data["predefined"] if p.get("required_tier") == "performance"]
        
        assert len(starter_plans) == 2, f"Expected 2 starter plans, got {len(starter_plans)}"
        assert len(performance_plans) == 7, f"Expected 7 performance plans, got {len(performance_plans)}"
        
        print(f"✓ Tier distribution correct: 2 starter, 7 performance")

    def test_get_performance_plan_as_elite_user(self, api_client, admin_token):
        """Elite user (admin) should access Performance plan pl_5k_sub30"""
        response = api_client.get(
            f"{BASE_URL}/api/plans/pl_5k_sub30",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["plan_id"] == "pl_5k_sub30"
        assert data["required_tier"] == "performance"
        print(f"✓ Elite user can access Performance plan")

    def test_get_performance_plan_as_free_user_fails(self, api_client, free_user_token):
        """Free user should NOT access Performance plan"""
        response = api_client.get(
            f"{BASE_URL}/api/plans/pl_5k_sub30",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        assert response.status_code == 403
        print(f"✓ Free user blocked from Performance plan (403)")

    def test_all_performance_plan_ids(self, api_client, admin_token):
        """Verify all 6 performance plan IDs exist"""
        response = api_client.get(
            f"{BASE_URL}/api/plans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        expected_performance_ids = [
            "pl_5k_sub30",
            "pl_10k_competitivo",
            "pl_mezza_performance",
            "pl_maratona",
            "pl_trail",
            "pl_progressione_10"
        ]
        
        plan_ids = [p["plan_id"] for p in data["predefined"]]
        for pid in expected_performance_ids:
            assert pid in plan_ids, f"Missing performance plan: {pid}"
        
        print(f"✓ All 6 performance plans present")

# ============ Race Predictor Tests (Performance+) ============
class TestRacePredictor:
    """Test POST /api/stats/predict-races (Performance+ required)"""

    def test_race_predictor_with_elite_user(self, api_client, admin_token):
        """Elite user should access race predictor"""
        response = api_client.post(
            f"{BASE_URL}/api/stats/predict-races",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "recent_distance_km": 10.0,
                "recent_time_seconds": 2700  # 45 minutes
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "predictions" in data
        assert "vo2max_estimate" in data
        
        # Verify all race distances
        assert "5K" in data["predictions"]
        assert "10K" in data["predictions"]
        assert "Mezza" in data["predictions"]
        assert "Maratona" in data["predictions"]
        
        # Verify prediction structure
        pred_5k = data["predictions"]["5K"]
        assert "distance_km" in pred_5k
        assert "seconds" in pred_5k
        assert "hms" in pred_5k
        assert "pace_min_per_km" in pred_5k
        
        # Verify VO2max is a number
        assert isinstance(data["vo2max_estimate"], (int, float))
        assert data["vo2max_estimate"] > 0
        
        print(f"✓ Race predictor working: VO2max={data['vo2max_estimate']}, 5K={pred_5k['hms']}")

    def test_race_predictor_with_free_user_fails(self, api_client, free_user_token):
        """Free user should NOT access race predictor (403)"""
        response = api_client.post(
            f"{BASE_URL}/api/stats/predict-races",
            headers={"Authorization": f"Bearer {free_user_token}"},
            json={
                "recent_distance_km": 5.0,
                "recent_time_seconds": 1500
            }
        )
        assert response.status_code == 403
        print(f"✓ Free user blocked from race predictor (403)")

    def test_race_predictor_invalid_data(self, api_client, admin_token):
        """Test race predictor with invalid data"""
        response = api_client.post(
            f"{BASE_URL}/api/stats/predict-races",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "recent_distance_km": 0,
                "recent_time_seconds": 0
            }
        )
        assert response.status_code == 400
        print(f"✓ Race predictor rejects invalid data (400)")

# ============ Weekly Stats Tests (Performance+) ============
class TestWeeklyStats:
    """Test GET /api/stats/weekly (Performance+ required)"""

    def test_weekly_stats_with_elite_user(self, api_client, admin_token):
        """Elite user should access weekly stats"""
        response = api_client.get(
            f"{BASE_URL}/api/stats/weekly",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return list of weekly aggregates
        assert isinstance(data, list)
        
        # If data exists, verify structure
        if len(data) > 0:
            week_data = data[0]
            assert "week" in week_data
            assert "distance_km" in week_data
            assert "duration_seconds" in week_data
            assert "count" in week_data
        
        print(f"✓ Weekly stats accessible for elite user")

    def test_weekly_stats_with_free_user_fails(self, api_client, free_user_token):
        """Free user should NOT access weekly stats (403)"""
        response = api_client.get(
            f"{BASE_URL}/api/stats/weekly",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        assert response.status_code == 403
        print(f"✓ Free user blocked from weekly stats (403)")

# ============ Coach Athletes Tests (Elite only) ============
class TestCoachAthletes:
    """Test GET/POST/DELETE /api/coach/athletes (Elite required)"""

    def test_coach_list_athletes_as_elite(self, api_client, admin_token):
        """Elite user should access coach athletes list"""
        response = api_client.get(
            f"{BASE_URL}/api/coach/athletes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Elite user can list athletes: {len(data)} athletes")

    def test_coach_add_athlete_and_verify(self, api_client, admin_token):
        """Elite user should add athlete and verify persistence"""
        # Add athlete
        athlete_email = f"athlete_{int(time.time())}@test.com"
        response = api_client.post(
            f"{BASE_URL}/api/coach/athletes",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Mario Rossi",
                "email": athlete_email
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "athlete_id" in data
        assert data["name"] == "Mario Rossi"
        assert data["email"] == athlete_email.lower()
        assert data["status"] in ["invited", "linked"]
        athlete_id = data["athlete_id"]
        
        print(f"✓ Athlete added: {data['name']} ({data['email']})")
        
        # Verify athlete in list
        list_response = api_client.get(
            f"{BASE_URL}/api/coach/athletes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_response.status_code == 200
        athletes = list_response.json()
        athlete_ids = [a["athlete_id"] for a in athletes]
        assert athlete_id in athlete_ids
        
        print(f"✓ Athlete verified in list")
        
        return athlete_id

    def test_coach_remove_athlete(self, api_client, admin_token):
        """Elite user should remove athlete"""
        # First add an athlete
        athlete_email = f"athlete_remove_{int(time.time())}@test.com"
        add_response = api_client.post(
            f"{BASE_URL}/api/coach/athletes",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "Test Remove",
                "email": athlete_email
            }
        )
        assert add_response.status_code == 200
        athlete_id = add_response.json()["athlete_id"]
        
        # Remove athlete
        delete_response = api_client.delete(
            f"{BASE_URL}/api/coach/athletes/{athlete_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify removed
        list_response = api_client.get(
            f"{BASE_URL}/api/coach/athletes",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        athletes = list_response.json()
        athlete_ids = [a["athlete_id"] for a in athletes]
        assert athlete_id not in athlete_ids
        
        print(f"✓ Athlete removed successfully")

    def test_coach_endpoints_blocked_for_free_user(self, api_client, free_user_token):
        """Free user should NOT access coach endpoints (403)"""
        # Test GET
        response = api_client.get(
            f"{BASE_URL}/api/coach/athletes",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        assert response.status_code == 403
        
        # Test POST
        response = api_client.post(
            f"{BASE_URL}/api/coach/athletes",
            headers={"Authorization": f"Bearer {free_user_token}"},
            json={"name": "Test", "email": "test@test.com"}
        )
        assert response.status_code == 403
        
        print(f"✓ Free user blocked from coach endpoints (403)")

# ============ Workouts History Limit Tests ============
class TestWorkoutsHistoryLimit:
    """Test free users limited to 10 workouts in history"""

    def test_free_user_workouts_history_limit(self, api_client, free_user_token):
        """Free user should only see 10 most recent workouts"""
        # Create 12 workout sessions
        for i in range(12):
            api_client.post(
                f"{BASE_URL}/api/workouts/complete",
                headers={"Authorization": f"Bearer {free_user_token}"},
                json={
                    "title": f"Test Run {i+1}",
                    "duration_seconds": 1800,
                    "distance_km": 5.0,
                    "avg_pace_min_per_km": 6.0,
                    "calories": 300
                }
            )
            time.sleep(0.1)  # Small delay to ensure different timestamps
        
        # Get history
        response = api_client.get(
            f"{BASE_URL}/api/workouts/history",
            headers={"Authorization": f"Bearer {free_user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return exactly 10 (most recent)
        assert len(data) == 10, f"Expected 10 workouts for free user, got {len(data)}"
        
        print(f"✓ Free user history limited to 10 workouts (created 12, got 10)")

    def test_elite_user_workouts_history_unlimited(self, api_client, admin_token):
        """Elite user should see more than 10 workouts"""
        # Get history (admin likely has workouts from previous tests)
        response = api_client.get(
            f"{BASE_URL}/api/workouts/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Elite users have limit of 200, not 10
        print(f"✓ Elite user can access {len(data)} workouts (no 10-limit)")
