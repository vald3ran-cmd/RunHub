import { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import Svg, { Polyline } from 'react-native-svg';
import { api } from '../src/api';
import { colors, spacing, radius, fonts, stepTypeColors, stepTypeLabels, activityMeta, ActivityType } from '../src/theme';
import { RouteMap } from '../src/RouteMap';
import { InterstitialAd, useShouldShowAds } from '../src/Ads';
import { interstitialManager } from '../src/adMobReal';
import { isAdMobAvailable } from '../src/adMobConfig';

type Step = {
  type: string; duration_seconds: number; description: string; target_pace?: string | null;
};

export default function RunActive() {
  const params = useLocalSearchParams<{ title?: string; workout_id?: string; plan_id?: string; steps?: string; activity_type?: string }>();
  const router = useRouter();
  const title = params.title || 'Run Libero';
  const steps: Step[] = params.steps ? JSON.parse(String(params.steps)) : [];
  const hasSteps = steps.length > 0;
  const activityType: ActivityType =
    (params.activity_type === 'walk' || params.activity_type === 'bike' || params.activity_type === 'run')
      ? params.activity_type as ActivityType
      : 'run';
  const activity = activityMeta[activityType];

  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [running, setRunning] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number; timestamp: number }[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepElapsed, setStepElapsed] = useState(0);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [gpsError, setGpsError] = useState<string>('');
  const [permState, setPermState] = useState<string>('unknown');
  const [showAd, setShowAd] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const pendingPbRef = useRef<any>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const lastStepAnnouncedRef = useRef<number>(-1);
  const showAds = useShouldShowAds();

  const speak = (text: string) => {
    if (!audioEnabled) return;
    try { Speech.stop(); Speech.speak(text, { language: 'it-IT', rate: 1.0 }); } catch {}
  };

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
            if (lastStepAnnouncedRef.current !== i) {
              lastStepAnnouncedRef.current = i;
              const step = steps[i];
              const label = stepTypeLabels[step.type] || step.type;
              speak(`${label}. ${step.description}`);
            }
            setStepIndex(i); setStepElapsed(rem); return;
          }
          rem -= steps[i].duration_seconds;
        }
        if (lastStepAnnouncedRef.current !== steps.length) {
          lastStepAnnouncedRef.current = steps.length;
          speak('Allenamento completato. Ottimo lavoro!');
        }
        setStepIndex(steps.length);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, hasSteps, audioEnabled]);

  const requestAndStart = async () => {
    try {
      // On web: use native navigator.geolocation directly (expo-location's web impl
      // doesn't reliably trigger the browser permission prompt, and iframes may silently block)
      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          setHasLocationPermission(false);
          setGpsError('GPS non disponibile nel browser');
        } else {
          const inIframe = typeof window !== 'undefined' && window.self !== window.top;
          // Try to get first position — triggers browser permission prompt
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setHasLocationPermission(true);
              setGpsError('');
              const pt = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp };
              setCoords(prev => [...prev, pt]);
              // Start continuous watch
              const watchId = navigator.geolocation.watchPosition(
                (p) => {
                  if (pausedRef.current) return;
                  const npt = { lat: p.coords.latitude, lng: p.coords.longitude, timestamp: p.timestamp };
                  setCoords(prev => {
                    if (prev.length > 0) {
                      const last = prev[prev.length - 1];
                      const d = haversine(last.lat, last.lng, npt.lat, npt.lng);
                      if (d > 0.002 && d < 0.2) setDistance(x => x + d);
                    }
                    return [...prev, npt];
                  });
                },
                (err) => { console.warn('GPS error', err); },
                { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
              );
              subRef.current = { remove: () => navigator.geolocation.clearWatch(watchId) } as any;
            },
            (err) => {
              setHasLocationPermission(false);
              if (err.code === err.PERMISSION_DENIED) {
                setGpsError(inIframe
                  ? 'Permesso bloccato. Apri la preview in una nuova scheda del browser.'
                  : 'Permesso negato. Controlla le impostazioni del browser.');
              } else if (err.code === err.POSITION_UNAVAILABLE) {
                setGpsError('Posizione non disponibile. Sei in un luogo con segnale GPS?');
              } else if (err.code === err.TIMEOUT) {
                setGpsError('Timeout GPS. Prova a riprovare.');
              } else {
                setGpsError(err.message || 'Errore GPS');
              }
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
        }
      } else {
        // Native (iOS/Android via Expo Go): use expo-location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setHasLocationPermission(false);
          setGpsError('Permesso GPS negato — cronometro attivo senza tracciamento');
        } else {
          setHasLocationPermission(true);
          setGpsError('');
          subRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
            (loc) => {
              if (pausedRef.current) return;
              const pt = { lat: loc.coords.latitude, lng: loc.coords.longitude, timestamp: loc.timestamp };
              setCoords(prev => {
                if (prev.length > 0) {
                  const last = prev[prev.length - 1];
                  const d = haversine(last.lat, last.lng, pt.lat, pt.lng);
                  if (d > 0.002 && d < 0.2) setDistance(x => x + d);
                }
                return [...prev, pt];
              });
            }
          );
        }
      }
    } catch (e: any) {
      setHasLocationPermission(false);
      setGpsError(e?.message || 'Errore accesso GPS');
    }
    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    setRunning(true);
  };

  const retryGps = async () => {
    setGpsError(''); setHasLocationPermission(null);
    subRef.current?.remove();
    // Re-run the same logic
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setHasLocationPermission(true);
          setGpsError('');
          setCoords(prev => [...prev, { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp }]);
          const watchId = navigator.geolocation.watchPosition(
            (p) => {
              if (pausedRef.current) return;
              const npt = { lat: p.coords.latitude, lng: p.coords.longitude, timestamp: p.timestamp };
              setCoords(prev => {
                if (prev.length > 0) {
                  const last = prev[prev.length - 1];
                  const d = haversine(last.lat, last.lng, npt.lat, npt.lng);
                  if (d > 0.002 && d < 0.2) setDistance(x => x + d);
                }
                return [...prev, npt];
              });
            },
            null as any,
            { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
          );
          subRef.current = { remove: () => navigator.geolocation.clearWatch(watchId) } as any;
        },
        (err) => {
          setHasLocationPermission(false);
          setGpsError(err.code === err.PERMISSION_DENIED && inIframe
            ? 'Permesso bloccato. Apri la preview in una nuova scheda del browser.'
            : err.message || 'Errore GPS');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
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
                  if (d > 0.002 && d < 0.2) setDistance(x => x + d);
                }
                return [...prev, pt];
              });
            }
          );
        } else {
          setHasLocationPermission(false);
          setGpsError('Permesso negato. Controlla le impostazioni del device.');
        }
      } catch (e: any) {
        setHasLocationPermission(false);
        setGpsError(e?.message || 'Errore GPS');
      }
    }
  };

  useEffect(() => {
    // Check if permission was previously denied - helps diagnose
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
      (navigator as any).permissions.query({ name: 'geolocation' })
        .then((res: any) => {
          console.log('[GPS] Initial permission state:', res.state);
          if (res.state === 'denied') {
            setHasLocationPermission(false);
            setGpsError('Permesso GPS negato in precedenza. Click icona 🔒 accanto all\'URL → Posizione → Consenti → ricarica la pagina.');
          }
        })
        .catch(() => {});
    }
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
        activity_type: activityType,
        duration_seconds: elapsed,
        distance_km: Number(distance.toFixed(3)),
        avg_pace_min_per_km: pace,
        calories: Math.round(distance * activity.kcalPerKm),
        locations: coords,
      });
      if (data.newly_awarded_badges && data.newly_awarded_badges.length > 0) {
        const names = data.newly_awarded_badges.join(', ');
        Alert.alert('🏆 Nuovo Achievement!', `Hai sbloccato: ${names}`, [{ text: 'Fantastico!' }]);
      }
      // Determine destination: if Personal Best -> /new-record, else workout summary
      const newPb = data?.new_pb;
      const buildNewRecordParams = () => {
        if (!newPb) return null;
        let value = String(newPb.value);
        let unit = newPb.unit || '';
        if (newPb.type === 'longest_duration') {
          // seconds -> "1h25" or "42m"
          const s = Number(newPb.value) || 0;
          const h = Math.floor(s / 3600);
          const m = Math.floor((s % 3600) / 60);
          value = h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m}`;
          unit = h > 0 ? 'h' : 'min';
        } else if (newPb.type === 'best_pace') {
          const p = Number(newPb.value) || 0;
          const min = Math.floor(p);
          const sec = Math.floor((p - min) * 60);
          value = `${min}:${String(sec).padStart(2, '0')}`;
        }
        const titleMap: Record<string, string> = {
          'best_pace': 'Nuovo Passo Record',
          'longest_distance': 'Distanza Record',
          'longest_duration': 'Tempo Record',
        };
        const labelMap: Record<string, string> = {
          'best_pace': 'Miglior passo medio',
          'longest_distance': 'Più lungo di sempre',
          'longest_duration': 'Più a lungo di sempre',
        };
        return {
          title: titleMap[newPb.type] || 'Nuovo Record',
          label: labelMap[newPb.type] || 'Personal Best',
          value,
          unit,
          session_id: data.session_id,
        };
      };
      const pbParams = buildNewRecordParams();

      if (showAds) {
        // Free tier → show interstitial before navigating
        setPendingSessionId(data.session_id);
        // Stash PB params on instance ref so we can route after ad close
        pendingPbRef.current = pbParams;
        if (isAdMobAvailable) {
          // Real AdMob interstitial (native builds only)
          const shown = await interstitialManager.show();
          if (shown) {
            if (pbParams) {
              router.replace({ pathname: '/new-record', params: pbParams });
            } else {
              router.replace({ pathname: '/workout/[id]', params: { id: data.session_id } });
            }
            setPendingSessionId(null);
            pendingPbRef.current = null;
          } else {
            // Fall back to placeholder modal if AdMob failed to load
            setShowAd(true);
          }
        } else {
          setShowAd(true);
        }
      } else {
        if (pbParams) {
          router.replace({ pathname: '/new-record', params: pbParams });
        } else {
          router.replace({ pathname: '/workout/[id]', params: { id: data.session_id } });
        }
      }
    } catch (e: any) {
      Alert.alert('Errore', 'Salvataggio fallito');
    }
  };

  const onAdClose = () => {
    const pb = pendingPbRef.current;
    if (pb) {
      router.replace({ pathname: '/new-record', params: pb });
      pendingPbRef.current = null;
      setPendingSessionId(null);
    } else if (pendingSessionId) {
      // Navigate FIRST, then close the modal to avoid black flash during transition
      router.replace({ pathname: '/workout/[id]', params: { id: pendingSessionId } });
      setPendingSessionId(null);
    }
    setShowAd(false);
  };

  const confirmStop = () => {
    Alert.alert('Termina allenamento?', 'La sessione verra\' salvata.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Termina', style: 'destructive', onPress: stop },
    ]);
  };

  const confirmExit = () => {
    if (elapsed < 5 && distance < 0.01) {
      subRef.current?.remove();
      router.back();
      return;
    }
    Alert.alert('Uscire senza salvare?', 'La sessione verra\' scartata.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Esci', style: 'destructive', onPress: () => { subRef.current?.remove(); router.back(); } },
    ]);
  };

  const currentStep = hasSteps && stepIndex < steps.length ? steps[stepIndex] : null;
  const pace = distance > 0 ? (elapsed / 60) / distance : 0;
  const paceStr = pace > 0 ? `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, '0')}` : '—:—';
  const stepColor = currentStep ? (stepTypeColors[currentStep.type] || activity.color) : activity.color;
  // Hero metric: durata se Free Run, distanza se workout strutturato
  const heroValue = hasSteps && currentStep
    ? formatTime(Math.max(currentStep.duration_seconds - stepElapsed, 0))
    : distance.toFixed(2);
  const heroUnit = hasSteps && currentStep ? 'rimanenti' : 'KM';

  return (
    <View style={styles.safe}>
      {/* Top bar — flottante */}
      <SafeAreaView edges={['top']} style={styles.topBarWrap}>
        <View style={styles.topBar}>
          <TouchableOpacity
            testID="exit-run-button"
            style={styles.topBtn}
            onPress={confirmExit}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1} testID="active-run-title">{title}</Text>
          <TouchableOpacity
            testID="audio-toggle"
            style={styles.topBtn}
            onPress={() => { setAudioEnabled(a => !a); Speech.stop(); }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={audioEnabled ? 'volume-high' : 'volume-mute'}
              size={20} color={audioEnabled ? stepColor : 'rgba(255,255,255,0.5)'}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ─── HERO METRIC (in alto sopra la mappa) ─────────────────── */}
      <View style={styles.heroSection}>
        {hasSteps && currentStep ? (
          <Text style={[styles.stepBadge, { color: stepColor }]}>
            {(stepTypeLabels[currentStep.type] || currentStep.type).toUpperCase()}
            {currentStep.target_pace ? `  ·  ${currentStep.target_pace}` : ''}
          </Text>
        ) : (
          <Text style={[styles.stepBadge, { color: stepColor }]}>
            {activity.label} {isPaused ? '· IN PAUSA' : '· LIVE'}
          </Text>
        )}
        <View style={styles.heroRow}>
          <Text style={[styles.heroValue, { color: '#fff' }]}>{heroValue}</Text>
          <Text style={styles.heroUnit}>{heroUnit}</Text>
        </View>
        {hasSteps && currentStep ? (
          <Text style={styles.stepDescInline} numberOfLines={1}>{currentStep.description}</Text>
        ) : null}

        {/* Progress bar segmenti */}
        {hasSteps && steps.length > 0 ? (
          <View style={styles.progressTrack}>
            {steps.map((s, i) => {
              const isPast = i < stepIndex;
              const isCurrent = i === stepIndex;
              const ratio = isCurrent ? Math.min(stepElapsed / s.duration_seconds, 1) : isPast ? 1 : 0;
              return (
                <View key={i} style={styles.progressSeg}>
                  <View style={[styles.progressFill, {
                    width: `${ratio * 100}%`,
                    backgroundColor: stepColor,
                  }]} />
                </View>
              );
            })}
          </View>
        ) : null}

        {/* Stats grid 2x3 — stile RUNNA */}
        <View style={styles.statsGrid}>
          <StatItem value={distance.toFixed(2)} label="DISTANZA · KM" />
          <StatItem value={formatTime(elapsed)} label="TEMPO" />
          <StatItem value={paceStr} label={activityType === 'bike' ? 'KM/H MEDI' : 'PASSO · /KM'} />
        </View>
      </View>

      {/* ─── MAPPA — occupa il resto dello schermo ─────────────────── */}
      <View style={styles.mapBox}>
        {coords.length >= 1 ? (
          <>
            <RouteMap coords={coords} height={undefined as any} fullHeight />
            <View style={styles.gpsBadge}>
              <View style={[styles.gpsDot, { backgroundColor: '#34D399' }]} />
              <Text style={styles.gpsBadgeText}>GPS · {coords.length}</Text>
            </View>
          </>
        ) : (
          <View style={styles.mapPlaceholder}>
            <View style={styles.gpsStatusRow}>
              <View style={[styles.gpsDot, {
                backgroundColor: hasLocationPermission === true
                  ? '#FBBF24'
                  : hasLocationPermission === false ? '#FF6B6B' : 'rgba(255,255,255,0.4)'
              }]} />
              <Text style={styles.gpsStatusText}>
                {hasLocationPermission === true
                  ? 'IN ATTESA SEGNALE GPS...'
                  : hasLocationPermission === false
                  ? 'GPS NON ATTIVO'
                  : 'INIZIALIZZAZIONE GPS...'}
              </Text>
            </View>
            {gpsError ? <Text style={styles.placeholderText}>{gpsError}</Text> : null}
            {hasLocationPermission !== true ? (
              <TouchableOpacity style={styles.retryBtn} onPress={retryGps} testID="retry-gps-button">
                <Ionicons name="location" size={18} color="#fff" />
                <Text style={styles.retryText}>ATTIVA GPS</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* ─── Bottom controls flottanti ─────────────────────────────── */}
      <SafeAreaView edges={['bottom']} style={styles.controlsWrap}>
        <View style={styles.controls}>
          <TouchableOpacity
            testID="pause-button"
            style={styles.pauseBtn}
            onPress={() => setIsPaused(p => !p)}
            activeOpacity={0.85}
          >
            <Ionicons name={isPaused ? 'play' : 'pause'} size={26} color="#0F1115" />
            <Text style={styles.pauseLabel}>{isPaused ? 'RIPRENDI' : 'PAUSA'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="stop-button"
            style={styles.stopBtn}
            onPress={confirmStop}
            activeOpacity={0.85}
          >
            <Ionicons name="stop" size={22} color="#fff" />
            <Text style={styles.stopLabel}>TERMINA</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <InterstitialAd visible={showAd} onClose={onAdClose} skipAfter={5} />
    </View>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  safe: { flex: 1, backgroundColor: '#000000' },

  // Top bar flottante (sopra mappa)
  topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center', alignItems: 'center',
  },
  topTitle: {
    color: '#fff', fontSize: 15, flex: 1, letterSpacing: -0.2,
    fontFamily: fonts.bold,
  },

  // Hero section (sopra mappa)
  heroSection: {
    paddingTop: 80,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: '#000000',
  },
  stepBadge: {
    fontSize: 11, letterSpacing: 1.8, marginBottom: 4,
    fontFamily: fonts.headingBold,
  },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroValue: {
    color: '#fff', fontSize: 68, letterSpacing: -3,
    fontFamily: fonts.heading,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: {
    color: 'rgba(255,255,255,0.5)', fontSize: 16, letterSpacing: 1,
    fontFamily: fonts.headingBold,
  },
  stepDescInline: {
    color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2,
    fontFamily: fonts.medium,
  },

  // Progress segments
  progressTrack: { flexDirection: 'row', gap: 3, marginTop: spacing.md },
  progressSeg: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },

  // Stats grid 1x3
  statsGrid: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)',
  },
  statItem: { flex: 1 },
  statValue: {
    color: '#fff', fontSize: 24, letterSpacing: -0.5,
    fontFamily: fonts.heading,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 9,
    letterSpacing: 1.5, marginTop: 4,
    fontFamily: fonts.headingBold,
  },

  // Map
  mapBox: { flex: 1, position: 'relative', backgroundColor: '#0A0A0A' },
  gpsBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gpsBadgeText: {
    color: '#fff', fontSize: 10, letterSpacing: 1,
    fontFamily: fonts.headingBold,
  },
  mapPlaceholder: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: spacing.xl, gap: spacing.md,
  },
  gpsStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsStatusText: {
    color: '#fff', fontSize: 11, letterSpacing: 1.2,
    fontFamily: fonts.headingBold,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12, textAlign: 'center',
    fontFamily: fonts.medium,
  },
  retryBtn: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  retryText: {
    color: '#fff', fontSize: 12, letterSpacing: 1,
    fontFamily: fonts.headingBold,
  },

  // Bottom controls flottanti
  controlsWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingBottom: 0, backgroundColor: 'transparent',
  },
  controls: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md,
  },
  pauseBtn: {
    flex: 2, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  pauseLabel: {
    color: '#000', fontSize: 14, letterSpacing: 1.5,
    fontFamily: fonts.headingBold,
  },
  stopBtn: {
    flex: 1, height: 60, borderRadius: 30, backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  stopLabel: {
    color: '#fff', fontSize: 13, letterSpacing: 1.5,
    fontFamily: fonts.headingBold,
  },

  // Legacy compat
  metricBox: { flex: 1, backgroundColor: 'transparent', padding: spacing.md, alignItems: 'center' },
  metricVal: { color: '#fff', fontSize: 24, fontFamily: fonts.heading },
  metricLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 2, marginTop: 2, fontFamily: fonts.headingBold },

  // Route preview legacy
  routeBox: {
    marginTop: spacing.md, padding: spacing.sm,
    borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  routeLabel: {
    color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 1.5,
    fontFamily: fonts.headingBold,
    marginTop: 4,
  },
});
