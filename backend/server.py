from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import asyncio
import json
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest
)

# ----------------- Setup -----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
STRIPE_API_KEY = os.environ['STRIPE_API_KEY']

app = FastAPI(title="RunHub API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ----------------- Helpers -----------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"user_id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ----------------- Models -----------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    level: str = "beginner"
    is_premium: bool = False
    created_at: datetime

class WorkoutStep(BaseModel):
    type: str  # warmup, run, recovery, sprint, walk, stretching, gymnastics
    duration_seconds: int
    description: str
    target_pace: Optional[str] = None  # e.g., "6:00/km"

class Workout(BaseModel):
    workout_id: str = Field(default_factory=lambda: f"wk_{uuid.uuid4().hex[:10]}")
    title: str
    day: int  # day number in plan (1-based)
    estimated_duration_min: int
    estimated_distance_km: float
    steps: List[WorkoutStep]

class TrainingPlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: f"pl_{uuid.uuid4().hex[:10]}")
    title: str
    description: str
    level: str  # beginner, intermediate, expert
    duration_weeks: int
    workouts_per_week: int
    is_premium: bool = False
    is_ai_generated: bool = False
    created_by: Optional[str] = None  # user_id for AI plans
    workouts: List[Workout]
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIGenerateRequest(BaseModel):
    level: str  # beginner, intermediate, expert
    goal: str  # e.g., "Run 5K without stopping"
    days_per_week: int = 3
    duration_weeks: int = 4
    available_minutes: int = 45
    notes: Optional[str] = None

class SessionLocation(BaseModel):
    lat: float
    lng: float
    timestamp: float  # unix ms

class CompleteWorkoutRequest(BaseModel):
    workout_id: Optional[str] = None
    plan_id: Optional[str] = None
    title: str = "Free Run"
    duration_seconds: int
    distance_km: float
    avg_pace_min_per_km: Optional[float] = None
    calories: Optional[float] = None
    locations: List[SessionLocation] = []

class CheckoutRequest(BaseModel):
    package_id: str  # "monthly" or "yearly"
    origin_url: str

# ----------------- Auth routes -----------------
@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email gia' registrata")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "password_hash": hash_password(data.password),
        "level": "beginner",
        "is_premium": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, data.email.lower())
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=604800, path="/")
    return {"token": token, "user": {k: v for k, v in doc.items() if k not in ("_id", "password_hash")}}

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o password errate")
    token = create_access_token(user["user_id"], user["email"])
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=604800, path="/")
    user.pop("_id", None); user.pop("password_hash", None)
    return {"token": token, "user": user}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user

# ----------------- Plans -----------------
PREDEFINED_PLANS = [
    {
        "plan_id": "pl_beginner_5k",
        "title": "Principiante — Corri 5K",
        "description": "Da zero al tuo primo 5K in 4 settimane. Alternanza corsa/camminata con riscaldamento e stretching.",
        "level": "beginner",
        "duration_weeks": 4,
        "workouts_per_week": 3,
        "is_premium": False,
        "is_ai_generated": False,
        "image_url": "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800",
        "workouts": [
            {"workout_id": "wk_b1", "title": "Settimana 1 — Avvio", "day": 1, "estimated_duration_min": 30, "estimated_distance_km": 2.5, "steps": [
                {"type": "warmup", "duration_seconds": 300, "description": "Camminata veloce", "target_pace": None},
                {"type": "run", "duration_seconds": 60, "description": "Corsa leggera", "target_pace": "7:30/km"},
                {"type": "walk", "duration_seconds": 90, "description": "Recupero camminando", "target_pace": None},
                {"type": "run", "duration_seconds": 60, "description": "Corsa leggera", "target_pace": "7:30/km"},
                {"type": "walk", "duration_seconds": 90, "description": "Recupero camminando", "target_pace": None},
                {"type": "run", "duration_seconds": 60, "description": "Corsa leggera", "target_pace": "7:30/km"},
                {"type": "walk", "duration_seconds": 90, "description": "Recupero camminando", "target_pace": None},
                {"type": "stretching", "duration_seconds": 300, "description": "Stretching arti inferiori", "target_pace": None},
            ]},
            {"workout_id": "wk_b2", "title": "Settimana 2 — Resistenza", "day": 2, "estimated_duration_min": 35, "estimated_distance_km": 3.0, "steps": [
                {"type": "warmup", "duration_seconds": 300, "description": "Camminata veloce", "target_pace": None},
                {"type": "run", "duration_seconds": 120, "description": "Corsa continua", "target_pace": "7:00/km"},
                {"type": "walk", "duration_seconds": 60, "description": "Recupero", "target_pace": None},
                {"type": "run", "duration_seconds": 120, "description": "Corsa continua", "target_pace": "7:00/km"},
                {"type": "walk", "duration_seconds": 60, "description": "Recupero", "target_pace": None},
                {"type": "run", "duration_seconds": 120, "description": "Corsa continua", "target_pace": "7:00/km"},
                {"type": "stretching", "duration_seconds": 300, "description": "Stretching gambe e schiena", "target_pace": None},
            ]},
            {"workout_id": "wk_b3", "title": "Settimana 3 — Consolidamento", "day": 3, "estimated_duration_min": 40, "estimated_distance_km": 4.0, "steps": [
                {"type": "warmup", "duration_seconds": 300, "description": "Camminata + mobilita'", "target_pace": None},
                {"type": "gymnastics", "duration_seconds": 300, "description": "Ginnastica da camera: squat 2x10, affondi 2x10", "target_pace": None},
                {"type": "run", "duration_seconds": 600, "description": "Corsa continua facile", "target_pace": "6:45/km"},
                {"type": "walk", "duration_seconds": 60, "description": "Recupero attivo", "target_pace": None},
                {"type": "run", "duration_seconds": 600, "description": "Corsa continua facile", "target_pace": "6:45/km"},
                {"type": "stretching", "duration_seconds": 300, "description": "Stretching completo", "target_pace": None},
            ]},
            {"workout_id": "wk_b4", "title": "Settimana 4 — 5K Completo", "day": 4, "estimated_duration_min": 45, "estimated_distance_km": 5.0, "steps": [
                {"type": "warmup", "duration_seconds": 600, "description": "Riscaldamento + mobilita'", "target_pace": None},
                {"type": "run", "duration_seconds": 1800, "description": "Corsa continua 5K", "target_pace": "6:30/km"},
                {"type": "stretching", "duration_seconds": 600, "description": "Stretching defaticante", "target_pace": None},
            ]},
        ]
    },
    {
        "plan_id": "pl_intermediate_10k",
        "title": "Intermedio — 10K Performance",
        "description": "Migliora tempi e resistenza per un 10K sotto i 55 minuti. Include sessioni di ripetute e lunghi.",
        "level": "intermediate",
        "duration_weeks": 6,
        "workouts_per_week": 4,
        "is_premium": False,
        "is_ai_generated": False,
        "image_url": "https://images.unsplash.com/photo-1765914448187-ee93dd13e1e6?w=800",
        "workouts": [
            {"workout_id": "wk_i1", "title": "Tempo Run 30'", "day": 1, "estimated_duration_min": 45, "estimated_distance_km": 7.0, "steps": [
                {"type": "warmup", "duration_seconds": 600, "description": "Jogging lento", "target_pace": "6:30/km"},
                {"type": "run", "duration_seconds": 1800, "description": "Tempo run a ritmo medio", "target_pace": "5:15/km"},
                {"type": "walk", "duration_seconds": 120, "description": "Recupero", "target_pace": None},
                {"type": "stretching", "duration_seconds": 480, "description": "Stretching dinamico", "target_pace": None},
            ]},
            {"workout_id": "wk_i2", "title": "Ripetute 6x400m", "day": 2, "estimated_duration_min": 50, "estimated_distance_km": 6.5, "steps": [
                {"type": "warmup", "duration_seconds": 900, "description": "Riscaldamento progressivo", "target_pace": "6:00/km"},
                {"type": "sprint", "duration_seconds": 90, "description": "400m veloce", "target_pace": "4:00/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Trotto recupero", "target_pace": "7:00/km"},
                {"type": "sprint", "duration_seconds": 90, "description": "400m veloce", "target_pace": "4:00/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Trotto recupero", "target_pace": "7:00/km"},
                {"type": "sprint", "duration_seconds": 90, "description": "400m veloce", "target_pace": "4:00/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Trotto recupero", "target_pace": "7:00/km"},
                {"type": "sprint", "duration_seconds": 90, "description": "400m veloce", "target_pace": "4:00/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Trotto recupero", "target_pace": "7:00/km"},
                {"type": "sprint", "duration_seconds": 90, "description": "400m veloce", "target_pace": "4:00/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Trotto recupero", "target_pace": "7:00/km"},
                {"type": "sprint", "duration_seconds": 90, "description": "400m veloce", "target_pace": "4:00/km"},
                {"type": "stretching", "duration_seconds": 480, "description": "Stretching statico gambe", "target_pace": None},
            ]},
            {"workout_id": "wk_i3", "title": "Lungo facile", "day": 3, "estimated_duration_min": 65, "estimated_distance_km": 10.0, "steps": [
                {"type": "warmup", "duration_seconds": 300, "description": "Camminata", "target_pace": None},
                {"type": "gymnastics", "duration_seconds": 300, "description": "Core: plank 3x30s, crunch 2x15", "target_pace": None},
                {"type": "run", "duration_seconds": 3300, "description": "Corsa lunga lenta", "target_pace": "6:00/km"},
                {"type": "stretching", "duration_seconds": 600, "description": "Stretching completo", "target_pace": None},
            ]},
        ]
    },
    {
        "plan_id": "pl_expert_half",
        "title": "Esperto — Mezza Maratona",
        "description": "Programma avanzato per completare una mezza maratona in meno di 1h45. Ripetute lunghe e corsa progressiva.",
        "level": "expert",
        "duration_weeks": 8,
        "workouts_per_week": 5,
        "is_premium": False,
        "is_ai_generated": False,
        "image_url": "https://images.unsplash.com/photo-1775225218390-34a8c5135110?w=800",
        "workouts": [
            {"workout_id": "wk_e1", "title": "Progressivo 12K", "day": 1, "estimated_duration_min": 70, "estimated_distance_km": 12.0, "steps": [
                {"type": "warmup", "duration_seconds": 600, "description": "Riscaldamento", "target_pace": "5:30/km"},
                {"type": "run", "duration_seconds": 1800, "description": "Ritmo medio", "target_pace": "5:00/km"},
                {"type": "run", "duration_seconds": 1200, "description": "Ritmo gara", "target_pace": "4:45/km"},
                {"type": "run", "duration_seconds": 600, "description": "Ritmo veloce", "target_pace": "4:20/km"},
                {"type": "stretching", "duration_seconds": 600, "description": "Stretching + rullo", "target_pace": None},
            ]},
            {"workout_id": "wk_e2", "title": "Ripetute 5x1000m", "day": 2, "estimated_duration_min": 60, "estimated_distance_km": 9.0, "steps": [
                {"type": "warmup", "duration_seconds": 900, "description": "Riscaldamento progressivo", "target_pace": "5:30/km"},
                {"type": "sprint", "duration_seconds": 210, "description": "1000m forte", "target_pace": "3:30/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Recupero trottato", "target_pace": None},
                {"type": "sprint", "duration_seconds": 210, "description": "1000m forte", "target_pace": "3:30/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Recupero trottato", "target_pace": None},
                {"type": "sprint", "duration_seconds": 210, "description": "1000m forte", "target_pace": "3:30/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Recupero trottato", "target_pace": None},
                {"type": "sprint", "duration_seconds": 210, "description": "1000m forte", "target_pace": "3:30/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Recupero trottato", "target_pace": None},
                {"type": "sprint", "duration_seconds": 210, "description": "1000m forte", "target_pace": "3:30/km"},
                {"type": "stretching", "duration_seconds": 600, "description": "Stretching + foam roller", "target_pace": None},
            ]},
        ]
    },
]

@api_router.get("/plans")
async def list_plans(user: dict = Depends(get_current_user)):
    # Predefined (accessible as-is)
    plans = list(PREDEFINED_PLANS)
    # User's AI-generated plans
    custom = await db.plans.find({"created_by": user["user_id"]}, {"_id": 0}).to_list(100)
    return {"predefined": plans, "custom": custom}

@api_router.get("/plans/{plan_id}")
async def get_plan(plan_id: str, user: dict = Depends(get_current_user)):
    for p in PREDEFINED_PLANS:
        if p["plan_id"] == plan_id:
            return p
    plan = await db.plans.find_one({"plan_id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Piano non trovato")
    if plan.get("is_premium") and not user.get("is_premium") and plan.get("created_by") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Piano premium richiesto")
    return plan

@api_router.post("/plans/ai-generate")
async def ai_generate_plan(data: AIGenerateRequest, user: dict = Depends(get_current_user)):
    if not user.get("is_premium"):
        raise HTTPException(status_code=403, detail="Funzione premium. Abbonati per generare piani personalizzati con AI.")
    system_msg = (
        "Sei un allenatore professionista di running. Devi generare un piano di allenamento personalizzato "
        "in formato JSON rigoroso. Rispondi SOLO con JSON valido, senza testo aggiuntivo, senza markdown. "
        "Struttura richiesta: {\"title\":str,\"description\":str,\"workouts\":["
        "{\"title\":str,\"day\":int,\"estimated_duration_min\":int,\"estimated_distance_km\":float,"
        "\"steps\":[{\"type\":\"warmup|run|recovery|sprint|walk|stretching|gymnastics\","
        "\"duration_seconds\":int,\"description\":str,\"target_pace\":str|null}]}]}. "
        "Genera almeno 6 workout distribuiti sulle settimane indicate. Includi sempre warmup all'inizio e stretching alla fine. "
        "Includi almeno un workout con ginnastica da camera (gymnastics) e stretching dedicato."
    )
    prompt = (
        f"Crea un piano di running per un livello {data.level}. "
        f"Obiettivo: {data.goal}. Durata: {data.duration_weeks} settimane, "
        f"{data.days_per_week} sessioni a settimana, ~{data.available_minutes} minuti per sessione. "
        f"Note utente: {data.notes or 'nessuna'}."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"plan_{user['user_id']}_{uuid.uuid4().hex[:6]}",
            system_message=system_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        resp = await chat.send_message(UserMessage(text=prompt))
        # Extract JSON
        match = re.search(r'\{.*\}', resp, re.DOTALL)
        raw = match.group(0) if match else resp
        parsed = json.loads(raw)
    except Exception as e:
        logger.error(f"AI generate error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione AI: {str(e)}")

    # Build plan document
    workouts = []
    for i, w in enumerate(parsed.get("workouts", []), start=1):
        steps = [WorkoutStep(**s).dict() for s in w.get("steps", [])]
        workouts.append({
            "workout_id": f"wk_{uuid.uuid4().hex[:10]}",
            "title": w.get("title", f"Workout {i}"),
            "day": w.get("day", i),
            "estimated_duration_min": int(w.get("estimated_duration_min", data.available_minutes)),
            "estimated_distance_km": float(w.get("estimated_distance_km", 5.0)),
            "steps": steps,
        })
    plan = {
        "plan_id": f"pl_{uuid.uuid4().hex[:10]}",
        "title": parsed.get("title", f"Piano AI — {data.goal}"),
        "description": parsed.get("description", data.goal),
        "level": data.level,
        "duration_weeks": data.duration_weeks,
        "workouts_per_week": data.days_per_week,
        "is_premium": True,
        "is_ai_generated": True,
        "created_by": user["user_id"],
        "workouts": workouts,
        "image_url": "https://images.unsplash.com/photo-1775225218390-34a8c5135110?w=800",
        "created_at": datetime.now(timezone.utc),
    }
    await db.plans.insert_one(dict(plan))
    plan.pop("_id", None)
    return plan

# ----------------- Workouts / Sessions -----------------
@api_router.post("/workouts/complete")
async def complete_workout(data: CompleteWorkoutRequest, user: dict = Depends(get_current_user)):
    session_id = f"ws_{uuid.uuid4().hex[:12]}"
    doc = {
        "session_id": session_id,
        "user_id": user["user_id"],
        "workout_id": data.workout_id,
        "plan_id": data.plan_id,
        "title": data.title,
        "duration_seconds": data.duration_seconds,
        "distance_km": data.distance_km,
        "avg_pace_min_per_km": data.avg_pace_min_per_km,
        "calories": data.calories,
        "locations": [l.dict() for l in data.locations],
        "completed_at": datetime.now(timezone.utc),
    }
    await db.workout_sessions.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/workouts/history")
async def workouts_history(user: dict = Depends(get_current_user)):
    sessions = await db.workout_sessions.find(
        {"user_id": user["user_id"]}, {"_id": 0, "locations": 0}
    ).sort("completed_at", -1).to_list(100)
    return sessions

@api_router.get("/workouts/{session_id}")
async def workout_detail(session_id: str, user: dict = Depends(get_current_user)):
    doc = await db.workout_sessions.find_one(
        {"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    return doc

# ----------------- Goals / Stats -----------------
@api_router.get("/stats/progress")
async def stats_progress(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    start_day = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    start_week = start_day - timedelta(days=now.weekday())
    start_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

    async def agg(start):
        pipeline = [
            {"$match": {"user_id": user["user_id"], "completed_at": {"$gte": start}}},
            {"$group": {"_id": None, "distance": {"$sum": "$distance_km"},
                        "duration": {"$sum": "$duration_seconds"}, "count": {"$sum": 1}}},
        ]
        res = await db.workout_sessions.aggregate(pipeline).to_list(1)
        if not res:
            return {"distance_km": 0.0, "duration_seconds": 0, "count": 0}
        r = res[0]
        return {"distance_km": round(r.get("distance", 0) or 0, 2),
                "duration_seconds": int(r.get("duration", 0) or 0),
                "count": int(r.get("count", 0) or 0)}

    daily = await agg(start_day)
    weekly = await agg(start_week)
    monthly = await agg(start_month)
    # Goals (default)
    goal_doc = await db.goals.find_one({"user_id": user["user_id"]}, {"_id": 0})
    goals = goal_doc or {"daily_km": 3.0, "weekly_km": 15.0, "monthly_km": 60.0}
    return {"daily": daily, "weekly": weekly, "monthly": monthly, "goals": goals}

class GoalsUpdate(BaseModel):
    daily_km: float
    weekly_km: float
    monthly_km: float

@api_router.put("/stats/goals")
async def update_goals(data: GoalsUpdate, user: dict = Depends(get_current_user)):
    await db.goals.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"user_id": user["user_id"], **data.dict()}},
        upsert=True
    )
    return {"ok": True, **data.dict()}

# ----------------- Stripe -----------------
PACKAGES = {
    "monthly": {"amount": 9.99, "currency": "eur", "label": "Premium Mensile", "duration_days": 30},
    "yearly": {"amount": 79.99, "currency": "eur", "label": "Premium Annuale", "duration_days": 365},
}

@api_router.get("/stripe/packages")
async def stripe_packages():
    return PACKAGES

@api_router.post("/stripe/checkout")
async def stripe_checkout(data: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    if data.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Pacchetto non valido")
    pkg = PACKAGES[data.package_id]
    host = str(request.base_url).rstrip("/")
    webhook_url = f"{host}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    success_url = f"{data.origin_url}/premium-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/premium"
    metadata = {"user_id": user["user_id"], "package_id": data.package_id}
    req = CheckoutSessionRequest(
        amount=float(pkg["amount"]), currency=pkg["currency"],
        success_url=success_url, cancel_url=cancel_url, metadata=metadata,
    )
    session = await stripe.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": user["user_id"],
        "package_id": data.package_id,
        "amount": pkg["amount"],
        "currency": pkg["currency"],
        "payment_status": "initiated",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc),
    })
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/stripe/status/{session_id}")
async def stripe_status(session_id: str, request: Request, user: dict = Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Sessione pagamento non trovata")
    host = str(request.base_url).rstrip("/")
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host}/api/webhook/stripe")
    status: CheckoutStatusResponse = await stripe.get_checkout_status(session_id)
    # Idempotent premium upgrade
    if status.payment_status == "paid" and tx["payment_status"] != "paid":
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"payment_status": "paid"}})
        pkg = PACKAGES.get(tx["package_id"], PACKAGES["monthly"])
        expires = datetime.now(timezone.utc) + timedelta(days=pkg["duration_days"])
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"is_premium": True, "premium_expires_at": expires}}
        )
    return {"session_id": session_id, "status": status.status, "payment_status": status.payment_status,
            "amount_total": status.amount_total, "currency": status.currency}

@api_router.post("/webhook/stripe")
async def webhook_stripe(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    host = str(request.base_url).rstrip("/")
    stripe = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=f"{host}/api/webhook/stripe")
    try:
        evt = await stripe.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"ok": False}
    if evt and evt.session_id and evt.payment_status == "paid":
        tx = await db.payment_transactions.find_one({"session_id": evt.session_id})
        if tx and tx.get("payment_status") != "paid":
            await db.payment_transactions.update_one({"session_id": evt.session_id}, {"$set": {"payment_status": "paid"}})
            pkg = PACKAGES.get(tx["package_id"], PACKAGES["monthly"])
            expires = datetime.now(timezone.utc) + timedelta(days=pkg["duration_days"])
            await db.users.update_one({"user_id": tx["user_id"]},
                                      {"$set": {"is_premium": True, "premium_expires_at": expires}})
    return {"ok": True}

# ----------------- Startup / Seed -----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.workout_sessions.create_index([("user_id", 1), ("completed_at", -1)])
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@runhub.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "level": "expert",
            "is_premium": True,
            "created_at": datetime.now(timezone.utc),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"password_hash": hash_password(admin_password), "is_premium": True}})

@api_router.get("/")
async def root():
    return {"message": "RunHub API", "status": "ok"}

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
