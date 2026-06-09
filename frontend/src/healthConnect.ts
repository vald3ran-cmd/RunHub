/**
 * healthConnect.ts — wrapper per Google Health Connect (Android).
 *
 * Stato:
 *   - Richiede build nativo Android (non funziona in Expo Go né web).
 *   - Permessi richiesti: Exercise, HeartRate, Distance, ActiveCaloriesBurned, Steps.
 *   - Legge ExerciseSession per gli ultimi `daysBackfill` giorni e fa POST batch
 *     al backend usando il MEDESIMO endpoint /api/workouts/import-batch usato
 *     per HealthKit (source='apple_health' viene comunque accettato; sul DB
 *     verrà identificato dall'`import_source` salvato a server-side al batch).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { api } from './api';
import type { HealthKitWorkoutSummary, ImportBatchResult } from './healthkit';

export const isHealthConnectSupported = (): boolean => {
  if (Platform.OS !== 'android') return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
};

export const healthConnectStatusReason = (): string | null => {
  if (Platform.OS === 'web') return 'Health Connect è disponibile solo su Android.';
  if (Platform.OS === 'ios') return 'Su iOS usa Apple HealthKit, non Health Connect.';
  if (Constants.appOwnership === 'expo') {
    return 'Health Connect richiede una build nativa Android (non funziona in Expo Go). Pubblica l\'app e genera un build Android per testarlo.';
  }
  return null;
};

function getHealthConnectModule(): any | null {
  if (!isHealthConnectSupported()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect');
  } catch (err) {
    console.warn('[health-connect] modulo nativo non disponibile:', err);
    return null;
  }
}

const HC_PERMISSIONS = [
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'Steps' },
];

export async function requestHealthConnectPermissions(): Promise<boolean> {
  const mod = getHealthConnectModule();
  if (!mod) return false;
  try {
    const initialized = await mod.initialize();
    if (!initialized) return false;
    const granted = await mod.requestPermission(HC_PERMISSIONS);
    return Array.isArray(granted) && granted.length > 0;
  } catch (e) {
    console.warn('[health-connect] permission error:', e);
    return false;
  }
}

function activityFromExerciseType(t: any): string {
  const s = String(t || '').toLowerCase();
  if (s.includes('bik') || s.includes('cycl')) return 'bike';
  if (s.includes('walk') || s.includes('hik')) return 'walk';
  if (s.includes('swim')) return 'swim';
  return 'run';
}

export async function readWorkouts(daysBackfill = 90): Promise<HealthKitWorkoutSummary[]> {
  const mod = getHealthConnectModule();
  if (!mod) return [];
  const end = new Date();
  const start = new Date(end.getTime() - daysBackfill * 24 * 60 * 60 * 1000);
  const timeRangeFilter = {
    operator: 'between',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
  try {
    const result = await mod.readRecords('ExerciseSession', { timeRangeFilter });
    const records = result?.records || [];
    return records.map((r: any) => {
      const startISO = r.startTime || start.toISOString();
      const endISO = r.endTime || end.toISOString();
      const dur = Math.max(0, Math.floor((new Date(endISO).getTime() - new Date(startISO).getTime()) / 1000));
      const meta = r.metadata || {};
      return {
        external_id: String(meta.id || meta.clientRecordId || `${r.exerciseType}-${startISO}`),
        activity_type: activityFromExerciseType(r.exerciseType),
        started_at: startISO,
        ended_at: endISO,
        duration_seconds: dur,
        distance_km: null,           // HC ritorna Distance come record separato (TODO: join)
        calories: null,              // idem ActiveCaloriesBurned
        avg_hr_bpm: null,            // idem HeartRate
        elevation_gain_m: null,
        heart_rate_samples: [],
        route_points: [],
      };
    });
  } catch (e) {
    console.warn('[health-connect] readRecords error:', e);
    return [];
  }
}

export async function connectAndImport(daysBackfill = 90): Promise<ImportBatchResult> {
  const ok = await requestHealthConnectPermissions();
  if (!ok) throw new Error('Permessi Health Connect negati o non disponibili.');
  const workouts = await readWorkouts(daysBackfill);
  if (workouts.length === 0) return { inserted: 0, updated: 0, skipped: 0, total: 0 };
  const res = await api.post('/workouts/import-batch', { workouts });
  return res.data as ImportBatchResult;
}
