import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Svg, { Polyline } from 'react-native-svg';
import { api } from '../src/api';
import { colors, spacing, radius, stepTypeColors, stepTypeLabels } from '../src/theme';

type Step = {
  type: string; duration_seconds: number; description: string; target_pace?: string | null;
};

export default function RunActive() {
  const params = useLocalSearchParams<{ title?: string; workout_id?: string; plan_id?: string; steps?: string }>();
  const router = useRouter();
  const title = params.title || 'Run Libero';
  const steps: Step[] = params.steps ? JSON.parse(String(params.steps)) : [];
  const hasSteps = steps.length > 0;

  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [running, setRunning] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; timestamp: number }[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);

  const subRef = useRef<Location.LocationSubscription | null>(null);
  const pausedRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);

  useEffect(() => {
    pausedRef.current = isPaused;
    if (isPaused) pauseStartRef.current = Date.now();
    else if (pauseStartRef.current) {
      pausedDurationRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = 0;
    }
  }, [isPaused]);

  // Ticker
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const now = Date.now();
      const total = Math.floor((now - startTimeRef.current - pausedDurationRef.current) / 1000);
      setElapsed(total);
      if (hasSteps) {
        // Compute step position
        let rem = total;
        for (let i = 0; i < steps.length; i++) {
          if (rem < steps[i].duration_seconds) {
            setStepIndex(i); setStepElapsed(rem); return;
          }
          rem -= steps[i].duration_seconds;
        }
        setStepIndex(steps.length);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, hasSteps]);

  const requestAndStart = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setHasLocationPermission(false);
        // still allow run without GPS
      } else {
        setHasLocationPermission(true);
        subRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
          (loc) => {
            if (pausedRef.current) return;
            const pt = { lat: loc.coords.latitude, lng: loc.coords.longitude, timestamp: loc.timestamp };
            setCoords(prev => {
              if (prev.length > 0) {
                const last = prev[prev.length - 1];
                const d = haversine(last.lat, last.lng, pt.lat, pt.lng);
                if (d > 0.002 && d < 0.2) { // sanity filter
                  setDistance(x => x + d);
                }
              }
              return [...prev, pt];
            });
          }
        );
      }
    } catch (e) {
      setHasLocationPermission(false);
    }
    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    setRunning(true);
  };

  useEffect(() => {
    requestAndStart();
    return () => { subRef.current?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = async () => {
    subRef.current?.remove();
    setRunning(false);
    const pace = distance > 0 ? (elapsed / 60) / distance : null;
    try {
      const { data } = await api.post('/workouts/complete', {
        title,
        workout_id: params.workout_id,
        plan_id: params.plan_id,
        duration_seconds: elapsed,
        distance_km: Number(distance.toFixed(3)),
        avg_pace_min_per_km: pace,
        calories: Math.round(distance * 65),
        locations: coords,
      });
      router.replace({ pathname: '/workout/[id]', params: { id: data.session_id } });
    } catch (e: any) {
      Alert.alert('Errore', 'Salvataggio fallito');
    }
  };

  const confirmStop = () => {
    Alert.alert('Termina allenamento?', 'La sessione verra\' salvata.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Termina', style: 'destructive', onPress: stop },
    ]);
  };

  const currentStep = hasSteps && stepIndex < steps.length ? steps[stepIndex] : null;
  const pace = distance > 0 ? (elapsed / 60) / distance : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1} testID="active-run-title">{title}</Text>
        </View>

        {hasSteps && currentStep ? (
          <View style={[styles.stepBox, { borderColor: stepTypeColors[currentStep.type] || colors.primary }]}>
            <Text style={[styles.stepType, { color: stepTypeColors[currentStep.type] || colors.primary }]}>
              {stepTypeLabels[currentStep.type] || currentStep.type.toUpperCase()}
            </Text>
            <Text style={styles.stepDesc}>{currentStep.description}</Text>
            <View style={styles.stepMeta}>
              <Text style={styles.stepRem}>
                {formatTime(Math.max(currentStep.duration_seconds - stepElapsed, 0))}
              </Text>
              <Text style={styles.stepNum}>STEP {stepIndex + 1} / {steps.length}</Text>
            </View>
          </View>
        ) : hasSteps ? (
          <View style={[styles.stepBox, { borderColor: colors.success }]}>
            <Text style={[styles.stepType, { color: colors.success }]}>COMPLETATO</Text>
            <Text style={styles.stepDesc}>Hai finito tutti gli step. Termina per salvare.</Text>
          </View>
        ) : null}

        <View style={styles.mainTime}>
          <Text style={styles.mainTimeValue} testID="active-elapsed">{formatTime(elapsed)}</Text>
          <Text style={styles.mainTimeLabel}>DURATA</Text>
        </View>

        <View style={styles.metricsRow}>
          <Metric label="KM" value={distance.toFixed(2)} />
          <Metric label="PASSO" value={pace > 0 ? `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, '0')}` : '--:--'} />
          <Metric label="KCAL" value={String(Math.round(distance * 65))} />
        </View>

        {coords.length > 1 ? <RoutePreview coords={coords} /> : (
          <View style={styles.mapPlaceholder}>
            <Ionicons name="location" size={24} color={colors.textMuted} />
            <Text style={styles.placeholderText}>
              {hasLocationPermission === false
                ? 'GPS non disponibile — cronometro attivo'
                : 'In attesa del segnale GPS...'}
            </Text>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity
            testID="pause-button"
            style={styles.pauseBtn} onPress={() => setIsPaused(p => !p)}
          >
            <Ionicons name={isPaused ? 'play' : 'pause'} size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="stop-button"
            style={styles.stopBtn} onPress={confirmStop}
          >
            <Ionicons name="stop" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricVal}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function formatTime(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function RoutePreview({ coords }: { coords: { lat: number; lng: number }[] }) {
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const W = 320, H = 180, P = 10;
  const dLat = Math.max(maxLat - minLat, 0.0001);
  const dLng = Math.max(maxLng - minLng, 0.0001);
  const points = coords.map(c => {
    const x = P + ((c.lng - minLng) / dLng) * (W - 2 * P);
    const y = H - P - ((c.lat - minLat) / dLat) * (H - 2 * P);
    return `${x},${y}`;
  }).join(' ');
  return (
    <View style={styles.routeBox}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Polyline points={points} fill="none" stroke={colors.primary} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Text style={styles.routeLabel}>PERCORSO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  stepBox: {
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 2,
    backgroundColor: colors.surface, marginTop: spacing.md,
  },
  stepType: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  stepDesc: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 4 },
  stepMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, alignItems: 'center' },
  stepRem: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
  stepNum: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  mainTime: { alignItems: 'center', marginTop: spacing.xl },
  mainTimeValue: { color: colors.textPrimary, fontSize: 72, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  mainTimeLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 3 },
  metricsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  metricBox: {
    flex: 1, backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  metricVal: { color: colors.textPrimary, fontSize: 24, fontWeight: '900' },
  metricLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  mapPlaceholder: {
    marginTop: spacing.lg, padding: spacing.xl, borderRadius: radius.lg,
    backgroundColor: colors.surface, alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  placeholderText: { color: colors.textSecondary, fontSize: 12 },
  routeBox: {
    marginTop: spacing.lg, padding: spacing.sm, backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  routeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 2, padding: spacing.sm },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginTop: spacing.xl },
  pauseBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  stopBtn: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
});
