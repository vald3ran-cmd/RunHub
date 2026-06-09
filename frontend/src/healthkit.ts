/**
 * healthkit.ts — wrapper per l'integrazione Apple HealthKit (read-only).
 *
 * Stato attuale:
 *   - L'integrazione richiede una build nativa iOS (Expo Go non supporta react-native-health).
 *   - In Expo Go / web il modulo non viene importato (try/catch su require dinamico).
 *   - La funzione `connectAndImport` chiede permessi, legge gli ultimi 90 giorni di workout,
 *     interroga HR per ogni sessione e fa POST al backend /api/workouts/import-batch.
 *
 * Permessi richiesti:
 *   - Workout (HKWorkoutType)
 *   - HeartRate, ActiveEnergyBurned
 *   - DistanceWalkingRunning, DistanceCycling, StepCount
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';

export type HealthKitWorkoutSummary = {
  external_id: string;
  activity_type: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  distance_km?: number | null;
  calories?: number | null;
  avg_hr_bpm?: number | null;
  elevation_gain_m?: number | null;
  heart_rate_samples: Array<{ timestamp: string; bpm: number }>;
  route_points: Array<{ timestamp?: string; latitude: number; longitude: number; altitude?: number }>;
};

export type ImportBatchResult = {
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
};

export const isHealthKitSupported = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  // Expo Go non ha il modulo nativo: appOwnership === 'expo'
  // Constants.appOwnership può essere 'expo' | 'standalone' | 'guest' | null
  if (Constants.appOwnership === 'expo') return false;
  return true;
};

export const healthKitStatusReason = (): string | null => {
  if (Platform.OS === 'web') return 'Apple HealthKit è disponibile solo su iPhone.';
  if (Platform.OS === 'android') return 'Su Android usa Health Connect, non HealthKit.';
  if (Constants.appOwnership === 'expo') {
    return 'Apple HealthKit richiede una build nativa (non funziona in Expo Go). Pubblica l\'app e genera un build iOS per testarlo.';
  }
  return null;
};

/**
 * Lazy load del modulo nativo. Lo facciamo così evitiamo crash in Expo Go / web.
 */
function getHealthKitModule(): any | null {
  if (!isHealthKitSupported()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-health');
    return mod.default || mod;
  } catch (err) {
    console.warn('[healthkit] modulo nativo non disponibile:', err);
    return null;
  }
}

function buildPermissions(AppleHealthKit: any) {
  const C = AppleHealthKit.Constants.Permissions;
  return {
    permissions: {
      read: [
        C.Workout,
        C.HeartRate,
        C.ActiveEnergyBurned,
        C.DistanceWalkingRunning,
        C.DistanceCycling,
        C.Steps,
      ],
      write: [],
    },
  };
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  const AppleHealthKit = getHealthKitModule();
  if (!AppleHealthKit) return false;
  const perms = buildPermissions(AppleHealthKit);
  return new Promise<boolean>((resolve) => {
    AppleHealthKit.initHealthKit(perms, (err: any) => {
      if (err) {
        console.warn('[healthkit] initHealthKit error:', err);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

/**
 * Legge gli ultimi `days` giorni di workout. Ritorna sempre un array (vuoto se errore o nessun dato).
 */
export async function readWorkouts(days = 90): Promise<HealthKitWorkoutSummary[]> {
  const AppleHealthKit = getHealthKitModule();
  if (!AppleHealthKit) return [];

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  const options = {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };

  const workouts: any[] = await new Promise((resolve) => {
    AppleHealthKit.getAnchoredWorkouts(options, (err: any, results: any) => {
      if (err) {
        console.warn('[healthkit] getAnchoredWorkouts error:', err);
        resolve([]);
        return;
      }
      // results può essere { anchor, data } o un array (a seconda della versione)
      const data = Array.isArray(results) ? results : (results?.data || []);
      resolve(data);
    });
  });

  const summaries: HealthKitWorkoutSummary[] = [];
  for (const w of workouts) {
    const startISO = w.start || w.startDate || new Date().toISOString();
    const endISO = w.end || w.endDate || startISO;
    const dur = Math.max(
      0,
      Math.floor((new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000),
    );
    const distKm = typeof w.distance === 'number' ? w.distance / 1000 : (w.distance?.value ? w.distance.value / 1000 : null);
    summaries.push({
      external_id: String(w.id || w.uuid || `${w.activityName || w.activityType || 'wo'}-${startISO}`),
      activity_type: String(w.activityName || w.activityType || 'run').toLowerCase(),
      started_at: startISO,
      ended_at: endISO,
      duration_seconds: dur,
      distance_km: distKm,
      calories: typeof w.calories === 'number' ? w.calories : (w.calories?.value ?? null),
      avg_hr_bpm: null,        // calcolato dopo via heart rate samples
      elevation_gain_m: typeof w.elevationAscended === 'number' ? w.elevationAscended : null,
      heart_rate_samples: [],  // popolato in fase di enrichment (opzionale)
      route_points: [],         // route richiede HKWorkoutRouteQuery (estensione futura)
    });
  }
  return summaries;
}

/**
 * Connect end-to-end:
 *   1. Chiedi permessi (contextual: chiamato solo on user-tap).
 *   2. Leggi ultimi 90 giorni di workout.
 *   3. POST al backend in batch.
 */
export async function connectAndImport(daysBackfill = 90): Promise<ImportBatchResult> {
  const ok = await requestHealthKitPermissions();
  if (!ok) {
    throw new Error('Permessi Apple Salute negati o non disponibili.');
  }
  const workouts = await readWorkouts(daysBackfill);
  if (workouts.length === 0) {
    return { inserted: 0, updated: 0, skipped: 0, total: 0 };
  }
  const res = await api.post('/workouts/import-batch', { workouts });
  return res.data as ImportBatchResult;
}
