"""
RunHub Weather Router
GET /api/weather — Returns weather conditions for share cards using Open-Meteo.
Extracted from server.py (1.6.2) for modular scaling.
"""
import logging
from datetime import datetime
from typing import Optional

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


def build_weather_router(get_current_user_dep) -> APIRouter:
    """
    Factory che riceve la dipendenza auth e ritorna l'APIRouter configurato.
    Permette di evitare import circolari con server.py.
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
            target_dt = None
            if timestamp:
                try:
                    target_dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                except Exception:
                    target_dt = None

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

    return router
