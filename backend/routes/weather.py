"""
RunHub Weather Router
GET /api/weather — Returns weather conditions for share cards using Open-Meteo.
GET /api/weather/forecast — Returns 7-day forecast for Lab widget.
Extracted from server.py (1.6.2) for modular scaling.
"""
import logging
from datetime import datetime
from typing import Optional, Any

import httpx
from fastapi import APIRouter, Depends

logger = logging.getLogger("server")

router = APIRouter(tags=["weather"])


def _wmo_label_icon(code: int) -> tuple[str, str]:
    """Map WMO weather code → human label + icon name."""
    if code == 0:
        return ("Sereno", "sun")
    if code <= 3:
        return ("Poco nuvoloso", "cloud-sun")
    if code <= 48:
        return ("Nebbia", "cloud-fog")
    if code <= 67:
        return ("Pioggia", "cloud-rain")
    if code <= 77:
        return ("Neve", "cloud-snow")
    if code <= 82:
        return ("Acquazzoni", "cloud-rain")
    if code <= 99:
        return ("Temporale", "cloud-lightning")
    return ("—", "cloud")


def build_weather_router(get_current_user_dep, db: Any = None) -> APIRouter:
    """
    Factory che riceve la dipendenza auth (e opzionalmente il client db) e
    ritorna l'APIRouter configurato. Permette di evitare import circolari con server.py.
    """

    @router.get("/weather")
    async def weather_for_share(
        lat: float,
        lon: float,
        timestamp: Optional[str] = None,
        user: dict = Depends(get_current_user_dep),
    ):
        """
        Restituisce condizioni meteo per share card.
        Provider: open-meteo.com (gratis, no auth, ~10k req/giorno).
        """
        try:
            # Reserved for future historical lookup (Open-Meteo /v1/archive)
            if timestamp:
                try:
                    _ = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                except Exception:
                    pass

            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
                "timezone": "auto",
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(url, params=params)
                r.raise_for_status()
                data = r.json()

            cur = data.get("current") or {}
            wc = int(cur.get("weather_code") or 0)
            label, icon = _wmo_label_icon(wc)
            return {
                "temperature_c": round(float(cur.get("temperature_2m") or 0)),
                "humidity_pct": round(float(cur.get("relative_humidity_2m") or 0)),
                "wind_kmh": round(float(cur.get("wind_speed_10m") or 0)),
                "weather_code": wc,
                "label": label,
                "icon": icon,
            }
        except Exception as e:
            logger.warning(f"weather fetch error: {e}")
            return {
                "temperature_c": None,
                "humidity_pct": None,
                "wind_kmh": None,
                "weather_code": None,
                "label": None,
                "icon": "cloud",
            }

    @router.get("/weather/forecast")
    async def weather_forecast(
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        user: dict = Depends(get_current_user_dep),
    ):
        """
        Restituisce previsioni meteo per i prossimi 7 giorni.
        - Se lat/lon non sono forniti, prova a usare la posizione dell'ultima
          sessione importata dell'utente.
        - Provider: open-meteo.com (gratis, no auth).
        """
        # Resolve coordinates: query params first, then fallback to latest workout
        resolved_lat: Optional[float] = lat
        resolved_lng: Optional[float] = lon

        if (resolved_lat is None or resolved_lng is None) and db is not None:
            try:
                user_id = user.get("user_id") or user.get("id") or user.get("_id")
                # Most recent workout that has location data
                latest = await db.workout_sessions.find_one(
                    {
                        "user_id": user_id,
                        "locations": {"$exists": True, "$ne": []},
                    },
                    sort=[("completed_at", -1)],
                )
                if latest:
                    locs = latest.get("locations") or []
                    for loc in locs:
                        la = loc.get("lat")
                        ln = loc.get("lng") if loc.get("lng") is not None else loc.get("lon")
                        if la is not None and ln is not None:
                            resolved_lat = float(la)
                            resolved_lng = float(ln)
                            break
            except Exception as e:
                logger.warning(f"weather/forecast fallback lookup error: {e}")

        if resolved_lat is None or resolved_lng is None:
            return {
                "available": False,
                "reason": "no_location",
                "lat": None,
                "lng": None,
                "days": [],
            }

        try:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": resolved_lat,
                "longitude": resolved_lng,
                "daily": ",".join([
                    "weather_code",
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_probability_max",
                    "wind_speed_10m_max",
                    "sunrise",
                    "sunset",
                ]),
                "current": "temperature_2m,weather_code",
                "timezone": "auto",
                "forecast_days": 7,
            }
            async with httpx.AsyncClient(timeout=8.0) as client:
                r = await client.get(url, params=params)
                r.raise_for_status()
                data = r.json()

            daily = data.get("daily") or {}
            cur = data.get("current") or {}
            times = daily.get("time") or []
            codes = daily.get("weather_code") or []
            tmax = daily.get("temperature_2m_max") or []
            tmin = daily.get("temperature_2m_min") or []
            pprob = daily.get("precipitation_probability_max") or []
            wmax = daily.get("wind_speed_10m_max") or []

            days = []
            for i, t in enumerate(times):
                wc = int(codes[i]) if i < len(codes) and codes[i] is not None else 0
                label, icon = _wmo_label_icon(wc)
                days.append({
                    "date": t,
                    "weather_code": wc,
                    "label": label,
                    "icon": icon,
                    "temp_max_c": round(float(tmax[i])) if i < len(tmax) and tmax[i] is not None else None,
                    "temp_min_c": round(float(tmin[i])) if i < len(tmin) and tmin[i] is not None else None,
                    "precip_prob_pct": round(float(pprob[i])) if i < len(pprob) and pprob[i] is not None else None,
                    "wind_kmh_max": round(float(wmax[i])) if i < len(wmax) and wmax[i] is not None else None,
                })

            cur_wc = int(cur.get("weather_code") or 0)
            cur_label, cur_icon = _wmo_label_icon(cur_wc)

            return {
                "available": True,
                "lat": resolved_lat,
                "lng": resolved_lng,
                "timezone": data.get("timezone"),
                "current": {
                    "temperature_c": round(float(cur.get("temperature_2m") or 0)) if cur.get("temperature_2m") is not None else None,
                    "weather_code": cur_wc,
                    "label": cur_label,
                    "icon": cur_icon,
                },
                "days": days,
            }
        except Exception as e:
            logger.warning(f"weather/forecast fetch error: {e}")
            return {
                "available": False,
                "reason": "fetch_error",
                "lat": resolved_lat,
                "lng": resolved_lng,
                "days": [],
            }

    return router
