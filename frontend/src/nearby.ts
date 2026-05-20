// Nearby Runners — geolocation heartbeat + count fetcher
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { api } from './api';

let _lastKnownCoords: { lat: number; lng: number } | null = null;
let _lastFetchTs = 0;

/** Cached low-power location lookup. Returns null if no permission/unavailable. */
export async function getApproxLocation(): Promise<{ lat: number; lng: number } | null> {
  // Web fallback: skip (no geolocation needed for dev)
  if (Platform.OS === 'web') return _lastKnownCoords;
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return _lastKnownCoords;
    const pos = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
    if (pos) {
      _lastKnownCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      return _lastKnownCoords;
    }
    // Fallback to a fresh fix with low accuracy (battery friendly)
    const cur = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    _lastKnownCoords = { lat: cur.coords.latitude, lng: cur.coords.longitude };
    return _lastKnownCoords;
  } catch {
    return _lastKnownCoords;
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch { return false; }
}

// ──────────────────────────────────────────────────────────────
// API helpers
// ──────────────────────────────────────────────────────────────

export type NearbyCount = { total: number; active: number; radius_km: number };

export async function fetchNearbyCount(radius_km = 10): Promise<NearbyCount | null> {
  const loc = await getApproxLocation();
  if (!loc) return null;
  try {
    const { data } = await api.get('/social/nearby/count', {
      params: { lat: loc.lat, lng: loc.lng, radius_km },
    });
    _lastFetchTs = Date.now();
    return data;
  } catch { return null; }
}

export type NearbyRunner = {
  user_id: string;
  name: string;
  avatar_base64?: string | null;
  tier: string;
  level: string;
  lat: number;
  lng: number;
  active: boolean;
  distance_km: number;
  updated_at: string | null;
};

export async function fetchNearbyRunners(radius_km = 5): Promise<{
  runners: NearbyRunner[]; radius_km: number; coords: { lat: number; lng: number } | null;
}> {
  const loc = await getApproxLocation();
  if (!loc) return { runners: [], radius_km, coords: null };
  try {
    const { data } = await api.get('/social/nearby/runners', {
      params: { lat: loc.lat, lng: loc.lng, radius_km },
    });
    return { runners: data.runners || [], radius_km: data.radius_km || radius_km, coords: loc };
  } catch {
    return { runners: [], radius_km, coords: loc };
  }
}

export async function fetchRunnerDetail(user_id: string) {
  const { data } = await api.get(`/social/nearby/runner/${user_id}`);
  return data;
}

/** Send a heartbeat. `active=true` when a run is in progress (auto opt-in). */
export async function sendNearbyHeartbeat(active: boolean): Promise<void> {
  const loc = await getApproxLocation();
  if (!loc) return;
  try {
    await api.post('/social/nearby/heartbeat', { lat: loc.lat, lng: loc.lng, active });
  } catch {}
}

export async function setNearbyVisibility(visible: boolean): Promise<boolean> {
  try {
    const { data } = await api.put('/users/me/nearby-visibility', { visible });
    return !!data?.visible;
  } catch { return false; }
}

// ──────────────────────────────────────────────────────────────
// Funny rotating headlines for the Home widget
// ──────────────────────────────────────────────────────────────
const HEADLINES = [
  'Stanno sudando: {N} RunHubber 💦',
  'Pista libera? {N} RunHubber in giro ora 🏃‍♂️',
  '{N} RunHubber stanno macinando km vicino a te 🔥',
  '{N} RunHubber a piede libero qui intorno 👟',
  '{N} runner stanno bruciando calorie nei dintorni 🚀',
];
const EMPTY_HEADLINES = [
  'Sii il primo della zona oggi! ⚡',
  'Pista vuota qui intorno. Apri tu le danze 🎯',
  'Nessun RunHubber in vista. Fai vedere chi sei! 💪',
];

export function pickHeadline(count: number): string {
  if (count <= 0) {
    return EMPTY_HEADLINES[Math.floor(Math.random() * EMPTY_HEADLINES.length)];
  }
  const tpl = HEADLINES[Math.floor(Math.random() * HEADLINES.length)];
  return tpl.replace('{N}', String(count));
}
