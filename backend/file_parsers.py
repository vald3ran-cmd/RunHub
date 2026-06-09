"""
file_parsers.py — Parser per file di tracciamento attività.

Formati supportati:
  - .gpx (XML, standard GPS)
  - .fit (Garmin/Strava binary format)
  - .tcx (Garmin Training Center XML)

Output normalizzato pronto da convertire in workout_session:
  {
    "distance_km": float,
    "duration_seconds": int,
    "avg_pace_min_per_km": float | None,
    "calories": float | None,
    "elevation_gain_m": float | None,
    "activity_type": "run" | "bike" | "walk",
    "started_at": datetime | None,
    "splits": [{"km", "pace_min_per_km", "duration_seconds"}],
    "locations": [{"lat", "lon", "elev", "ts"}],
    "raw_format": "gpx" | "fit" | "tcx",
  }
"""
from __future__ import annotations

import io
import math
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import gpxpy
import fitparse
from lxml import etree

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────
def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _compute_splits(locations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Calcola split km-per-km dalle locazioni."""
    if not locations or len(locations) < 2:
        return []
    splits: List[Dict[str, Any]] = []
    total_km = 0.0
    current_km_target = 1.0
    km_start_ts = locations[0].get("ts")
    last = locations[0]
    for cur in locations[1:]:
        try:
            inc = _haversine_km(last["lat"], last["lon"], cur["lat"], cur["lon"])
            total_km += inc
            while total_km >= current_km_target and km_start_ts is not None and cur.get("ts") is not None:
                # interpolazione lineare per il punto a esatti current_km_target
                ts_delta = (cur["ts"] - km_start_ts).total_seconds()
                pace_min = (ts_delta / 60.0)
                splits.append({
                    "km": int(current_km_target),
                    "pace_min_per_km": round(pace_min, 3),
                    "duration_seconds": int(ts_delta),
                })
                km_start_ts = cur["ts"]
                current_km_target += 1.0
                if current_km_target > 60:  # safety cap
                    return splits
            last = cur
        except Exception:
            continue
    return splits


def _activity_from_string(s: Optional[str]) -> str:
    if not s:
        return "run"
    s = str(s).lower()
    if "bik" in s or "cycl" in s or "ride" in s:
        return "bike"
    if "walk" in s or "hike" in s:
        return "walk"
    return "run"


def _avg_pace(distance_km: float, duration_seconds: int) -> Optional[float]:
    if distance_km <= 0 or duration_seconds <= 0:
        return None
    return round((duration_seconds / 60.0) / distance_km, 3)


def _elevation_gain(locations: List[Dict[str, Any]]) -> Optional[float]:
    gains = 0.0
    prev_elev = None
    for p in locations:
        e = p.get("elev")
        if e is None:
            continue
        if prev_elev is not None and e > prev_elev:
            gains += (e - prev_elev)
        prev_elev = e
    return round(gains, 1) if gains > 0 else None


# ─────────────────────────────────────────────────────────────
# GPX
# ─────────────────────────────────────────────────────────────
def parse_gpx(blob: bytes) -> Dict[str, Any]:
    text = blob.decode("utf-8", errors="ignore")
    gpx = gpxpy.parse(io.StringIO(text))
    locations: List[Dict[str, Any]] = []
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    activity = "run"

    # GPX activity hint dal trk.type (Strava lo usa)
    for trk in gpx.tracks:
        if trk.type:
            activity = _activity_from_string(trk.type)
        for seg in trk.segments:
            for p in seg.points:
                ts = p.time
                if ts and ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                locations.append({
                    "lat": p.latitude,
                    "lon": p.longitude,
                    "elev": p.elevation,
                    "ts": ts,
                })
                if ts:
                    started_at = started_at or ts
                    ended_at = ts

    distance_km = 0.0
    for i in range(1, len(locations)):
        distance_km += _haversine_km(
            locations[i - 1]["lat"], locations[i - 1]["lon"],
            locations[i]["lat"], locations[i]["lon"],
        )
    duration_seconds = int((ended_at - started_at).total_seconds()) if started_at and ended_at else 0

    return {
        "distance_km": round(distance_km, 3),
        "duration_seconds": duration_seconds,
        "avg_pace_min_per_km": _avg_pace(distance_km, duration_seconds),
        "calories": None,
        "elevation_gain_m": _elevation_gain(locations),
        "activity_type": activity,
        "started_at": started_at,
        "splits": _compute_splits(locations),
        "locations": [
            {"lat": pt["lat"], "lon": pt["lon"], "elev": pt.get("elev")}
            for pt in locations
        ],
        "raw_format": "gpx",
    }


# ─────────────────────────────────────────────────────────────
# TCX  (Training Center XML)
# ─────────────────────────────────────────────────────────────
TCX_NS = {"tc": "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"}


def parse_tcx(blob: bytes) -> Dict[str, Any]:
    root = etree.fromstring(blob, parser=etree.XMLParser(recover=True))
    # Default ns search
    activities = root.findall(".//tc:Activity", TCX_NS)
    if not activities:
        # try without ns
        activities = root.findall(".//Activity")
        ns = ""
    else:
        ns = "tc:"

    def fx(node, path):
        return node.find(path, TCX_NS) if ns else node.find(path)

    def fall(node, path):
        return node.findall(path, TCX_NS) if ns else node.findall(path)

    locations: List[Dict[str, Any]] = []
    activity = "run"
    total_calories = 0.0
    total_distance_m = 0.0
    total_time_s = 0.0
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    for act in activities:
        sport = act.get("Sport") or ""
        activity = _activity_from_string(sport)
        for lap in fall(act, f"{ns}Lap"):
            try:
                total_time_s += float(fx(lap, f"{ns}TotalTimeSeconds").text or 0)
            except Exception:
                pass
            try:
                total_distance_m += float(fx(lap, f"{ns}DistanceMeters").text or 0)
            except Exception:
                pass
            try:
                cal_node = fx(lap, f"{ns}Calories")
                if cal_node is not None and cal_node.text:
                    total_calories += float(cal_node.text)
            except Exception:
                pass
            for tp in fall(lap, f".//{ns}Trackpoint"):
                t = fx(tp, f"{ns}Time")
                ts = None
                if t is not None and t.text:
                    try:
                        ts = datetime.fromisoformat(t.text.replace("Z", "+00:00"))
                        if ts.tzinfo is None:
                            ts = ts.replace(tzinfo=timezone.utc)
                    except Exception:
                        ts = None
                pos = fx(tp, f"{ns}Position")
                lat = lon = None
                if pos is not None:
                    try:
                        lat = float(fx(pos, f"{ns}LatitudeDegrees").text)
                        lon = float(fx(pos, f"{ns}LongitudeDegrees").text)
                    except Exception:
                        pass
                elev = None
                e = fx(tp, f"{ns}AltitudeMeters")
                if e is not None and e.text:
                    try:
                        elev = float(e.text)
                    except Exception:
                        pass
                if lat is not None and lon is not None:
                    locations.append({"lat": lat, "lon": lon, "elev": elev, "ts": ts})
                    if ts:
                        started_at = started_at or ts
                        ended_at = ts

    distance_km = round((total_distance_m / 1000.0), 3) if total_distance_m else 0.0
    if not distance_km and locations:
        # fallback: calcola distanza geodetica
        d = 0.0
        for i in range(1, len(locations)):
            d += _haversine_km(
                locations[i-1]["lat"], locations[i-1]["lon"],
                locations[i]["lat"], locations[i]["lon"],
            )
        distance_km = round(d, 3)

    duration_seconds = int(total_time_s) if total_time_s else (
        int((ended_at - started_at).total_seconds()) if started_at and ended_at else 0
    )

    return {
        "distance_km": distance_km,
        "duration_seconds": duration_seconds,
        "avg_pace_min_per_km": _avg_pace(distance_km, duration_seconds),
        "calories": round(total_calories, 1) if total_calories else None,
        "elevation_gain_m": _elevation_gain(locations),
        "activity_type": activity,
        "started_at": started_at,
        "splits": _compute_splits(locations),
        "locations": [
            {"lat": pt["lat"], "lon": pt["lon"], "elev": pt.get("elev")}
            for pt in locations
        ],
        "raw_format": "tcx",
    }


# ─────────────────────────────────────────────────────────────
# FIT (Garmin binary)
# ─────────────────────────────────────────────────────────────
def parse_fit(blob: bytes) -> Dict[str, Any]:
    fit = fitparse.FitFile(io.BytesIO(blob))
    fit.parse()

    locations: List[Dict[str, Any]] = []
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    activity = "run"
    total_distance_m = 0.0
    total_time_s = 0.0
    total_calories = 0.0
    elev_gain = 0.0

    # `session` messages have summary data
    for msg in fit.get_messages("session"):
        values = {d.name: d.value for d in msg}
        sport = values.get("sport")
        activity = _activity_from_string(sport)
        if values.get("total_distance"):
            total_distance_m = float(values["total_distance"])
        if values.get("total_elapsed_time"):
            total_time_s = float(values["total_elapsed_time"])
        elif values.get("total_timer_time"):
            total_time_s = float(values["total_timer_time"])
        if values.get("total_calories"):
            total_calories = float(values["total_calories"])
        if values.get("total_ascent"):
            elev_gain = float(values["total_ascent"])
        st = values.get("start_time")
        if isinstance(st, datetime):
            if st.tzinfo is None:
                st = st.replace(tzinfo=timezone.utc)
            started_at = st

    # `record` messages: punti GPS individuali
    for msg in fit.get_messages("record"):
        values = {d.name: d.value for d in msg}
        # FIT GPS is in semicircles: convert to degrees
        lat_sc = values.get("position_lat")
        lon_sc = values.get("position_long")
        lat = (lat_sc * (180.0 / 2**31)) if lat_sc is not None else None
        lon = (lon_sc * (180.0 / 2**31)) if lon_sc is not None else None
        ts = values.get("timestamp")
        if isinstance(ts, datetime) and ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        elev = values.get("altitude") or values.get("enhanced_altitude")
        if lat is not None and lon is not None:
            locations.append({"lat": lat, "lon": lon, "elev": elev, "ts": ts})
            if ts:
                started_at = started_at or ts
                ended_at = ts

    distance_km = round(total_distance_m / 1000.0, 3) if total_distance_m else 0.0
    if not distance_km and locations:
        d = 0.0
        for i in range(1, len(locations)):
            d += _haversine_km(
                locations[i-1]["lat"], locations[i-1]["lon"],
                locations[i]["lat"], locations[i]["lon"],
            )
        distance_km = round(d, 3)

    duration_seconds = int(total_time_s) if total_time_s else (
        int((ended_at - started_at).total_seconds()) if started_at and ended_at else 0
    )

    return {
        "distance_km": distance_km,
        "duration_seconds": duration_seconds,
        "avg_pace_min_per_km": _avg_pace(distance_km, duration_seconds),
        "calories": round(total_calories, 1) if total_calories else None,
        "elevation_gain_m": round(elev_gain, 1) if elev_gain else _elevation_gain(locations),
        "activity_type": activity,
        "started_at": started_at,
        "splits": _compute_splits(locations),
        "locations": [
            {"lat": pt["lat"], "lon": pt["lon"], "elev": pt.get("elev")}
            for pt in locations
        ],
        "raw_format": "fit",
    }


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────
SUPPORTED_EXTENSIONS = ("gpx", "tcx", "fit")


def parse_activity_file(filename: str, blob: bytes) -> Dict[str, Any]:
    """Dispatcher: deduce il formato dall'estensione e ritorna il dict normalizzato."""
    name = (filename or "").lower().strip()
    if name.endswith(".gpx"):
        return parse_gpx(blob)
    if name.endswith(".tcx"):
        return parse_tcx(blob)
    if name.endswith(".fit"):
        return parse_fit(blob)
    raise ValueError(f"Unsupported file format: {filename}")
