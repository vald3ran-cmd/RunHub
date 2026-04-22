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
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

import stripe
from anthropic import AsyncAnthropic

# ----------------- Setup -----------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
STRIPE_API_KEY = os.environ['STRIPE_API_KEY']
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')

# RevenueCat (IAP Apple/Google per build nativa)
REVENUECAT_WEBHOOK_AUTH = os.environ.get('REVENUECAT_WEBHOOK_AUTH', '')
REVENUECAT_SECRET_KEY = os.environ.get('REVENUECAT_SECRET_KEY', '')

stripe.api_key = STRIPE_API_KEY

app = FastAPI(title="RunHub API")
api_router = APIRouter(prefix="/api")

@api_router.get("/health")
async def health_check():
    """Public health check endpoint for Render / uptime monitors."""
    return {"status": "ok", "service": "runhub-backend", "timestamp": datetime.now(timezone.utc).isoformat()}

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

# ----------------- Tier utilities -----------------
TIER_ORDER = {"free": 0, "starter": 1, "performance": 2, "elite": 3}

# ----------------- Password Reset & Email Verification (OTP via Resend) -----------------

class OtpSendIn(BaseModel):
    email: EmailStr

class OtpVerifyIn(BaseModel):
    email: EmailStr
    code: str

class PasswordResetIn(BaseModel):
    email: EmailStr
    code: str
    new_password: str

def _generate_otp() -> str:
    return str(uuid.uuid4().int)[-6:].zfill(6)

async def _save_otp(email: str, code: str, purpose: str) -> None:
    await db.otp_codes.insert_one({
        "email": email.lower(),
        "code": code,
        "purpose": purpose,  # "verify_email" | "reset_password"
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
        "consumed": False,
    })

async def _consume_otp(email: str, code: str, purpose: str) -> bool:
    rec = await db.otp_codes.find_one({
        "email": email.lower(),
        "code": code,
        "purpose": purpose,
        "consumed": False,
        "expires_at": {"$gt": datetime.now(timezone.utc)},
    })
    if not rec:
        return False
    await db.otp_codes.update_one({"_id": rec["_id"]}, {"$set": {"consumed": True, "consumed_at": datetime.now(timezone.utc)}})
    return True

@api_router.post("/auth/verify-email/send")
async def verify_email_send(data: OtpSendIn):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0, "name": 1, "email_verified": 1})
    if not user:
        # Silent: non rivelare se email esiste
        return {"ok": True}
    if user.get("email_verified"):
        return {"ok": True, "already_verified": True}
    code = _generate_otp()
    await _save_otp(data.email, code, "verify_email")
    asyncio.create_task(send_email(
        data.email.lower(),
        f"{APP_NAME}: conferma la tua email",
        _otp_email_html(user.get("name", "Runner"), code, "verificare la tua email"),
        f"Il tuo codice di verifica e': {code}",
    ))
    return {"ok": True}

@api_router.post("/auth/verify-email/confirm")
async def verify_email_confirm(data: OtpVerifyIn):
    ok = await _consume_otp(data.email, data.code, "verify_email")
    if not ok:
        raise HTTPException(status_code=400, detail="Codice non valido o scaduto")
    await db.users.update_one(
        {"email": data.email.lower()},
        {"$set": {"email_verified": True, "email_verified_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: OtpSendIn):
    user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0, "name": 1})
    if user:
        code = _generate_otp()
        await _save_otp(data.email, code, "reset_password")
        asyncio.create_task(send_email(
            data.email.lower(),
            f"{APP_NAME}: reimposta la password",
            _otp_email_html(user.get("name", "Runner"), code, "reimpostare la password"),
            f"Il tuo codice per il reset password e': {code}",
        ))
    # Risposta uguale indipendentemente per privacy
    return {"ok": True}

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordResetIn):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password troppo corta (min 6 caratteri)")
    ok = await _consume_otp(data.email, data.code, "reset_password")
    if not ok:
        raise HTTPException(status_code=400, detail="Codice non valido o scaduto")
    result = await db.users.update_one(
        {"email": data.email.lower()},
        {"$set": {"password_hash": hash_password(data.new_password), "password_changed_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"ok": True}

# ----------------- Push Notifications (Expo Push Service) -----------------

import httpx as _httpx_push

# Email service: MailerSend (primary) con fallback su Resend (legacy)
MAILERSEND_API_KEY = os.environ.get("MAILERSEND_API_KEY", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "RunHub <noreply@apprunhub.com>")
# Email di contatto pubbliche (usate in Terms, Privacy, footer email)
EMAIL_INFO = os.environ.get("EMAIL_INFO", "info@apprunhub.com")
EMAIL_SUPPORT = os.environ.get("EMAIL_SUPPORT", "support@apprunhub.com")
EMAIL_PRIVACY = os.environ.get("EMAIL_PRIVACY", "support@apprunhub.com")
EMAIL_DPO = os.environ.get("EMAIL_DPO", "support@apprunhub.com")
APP_NAME = os.environ.get("APP_NAME", "RunHub")


def _parse_email_from(email_from: str) -> dict:
    """Parse 'Name <email@domain>' into {'name': 'Name', 'email': 'email@domain'} for MailerSend."""
    email_from = (email_from or "").strip()
    if "<" in email_from and ">" in email_from:
        name = email_from.split("<")[0].strip().strip('"')
        email = email_from.split("<")[1].split(">")[0].strip()
        return {"name": name or APP_NAME, "email": email}
    return {"name": APP_NAME, "email": email_from}


async def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> dict:
    """Send email via MailerSend API (preferred) or Resend (fallback)."""
    # Tentativo 1: MailerSend
    if MAILERSEND_API_KEY:
        try:
            sender = _parse_email_from(EMAIL_FROM)
            async with _httpx_push.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.mailersend.com/v1/email",
                    json={
                        "from": sender,
                        "to": [{"email": to}],
                        "subject": subject,
                        "html": html,
                        "text": text or "",
                    },
                    headers={
                        "Authorization": f"Bearer {MAILERSEND_API_KEY}",
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                )
                if resp.status_code in (200, 202):
                    msg_id = resp.headers.get("x-message-id") or ""
                    return {"ok": True, "id": msg_id, "provider": "mailersend"}
                try:
                    data = resp.json()
                except Exception:
                    data = {"raw": resp.text}
                logger.error(f"MailerSend error {resp.status_code}: {data}")
                # non ritorno subito: provo Resend come fallback se configurato
                if not RESEND_API_KEY:
                    return {"ok": False, "error": data.get("message") or str(resp.status_code), "provider": "mailersend"}
        except Exception as e:
            logger.error(f"MailerSend send_email failed: {e}")
            if not RESEND_API_KEY:
                return {"ok": False, "error": str(e), "provider": "mailersend"}
    # Tentativo 2 / Fallback: Resend (solo se MailerSend non configurato o ha fallito)
    if RESEND_API_KEY:
        try:
            async with _httpx_push.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.resend.com/emails",
                    json={
                        "from": EMAIL_FROM,
                        "to": [to],
                        "subject": subject,
                        "html": html,
                        "text": text or "",
                    },
                    headers={
                        "Authorization": f"Bearer {RESEND_API_KEY}",
                        "Content-Type": "application/json",
                    },
                )
                data = resp.json() if resp.text else {}
                if resp.status_code >= 400:
                    logger.error(f"Resend error {resp.status_code}: {data}")
                    return {"ok": False, "error": data.get("message") or str(resp.status_code), "provider": "resend"}
                return {"ok": True, "id": data.get("id"), "provider": "resend"}
        except Exception as e:
            logger.error(f"Resend send_email failed: {e}")
            return {"ok": False, "error": str(e), "provider": "resend"}
    logger.warning("No email provider configured (MAILERSEND_API_KEY / RESEND_API_KEY); skipping email")
    return {"ok": False, "error": "no-api-key"}

def _otp_email_html(name: str, code: str, action: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #09090B; color: #fff; padding: 32px; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 24px 0;">
        <h1 style="color: #FF3B30; font-size: 32px; margin: 0; letter-spacing: -1px;">RUN<span style="color:#fff;">HUB</span></h1>
      </div>
      <div style="background: #18181B; padding: 32px; border-radius: 16px; border: 1px solid #27272A;">
        <h2 style="color: #fff; margin: 0 0 16px;">Ciao {name}!</h2>
        <p style="color: #A1A1AA; line-height: 1.6;">Ecco il tuo codice per {action}:</p>
        <div style="background: #FF3B30; color: #fff; padding: 24px; border-radius: 12px; text-align: center; font-size: 36px; font-weight: 900; letter-spacing: 8px; margin: 24px 0;">
          {code}
        </div>
        <p style="color: #A1A1AA; font-size: 14px;">Il codice scade tra <b>15 minuti</b>. Se non hai richiesto tu questa operazione, ignora questa email.</p>
      </div>
      <p style="color: #71717A; font-size: 12px; text-align: center; margin-top: 24px;">
        OGNI KM. OGNI BATTITO. OGNI TRAGUARDO.<br>
        © 2026 {APP_NAME}
      </p>
    </body>
    </html>
    """

def _welcome_email_html(name: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, sans-serif; background: #09090B; color: #fff; padding: 32px; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #FF3B30; text-align: center;">RUN<span style="color:#fff;">HUB</span></h1>
      <div style="background: #18181B; padding: 32px; border-radius: 16px;">
        <h2>Benvenuto nel branco, {name}! 🏃</h2>
        <p style="color: #A1A1AA; line-height: 1.6;">Siamo felici di averti con noi. RunHub ti aiuta a correre meglio con:</p>
        <ul style="color: #A1A1AA; line-height: 1.8;">
          <li>📊 Piani di allenamento personalizzati</li>
          <li>🗺️ GPS tracking real-time</li>
          <li>🤖 AI Coach che genera piani su misura</li>
          <li>🏆 Badge e classifiche con amici</li>
        </ul>
        <p style="color: #A1A1AA;">Apri l'app e inizia la tua prima corsa!</p>
      </div>
    </body>
    </html>
    """

async def send_expo_push(tokens: List[str], title: str, body: str, data: Optional[dict] = None) -> dict:
    """Send push notification(s) via Expo Push Service (free, no API key required)."""
    if not tokens:
        return {"sent": 0, "tickets": []}
    valid_tokens = [t for t in tokens if t and t.startswith(("ExponentPushToken[", "ExpoPushToken["))]
    if not valid_tokens:
        return {"sent": 0, "tickets": []}
    messages = [
        {
            "to": tok,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            "priority": "high",
            "channelId": "default",
        }
        for tok in valid_tokens
    ]
    try:
        async with _httpx_push.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=messages,
                headers={"Accept": "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json"},
            )
            result = resp.json()
            tickets = result.get("data", []) if isinstance(result, dict) else []
            return {"sent": len(valid_tokens), "tickets": tickets}
    except Exception as e:
        logger.error(f"Expo push error: {e}")
        return {"sent": 0, "error": str(e)}

def user_tier(user: dict) -> str:
    t = user.get("tier")
    if t in TIER_ORDER:
        # Check expiry
        exp = user.get("tier_expires_at")
        if t != "free" and exp:
            exp_dt = exp if isinstance(exp, datetime) else datetime.fromisoformat(str(exp))
            if exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt < datetime.now(timezone.utc):
                return "free"
        return t
    # Backward compat with is_premium
    return "performance" if user.get("is_premium") else "free"

def has_tier(user: dict, min_tier: str) -> bool:
    return TIER_ORDER.get(user_tier(user), 0) >= TIER_ORDER.get(min_tier, 0)

def require_tier(min_tier: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if not has_tier(user, min_tier):
            raise HTTPException(status_code=403,
                                detail=f"Funzione riservata al piano {min_tier.capitalize()} o superiore")
        return user
    return dep

def require_admin():
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Accesso admin richiesto")
        return user
    return dep

# ----------------- Models -----------------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    # Data di nascita (ISO format YYYY-MM-DD). Obbligatoria per verificare età minima.
    date_of_birth: Optional[str] = None
    # GDPR consent fields (opzionali per backward compat, ma frontend li invia sempre)
    accepted_terms: Optional[bool] = None
    accepted_privacy: Optional[bool] = None
    accepted_at: Optional[str] = None
    terms_version: Optional[str] = None
    privacy_version: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class CompleteProfileIn(BaseModel):
    """DOB + consent GDPR per utenti OAuth (Google/Apple) che hanno saltato il flow di registrazione email."""
    date_of_birth: str  # ISO YYYY-MM-DD
    accepted_terms: bool
    accepted_privacy: bool
    accepted_at: Optional[str] = None
    terms_version: Optional[str] = None
    privacy_version: Optional[str] = None

class UserOut(BaseModel):
    user_id: str
    email: str
    name: str
    level: str = "beginner"
    tier: str = "free"
    tier_expires_at: Optional[datetime] = None
    is_premium: bool = False  # deprecated, kept for backward compat
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
# Età minima per iscriversi (normativa italiana D.Lgs. 101/2018 - GDPR Art. 8)
MIN_AGE_YEARS = 14

def _calculate_age(birthdate_iso: str) -> Optional[int]:
    """Calcola età in anni da ISO date string (YYYY-MM-DD). None se invalido."""
    try:
        if not birthdate_iso:
            return None
        # Accetta sia "YYYY-MM-DD" che "YYYY-MM-DDTHH:MM:SS"
        dob = datetime.fromisoformat(birthdate_iso.split("T")[0] + "T00:00:00+00:00")
        now = datetime.now(timezone.utc)
        age = now.year - dob.year - ((now.month, now.day) < (dob.month, dob.day))
        return age if age >= 0 else None
    except Exception:
        return None


@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email gia' registrata")

    # Validazione data di nascita + età minima
    dob_iso = None
    user_age = None
    if data.date_of_birth:
        user_age = _calculate_age(data.date_of_birth)
        if user_age is None:
            raise HTTPException(status_code=400, detail="Data di nascita non valida. Usa formato GG/MM/AAAA.")
        if user_age < MIN_AGE_YEARS:
            raise HTTPException(
                status_code=400,
                detail=f"Devi avere almeno {MIN_AGE_YEARS} anni per iscriverti a RunHub (normativa italiana)."
            )
        if user_age > 120:
            raise HTTPException(status_code=400, detail="Data di nascita non plausibile.")
        dob_iso = data.date_of_birth.split("T")[0]

    # GDPR: registra proof-of-consent (obbligatorio Art. 7 GDPR)
    now = datetime.now(timezone.utc)
    consent_record = None
    if data.accepted_terms or data.accepted_privacy:
        try:
            accepted_dt = datetime.fromisoformat(data.accepted_at.replace('Z', '+00:00')) if data.accepted_at else now
        except Exception:
            accepted_dt = now
        consent_record = {
            "accepted_terms": bool(data.accepted_terms),
            "accepted_privacy": bool(data.accepted_privacy),
            "accepted_at": accepted_dt,
            "terms_version": data.terms_version or "unversioned",
            "privacy_version": data.privacy_version or "unversioned",
            "source": "register",
        }

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    doc = {
        "user_id": user_id,
        "email": data.email.lower(),
        "name": data.name,
        "password_hash": hash_password(data.password),
        "level": "beginner",
        "tier": "free",
        "tier_expires_at": None,
        "is_premium": False,
        "onboarding_completed": False,
        "created_at": now,
    }
    if dob_iso:
        doc["date_of_birth"] = dob_iso
        doc["age_at_signup"] = user_age
    if consent_record:
        doc["consent"] = consent_record
        doc["consent_history"] = [consent_record]
    await db.users.insert_one(doc)
    token = create_access_token(user_id, data.email.lower())
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=604800, path="/")
    # Fire-and-forget: welcome email
    asyncio.create_task(send_email(
        data.email.lower(),
        f"Benvenuto in {APP_NAME}! 🏃",
        _welcome_email_html(data.name),
        f"Ciao {data.name}, benvenuto in {APP_NAME}! Apri l'app per iniziare.",
    ))
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
    # Flag: l'utente deve completare profilo (DOB + consent)?
    # Vero per: nuovi utenti OAuth (Google/Apple) o utenti legacy senza consent registrato
    has_dob = bool(user.get("date_of_birth"))
    consent = user.get("consent") or {}
    has_consent = bool(consent.get("accepted_terms") and consent.get("accepted_privacy") and consent.get("accepted_at"))
    user["needs_profile_completion"] = not (has_dob and has_consent)
    return user


@api_router.post("/auth/complete-profile")
async def complete_profile(data: CompleteProfileIn, user: dict = Depends(get_current_user)):
    """
    Completa profilo utente OAuth (Google/Apple) con DOB + consensi GDPR.
    Obbligatorio per conformità GDPR Art. 7 + D.Lgs. 101/2018 (età minima 14 anni).
    """
    uid = user.get("user_id") or user.get("id")

    # Validazione età minima
    user_age = _calculate_age(data.date_of_birth)
    if user_age is None:
        raise HTTPException(status_code=400, detail="Data di nascita non valida. Usa formato GG/MM/AAAA.")
    if user_age < MIN_AGE_YEARS:
        raise HTTPException(
            status_code=400,
            detail=f"Devi avere almeno {MIN_AGE_YEARS} anni per usare RunHub (normativa italiana)."
        )
    if user_age > 120:
        raise HTTPException(status_code=400, detail="Data di nascita non plausibile.")

    # Consensi obbligatori
    if not data.accepted_terms or not data.accepted_privacy:
        raise HTTPException(status_code=400, detail="Devi accettare Termini di Servizio e Privacy Policy per continuare.")

    now = datetime.now(timezone.utc)
    try:
        accepted_dt = datetime.fromisoformat(data.accepted_at.replace('Z', '+00:00')) if data.accepted_at else now
    except Exception:
        accepted_dt = now

    consent_record = {
        "accepted_terms": True,
        "accepted_privacy": True,
        "accepted_at": accepted_dt,
        "terms_version": data.terms_version or "unversioned",
        "privacy_version": data.privacy_version or "unversioned",
        "source": "complete_profile_oauth",
    }

    dob_iso = data.date_of_birth.split("T")[0]

    await db.users.update_one(
        {"user_id": uid},
        {
            "$set": {
                "date_of_birth": dob_iso,
                "age_at_signup": user_age,
                "consent": consent_record,
            },
            "$push": {"consent_history": consent_record},
        }
    )

    updated = await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})
    updated["needs_profile_completion"] = False
    return {"ok": True, "user": updated}

# ----------------- GDPR Export & Account Deletion -----------------

@api_router.get("/user/export")
async def export_user_data(user: dict = Depends(get_current_user)):
    """
    GDPR Article 20 - Data portability.
    Ritorna TUTTI i dati dell'utente in formato JSON.
    """
    uid = user.get("id") or user.get("user_id")

    # Account data (senza password hash)
    account = await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})

    # Workouts + steps
    workouts_cursor = db.workouts.find({"user_id": uid}, {"_id": 0}).sort("completed_at", -1)
    workouts = await workouts_cursor.to_list(length=None)
    for w in workouts:
        for key in list(w.keys()):
            if hasattr(w[key], "isoformat"):
                w[key] = w[key].isoformat()

    # Sessions (GPS tracking)
    sessions_cursor = db.sessions.find({"user_id": uid}, {"_id": 0}).sort("started_at", -1)
    sessions = await sessions_cursor.to_list(length=None)
    for s in sessions:
        for key in list(s.keys()):
            if hasattr(s[key], "isoformat"):
                s[key] = s[key].isoformat()

    # Social: friends, comments, likes
    friends = await db.friendships.find(
        {"$or": [{"from_user_id": uid}, {"to_user_id": uid}]}, {"_id": 0}
    ).to_list(length=None)
    comments = await db.comments.find({"user_id": uid}, {"_id": 0}).to_list(length=None)
    likes = await db.likes.find({"user_id": uid}, {"_id": 0}).to_list(length=None)

    # Onboarding
    onboarding = await db.onboarding.find_one({"user_id": uid}, {"_id": 0})

    # Subscriptions / payments
    payments = await db.payment_transactions.find(
        {"$or": [{"user_id": uid}, {"app_user_id": uid}]}, {"_id": 0}
    ).to_list(length=None)
    for p in payments:
        for key in list(p.keys()):
            if hasattr(p[key], "isoformat"):
                p[key] = p[key].isoformat()

    # Notifications tokens
    push_tokens = await db.push_tokens.find({"user_id": uid}, {"_id": 0}).to_list(length=None)

    # Wearables data (Apple Health / Google Fit sync)
    wearables = await db.wearables_samples.find({"user_id": uid}, {"_id": 0}).to_list(length=None)
    for w in wearables:
        for key in list(w.keys()):
            if hasattr(w[key], "isoformat"):
                w[key] = w[key].isoformat()

    # OTP history (informative only, no sensitive data)
    otp_count = await db.otp_codes.count_documents({"email": user.get("email")})

    # Normalize datetimes
    if account:
        for key in list(account.keys()):
            if hasattr(account[key], "isoformat"):
                account[key] = account[key].isoformat()
    if onboarding:
        for key in list(onboarding.keys()):
            if hasattr(onboarding[key], "isoformat"):
                onboarding[key] = onboarding[key].isoformat()

    export = {
        "export_meta": {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "user_id": uid,
            "format": "application/json",
            "gdpr_article": "20 - Data portability",
        },
        "account": account,
        "onboarding": onboarding,
        "workouts": workouts,
        "sessions": sessions,
        "friends": friends,
        "comments": comments,
        "likes": likes,
        "payments": payments,
        "push_tokens": [{"platform": t.get("platform"), "created_at": t.get("created_at", "").isoformat() if hasattr(t.get("created_at"), "isoformat") else t.get("created_at")} for t in push_tokens],
        "wearables_samples": wearables,
        "otp_requests_count": otp_count,
        "stats": {
            "total_workouts": len(workouts),
            "total_sessions": len(sessions),
            "total_friends": len(friends),
            "total_comments": len(comments),
            "total_likes": len(likes),
        },
    }
    return export


@api_router.delete("/user/me")
async def delete_my_account(user: dict = Depends(get_current_user)):
    """
    GDPR Article 17 - Right to erasure.
    Cancella account utente e TUTTI i dati associati (cascade).
    Obbligatorio per App Store dal 2022.
    """
    uid = user.get("id") or user.get("user_id")
    user_email = user.get("email")

    # Protezione admin: un admin non si puo' auto-cancellare (sicurezza)
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Gli account admin non possono essere auto-cancellati. Contatta il supporto.")

    deleted = {"user_id": uid, "collections": {}}

    # Cascade delete
    for coll, filters in [
        ("users", {"user_id": uid}),
        ("workout_sessions", {"user_id": uid}),
        ("friendships", {"$or": [{"from_user_id": uid}, {"to_user_id": uid}]}),
        ("friend_requests", {"$or": [{"from_user_id": uid}, {"to_user_id": uid}]}),
        ("comments", {"user_id": uid}),
        ("likes", {"user_id": uid}),
        ("onboarding", {"user_id": uid}),
        ("push_tokens", {"user_id": uid}),
        ("wearables_samples", {"user_id": uid}),
        ("badges", {"user_id": uid}),
        ("otp_codes", {"email": user_email}),
    ]:
        try:
            result = await db[coll].delete_many(filters)
            deleted["collections"][coll] = result.deleted_count
        except Exception as e:
            logger.warning(f"Errore cancellazione {coll}: {e}")
            deleted["collections"][coll] = 0

    # NOTA: payment_transactions conservati 10 anni per obbligo fiscale (anonimizzati: rimuoviamo email/nome)
    try:
        await db.payment_transactions.update_many(
            {"$or": [{"user_id": uid}, {"app_user_id": uid}]},
            {"$set": {"user_deleted": True, "user_deleted_at": datetime.now(timezone.utc), "user_email_snapshot": None}}
        )
    except Exception:
        pass

    logger.info(f"[GDPR] Account cancellato: user_id={uid} email={user.get('email')} deleted_counts={deleted['collections']}")

    return {
        "ok": True,
        "message": "Account e dati associati eliminati con successo.",
        "deleted": deleted,
    }


# ----------------- Social Auth (Google, Apple) -----------------

# Notification endpoints (register/unregister push tokens, send test)

class RegisterTokenIn(BaseModel):
    token: str
    platform: Optional[str] = None

class TestNotifyIn(BaseModel):
    title: str = "Test Notification"
    body: str = "Questa e' una notifica di test da RunHub"

@api_router.post("/notifications/register")
async def notifications_register(data: RegisterTokenIn, user: dict = Depends(get_current_user)):
    if not data.token:
        raise HTTPException(status_code=400, detail="Token mancante")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$addToSet": {"push_tokens": {"token": data.token, "platform": data.platform or "unknown"}}}
    )
    return {"ok": True}

@api_router.post("/notifications/unregister")
async def notifications_unregister(data: RegisterTokenIn, user: dict = Depends(get_current_user)):
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"push_tokens": {"token": data.token}}}
    )
    return {"ok": True}

@api_router.post("/notifications/test")
async def notifications_test(data: TestNotifyIn, user: dict = Depends(get_current_user)):
    fresh = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "push_tokens": 1})
    tokens = [t["token"] for t in (fresh.get("push_tokens") or []) if t.get("token")]
    if not tokens:
        raise HTTPException(status_code=400, detail="Nessun push token registrato. Apri l'app su un dispositivo nativo per registrarne uno.")
    result = await send_expo_push(tokens, data.title, data.body, data={"type": "test"})
    return result

@api_router.get("/stats/routes")
async def stats_all_routes(user: dict = Depends(get_current_user), limit: int = 100):
    """Return all workout routes of user for heatmap visualization."""
    cursor = db.workout_sessions.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "session_id": 1, "completed_at": 1, "distance_km": 1, "locations": 1}
    ).sort("completed_at", -1).limit(limit)
    out = []
    async for s in cursor:
        locs = s.get("locations") or []
        coords = []
        # Downsample to reduce payload — take max ~80 points per route
        step = max(1, len(locs) // 80) if locs else 1
        for i in range(0, len(locs), step):
            l = locs[i]
            lat = l.get("latitude") or l.get("lat")
            lng = l.get("longitude") or l.get("lng")
            if lat is not None and lng is not None:
                coords.append({"lat": lat, "lng": lng})
        if coords:
            out.append({
                "session_id": s.get("session_id"),
                "completed_at": s.get("completed_at"),
                "distance_km": s.get("distance_km", 0),
                "coords": coords,
            })
    return out

# ----------------- Wearables Sync (Apple HealthKit / Google Health Connect) -----------------

class WearableSyncIn(BaseModel):
    steps: int
    distance_km: float
    active_calories: float
    heart_rate_avg: Optional[float] = None
    platform: str  # "apple_health" | "health_connect"
    synced_at: Optional[str] = None

@api_router.post("/wearables/sync")
async def wearables_sync(data: WearableSyncIn, user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    doc = {
        "user_id": user["user_id"],
        "date": today,
        "steps": data.steps,
        "distance_km": round(data.distance_km, 3),
        "active_calories": round(data.active_calories, 1),
        "heart_rate_avg": data.heart_rate_avg,
        "platform": data.platform,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.wearable_daily.update_one(
        {"user_id": user["user_id"], "date": today},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True, "date": today.isoformat()}

@api_router.get("/wearables/today")
async def wearables_today(user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    doc = await db.wearable_daily.find_one({"user_id": user["user_id"], "date": today}, {"_id": 0})
    return doc or {}

@api_router.get("/wearables/history")
async def wearables_history(user: dict = Depends(get_current_user), days: int = 30):
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days)
    cursor = db.wearable_daily.find(
        {"user_id": user["user_id"], "date": {"$gte": start}}, {"_id": 0}
    ).sort("date", -1)
    return await cursor.to_list(days + 5)


class GoogleAuthIn(BaseModel):
    id_token: str

class AppleAuthIn(BaseModel):
    identity_token: str
    user_id: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None

async def _find_or_create_oauth_user(provider: str, provider_sub: str, email: str, name: Optional[str]) -> dict:
    """Find existing user by provider_sub OR by email; create if not exists."""
    # 1) Match by provider sub (primary)
    existing = await db.users.find_one({f"oauth.{provider}.sub": provider_sub})
    if existing:
        # Update last login
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {"last_login_at": datetime.now(timezone.utc)}}
        )
        return existing

    # 2) Match by email (link accounts)
    if email:
        existing = await db.users.find_one({"email": email.lower()})
        if existing:
            await db.users.update_one(
                {"user_id": existing["user_id"]},
                {"$set": {
                    f"oauth.{provider}": {"sub": provider_sub, "linked_at": datetime.now(timezone.utc)},
                    "last_login_at": datetime.now(timezone.utc),
                }}
            )
            return await db.users.find_one({"user_id": existing["user_id"]})

    # 3) Create new user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    display_name = name or (email.split("@")[0] if email else "Runner")
    fallback_email = email.lower() if email else f"{provider_sub}@{provider}.runhub.local"
    doc = {
        "user_id": user_id,
        "email": fallback_email,
        "name": display_name,
        "password_hash": "",  # social accounts have no password
        "level": "beginner",
        "tier": "free",
        "tier_expires_at": None,
        "is_premium": False,
        "onboarding_completed": False,
        "created_at": datetime.now(timezone.utc),
        "last_login_at": datetime.now(timezone.utc),
        "oauth": {
            provider: {"sub": provider_sub, "linked_at": datetime.now(timezone.utc)}
        },
    }
    await db.users.insert_one(doc)
    return doc

@api_router.post("/auth/google")
async def google_auth(data: GoogleAuthIn, response: Response):
    """Verify Google ID token and return a RunHub JWT."""
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
    except ImportError:
        raise HTTPException(status_code=500, detail="Google auth lib non installata")

    ios_id = os.environ.get("GOOGLE_IOS_CLIENT_ID", "")
    web_id = os.environ.get("GOOGLE_WEB_CLIENT_ID", "")
    allowed_audiences = [x for x in (ios_id, web_id) if x]

    try:
        payload = google_id_token.verify_oauth2_token(
            data.id_token, google_requests.Request()
        )
        if payload.get("aud") not in allowed_audiences:
            raise HTTPException(status_code=401, detail=f"Audience non valida: {payload.get('aud')}")
        if payload.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise HTTPException(status_code=401, detail="Issuer non valido")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Token Google non valido: {str(e)}")

    sub = payload.get("sub")
    email = payload.get("email") or ""
    name = payload.get("name") or payload.get("given_name")

    user = await _find_or_create_oauth_user("google", sub, email, name)
    token = create_access_token(user["user_id"], user["email"])
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=604800, path="/")
    user.pop("_id", None); user.pop("password_hash", None)
    return {"token": token, "user": user}

@api_router.post("/auth/apple")
async def apple_auth(data: AppleAuthIn, response: Response):
    """Verify Apple identity token (JWT) using Apple's public keys."""
    try:
        import jwt as pyjwt
        from jwt import PyJWKClient
    except ImportError:
        raise HTTPException(status_code=500, detail="PyJWT non installata")

    bundle_id = os.environ.get("APPLE_BUNDLE_ID", "com.runhub.app")
    try:
        jwks_client = PyJWKClient("https://appleid.apple.com/auth/keys")
        signing_key = jwks_client.get_signing_key_from_jwt(data.identity_token)
        payload = pyjwt.decode(
            data.identity_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=bundle_id,
            issuer="https://appleid.apple.com",
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token Apple non valido: {str(e)}")

    sub = payload.get("sub")
    email = payload.get("email") or data.email or ""
    name = data.name  # Apple fornisce il nome SOLO alla prima autenticazione (dal client)

    user = await _find_or_create_oauth_user("apple", sub, email, name)
    token = create_access_token(user["user_id"], user["email"])
    response.set_cookie("access_token", token, httponly=True, samesite="lax", max_age=604800, path="/")
    user.pop("_id", None); user.pop("password_hash", None)
    return {"token": token, "user": user}

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
        "required_tier": "starter",
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
        "required_tier": "starter",
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
        "required_tier": "performance",
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
    # ===== PERFORMANCE TIER PLANS =====
    {
        "plan_id": "pl_5k_sub30",
        "title": "5K sotto 30 minuti",
        "description": "Piano 4 settimane per sfondare il muro dei 30 minuti sui 5K con tempo run e ripetute brevi.",
        "level": "intermediate", "duration_weeks": 4, "workouts_per_week": 3,
        "is_premium": False, "required_tier": "performance",
        "image_url": "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800",
        "workouts": [
            {"workout_id": "wk_530_1", "title": "Tempo 20' + 4x200m", "day": 1, "estimated_duration_min": 40, "estimated_distance_km": 6.0, "steps": [
                {"type": "warmup", "duration_seconds": 600, "description": "Riscaldamento", "target_pace": "6:30/km"},
                {"type": "run", "duration_seconds": 1200, "description": "Tempo run", "target_pace": "5:30/km"},
                {"type": "recovery", "duration_seconds": 180, "description": "Recupero", "target_pace": None},
                {"type": "sprint", "duration_seconds": 45, "description": "200m veloce", "target_pace": "4:30/km"},
                {"type": "recovery", "duration_seconds": 90, "description": "Recupero", "target_pace": None},
                {"type": "sprint", "duration_seconds": 45, "description": "200m veloce", "target_pace": "4:30/km"},
                {"type": "recovery", "duration_seconds": 90, "description": "Recupero", "target_pace": None},
                {"type": "sprint", "duration_seconds": 45, "description": "200m veloce", "target_pace": "4:30/km"},
                {"type": "recovery", "duration_seconds": 90, "description": "Recupero", "target_pace": None},
                {"type": "sprint", "duration_seconds": 45, "description": "200m veloce", "target_pace": "4:30/km"},
                {"type": "stretching", "duration_seconds": 480, "description": "Stretching", "target_pace": None},
            ]},
            {"workout_id": "wk_530_2", "title": "5x1000m a ritmo gara", "day": 2, "estimated_duration_min": 45, "estimated_distance_km": 7.0, "steps": [
                {"type": "warmup", "duration_seconds": 900, "description": "Riscaldamento", "target_pace": "6:00/km"},
                {"type": "sprint", "duration_seconds": 300, "description": "1000m ritmo gara", "target_pace": "5:00/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Recupero", "target_pace": None},
                {"type": "sprint", "duration_seconds": 300, "description": "1000m ritmo gara", "target_pace": "5:00/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Recupero", "target_pace": None},
                {"type": "sprint", "duration_seconds": 300, "description": "1000m ritmo gara", "target_pace": "5:00/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Recupero", "target_pace": None},
                {"type": "sprint", "duration_seconds": 300, "description": "1000m ritmo gara", "target_pace": "5:00/km"},
                {"type": "recovery", "duration_seconds": 120, "description": "Recupero", "target_pace": None},
                {"type": "sprint", "duration_seconds": 300, "description": "1000m ritmo gara", "target_pace": "5:00/km"},
                {"type": "stretching", "duration_seconds": 480, "description": "Stretching", "target_pace": None},
            ]},
        ],
    },
    {
        "plan_id": "pl_10k_competitivo",
        "title": "10K Competitivo",
        "description": "8 settimane per correre 10K sotto 45 minuti. Soglia, VO2max, lunghi qualitativi.",
        "level": "expert", "duration_weeks": 8, "workouts_per_week": 4,
        "is_premium": False, "required_tier": "performance",
        "image_url": "https://images.unsplash.com/photo-1456613820599-bfe244172af5?w=800",
        "workouts": [
            {"workout_id": "wk_10c_1", "title": "Soglia 2x15'", "day": 1, "estimated_duration_min": 60, "estimated_distance_km": 10.5, "steps": [
                {"type": "warmup", "duration_seconds": 900, "description": "Riscaldamento", "target_pace": "5:30/km"},
                {"type": "run", "duration_seconds": 900, "description": "Soglia", "target_pace": "4:30/km"},
                {"type": "recovery", "duration_seconds": 180, "description": "Trotto", "target_pace": None},
                {"type": "run", "duration_seconds": 900, "description": "Soglia", "target_pace": "4:30/km"},
                {"type": "stretching", "duration_seconds": 480, "description": "Stretching", "target_pace": None},
            ]},
            {"workout_id": "wk_10c_2", "title": "VO2max 8x400m", "day": 2, "estimated_duration_min": 55, "estimated_distance_km": 9.0, "steps": [
                {"type": "warmup", "duration_seconds": 900, "description": "Riscaldamento", "target_pace": "5:30/km"},
                *[step for _ in range(8) for step in [
                    {"type": "sprint", "duration_seconds": 80, "description": "400m veloce", "target_pace": "4:00/km"},
                    {"type": "recovery", "duration_seconds": 90, "description": "Trotto", "target_pace": None},
                ]],
                {"type": "stretching", "duration_seconds": 480, "description": "Stretching", "target_pace": None},
            ]},
        ],
    },
    {
        "plan_id": "pl_mezza_performance",
        "title": "Mezza Maratona Performance",
        "description": "10 settimane per battere il tuo record sulla mezza. Lunghi progressivi, soglia estesa, gara simulata.",
        "level": "expert", "duration_weeks": 10, "workouts_per_week": 5,
        "is_premium": False, "required_tier": "performance",
        "image_url": "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=800",
        "workouts": [
            {"workout_id": "wk_mp_1", "title": "Lungo progressivo 18K", "day": 1, "estimated_duration_min": 100, "estimated_distance_km": 18.0, "steps": [
                {"type": "warmup", "duration_seconds": 600, "description": "Riscaldamento", "target_pace": "6:00/km"},
                {"type": "run", "duration_seconds": 3000, "description": "Lento", "target_pace": "5:30/km"},
                {"type": "run", "duration_seconds": 1800, "description": "Medio", "target_pace": "5:00/km"},
                {"type": "run", "duration_seconds": 600, "description": "Forte", "target_pace": "4:30/km"},
                {"type": "stretching", "duration_seconds": 600, "description": "Stretching + foam roller", "target_pace": None},
            ]},
        ],
    },
    {
        "plan_id": "pl_maratona",
        "title": "Maratona — 16 settimane",
        "description": "Programma completo per finire la tua prima maratona. Costruzione progressiva fino a 32K di lungo.",
        "level": "expert", "duration_weeks": 16, "workouts_per_week": 5,
        "is_premium": False, "required_tier": "performance",
        "image_url": "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800",
        "workouts": [
            {"workout_id": "wk_mar_1", "title": "Lungo 32K", "day": 1, "estimated_duration_min": 180, "estimated_distance_km": 32.0, "steps": [
                {"type": "warmup", "duration_seconds": 600, "description": "Riscaldamento", "target_pace": "6:30/km"},
                {"type": "run", "duration_seconds": 9600, "description": "Lungo lento", "target_pace": "6:00/km"},
                {"type": "stretching", "duration_seconds": 900, "description": "Stretching completo", "target_pace": None},
            ]},
        ],
    },
    {
        "plan_id": "pl_trail",
        "title": "Trail Running — Montagna",
        "description": "6 settimane per prepararsi a una gara trail. Focus su salite, discese tecniche, forza gambe.",
        "level": "intermediate", "duration_weeks": 6, "workouts_per_week": 4,
        "is_premium": False, "required_tier": "performance",
        "image_url": "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800",
        "workouts": [
            {"workout_id": "wk_tr_1", "title": "Salite ripetute", "day": 1, "estimated_duration_min": 60, "estimated_distance_km": 8.0, "steps": [
                {"type": "warmup", "duration_seconds": 600, "description": "Riscaldamento piano", "target_pace": "6:30/km"},
                {"type": "gymnastics", "duration_seconds": 300, "description": "Skip + calciate, 3 serie", "target_pace": None},
                *[step for _ in range(6) for step in [
                    {"type": "sprint", "duration_seconds": 90, "description": "Salita forte", "target_pace": None},
                    {"type": "recovery", "duration_seconds": 120, "description": "Discesa recupero", "target_pace": None},
                ]],
                {"type": "stretching", "duration_seconds": 600, "description": "Stretching gambe", "target_pace": None},
            ]},
        ],
    },
    {
        "plan_id": "pl_progressione_10",
        "title": "Regola del +10% — Sicurezza",
        "description": "4 settimane di carico progressivo sicuro (+10%/settimana). Previene infortuni e costruisce base aerobica.",
        "level": "beginner", "duration_weeks": 4, "workouts_per_week": 4,
        "is_premium": False, "required_tier": "performance",
        "image_url": "https://images.unsplash.com/photo-1606889464198-fcb18894cf50?w=800",
        "workouts": [
            {"workout_id": "wk_p10_1", "title": "Base aerobica 6K", "day": 1, "estimated_duration_min": 40, "estimated_distance_km": 6.0, "steps": [
                {"type": "warmup", "duration_seconds": 600, "description": "Camminata + mobilita'", "target_pace": None},
                {"type": "run", "duration_seconds": 1800, "description": "Corsa aerobica", "target_pace": "6:00/km"},
                {"type": "gymnastics", "duration_seconds": 300, "description": "Core: plank, bird-dog, glute bridge", "target_pace": None},
                {"type": "stretching", "duration_seconds": 480, "description": "Stretching", "target_pace": None},
            ]},
        ],
    },
]

@api_router.get("/plans")
async def list_plans(user: dict = Depends(get_current_user)):
    # Add tier info and accessibility to plans
    tier = user_tier(user)
    plans = []
    for p in PREDEFINED_PLANS:
        pc = dict(p)
        pc["locked"] = not has_tier(user, pc.get("required_tier", "free"))
        plans.append(pc)
    # User's AI-generated plans
    custom = await db.plans.find({"created_by": user["user_id"]}, {"_id": 0}).to_list(100)
    for c in custom:
        c["locked"] = False
    return {"predefined": plans, "custom": custom, "user_tier": tier}

@api_router.get("/plans/{plan_id}")
async def get_plan(plan_id: str, user: dict = Depends(get_current_user)):
    for p in PREDEFINED_PLANS:
        if p["plan_id"] == plan_id:
            req = p.get("required_tier", "free")
            # Return plan info but flag if locked (frontend can show paywall on start)
            out = dict(p)
            out["locked"] = not has_tier(user, req)
            return out
    plan = await db.plans.find_one({"plan_id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Piano non trovato")
    if plan.get("created_by") != user["user_id"]:
        raise HTTPException(status_code=403, detail="Non autorizzato")
    plan["locked"] = False
    return plan

@api_router.post("/plans/ai-generate")
async def ai_generate_plan(data: AIGenerateRequest, user: dict = Depends(require_tier("performance"))):
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
        # Use Anthropic SDK directly. If ANTHROPIC_API_KEY is set we use it,
        # otherwise we use EMERGENT_LLM_KEY via Emergent's proxy (only works from within Emergent).
        api_key = ANTHROPIC_API_KEY or EMERGENT_LLM_KEY
        if not api_key:
            raise HTTPException(status_code=503, detail="AI Coach non configurato. Contatta il supporto.")
        base_url = None
        if not ANTHROPIC_API_KEY and EMERGENT_LLM_KEY:
            base_url = os.environ.get("EMERGENT_LLM_BASE_URL", "https://integrations.emergentagent.com/llm/anthropic")
        anthro = AsyncAnthropic(api_key=api_key, base_url=base_url) if base_url else AsyncAnthropic(api_key=api_key)
        try:
            msg = await asyncio.wait_for(
                anthro.messages.create(
                    model="claude-sonnet-4-5-20250929",
                    max_tokens=4096,
                    system=system_msg,
                    messages=[{"role": "user", "content": prompt}],
                ),
                timeout=90.0,
            )
            resp = msg.content[0].text if msg.content else ""
        except asyncio.TimeoutError:
            raise HTTPException(status_code=504, detail="L'AI sta impiegando troppo tempo. Riprova tra qualche istante.")
        # Extract JSON
        match = re.search(r'\{.*\}', resp, re.DOTALL)
        raw = match.group(0) if match else resp
        parsed = json.loads(raw)
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"AI JSON parse error: {e}")
        raise HTTPException(status_code=502, detail="Risposta AI non valida. Riprova.")
    except Exception as e:
        logger.error(f"AI generate error: {e}")
        msg = str(e)
        if "502" in msg or "BadGateway" in msg:
            raise HTTPException(status_code=503, detail="Servizio AI momentaneamente non disponibile. Riprova tra qualche minuto.")
        raise HTTPException(status_code=500, detail=f"Errore generazione AI: {msg[:200]}")

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
    # Award badges
    try:
        newly_awarded = await award_badges(user["user_id"])
        doc["newly_awarded_badges"] = newly_awarded
    except Exception as e:
        logger.error(f"badge award error: {e}")
        doc["newly_awarded_badges"] = []
    return doc

@api_router.get("/workouts/history")
async def workouts_history(user: dict = Depends(get_current_user)):
    limit = 10 if user_tier(user) == "free" else 200
    sessions = await db.workout_sessions.find(
        {"user_id": user["user_id"]}, {"_id": 0, "locations": 0}
    ).sort("completed_at", -1).to_list(limit)
    return sessions

@api_router.get("/workouts/{session_id}")
async def workout_detail(session_id: str, user: dict = Depends(get_current_user)):
    doc = await db.workout_sessions.find_one(
        {"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    return doc

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

# ----------------- Weekly chart (Performance+) -----------------
@api_router.get("/stats/weekly")
async def stats_weekly(user: dict = Depends(require_tier("performance"))):
    now = datetime.now(timezone.utc)
    # last 8 weeks
    start = now - timedelta(days=56)
    pipeline = [
        {"$match": {"user_id": user["user_id"], "completed_at": {"$gte": start}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%U", "date": "$completed_at"}},
            "distance": {"$sum": "$distance_km"},
            "duration": {"$sum": "$duration_seconds"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    res = await db.workout_sessions.aggregate(pipeline).to_list(20)
    return [{"week": r["_id"], "distance_km": round(r["distance"] or 0, 2),
             "duration_seconds": int(r["duration"] or 0), "count": int(r["count"] or 0)} for r in res]

# ----------------- Race predictor (Performance+, Riegel formula) -----------------
class RacePredictRequest(BaseModel):
    recent_distance_km: float
    recent_time_seconds: int

@api_router.post("/stats/predict-races")
async def predict_races(data: RacePredictRequest, user: dict = Depends(require_tier("performance"))):
    # Riegel: T2 = T1 * (D2/D1)^1.06
    if data.recent_distance_km <= 0 or data.recent_time_seconds <= 0:
        raise HTTPException(status_code=400, detail="Valori non validi")
    d1, t1 = data.recent_distance_km, data.recent_time_seconds
    races = {"5K": 5.0, "10K": 10.0, "Mezza": 21.0975, "Maratona": 42.195}
    predictions = {}
    for name, d2 in races.items():
        t2 = t1 * (d2 / d1) ** 1.06
        predictions[name] = {
            "distance_km": d2,
            "seconds": int(t2),
            "hms": format_hms(int(t2)),
            "pace_min_per_km": round((t2 / 60) / d2, 2),
        }
    # Also compute VO2max estimate (Jack Daniels)
    pace_m_per_min = (d1 * 1000) / (t1 / 60) if t1 else 0
    vo2 = 0
    if pace_m_per_min > 0:
        t_min = t1 / 60
        vo2 = (-4.60 + 0.182258 * pace_m_per_min + 0.000104 * pace_m_per_min ** 2) / \
              (0.8 + 0.1894393 * (2.71828 ** (-0.012778 * t_min)) + 0.2989558 * (2.71828 ** (-0.1932605 * t_min)))
        vo2 = round(max(0, vo2), 1)
    return {"predictions": predictions, "vo2max_estimate": vo2}

def format_hms(s: int) -> str:
    h = s // 3600; m = (s % 3600) // 60; sec = s % 60
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"

# ----------------- Coach athletes (Elite) -----------------
class AthleteInviteRequest(BaseModel):
    email: EmailStr
    name: str

@api_router.get("/coach/athletes")
async def list_athletes(user: dict = Depends(require_tier("elite"))):
    items = await db.athletes.find({"coach_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return items

@api_router.post("/coach/athletes")
async def add_athlete(data: AthleteInviteRequest, user: dict = Depends(require_tier("elite"))):
    count = await db.athletes.count_documents({"coach_id": user["user_id"]})
    if count >= 10:
        raise HTTPException(status_code=400, detail="Limite di 10 atleti raggiunto")
    existing_user = await db.users.find_one({"email": data.email.lower()}, {"_id": 0, "password_hash": 0})
    doc = {
        "athlete_id": f"ath_{uuid.uuid4().hex[:10]}",
        "coach_id": user["user_id"],
        "email": data.email.lower(),
        "name": data.name,
        "status": "linked" if existing_user else "invited",
        "linked_user_id": existing_user["user_id"] if existing_user else None,
        "created_at": datetime.now(timezone.utc),
    }
    await db.athletes.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc

@api_router.delete("/coach/athletes/{athlete_id}")
async def remove_athlete(athlete_id: str, user: dict = Depends(require_tier("elite"))):
    res = await db.athletes.delete_one({"athlete_id": athlete_id, "coach_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Atleta non trovato")
    return {"ok": True}

# ----------------- Stripe (Native SDK, Full Subscriptions) -----------------
PACKAGES = {
    "starter_monthly":     {"tier": "starter",     "amount": 499,   "currency": "eur", "label": "Allenati Mensile",  "interval": "month", "duration_days": 30},
    "starter_yearly":      {"tier": "starter",     "amount": 3999,  "currency": "eur", "label": "Allenati Annuale",  "interval": "year",  "duration_days": 365},
    "performance_monthly": {"tier": "performance", "amount": 899,   "currency": "eur", "label": "Competi Mensile",   "interval": "month", "duration_days": 30},
    "performance_yearly":  {"tier": "performance", "amount": 7999,  "currency": "eur", "label": "Competi Annuale",   "interval": "year",  "duration_days": 365},
    "elite_monthly":       {"tier": "elite",       "amount": 1499,  "currency": "eur", "label": "Coach Mensile",     "interval": "month", "duration_days": 30},
    "elite_yearly":        {"tier": "elite",       "amount": 12999, "currency": "eur", "label": "Coach Annuale",     "interval": "year",  "duration_days": 365},
}

_stripe_price_ids: Dict[str, str] = {}

async def _ensure_stripe_products_and_prices():
    """Create Stripe Products + Recurring Prices idempotently. Cached per process."""
    global _stripe_price_ids
    if _stripe_price_ids:
        return _stripe_price_ids
    if not STRIPE_API_KEY or STRIPE_API_KEY.startswith("sk_test_emergent") or STRIPE_API_KEY == "sk_test_emergent":
        return {}
    try:
        existing = await asyncio.to_thread(
            lambda: stripe.Product.list(limit=100, active=True)
        )
        by_name = {p["name"]: p for p in existing["data"]}
        for pkg_id, pkg in PACKAGES.items():
            product_name = f"RunHub - {pkg['label']}"
            product = by_name.get(product_name)
            if not product:
                product = await asyncio.to_thread(
                    lambda: stripe.Product.create(
                        name=product_name,
                        metadata={"package_id": pkg_id, "tier": pkg["tier"]},
                    )
                )
            # Find matching price or create
            prices = await asyncio.to_thread(
                lambda: stripe.Price.list(product=product["id"], active=True, limit=10)
            )
            match = None
            for pr in prices["data"]:
                if (pr["unit_amount"] == pkg["amount"] and
                    pr["currency"] == pkg["currency"] and
                    pr.get("recurring") and
                    pr["recurring"]["interval"] == pkg["interval"]):
                    match = pr
                    break
            if not match:
                match = await asyncio.to_thread(
                    lambda: stripe.Price.create(
                        product=product["id"],
                        unit_amount=pkg["amount"],
                        currency=pkg["currency"],
                        recurring={"interval": pkg["interval"]},
                        metadata={"package_id": pkg_id, "tier": pkg["tier"]},
                    )
                )
            _stripe_price_ids[pkg_id] = match["id"]
        logger.info(f"Stripe prices initialized: {len(_stripe_price_ids)} entries")
        return _stripe_price_ids
    except Exception as e:
        logger.error(f"Stripe products init failed: {e}")
        return {}

@api_router.get("/stripe/packages")
async def stripe_packages():
    # Return human-friendly amounts (eur, not cents)
    return {
        k: {**v, "amount": v["amount"] / 100.0}
        for k, v in PACKAGES.items()
    }

async def _ensure_customer(user: dict) -> str:
    """Return Stripe customer id for user, creating it if missing."""
    cust_id = user.get("stripe_customer_id")
    if cust_id:
        return cust_id
    try:
        cust = await asyncio.to_thread(
            lambda: stripe.Customer.create(
                email=user["email"],
                name=user.get("name") or user["email"].split("@")[0],
                metadata={"user_id": user["user_id"]},
            )
        )
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"stripe_customer_id": cust["id"]}})
        return cust["id"]
    except Exception as e:
        logger.error(f"Stripe customer create failed: {e}")
        raise HTTPException(status_code=502, detail="Impossibile creare cliente Stripe")

@api_router.post("/stripe/checkout")
async def stripe_checkout(data: CheckoutRequest, user: dict = Depends(get_current_user)):
    if data.package_id not in PACKAGES:
        raise HTTPException(status_code=400, detail="Pacchetto non valido")
    pkg = PACKAGES[data.package_id]
    # Ensure Stripe products/prices exist
    prices = await _ensure_stripe_products_and_prices()
    price_id = prices.get(data.package_id)
    if not price_id:
        raise HTTPException(status_code=503, detail="Servizio pagamenti non configurato. Controlla STRIPE_API_KEY.")
    # Ensure Stripe customer
    cust_id = await _ensure_customer(user)
    success_url = f"{data.origin_url}/premium-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/premium"
    metadata = {"user_id": user["user_id"], "package_id": data.package_id, "tier": pkg["tier"]}
    try:
        session = await asyncio.to_thread(
            lambda: stripe.checkout.Session.create(
                mode="subscription",
                customer=cust_id,
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
                subscription_data={"metadata": metadata},
                allow_promotion_codes=True,
                billing_address_collection="auto",
                locale="it",
            )
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=502, detail=f"Errore Stripe: {str(e)}")
    await db.payment_transactions.insert_one({
        "session_id": session["id"],
        "user_id": user["user_id"],
        "package_id": data.package_id,
        "amount": pkg["amount"] / 100.0,
        "currency": pkg["currency"],
        "payment_status": "initiated",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc),
    })
    return {"url": session["url"], "session_id": session["id"]}

@api_router.get("/stripe/status/{session_id}")
async def stripe_status(session_id: str, user: dict = Depends(get_current_user)):
    tx = await db.payment_transactions.find_one({"session_id": session_id, "user_id": user["user_id"]}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Sessione pagamento non trovata")
    try:
        session = await asyncio.to_thread(
            lambda: stripe.checkout.Session.retrieve(session_id, expand=["subscription"])
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe: {str(e)}")
    payment_status = session.get("payment_status")
    # Idempotent tier upgrade
    if payment_status == "paid" and tx.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "stripe_subscription_id": session.get("subscription", {}).get("id") if isinstance(session.get("subscription"), dict) else session.get("subscription")}}
        )
        pkg = PACKAGES.get(tx["package_id"], PACKAGES["starter_monthly"])
        expires = datetime.now(timezone.utc) + timedelta(days=pkg["duration_days"])
        sub = session.get("subscription")
        sub_id = sub["id"] if isinstance(sub, dict) else sub
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "tier": pkg["tier"],
                "tier_expires_at": expires,
                "is_premium": True,
                "stripe_subscription_id": sub_id,
                "subscription_status": "active",
            }}
        )
    return {
        "session_id": session_id,
        "status": session.get("status"),
        "payment_status": payment_status,
        "amount_total": session.get("amount_total"),
        "currency": session.get("currency"),
    }

@api_router.post("/stripe/portal")
async def stripe_portal(user: dict = Depends(get_current_user), return_url: str = "https://runhub.app/profile"):
    """Create a Stripe Billing Portal session for self-service subscription management."""
    cust_id = user.get("stripe_customer_id")
    if not cust_id:
        raise HTTPException(status_code=404, detail="Nessun abbonamento attivo")
    try:
        portal = await asyncio.to_thread(
            lambda: stripe.billing_portal.Session.create(
                customer=cust_id,
                return_url=return_url,
            )
        )
        return {"url": portal["url"]}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe Portal: {str(e)}")

@api_router.post("/stripe/cancel")
async def stripe_cancel(user: dict = Depends(get_current_user)):
    """Cancel subscription at period end (user keeps access until expiry)."""
    sub_id = user.get("stripe_subscription_id")
    if not sub_id:
        raise HTTPException(status_code=404, detail="Nessun abbonamento attivo")
    try:
        sub = await asyncio.to_thread(
            lambda: stripe.Subscription.modify(sub_id, cancel_at_period_end=True)
        )
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"subscription_status": "canceling", "subscription_cancel_at": datetime.fromtimestamp(sub.get("cancel_at") or 0, tz=timezone.utc) if sub.get("cancel_at") else None}}
        )
        return {"ok": True, "cancel_at": sub.get("cancel_at"), "status": sub.get("status")}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=502, detail=f"Stripe: {str(e)}")

@api_router.get("/stripe/subscription")
async def stripe_subscription(user: dict = Depends(get_current_user)):
    sub_id = user.get("stripe_subscription_id")
    if not sub_id:
        return {"active": False}
    try:
        sub = await asyncio.to_thread(lambda: stripe.Subscription.retrieve(sub_id))
        return {
            "active": sub["status"] in ("active", "trialing"),
            "status": sub["status"],
            "current_period_end": sub.get("current_period_end"),
            "cancel_at_period_end": sub.get("cancel_at_period_end", False),
            "cancel_at": sub.get("cancel_at"),
            "tier": user.get("tier"),
        }
    except stripe.error.StripeError as e:
        logger.warning(f"Stripe sub retrieve error: {e}")
        return {"active": False, "error": str(e)}

async def _apply_subscription_to_user(subscription: dict):
    """Update user DB state based on Stripe subscription object."""
    metadata = subscription.get("metadata") or {}
    user_id = metadata.get("user_id")
    pkg_id = metadata.get("package_id")
    tier = metadata.get("tier")
    if not user_id or not tier:
        # Find by customer
        cust_id = subscription.get("customer")
        doc = await db.users.find_one({"stripe_customer_id": cust_id})
        if not doc:
            return
        user_id = doc["user_id"]
        # Derive tier from package_id -> PACKAGES
        if pkg_id and pkg_id in PACKAGES:
            tier = PACKAGES[pkg_id]["tier"]
    if not tier:
        return
    status = subscription.get("status")
    current_period_end = subscription.get("current_period_end")
    expires = datetime.fromtimestamp(current_period_end, tz=timezone.utc) if current_period_end else None
    is_active = status in ("active", "trialing")
    update = {
        "stripe_subscription_id": subscription.get("id"),
        "subscription_status": status,
    }
    if is_active:
        update["tier"] = tier
        update["is_premium"] = True
        if expires:
            update["tier_expires_at"] = expires
    elif status in ("canceled", "unpaid", "incomplete_expired"):
        # Keep premium until period end; then revert
        update["tier"] = "free"
        update["is_premium"] = False
    await db.users.update_one({"user_id": user_id}, {"$set": update})

@api_router.post("/webhook/stripe")
async def webhook_stripe(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        if STRIPE_WEBHOOK_SECRET and not STRIPE_WEBHOOK_SECRET.startswith("whsec_placeholder"):
            event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
        else:
            # No signing secret configured: parse without verification (DEV ONLY)
            event = json.loads(body)
            logger.warning("STRIPE_WEBHOOK_SECRET missing: processing without signature verification")
    except Exception as e:
        logger.error(f"Webhook signature invalid: {e}")
        return JSONResponse(status_code=400, content={"error": "Invalid signature"})

    etype = event.get("type") if isinstance(event, dict) else event["type"]
    obj = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event["data"]["object"]

    try:
        if etype == "checkout.session.completed":
            sub_id = obj.get("subscription")
            if sub_id:
                sub = await asyncio.to_thread(lambda: stripe.Subscription.retrieve(sub_id))
                await _apply_subscription_to_user(sub)
            await db.payment_transactions.update_one(
                {"session_id": obj.get("id")},
                {"$set": {"payment_status": "paid"}}
            )
            # Email receipt (fire-and-forget)
            cust_email = obj.get("customer_details", {}).get("email") or obj.get("customer_email")
            amount = (obj.get("amount_total") or 0) / 100.0
            currency = (obj.get("currency") or "eur").upper()
            if cust_email:
                asyncio.create_task(send_email(
                    cust_email,
                    f"{APP_NAME}: pagamento confermato",
                    f"""<html><body style='font-family:sans-serif;background:#09090B;color:#fff;padding:32px;'>
                    <h1 style='color:#FF3B30;'>RUN<span style='color:#fff;'>HUB</span></h1>
                    <h2>Pagamento confermato! 🎉</h2>
                    <p>Grazie per il tuo supporto. L'abbonamento e' attivo.</p>
                    <div style='background:#18181B;padding:24px;border-radius:12px;'>
                      <b>Importo:</b> {amount:.2f} {currency}<br>
                      <b>ID sessione:</b> {obj.get('id')}
                    </div>
                    <p>Puoi gestire il tuo abbonamento in qualsiasi momento dall'app.</p>
                    </body></html>""",
                    f"Pagamento di {amount:.2f} {currency} confermato. ID: {obj.get('id')}",
                ))
        elif etype in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
            await _apply_subscription_to_user(obj)
        elif etype == "invoice.payment_failed":
            cust_id = obj.get("customer")
            doc = await db.users.find_one({"stripe_customer_id": cust_id}, {"_id": 0, "email": 1, "name": 1})
            if doc and doc.get("email"):
                asyncio.create_task(send_email(
                    doc["email"],
                    f"{APP_NAME}: pagamento non riuscito",
                    f"<html><body><p>Ciao {doc.get('name','Runner')}, il pagamento del tuo abbonamento non e' andato a buon fine. Aggiorna il metodo di pagamento dall'app per non perdere l'accesso premium.</p></body></html>",
                    "Pagamento fallito, aggiorna il metodo di pagamento",
                ))
    except Exception as e:
        logger.error(f"Webhook handler error: {e}")
    return {"received": True}

# ----------------- RevenueCat Webhook (Apple/Google IAP sync) -----------------
# Mappa RevenueCat entitlements -> tier interno
_REVENUECAT_ENTITLEMENT_TO_TIER = {
    "elite_tier": "elite",
    "performance_tier": "performance",
    "starter_tier": "starter",
}
# Ordine di priorità (piu' alto primo)
_REVENUECAT_TIER_PRIORITY = ["elite", "performance", "starter"]

async def _apply_revenuecat_entitlements(app_user_id: str, entitlement_ids: list, expires_at_ms: Optional[int] = None, active: bool = True):
    """Aggiorna user.tier basandosi sugli entitlements attivi ricevuti da RevenueCat."""
    if not app_user_id:
        return
    # Trova user (puo' essere user_id = nostro user.user_id)
    user = await db.users.find_one({"user_id": app_user_id})
    if not user:
        # Fallback: prova per email (se RC usa email come user_id)
        user = await db.users.find_one({"email": app_user_id})
    if not user:
        logger.warning(f"[RevenueCat] User non trovato: {app_user_id}")
        return

    # Determina tier piu' alto attivo tra entitlement_ids
    new_tier = "free"
    if active and entitlement_ids:
        tiers_attivi = [_REVENUECAT_ENTITLEMENT_TO_TIER.get(e) for e in entitlement_ids]
        tiers_attivi = [t for t in tiers_attivi if t]
        for priority in _REVENUECAT_TIER_PRIORITY:
            if priority in tiers_attivi:
                new_tier = priority
                break

    update = {
        "tier": new_tier,
        "is_premium": new_tier != "free",
        "updated_at": datetime.now(timezone.utc),
        "revenuecat_app_user_id": app_user_id,
    }
    if expires_at_ms:
        update["subscription_expires_at"] = datetime.fromtimestamp(expires_at_ms / 1000, tz=timezone.utc)

    await db.users.update_one({"user_id": user["user_id"]}, {"$set": update})
    logger.info(f"[RevenueCat] User {app_user_id} -> tier={new_tier} (entitlements={entitlement_ids})")


@api_router.post("/webhook/revenuecat")
async def webhook_revenuecat(request: Request):
    """
    Riceve eventi webhook da RevenueCat (IAP Apple/Google).
    Eventi supportati: INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, CANCELLATION,
    EXPIRATION, BILLING_ISSUE, UNCANCELLATION, SUBSCRIPTION_PAUSED, TRANSFER, TEST.

    Autenticazione via header Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>
    configurato nella dashboard RevenueCat.
    """
    # Verifica autorizzazione (se configurata)
    if REVENUECAT_WEBHOOK_AUTH:
        auth_header = request.headers.get("Authorization", "")
        expected = f"Bearer {REVENUECAT_WEBHOOK_AUTH}"
        if auth_header != expected:
            logger.warning(f"[RevenueCat] Auth header invalido: {auth_header[:20]}...")
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})
    else:
        logger.warning("[RevenueCat] REVENUECAT_WEBHOOK_AUTH non configurato: skip verifica (DEV ONLY)")

    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"[RevenueCat] JSON invalido: {e}")
        return JSONResponse(status_code=400, content={"error": "Invalid JSON"})

    event = payload.get("event", {})
    event_type = event.get("type", "UNKNOWN")
    app_user_id = event.get("app_user_id") or event.get("original_app_user_id")
    entitlement_ids = event.get("entitlement_ids") or []
    expires_at_ms = event.get("expiration_at_ms")

    logger.info(f"[RevenueCat] Event: {event_type} user={app_user_id} entitlements={entitlement_ids}")

    # Eventi che attivano / rinnovano subscription
    ACTIVATE_EVENTS = {"INITIAL_PURCHASE", "RENEWAL", "UNCANCELLATION", "PRODUCT_CHANGE", "TRANSFER", "NON_RENEWING_PURCHASE"}
    # Eventi che disattivano
    DEACTIVATE_EVENTS = {"EXPIRATION", "CANCELLATION"}
    # Eventi informativi (nessuna azione su tier)
    INFO_EVENTS = {"TEST", "SUBSCRIBER_ALIAS", "BILLING_ISSUE", "SUBSCRIPTION_PAUSED"}

    try:
        if event_type in ACTIVATE_EVENTS:
            await _apply_revenuecat_entitlements(app_user_id, entitlement_ids, expires_at_ms, active=True)
        elif event_type in DEACTIVATE_EVENTS:
            # EXPIRATION: l'entitlement non e' piu' attivo, riportiamo a free
            # CANCELLATION: l'utente ha disdetto ma e' ancora attivo fino a expires_at
            if event_type == "EXPIRATION":
                await _apply_revenuecat_entitlements(app_user_id, [], None, active=False)
            else:
                # CANCELLATION: lasciamo il tier attivo ma salviamo la scadenza
                user = await db.users.find_one({"user_id": app_user_id}) or await db.users.find_one({"email": app_user_id})
                if user and expires_at_ms:
                    await db.users.update_one(
                        {"user_id": user["user_id"]},
                        {"$set": {
                            "subscription_cancelled": True,
                            "subscription_expires_at": datetime.fromtimestamp(expires_at_ms / 1000, tz=timezone.utc),
                        }}
                    )
        elif event_type in INFO_EVENTS:
            logger.info(f"[RevenueCat] Info event ignorato: {event_type}")
        else:
            logger.warning(f"[RevenueCat] Evento sconosciuto: {event_type}")

        # Log transazione in payment_transactions per audit
        await db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "provider": "revenuecat",
            "event_type": event_type,
            "app_user_id": app_user_id,
            "entitlement_ids": entitlement_ids,
            "product_id": event.get("product_id"),
            "store": event.get("store"),
            "price": event.get("price"),
            "currency": event.get("currency"),
            "expires_at_ms": expires_at_ms,
            "raw_payload": json.dumps(payload)[:5000],  # limita dimensione
            "created_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.error(f"[RevenueCat] Handler error: {e}", exc_info=True)

    # Rispondi SEMPRE 200 (RevenueCat riprova in caso di errore)
    return {"received": True, "event_type": event_type}

# ----------------- Startup / Seed -----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.workout_sessions.create_index([("user_id", 1), ("completed_at", -1)])
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@runhub.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    # Seed consent (data fittizia per admin di sistema, marcata source="seed")
    seed_consent = {
        "accepted_terms": True,
        "accepted_privacy": True,
        "accepted_at": datetime.now(timezone.utc),
        "terms_version": "seed",
        "privacy_version": "seed",
        "source": "seed",
    }
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "level": "expert",
            "tier": "elite",
            "tier_expires_at": datetime.now(timezone.utc) + timedelta(days=3650),
            "is_premium": True,
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
            "date_of_birth": "1980-01-01",
            "age_at_signup": 45,
            "consent": seed_consent,
            "consent_history": [seed_consent],
        })
    else:
        update = {}
        if not verify_password(admin_password, existing["password_hash"]):
            update["password_hash"] = hash_password(admin_password)
        if existing.get("tier") != "elite":
            update["tier"] = "elite"
            update["tier_expires_at"] = datetime.now(timezone.utc) + timedelta(days=3650)
            update["is_premium"] = True
        if existing.get("role") != "admin":
            update["role"] = "admin"
        # Backfill DOB + consent per admin legacy (fix needs_profile_completion per admin)
        if not existing.get("date_of_birth"):
            update["date_of_birth"] = "1980-01-01"
            update["age_at_signup"] = 45
        if not existing.get("consent") or not (existing.get("consent") or {}).get("accepted_at"):
            update["consent"] = seed_consent
            if not existing.get("consent_history"):
                update["consent_history"] = [seed_consent]
        if update:
            await db.users.update_one({"email": admin_email}, {"$set": update})

# ----------------- Achievements / Badges -----------------
BADGES_DEFS = [
    {"id": "first_run",       "title": "Primo passo",         "description": "Completa la tua prima corsa",              "icon": "flag",          "threshold_type": "count",      "threshold": 1},
    {"id": "five_runs",       "title": "Runner regolare",     "description": "Completa 5 corse",                         "icon": "ribbon",        "threshold_type": "count",      "threshold": 5},
    {"id": "ten_runs",        "title": "Abitudine creata",    "description": "Completa 10 corse",                        "icon": "medal",         "threshold_type": "count",      "threshold": 10},
    {"id": "first_5k",        "title": "Primo 5K",            "description": "Corri 5 km in un'unica sessione",          "icon": "trophy",        "threshold_type": "single_km",  "threshold": 5.0},
    {"id": "first_10k",       "title": "Primo 10K",           "description": "Corri 10 km in un'unica sessione",         "icon": "trophy",        "threshold_type": "single_km",  "threshold": 10.0},
    {"id": "half_marathon",   "title": "Mezza Maratona",      "description": "Corri 21.0975 km in un'unica sessione",    "icon": "star",          "threshold_type": "single_km",  "threshold": 21.0},
    {"id": "total_50km",      "title": "50 km totali",        "description": "Accumula 50 km totali",                    "icon": "flame",         "threshold_type": "total_km",   "threshold": 50.0},
    {"id": "total_100km",     "title": "Centurione",          "description": "Accumula 100 km totali",                   "icon": "flame",         "threshold_type": "total_km",   "threshold": 100.0},
    {"id": "early_bird",      "title": "Uccellino mattutino", "description": "Corri prima delle 8:00",                   "icon": "sunny",         "threshold_type": "early_run",  "threshold": 8},
    {"id": "week_streak",     "title": "Settimana perfetta",  "description": "Corri 3 giorni diversi in una settimana",  "icon": "calendar",      "threshold_type": "week_days",  "threshold": 3},
]

async def award_badges(user_id: str):
    """Check user's stats and award any newly-earned badges. Idempotent."""
    earned = set(a["badge_id"] for a in await db.user_badges.find({"user_id": user_id}, {"_id": 0, "badge_id": 1}).to_list(100))
    # Compute user stats
    count = await db.workout_sessions.count_documents({"user_id": user_id})
    agg = await db.workout_sessions.aggregate([
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "total_km": {"$sum": "$distance_km"}, "max_km": {"$max": "$distance_km"}}},
    ]).to_list(1)
    total_km = (agg[0].get("total_km", 0) or 0) if agg else 0
    max_km = (agg[0].get("max_km", 0) or 0) if agg else 0
    # Early bird: any session completed before 8:00 UTC (approx)
    early = await db.workout_sessions.find_one({"user_id": user_id, "$expr": {"$lt": [{"$hour": "$completed_at"}, 8]}})
    # Week streak: at least 3 distinct days in current week
    now = datetime.now(timezone.utc)
    start_week = datetime(now.year, now.month, now.day, tzinfo=timezone.utc) - timedelta(days=now.weekday())
    days = await db.workout_sessions.aggregate([
        {"$match": {"user_id": user_id, "completed_at": {"$gte": start_week}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$completed_at"}}}},
    ]).to_list(20)
    distinct_days = len(days)
    newly_awarded = []
    for b in BADGES_DEFS:
        if b["id"] in earned:
            continue
        awarded = False
        if b["threshold_type"] == "count" and count >= b["threshold"]:
            awarded = True
        elif b["threshold_type"] == "single_km" and max_km >= b["threshold"]:
            awarded = True
        elif b["threshold_type"] == "total_km" and total_km >= b["threshold"]:
            awarded = True
        elif b["threshold_type"] == "early_run" and early:
            awarded = True
        elif b["threshold_type"] == "week_days" and distinct_days >= b["threshold"]:
            awarded = True
        if awarded:
            doc = {"user_id": user_id, "badge_id": b["id"], "awarded_at": datetime.now(timezone.utc)}
            await db.user_badges.insert_one(dict(doc))
            newly_awarded.append(b["id"])
    return newly_awarded

@api_router.get("/badges")
async def list_badges(user: dict = Depends(get_current_user)):
    earned = await db.user_badges.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    earned_map = {e["badge_id"]: e.get("awarded_at") for e in earned}
    result = []
    for b in BADGES_DEFS:
        item = dict(b)
        item["earned"] = b["id"] in earned_map
        item["awarded_at"] = earned_map.get(b["id"])
        result.append(item)
    return result

# ----------------- Onboarding -----------------
class OnboardingRequest(BaseModel):
    level: str  # beginner, intermediate, expert
    goal: str   # "5k" | "10k" | "half" | "fitness" | "weight_loss"
    days_per_week: int = 3

@api_router.post("/onboarding")
async def save_onboarding(data: OnboardingRequest, user: dict = Depends(get_current_user)):
    # Recommend a plan based on level + goal
    plan_map = {
        ("beginner", "5k"): "pl_beginner_5k",
        ("beginner", "10k"): "pl_beginner_5k",
        ("beginner", "fitness"): "pl_progressione_10",
        ("beginner", "weight_loss"): "pl_progressione_10",
        ("intermediate", "5k"): "pl_5k_sub30",
        ("intermediate", "10k"): "pl_intermediate_10k",
        ("intermediate", "half"): "pl_expert_half",
        ("intermediate", "fitness"): "pl_intermediate_10k",
        ("expert", "5k"): "pl_5k_sub30",
        ("expert", "10k"): "pl_10k_competitivo",
        ("expert", "half"): "pl_mezza_performance",
        ("expert", "fitness"): "pl_10k_competitivo",
    }
    recommended = plan_map.get((data.level, data.goal), "pl_beginner_5k")
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"level": data.level, "goal": data.goal, "days_per_week": data.days_per_week,
                  "onboarding_completed": True, "recommended_plan": recommended}}
    )
    return {"ok": True, "recommended_plan_id": recommended}

# ----------------- Social (Friends, Feed, Likes, Comments, Leaderboard) -----------------

class FriendRequestIn(BaseModel):
    email: EmailStr

class CommentIn(BaseModel):
    text: str

def _friend_pair(a: str, b: str) -> List[str]:
    return sorted([a, b])

async def _users_map(user_ids: List[str]) -> Dict[str, dict]:
    if not user_ids:
        return {}
    docs = await db.users.find(
        {"user_id": {"$in": list(set(user_ids))}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "tier": 1}
    ).to_list(1000)
    return {d["user_id"]: d for d in docs}

async def _are_friends(uid_a: str, uid_b: str) -> bool:
    if uid_a == uid_b:
        return True
    pair = _friend_pair(uid_a, uid_b)
    f = await db.friendships.find_one({"users": pair, "status": "accepted"})
    return f is not None

async def _friend_ids(user_id: str) -> List[str]:
    cur = db.friendships.find({"users": user_id, "status": "accepted"})
    ids: List[str] = []
    async for f in cur:
        for u in f["users"]:
            if u != user_id:
                ids.append(u)
    return ids

@api_router.post("/social/friends/request")
async def social_friend_request(data: FriendRequestIn, user: dict = Depends(get_current_user)):
    target = await db.users.find_one({"email": data.email.lower()}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target["user_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="Non puoi inviare una richiesta a te stesso")
    pair = _friend_pair(user["user_id"], target["user_id"])
    existing = await db.friendships.find_one({"users": pair})
    if existing:
        if existing["status"] == "accepted":
            raise HTTPException(status_code=400, detail="Siete gia' amici")
        if existing["status"] == "pending":
            raise HTTPException(status_code=400, detail="Richiesta gia' inviata")
    friendship_id = f"fr_{uuid.uuid4().hex[:12]}"
    await db.friendships.insert_one({
        "friendship_id": friendship_id,
        "users": pair,
        "requested_by": user["user_id"],
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
    })
    return {"ok": True, "friendship_id": friendship_id, "target": target}

@api_router.post("/social/friends/respond/{friendship_id}")
async def social_friend_respond(friendship_id: str, action: str, user: dict = Depends(get_current_user)):
    if action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="Azione non valida")
    f = await db.friendships.find_one({"friendship_id": friendship_id})
    if not f:
        raise HTTPException(status_code=404, detail="Richiesta non trovata")
    if user["user_id"] not in f["users"]:
        raise HTTPException(status_code=403, detail="Non sei parte di questa richiesta")
    if f["requested_by"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="Non puoi rispondere a una tua richiesta")
    if f["status"] != "pending":
        raise HTTPException(status_code=400, detail="Richiesta gia' gestita")
    if action == "accept":
        await db.friendships.update_one(
            {"friendship_id": friendship_id},
            {"$set": {"status": "accepted", "accepted_at": datetime.now(timezone.utc)}}
        )
        return {"ok": True, "status": "accepted"}
    else:
        await db.friendships.delete_one({"friendship_id": friendship_id})
        return {"ok": True, "status": "rejected"}

@api_router.delete("/social/friends/{user_id}")
async def social_unfriend(user_id: str, user: dict = Depends(get_current_user)):
    pair = _friend_pair(user["user_id"], user_id)
    res = await db.friendships.delete_one({"users": pair, "status": "accepted"})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Amicizia non trovata")
    return {"ok": True}

@api_router.get("/social/friends")
async def social_friends_list(user: dict = Depends(get_current_user)):
    friend_ids = await _friend_ids(user["user_id"])
    umap = await _users_map(friend_ids)
    # Attach basic stats
    results = []
    for fid in friend_ids:
        u = umap.get(fid)
        if not u:
            continue
        total = await db.workout_sessions.aggregate([
            {"$match": {"user_id": fid}},
            {"$group": {"_id": None, "km": {"$sum": "$distance_km"}, "count": {"$sum": 1}}}
        ]).to_list(1)
        stats = total[0] if total else {"km": 0.0, "count": 0}
        results.append({
            "user_id": fid,
            "name": u.get("name"),
            "email": u.get("email"),
            "tier": u.get("tier", "free"),
            "total_km": round(stats.get("km") or 0.0, 2),
            "total_runs": stats.get("count") or 0,
        })
    return results

@api_router.get("/social/friends/requests")
async def social_friend_requests_incoming(user: dict = Depends(get_current_user)):
    cur = db.friendships.find({
        "users": user["user_id"],
        "status": "pending",
        "requested_by": {"$ne": user["user_id"]}
    })
    out = []
    async for f in cur:
        other_id = next((u for u in f["users"] if u != user["user_id"]), None)
        if not other_id:
            continue
        other = await db.users.find_one({"user_id": other_id}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
        if other:
            out.append({
                "friendship_id": f["friendship_id"],
                "from": other,
                "created_at": f.get("created_at"),
            })
    return out

@api_router.get("/social/friends/outgoing")
async def social_friend_requests_outgoing(user: dict = Depends(get_current_user)):
    cur = db.friendships.find({
        "users": user["user_id"],
        "status": "pending",
        "requested_by": user["user_id"]
    })
    out = []
    async for f in cur:
        other_id = next((u for u in f["users"] if u != user["user_id"]), None)
        other = await db.users.find_one({"user_id": other_id}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
        if other:
            out.append({
                "friendship_id": f["friendship_id"],
                "to": other,
                "created_at": f.get("created_at"),
            })
    return out

@api_router.get("/social/users/search")
async def social_users_search(q: str, user: dict = Depends(get_current_user)):
    if not q or len(q) < 2:
        return []
    pattern = re.escape(q.strip())
    docs = await db.users.find(
        {
            "$or": [
                {"email": {"$regex": pattern, "$options": "i"}},
                {"name": {"$regex": pattern, "$options": "i"}},
            ],
            "user_id": {"$ne": user["user_id"]},
        },
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "tier": 1}
    ).limit(20).to_list(20)
    # Mark friendship status
    friend_ids = set(await _friend_ids(user["user_id"]))
    pending_ids: set = set()
    async for f in db.friendships.find({"users": user["user_id"], "status": "pending"}):
        for u in f["users"]:
            if u != user["user_id"]:
                pending_ids.add(u)
    for d in docs:
        if d["user_id"] in friend_ids:
            d["relation"] = "friend"
        elif d["user_id"] in pending_ids:
            d["relation"] = "pending"
        else:
            d["relation"] = "none"
    return docs

@api_router.get("/social/feed")
async def social_feed(user: dict = Depends(get_current_user)):
    friend_ids = await _friend_ids(user["user_id"])
    user_ids = friend_ids + [user["user_id"]]
    sessions = await db.workout_sessions.find(
        {"user_id": {"$in": user_ids}}, {"_id": 0, "locations": 0}
    ).sort("completed_at", -1).to_list(80)
    if not sessions:
        return []
    umap = await _users_map([s["user_id"] for s in sessions])
    session_ids = [s["session_id"] for s in sessions]
    # Likes aggregation
    likes_agg = await db.workout_likes.aggregate([
        {"$match": {"session_id": {"$in": session_ids}}},
        {"$group": {"_id": "$session_id", "count": {"$sum": 1}, "users": {"$push": "$user_id"}}}
    ]).to_list(len(session_ids))
    likes_map = {l["_id"]: l for l in likes_agg}
    # Comments count
    comments_agg = await db.workout_comments.aggregate([
        {"$match": {"session_id": {"$in": session_ids}}},
        {"$group": {"_id": "$session_id", "count": {"$sum": 1}}}
    ]).to_list(len(session_ids))
    comments_map = {c["_id"]: c["count"] for c in comments_agg}
    out = []
    for s in sessions:
        u = umap.get(s["user_id"], {})
        lk = likes_map.get(s["session_id"], {"count": 0, "users": []})
        out.append({
            "session_id": s["session_id"],
            "user": {
                "user_id": s["user_id"],
                "name": u.get("name", "Runner"),
                "tier": u.get("tier", "free"),
            },
            "title": s.get("title", "Corsa"),
            "distance_km": s.get("distance_km", 0),
            "duration_seconds": s.get("duration_seconds", 0),
            "avg_pace_min_per_km": s.get("avg_pace_min_per_km"),
            "calories": s.get("calories", 0),
            "completed_at": s.get("completed_at"),
            "likes_count": lk["count"],
            "liked_by_me": user["user_id"] in lk.get("users", []),
            "comments_count": comments_map.get(s["session_id"], 0),
        })
    return out

@api_router.post("/social/workouts/{session_id}/like")
async def social_like(session_id: str, user: dict = Depends(get_current_user)):
    session = await db.workout_sessions.find_one({"session_id": session_id}, {"_id": 0, "user_id": 1})
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    if session["user_id"] != user["user_id"] and not await _are_friends(user["user_id"], session["user_id"]):
        raise HTTPException(status_code=403, detail="Non autorizzato")
    existing = await db.workout_likes.find_one({"session_id": session_id, "user_id": user["user_id"]})
    if existing:
        return {"ok": True, "already_liked": True}
    await db.workout_likes.insert_one({
        "like_id": f"lk_{uuid.uuid4().hex[:12]}",
        "session_id": session_id,
        "user_id": user["user_id"],
        "created_at": datetime.now(timezone.utc),
    })
    count = await db.workout_likes.count_documents({"session_id": session_id})
    return {"ok": True, "likes_count": count}

@api_router.delete("/social/workouts/{session_id}/like")
async def social_unlike(session_id: str, user: dict = Depends(get_current_user)):
    await db.workout_likes.delete_one({"session_id": session_id, "user_id": user["user_id"]})
    count = await db.workout_likes.count_documents({"session_id": session_id})
    return {"ok": True, "likes_count": count}

@api_router.get("/social/workouts/{session_id}/comments")
async def social_comments_list(session_id: str, user: dict = Depends(get_current_user)):
    session = await db.workout_sessions.find_one({"session_id": session_id}, {"_id": 0, "user_id": 1})
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    if session["user_id"] != user["user_id"] and not await _are_friends(user["user_id"], session["user_id"]):
        raise HTTPException(status_code=403, detail="Non autorizzato")
    comments = await db.workout_comments.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    umap = await _users_map([c["user_id"] for c in comments])
    for c in comments:
        u = umap.get(c["user_id"], {})
        c["user_name"] = u.get("name", "Runner")
    return comments

@api_router.post("/social/workouts/{session_id}/comments")
async def social_comment_add(session_id: str, data: CommentIn, user: dict = Depends(get_current_user)):
    text = (data.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Commento vuoto")
    if len(text) > 500:
        raise HTTPException(status_code=400, detail="Commento troppo lungo (max 500 caratteri)")
    session = await db.workout_sessions.find_one({"session_id": session_id}, {"_id": 0, "user_id": 1})
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    if session["user_id"] != user["user_id"] and not await _are_friends(user["user_id"], session["user_id"]):
        raise HTTPException(status_code=403, detail="Non autorizzato")
    comment_id = f"cm_{uuid.uuid4().hex[:12]}"
    doc = {
        "comment_id": comment_id,
        "session_id": session_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", "Runner"),
        "text": text,
        "created_at": datetime.now(timezone.utc),
    }
    await db.workout_comments.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc

@api_router.delete("/social/comments/{comment_id}")
async def social_comment_delete(comment_id: str, user: dict = Depends(get_current_user)):
    c = await db.workout_comments.find_one({"comment_id": comment_id})
    if not c:
        raise HTTPException(status_code=404, detail="Commento non trovato")
    session = await db.workout_sessions.find_one({"session_id": c["session_id"]}, {"_id": 0, "user_id": 1})
    # Allow: comment author or session owner
    if c["user_id"] != user["user_id"] and (not session or session["user_id"] != user["user_id"]):
        raise HTTPException(status_code=403, detail="Non autorizzato")
    await db.workout_comments.delete_one({"comment_id": comment_id})
    return {"ok": True}

@api_router.get("/social/leaderboard")
async def social_leaderboard(period: str = "weekly", metric: str = "km", user: dict = Depends(get_current_user)):
    if period not in ("weekly", "monthly", "all"):
        raise HTTPException(status_code=400, detail="Periodo non valido")
    if metric not in ("km", "runs", "calories"):
        raise HTTPException(status_code=400, detail="Metrica non valida")
    now = datetime.now(timezone.utc)
    if period == "weekly":
        start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc) - timedelta(days=now.weekday())
    elif period == "monthly":
        start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    else:
        start = datetime(1970, 1, 1, tzinfo=timezone.utc)
    friend_ids = await _friend_ids(user["user_id"])
    user_ids = friend_ids + [user["user_id"]]
    match_field = {
        "km": {"$sum": "$distance_km"},
        "runs": {"$sum": 1},
        "calories": {"$sum": "$calories"},
    }[metric]
    pipeline = [
        {"$match": {"user_id": {"$in": user_ids}, "completed_at": {"$gte": start}}},
        {"$group": {"_id": "$user_id", "value": match_field}},
        {"$sort": {"value": -1}},
    ]
    rows = await db.workout_sessions.aggregate(pipeline).to_list(200)
    umap = await _users_map([r["_id"] for r in rows])
    out = []
    for idx, r in enumerate(rows):
        u = umap.get(r["_id"], {})
        out.append({
            "rank": idx + 1,
            "user_id": r["_id"],
            "name": u.get("name", "Runner"),
            "tier": u.get("tier", "free"),
            "value": round(r["value"] or 0, 2) if metric == "km" else int(r["value"] or 0),
            "is_me": r["_id"] == user["user_id"],
        })
    return {"period": period, "metric": metric, "entries": out}

# ----------------- Admin -----------------
@api_router.get("/admin/users")
async def admin_list_users(admin: dict = Depends(require_admin())):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    # Enrich with workout count
    for u in users:
        u["workout_count"] = await db.workout_sessions.count_documents({"user_id": u["user_id"]})
    return users

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin())):
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Impossibile eliminare un admin")
    # Cascade delete related data
    await db.workout_sessions.delete_many({"user_id": user_id})
    await db.goals.delete_many({"user_id": user_id})
    await db.plans.delete_many({"created_by": user_id})
    await db.user_badges.delete_many({"user_id": user_id})
    await db.athletes.delete_many({"$or": [{"coach_id": user_id}, {"linked_user_id": user_id}]})
    await db.payment_transactions.delete_many({"user_id": user_id})
    await db.users.delete_one({"user_id": user_id})
    return {"ok": True, "deleted_user_id": user_id, "email": target.get("email")}

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
