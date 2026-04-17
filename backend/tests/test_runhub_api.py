"""
RunHub API Backend Tests
Tests: Auth, Plans, Workouts, Stats, Stripe
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://run-training-hub-1.preview.emergentagent.com').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@runhub.com"
ADMIN_PASSWORD = "admin123"
TEST_EMAIL = f"test_{int(time.time())}@runhub.com"
TEST_PASSWORD = "test123"
TEST_NAME = "Test Runner"

@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="session")
def admin_token(api_client):
    """Login as admin and return token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data
    assert "user" in data
    assert data["user"]["is_premium"] is True
    return data["token"]

@pytest.fixture(scope="session")
def test_user_token(api_client):
    """Register test user and return token"""
    response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    assert response.status_code == 200, f"Registration failed: {response.text}"
    data = response.json()
    assert "token" in data
    return data["token"]

# ============ Auth Tests ============
class TestAuth:
    """Authentication endpoint tests"""

    def test_health_check(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"

    def test_register_success(self, api_client):
        """Test user registration"""
        email = f"newuser_{int(time.time())}@runhub.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "newpass123",
            "name": "New User"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == email.lower()
        assert data["user"]["is_premium"] is False

    def test_register_duplicate_email(self, api_client):
        """Test duplicate email registration fails"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_EMAIL,
            "password": "anypass",
            "name": "Duplicate"
        })
        assert response.status_code == 400

    def test_login_success(self, api_client):
        """Test admin login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL.lower()
        assert data["user"]["is_premium"] is True

    def test_login_wrong_password(self, api_client):
        """Test login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401

    def test_auth_me_with_token(self, api_client, admin_token):
        """Test GET /auth/me with valid token"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL.lower()
        assert data["is_premium"] is True

    def test_auth_me_without_token(self, api_client):
        """Test GET /auth/me without token"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401

# ============ Plans Tests ============
class TestPlans:
    """Training plans endpoint tests"""

    def test_list_plans(self, api_client, admin_token):
        """Test GET /plans returns predefined and custom plans"""
        response = api_client.get(
            f"{BASE_URL}/api/plans",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "predefined" in data
        assert "custom" in data
        assert len(data["predefined"]) == 3
        
        # Verify predefined plan IDs
        plan_ids = [p["plan_id"] for p in data["predefined"]]
        assert "pl_beginner_5k" in plan_ids
        assert "pl_intermediate_10k" in plan_ids
        assert "pl_expert_half" in plan_ids

    def test_get_plan_beginner_5k(self, api_client, admin_token):
        """Test GET /plans/{plan_id} for beginner plan"""
        response = api_client.get(
            f"{BASE_URL}/api/plans/pl_beginner_5k",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["plan_id"] == "pl_beginner_5k"
        assert data["level"] == "beginner"
        assert data["duration_weeks"] == 4
        assert data["workouts_per_week"] == 3
        assert len(data["workouts"]) == 4
        
        # Verify step types
        workout = data["workouts"][0]
        assert "steps" in workout
        step_types = [s["type"] for s in workout["steps"]]
        assert "warmup" in step_types
        assert "run" in step_types
        assert "walk" in step_types
        assert "stretching" in step_types

    def test_get_plan_intermediate_10k(self, api_client, admin_token):
        """Test intermediate plan has sprint and recovery steps"""
        response = api_client.get(
            f"{BASE_URL}/api/plans/pl_intermediate_10k",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["level"] == "intermediate"
        
        # Check for sprint and recovery in workouts
        all_step_types = []
        for w in data["workouts"]:
            all_step_types.extend([s["type"] for s in w["steps"]])
        assert "sprint" in all_step_types
        assert "recovery" in all_step_types
        assert "gymnastics" in all_step_types

    def test_get_plan_expert_half(self, api_client, admin_token):
        """Test expert plan structure"""
        response = api_client.get(
            f"{BASE_URL}/api/plans/pl_expert_half",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["level"] == "expert"
        assert data["duration_weeks"] == 8
        assert data["workouts_per_week"] == 5

    def test_get_plan_not_found(self, api_client, admin_token):
        """Test GET /plans/{plan_id} with invalid ID"""
        response = api_client.get(
            f"{BASE_URL}/api/plans/invalid_plan_id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404

    def test_ai_generate_plan_premium_user(self, api_client, admin_token):
        """Test AI plan generation for premium user (admin)"""
        response = api_client.post(
            f"{BASE_URL}/api/plans/ai-generate",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "level": "intermediate",
                "goal": "Correre 10K in meno di 50 minuti",
                "days_per_week": 3,
                "duration_weeks": 4,
                "available_minutes": 45,
                "notes": "Preferisco correre la mattina"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "plan_id" in data
        assert data["is_ai_generated"] is True
        assert data["is_premium"] is True
        assert "workouts" in data
        assert len(data["workouts"]) >= 6  # AI should generate at least 6 workouts
        
        # Verify workout structure
        workout = data["workouts"][0]
        assert "workout_id" in workout
        assert "title" in workout
        assert "steps" in workout
        assert len(workout["steps"]) > 0

    def test_ai_generate_plan_non_premium_user(self, api_client, test_user_token):
        """Test AI plan generation fails for non-premium user"""
        response = api_client.post(
            f"{BASE_URL}/api/plans/ai-generate",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={
                "level": "beginner",
                "goal": "Run 5K",
                "days_per_week": 3,
                "duration_weeks": 4,
                "available_minutes": 30
            }
        )
        assert response.status_code == 403

# ============ Workouts Tests ============
class TestWorkouts:
    """Workout sessions endpoint tests"""

    def test_complete_workout_and_verify(self, api_client, admin_token):
        """Test POST /workouts/complete and verify with GET"""
        # Create workout session
        response = api_client.post(
            f"{BASE_URL}/api/workouts/complete",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "workout_id": "wk_b1",
                "plan_id": "pl_beginner_5k",
                "title": "Test Run",
                "duration_seconds": 1800,
                "distance_km": 5.2,
                "avg_pace_min_per_km": 5.8,
                "calories": 350,
                "locations": [
                    {"lat": 45.4642, "lng": 9.1900, "timestamp": 1704067200000},
                    {"lat": 45.4643, "lng": 9.1901, "timestamp": 1704067260000}
                ]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["distance_km"] == 5.2
        session_id = data["session_id"]
        
        # Verify session was persisted
        get_response = api_client.get(
            f"{BASE_URL}/api/workouts/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        session_data = get_response.json()
        assert session_data["session_id"] == session_id
        assert session_data["distance_km"] == 5.2
        assert len(session_data["locations"]) == 2

    def test_workouts_history(self, api_client, admin_token):
        """Test GET /workouts/history"""
        response = api_client.get(
            f"{BASE_URL}/api/workouts/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the workout we just created
        assert len(data) > 0

    def test_workout_detail_not_found(self, api_client, admin_token):
        """Test GET /workouts/{session_id} with invalid ID"""
        response = api_client.get(
            f"{BASE_URL}/api/workouts/invalid_session_id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404

# ============ Stats Tests ============
class TestStats:
    """Stats and goals endpoint tests"""

    def test_stats_progress(self, api_client, admin_token):
        """Test GET /stats/progress"""
        response = api_client.get(
            f"{BASE_URL}/api/stats/progress",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "daily" in data
        assert "weekly" in data
        assert "monthly" in data
        assert "goals" in data
        
        # Verify structure
        assert "distance_km" in data["daily"]
        assert "duration_seconds" in data["daily"]
        assert "count" in data["daily"]
        
        # Verify goals
        assert "daily_km" in data["goals"]
        assert "weekly_km" in data["goals"]
        assert "monthly_km" in data["goals"]

    def test_update_goals_and_verify(self, api_client, admin_token):
        """Test PUT /stats/goals and verify with GET"""
        # Update goals
        response = api_client.put(
            f"{BASE_URL}/api/stats/goals",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "daily_km": 5.0,
                "weekly_km": 25.0,
                "monthly_km": 100.0
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["daily_km"] == 5.0
        assert data["weekly_km"] == 25.0
        assert data["monthly_km"] == 100.0
        
        # Verify goals were persisted
        get_response = api_client.get(
            f"{BASE_URL}/api/stats/progress",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        progress_data = get_response.json()
        assert progress_data["goals"]["daily_km"] == 5.0
        assert progress_data["goals"]["weekly_km"] == 25.0
        assert progress_data["goals"]["monthly_km"] == 100.0

# ============ Stripe Tests ============
class TestStripe:
    """Stripe payment endpoint tests"""

    def test_stripe_packages(self, api_client):
        """Test GET /stripe/packages"""
        response = api_client.get(f"{BASE_URL}/api/stripe/packages")
        assert response.status_code == 200
        data = response.json()
        assert "monthly" in data
        assert "yearly" in data
        
        # Verify package structure
        assert data["monthly"]["amount"] == 9.99
        assert data["monthly"]["currency"] == "eur"
        assert data["yearly"]["amount"] == 79.99
        assert data["yearly"]["currency"] == "eur"

    def test_stripe_checkout_creates_session(self, api_client, admin_token):
        """Test POST /stripe/checkout creates session and transaction"""
        response = api_client.post(
            f"{BASE_URL}/api/stripe/checkout",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "package_id": "monthly",
                "origin_url": "https://run-training-hub-1.preview.emergentagent.com"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "session_id" in data
        assert data["url"].startswith("https://")

    def test_stripe_checkout_invalid_package(self, api_client, admin_token):
        """Test POST /stripe/checkout with invalid package"""
        response = api_client.post(
            f"{BASE_URL}/api/stripe/checkout",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "package_id": "invalid_package",
                "origin_url": "https://example.com"
            }
        )
        assert response.status_code == 400
