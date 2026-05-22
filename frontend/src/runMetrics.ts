// Run metrics helpers — splits, elevation, calories, pace target
// Pure functions, no React deps.

import type { ActivityType } from './theme';

export type Coord = { lat: number; lng: number; timestamp: number; alt?: number | null };

export type KmSplit = {
  km: number;            // 1-based km index (1 = first km)
  durationSec: number;   // seconds taken to cover this single km
  totalSec: number;      // cumulative elapsed seconds at end of this km
  paceMinPerKm: number;  // min/km for this split
  manual?: boolean;      // true if it's a manual lap rather than auto-km
};

export type ManualLap = {
  index: number;         // 1-based lap number
  distanceKm: number;    // distance from previous lap (or start)
  durationSec: number;   // duration of this lap
  totalKmAtLap: number;  // cumulative distance at lap point
  totalSecAtLap: number; // cumulative time at lap point
};

// ─── PACE PARSING ─────────────────────────────────────────────────
// Accepts "5:30", "5:30/km", "5'30\"/km", "5.5" → minutes per km (float)
export function parseTargetPace(raw?: string | null): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // Try MM:SS
  const m = s.match(/(\d+)[:'](\d+)/);
  if (m) {
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    return min + sec / 60;
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function formatPace(minPerKm: number): string {
  if (!isFinite(minPerKm) || minPerKm <= 0) return '—:—';
  const min = Math.floor(minPerKm);
  const sec = Math.floor((minPerKm - min) * 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function formatTimeShort(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Returns target-zone status given a target pace and current pace.
// Tolerance: ±15s (0.25 min)
export type PaceStatus = 'onTarget' | 'tooFast' | 'tooSlow' | 'unknown';
export function paceStatus(target: number | null, current: number): PaceStatus {
  if (target == null || !isFinite(target) || target <= 0) return 'unknown';
  if (!isFinite(current) || current <= 0) return 'unknown';
  const tol = 0.25; // 15 seconds
  if (current < target - tol) return 'tooFast';
  if (current > target + tol) return 'tooSlow';
  return 'onTarget';
}

// ─── ELEVATION GAIN ───────────────────────────────────────────────
// Computes cumulative positive elevation change with smoothing + threshold.
// Returns elevation gain in METERS.
export function computeElevationGain(coords: Coord[], threshold: number = 1.5, window: number = 5): number {
  const alts = coords
    .map(c => (c.alt == null ? null : c.alt))
    .filter((v): v is number => typeof v === 'number' && isFinite(v));
  if (alts.length < 3) return 0;
  // Moving-average smoothing
  const smoothed: number[] = [];
  for (let i = 0; i < alts.length; i++) {
    const a = Math.max(0, i - Math.floor(window / 2));
    const b = Math.min(alts.length, i + Math.ceil(window / 2));
    let sum = 0, n = 0;
    for (let j = a; j < b; j++) { sum += alts[j]; n++; }
    smoothed.push(sum / Math.max(n, 1));
  }
  let gain = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const d = smoothed[i] - smoothed[i - 1];
    if (d > threshold) gain += d;
  }
  return Math.round(gain);
}

// ─── CALORIES (MET-based) ────────────────────────────────────────
// MET values approximate by activity + intensity (pace or speed).
// Formula: kcal = MET × weight(kg) × hours
//
// Returns kcal for elapsed seconds at current avg pace, with weight in kg.
export function estimateCalories(opts: {
  activity: ActivityType;
  distanceKm: number;
  elapsedSec: number;
  weightKg: number;
}): number {
  const { activity, distanceKm, elapsedSec, weightKg } = opts;
  if (elapsedSec <= 0 || weightKg <= 0) return 0;
  const hours = elapsedSec / 3600;

  let met = 4; // fallback
  if (activity === 'run') {
    // Use speed km/h if distance available, else default 9 MET
    if (distanceKm > 0 && hours > 0) {
      const kmh = distanceKm / hours;
      // Approx running MET tables (ACSM)
      if (kmh < 6.4) met = 6.0;        // jogging slow
      else if (kmh < 8.0) met = 8.3;   // easy run
      else if (kmh < 9.7) met = 9.8;   // moderate
      else if (kmh < 11.3) met = 11.0; // tempo
      else if (kmh < 12.9) met = 11.8; // fast
      else if (kmh < 14.5) met = 12.8; // very fast
      else met = 14.5;                  // race pace
    } else {
      met = 9.0;
    }
  } else if (activity === 'walk') {
    if (distanceKm > 0 && hours > 0) {
      const kmh = distanceKm / hours;
      if (kmh < 3.2) met = 2.8;
      else if (kmh < 4.0) met = 3.0;
      else if (kmh < 4.8) met = 3.5;
      else if (kmh < 5.6) met = 4.3;
      else if (kmh < 6.4) met = 5.0;
      else met = 7.0; // brisk walking / hiking
    } else {
      met = 3.5;
    }
  } else if (activity === 'bike') {
    if (distanceKm > 0 && hours > 0) {
      const kmh = distanceKm / hours;
      if (kmh < 16) met = 4.0;
      else if (kmh < 19) met = 6.8;
      else if (kmh < 22) met = 8.0;
      else if (kmh < 25) met = 10.0;
      else if (kmh < 30) met = 12.0;
      else met = 15.8;
    } else {
      met = 6.0;
    }
  }

  return Math.round(met * weightKg * hours);
}

// ─── KM SPLIT DETECTION ──────────────────────────────────────────
// Given a totalDistanceKm and elapsedSec snapshot history (you must call
// this each tick), returns the new completed km index (>0) the moment it
// is first crossed, otherwise 0.
// `lastKmCompleted` is the count last reported (caller keeps state).
export function detectKmCrossing(currentDistKm: number, lastKmCompleted: number): number {
  const fullKm = Math.floor(currentDistKm);
  if (fullKm > lastKmCompleted) return fullKm;
  return 0;
}

export function buildSplit(km: number, totalSecAtCross: number, prevTotalSec: number): KmSplit {
  const durationSec = Math.max(totalSecAtCross - prevTotalSec, 1);
  const pace = durationSec / 60; // min per km (this split is exactly 1km)
  return { km, durationSec, totalSec: totalSecAtCross, paceMinPerKm: pace };
}

// ─── SPEED INSTANTANEOUS ─────────────────────────────────────────
// Compute speed in m/s from the last few coords (sliding window).
export function instantSpeedMs(coords: Coord[], windowSec: number = 6): number {
  if (coords.length < 2) return 0;
  const last = coords[coords.length - 1];
  // Find oldest coord within window
  let oldestIdx = coords.length - 1;
  for (let i = coords.length - 2; i >= 0; i--) {
    if ((last.timestamp - coords[i].timestamp) / 1000 > windowSec) {
      oldestIdx = i + 1;
      break;
    }
    oldestIdx = i;
  }
  const start = coords[oldestIdx];
  const dtSec = (last.timestamp - start.timestamp) / 1000;
  if (dtSec <= 0.5) return 0;
  // Sum distance along path in window
  let distM = 0;
  for (let i = oldestIdx + 1; i < coords.length; i++) {
    const a = coords[i - 1], b = coords[i];
    distM += haversineM(a.lat, a.lng, b.lat, b.lng);
  }
  return distM / dtSec;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ─── TTS LINE BUILDERS (i18n-aware) ─────────────────────────────────
type TfnLite = (key: string, opts?: Record<string, any>) => string;

export function ttsForKmSplit(s: KmSplit, activity: ActivityType, t?: TfnLite): string {
  const min = Math.floor(s.paceMinPerKm);
  const sec = Math.floor((s.paceMinPerKm - min) * 60);
  const totalMin = Math.floor(s.totalSec / 60);
  const totalSec = s.totalSec % 60;
  if (activity === 'bike') {
    const kmh = s.durationSec > 0 ? 3600 / s.durationSec : 0;
    if (t) return t('run.tts_km_bike', { km: s.km, kmh: kmh.toFixed(1), totalMin, totalSec });
    return `Chilometro ${s.km} completato. Velocità ${kmh.toFixed(1)} chilometri orari. Tempo totale ${totalMin} minuti e ${totalSec} secondi.`;
  }
  const paceSecStr = String(sec).padStart(2, '0');
  if (t) {
    const key = activity === 'walk' ? 'run.tts_km_walk' : 'run.tts_km_run';
    return t(key, { km: s.km, paceMin: min, paceSec: paceSecStr, totalMin, totalSec });
  }
  const verb = activity === 'walk' ? 'camminato' : 'corso';
  return `Hai ${verb} ${s.km} chilometri. Passo ${min} minuti e ${paceSecStr} secondi al chilometro. Tempo totale ${totalMin} minuti e ${totalSec} secondi.`;
}

export function ttsManualLap(lap: ManualLap, activity: ActivityType, t?: TfnLite): string {
  const km = lap.distanceKm.toFixed(2).replace('.', ',');
  const min = Math.floor(lap.durationSec / 60);
  const sec = lap.durationSec % 60;
  if (t) return t('run.tts_lap', { index: lap.index, km, min, sec });
  return `Lap ${lap.index}. ${km} chilometri in ${min} minuti e ${sec} secondi.`;
}
