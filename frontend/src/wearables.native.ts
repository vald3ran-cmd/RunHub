import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';
const available = !isExpoGo && Platform.OS !== 'web';

type WearableStats = {
  steps: number;
  distance_km: number;
  active_calories: number;
  heart_rate_avg: number | null;
  synced_at: string;
};

let _appleHealth: any = null;
let _healthConnect: any = null;

function loadIOS() {
  if (Platform.OS !== 'ios' || !available) return null;
  if (_appleHealth) return _appleHealth;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _appleHealth = require('react-native-health').default || require('react-native-health');
    return _appleHealth;
  } catch (e) {
    console.warn('[Wearables] react-native-health unavailable', e);
    return null;
  }
}

function loadAndroid() {
  if (Platform.OS !== 'android' || !available) return null;
  if (_healthConnect) return _healthConnect;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _healthConnect = require('react-native-health-connect');
    return _healthConnect;
  } catch (e) {
    console.warn('[Wearables] react-native-health-connect unavailable', e);
    return null;
  }
}

export function isWearablesAvailable(): boolean {
  return available;
}

// ---- iOS Apple HealthKit ----
async function connectAppleHealth(): Promise<boolean> {
  const AppleHealthKit = loadIOS();
  if (!AppleHealthKit) return false;
  const permissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
        AppleHealthKit.Constants.Permissions.HeartRate,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      ],
      write: [AppleHealthKit.Constants.Permissions.Workout],
    },
  };
  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (err: any) => {
      if (err) {
        console.warn('[HealthKit] init failed', err);
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}

async function fetchAppleHealthStats(): Promise<WearableStats | null> {
  const AppleHealthKit = loadIOS();
  if (!AppleHealthKit) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const options = { startDate: today.toISOString() };
  const run = (fn: string, opts: any) => new Promise<any>((res) => {
    AppleHealthKit[fn](opts, (err: any, data: any) => res(err ? null : data));
  });
  const [steps, dist, hr, cal] = await Promise.all([
    run('getStepCount', options),
    run('getDistanceWalkingRunning', { ...options, unit: 'meter' }),
    run('getHeartRateSamples', { ...options, limit: 10 }),
    run('getActiveEnergyBurned', options),
  ]);
  const hrValues: number[] = Array.isArray(hr) ? hr.map((s: any) => s.value).filter(Number.isFinite) : [];
  return {
    steps: steps?.value || 0,
    distance_km: (dist?.value || 0) / 1000,
    active_calories: cal?.value || 0,
    heart_rate_avg: hrValues.length ? hrValues.reduce((a, b) => a + b, 0) / hrValues.length : null,
    synced_at: new Date().toISOString(),
  };
}

// ---- Android Health Connect ----
async function connectHealthConnect(): Promise<boolean> {
  const HC = loadAndroid();
  if (!HC) return false;
  try {
    const sdk = await HC.getSdkStatus();
    if (sdk !== HC.SdkAvailabilityStatus.SDK_AVAILABLE) {
      Alert.alert('Health Connect', 'Installa Health Connect dal Play Store per sincronizzare i dati.');
      return false;
    }
    await HC.initialize();
    const granted = await HC.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
      { accessType: 'read', recordType: 'Distance' },
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
    ]);
    return Array.isArray(granted) && granted.length > 0;
  } catch (e) {
    console.warn('[HealthConnect] init failed', e);
    return false;
  }
}

async function fetchHealthConnectStats(): Promise<WearableStats | null> {
  const HC = loadAndroid();
  if (!HC) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startTime = today.toISOString();
  const endTime = new Date().toISOString();
  const timeFilter = { operator: 'between', startTime, endTime };
  const readOpts = { timeRangeFilter: timeFilter };
  try {
    const [steps, dist, hr, cal] = await Promise.all([
      HC.readRecords('Steps', readOpts),
      HC.readRecords('Distance', readOpts),
      HC.readRecords('HeartRate', readOpts),
      HC.readRecords('ActiveCaloriesBurned', readOpts),
    ]);
    const totalSteps = (steps?.records || []).reduce((s: number, r: any) => s + (r.count || 0), 0);
    const totalDist = (dist?.records || []).reduce((s: number, r: any) => s + (r.distance?.inMeters || 0), 0);
    const totalCal = (cal?.records || []).reduce((s: number, r: any) => s + (r.energy?.inKilocalories || 0), 0);
    const hrSamples = (hr?.records || []).flatMap((r: any) => r.samples?.map((s: any) => s.beatsPerMinute) || []);
    return {
      steps: totalSteps,
      distance_km: totalDist / 1000,
      active_calories: totalCal,
      heart_rate_avg: hrSamples.length ? hrSamples.reduce((a: number, b: number) => a + b, 0) / hrSamples.length : null,
      synced_at: new Date().toISOString(),
    };
  } catch (e) {
    console.warn('[HealthConnect] read failed', e);
    return null;
  }
}

// ---- Public API ----
export async function connectWearable(): Promise<{ ok: boolean; platform: string }> {
  if (!available) {
    Alert.alert('Non disponibile', 'I wearables funzionano solo in build nativa (non in Expo Go).');
    return { ok: false, platform: Platform.OS };
  }
  if (Platform.OS === 'ios') {
    const ok = await connectAppleHealth();
    return { ok, platform: 'apple_health' };
  }
  if (Platform.OS === 'android') {
    const ok = await connectHealthConnect();
    return { ok, platform: 'health_connect' };
  }
  return { ok: false, platform: 'unsupported' };
}

export async function fetchWearableStats(): Promise<WearableStats | null> {
  if (!available) return null;
  if (Platform.OS === 'ios') return fetchAppleHealthStats();
  if (Platform.OS === 'android') return fetchHealthConnectStats();
  return null;
}
