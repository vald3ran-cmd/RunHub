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
import {
  KmSplit, ManualLap, Coord,
  parseTargetPace, formatPace, paceStatus, PaceStatus,
  computeElevationGain, estimateCalories,
  detectKmCrossing, buildSplit, instantSpeedMs,
  ttsForKmSplit, ttsManualLap,
} from '../src/runMetrics';
import { fetchWeather, WeatherSnapshot } from '../src/weather';
import { loadRunSettings, RunSettings, DEFAULT_SETTINGS, VoiceFrequency } from '../src/runSettings';
import { useT } from '../src/i18n';
import { hasTierAccess, useTierAccess } from '../src/PremiumGate';

type Step = {
  type: string; duration_seconds: number; description: string; target_pace?: string | null;
};

export default function RunActive() {
  const params = useLocalSearchParams<{ title?: string; workout_id?: string; plan_id?: string; steps?: string; activity_type?: string }>();
  const router = useRouter();
  const { t } = useT();
  const { hasAccess: hasPerformance } = useTierAccess('performance');
  const title = params.title || t('run.free_run');
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
  const [autoPaused, setAutoPaused] = useState(false);
  const [running, setRunning] = useState(false);
  const [coords, setCoords] = useState<Coord[]>([]);
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

  // ── NEW: splits, calories, elevation, weather, settings, pace status ──
  const [splits, setSplits] = useState<KmSplit[]>([]);
  const [manualLaps, setManualLaps] = useState<ManualLap[]>([]);
  const [liveCalories, setLiveCalories] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [settings, setSettings] = useState<RunSettings>(DEFAULT_SETTINGS);
  const [currentPaceStatus, setCurrentPaceStatus] = useState<PaceStatus>('unknown');

  const lastKmCompletedRef = useRef<number>(0);
  const last5MinAnnouncedRef = useRef<number>(0);
  const lastLapAnchorRef = useRef<{ km: number; sec: number }>({ km: 0, sec: 0 });
  const stationarySinceRef = useRef<number>(0);
  const settingsRef = useRef<RunSettings>(DEFAULT_SETTINGS);
  const splitsRef = useRef<KmSplit[]>([]);
  const coordsRef = useRef<Coord[]>([]);
  const distanceRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const weatherFetchedRef = useRef<boolean>(false);

  const speak = (text: string) => {
    if (!audioEnabled) return;
    try { Speech.stop(); Speech.speak(text, { language: t('run.tts_locale'), rate: 1.0 }); } catch {}
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
      elapsedRef.current = total;

      // ── Live calories (MET-based) ────────────────────────────
      const kcal = estimateCalories({
        activity: activityType,
        distanceKm: distanceRef.current,
        elapsedSec: total,
        weightKg: settingsRef.current.weightKg,
      });
      setLiveCalories(kcal);

      // ── Km split detection (auto-lap) ────────────────────────
      const newKm = detectKmCrossing(distanceRef.current, lastKmCompletedRef.current);
      if (newKm > 0) {
        const prevTotal = splitsRef.current.length > 0
          ? splitsRef.current[splitsRef.current.length - 1].totalSec
          : 0;
        const split = buildSplit(newKm, total, prevTotal);
        const updated = [...splitsRef.current, split];
        splitsRef.current = updated;
        setSplits(updated);
        lastKmCompletedRef.current = newKm;
        // Voice announcement based on user prefs
        const freq = settingsRef.current.voiceFrequency;
        if (freq === 'every_km' || freq === 'every_5min') {
          speak(ttsForKmSplit(split, activityType, t));
        }
      }

      // ── Every-5-min announcement (Performance+) ─────────────
      if (hasPerformance && settingsRef.current.voiceFrequency === 'every_5min') {
        const fiveMinBucket = Math.floor(total / 300);
        if (fiveMinBucket > last5MinAnnouncedRef.current && fiveMinBucket > 0) {
          last5MinAnnouncedRef.current = fiveMinBucket;
          const totalMin = Math.floor(total / 60);
          const km = distanceRef.current.toFixed(2).replace('.', ',');
          speak(t('run.tts_5min', { totalMin, km }));
        }
      }

      // ── Auto-pause detection (Performance+) ─────────────────
      if (hasPerformance && settingsRef.current.autoPauseEnabled && Platform.OS !== 'web') {
        const sp = instantSpeedMs(coordsRef.current, 6);
        // Threshold: 0.4 m/s ≈ very slow walk (or stop). For bike, 1.0 m/s
        const threshold = activityType === 'bike' ? 1.0 : 0.4;
        if (sp < threshold && coordsRef.current.length > 3) {
          if (stationarySinceRef.current === 0) stationarySinceRef.current = now;
          else if (!pausedRef.current && (now - stationarySinceRef.current) > 5000) {
            setIsPaused(true);
            setAutoPaused(true);
            speak(t('run.tts_auto_pause'));
          }
        } else {
          stationarySinceRef.current = 0;
          if (autoPaused && pausedRef.current) {
            setIsPaused(false);
            setAutoPaused(false);
            speak(t('run.tts_resume'));
          }
        }
      }

      if (hasSteps) {
        // Compute step position
        let rem = total;
        for (let i = 0; i < steps.length; i++) {
          if (rem < steps[i].duration_seconds) {
            if (lastStepAnnouncedRef.current !== i) {
              lastStepAnnouncedRef.current = i;
              const step = steps[i];
              const label = (t(`run.step_${step.type}`) !== `run.step_${step.type}`)
                ? t(`run.step_${step.type}`)
                : (stepTypeLabels[step.type] || step.type);
              speak(`${label}. ${step.description}`);
            }
            setStepIndex(i); setStepElapsed(rem); return;
          }
          rem -= steps[i].duration_seconds;
        }
        if (lastStepAnnouncedRef.current !== steps.length) {
          lastStepAnnouncedRef.current = steps.length;
          speak(t('run.tts_workout_complete'));
        }
        setStepIndex(steps.length);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running, hasSteps, audioEnabled, activityType, autoPaused]);

  // ── Load user settings on mount ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const s = await loadRunSettings();
        setSettings(s);
        settingsRef.current = s;
      } catch {}
    })();
  }, []);

  const requestAndStart = async () => {
    // Helper: handle a new GPS point — updates coords/distance/elevation/refs.
    const pushCoord = (npt: Coord) => {
      setCoords(prev => {
        let nextDist = distanceRef.current;
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const d = haversine(last.lat, last.lng, npt.lat, npt.lng);
          if (d > 0.002 && d < 0.2) {
            nextDist = nextDist + d;
            distanceRef.current = nextDist;
            setDistance(nextDist);
          }
        }
        const next = [...prev, npt];
        coordsRef.current = next;
        // Re-compute elevation gain every ~10 coords (cheap heuristic)
        if (next.length % 10 === 0) {
          const gain = computeElevationGain(next);
          setElevationGain(gain);
        }
        // Fetch weather once after we have first reliable fix
        if (!weatherFetchedRef.current && next.length >= 1) {
          weatherFetchedRef.current = true;
          fetchWeather(npt.lat, npt.lng).then(w => { if (w) setWeather(w); }).catch(() => {});
        }
        return next;
      });
    };

    try {
      // On web: use native navigator.geolocation directly (expo-location's web impl
      // doesn't reliably trigger the browser permission prompt, and iframes may silently block)
      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          setHasLocationPermission(false);
          setGpsError(t('run.gps_browser_unavailable'));
        } else {
          const inIframe = typeof window !== 'undefined' && window.self !== window.top;
          // Try to get first position — triggers browser permission prompt
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setHasLocationPermission(true);
              setGpsError('');
              const pt: Coord = {
                lat: pos.coords.latitude, lng: pos.coords.longitude,
                timestamp: pos.timestamp, alt: pos.coords.altitude ?? null,
              };
              pushCoord(pt);
              // Start continuous watch
              const watchId = navigator.geolocation.watchPosition(
                (p) => {
                  if (pausedRef.current) return;
                  pushCoord({
                    lat: p.coords.latitude, lng: p.coords.longitude,
                    timestamp: p.timestamp, alt: p.coords.altitude ?? null,
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
                  ? t('run.gps_blocked_iframe')
                  : t('run.gps_permission_browser'));
              } else if (err.code === err.POSITION_UNAVAILABLE) {
                setGpsError(t('run.gps_position_unavailable'));
              } else if (err.code === err.TIMEOUT) {
                setGpsError(t('run.gps_timeout'));
              } else {
                setGpsError(err.message || t('run.ui_gps_error'));
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
          setGpsError(t('run.gps_denied_native'));
        } else {
          setHasLocationPermission(true);
          setGpsError('');
          subRef.current = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
            (loc) => {
              if (pausedRef.current) return;
              pushCoord({
                lat: loc.coords.latitude, lng: loc.coords.longitude,
                timestamp: loc.timestamp, alt: loc.coords.altitude ?? null,
              });
            }
          );
        }
      }
    } catch (e: any) {
      setHasLocationPermission(false);
      setGpsError(e?.message || t('run.ui_gps_access_error'));
    }
    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    setRunning(true);
  };

  const retryGps = async () => {
    setGpsError(''); setHasLocationPermission(null);
    subRef.current?.remove();

    // Shared helper (mirror of requestAndStart's pushCoord)
    const pushCoord = (npt: Coord) => {
      setCoords(prev => {
        let nextDist = distanceRef.current;
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          const d = haversine(last.lat, last.lng, npt.lat, npt.lng);
          if (d > 0.002 && d < 0.2) {
            nextDist = nextDist + d;
            distanceRef.current = nextDist;
            setDistance(nextDist);
          }
        }
        const next = [...prev, npt];
        coordsRef.current = next;
        if (next.length % 10 === 0) {
          const gain = computeElevationGain(next);
          setElevationGain(gain);
        }
        if (!weatherFetchedRef.current) {
          weatherFetchedRef.current = true;
          fetchWeather(npt.lat, npt.lng).then(w => { if (w) setWeather(w); }).catch(() => {});
        }
        return next;
      });
    };

    // Re-run the same logic
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      const inIframe = typeof window !== 'undefined' && window.self !== window.top;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setHasLocationPermission(true);
          setGpsError('');
          pushCoord({
            lat: pos.coords.latitude, lng: pos.coords.longitude,
            timestamp: pos.timestamp, alt: pos.coords.altitude ?? null,
          });
          const watchId = navigator.geolocation.watchPosition(
            (p) => {
              if (pausedRef.current) return;
              pushCoord({
                lat: p.coords.latitude, lng: p.coords.longitude,
                timestamp: p.timestamp, alt: p.coords.altitude ?? null,
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
            ? t('run.gps_blocked_iframe')
            : err.message || t('run.ui_gps_error'));
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
              pushCoord({
                lat: loc.coords.latitude, lng: loc.coords.longitude,
                timestamp: loc.timestamp, alt: loc.coords.altitude ?? null,
              });
            }
          );
        } else {
          setHasLocationPermission(false);
          setGpsError(t('run.gps_denied_device'));
        }
      } catch (e: any) {
        setHasLocationPermission(false);
        setGpsError(e?.message || t('run.ui_gps_error'));
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
            setGpsError(t('run.gps_denied_prior'));
          }
        })
        .catch(() => {});
    }
    requestAndStart();
    return () => { subRef.current?.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── NEARBY: heartbeat ogni 60s mentre corro (auto opt-in)
  useEffect(() => {
    if (!running) return;
    // Fire one immediately, then every 60s
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const { sendNearbyHeartbeat } = await import('../src/nearby');
        await sendNearbyHeartbeat(true);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [running]);

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
        calories: liveCalories || Math.round(distance * activity.kcalPerKm),
        elevation_gain_m: elevationGain || null,
        splits: splits.map(s => ({
          km: s.km,
          duration_sec: s.durationSec,
          total_sec: s.totalSec,
          pace_min_per_km: Number(s.paceMinPerKm.toFixed(3)),
        })),
        locations: coords,
      });
      if (data.newly_awarded_badges && data.newly_awarded_badges.length > 0) {
        const names = data.newly_awarded_badges.join(', ');
        Alert.alert(t('run.new_achievement_title'), t('run.new_achievement_msg', { names }), [{ text: t('run.awesome') }]);
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
          'best_pace': t('run.pb_new_pace_title'),
          'longest_distance': t('run.pb_new_distance_title'),
          'longest_duration': t('run.pb_new_duration_title'),
        };
        const labelMap: Record<string, string> = {
          'best_pace': t('run.pb_best_pace_label'),
          'longest_distance': t('run.pb_longest_distance_label'),
          'longest_duration': t('run.pb_longest_duration_label'),
        };
        return {
          title: titleMap[newPb.type] || t('run.pb_new_default_title'),
          label: labelMap[newPb.type] || t('run.pb_default_label'),
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
      Alert.alert(t('common.error'), t('run.save_failed'));
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
    Alert.alert(t('run.alert_finish_title'), t('run.alert_finish_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('run.alert_finish_cta'), style: 'destructive', onPress: stop },
    ]);
  };

  const confirmExit = () => {
    if (elapsed < 5 && distance < 0.01) {
      subRef.current?.remove();
      router.back();
      return;
    }
    Alert.alert(t('run.alert_quit_title'), t('run.alert_quit_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.back'), style: 'destructive', onPress: () => { subRef.current?.remove(); router.back(); } },
    ]);
  };

  // ── Manual lap action ──
  const doManualLap = () => {
    if (!running || isPaused) return;
    const total = elapsedRef.current;
    const dist = distanceRef.current;
    const prevKm = lastLapAnchorRef.current.km;
    const prevSec = lastLapAnchorRef.current.sec;
    const lap: ManualLap = {
      index: manualLaps.length + 1,
      distanceKm: Math.max(dist - prevKm, 0),
      durationSec: Math.max(total - prevSec, 0),
      totalKmAtLap: dist,
      totalSecAtLap: total,
    };
    lastLapAnchorRef.current = { km: dist, sec: total };
    setManualLaps(prev => [...prev, lap]);
    speak(ttsManualLap(lap, activityType, t));
  };

  const currentStep = hasSteps && stepIndex < steps.length ? steps[stepIndex] : null;
  const pace = distance > 0 ? (elapsed / 60) / distance : 0;
  const paceStr = pace > 0 ? formatPace(pace) : '—:—';
  const stepColor = currentStep ? (stepTypeColors[currentStep.type] || activity.color) : activity.color;
  // Pace target status (uses current step's target_pace if available)
  const targetPaceMin = hasPerformance ? parseTargetPace(currentStep?.target_pace || null) : null;
  const paceState = paceStatus(targetPaceMin, pace);
  // For bike: show km/h instead of pace
  const kmh = elapsed > 0 ? (distance / (elapsed / 3600)) : 0;
  const speedDisplay = activityType === 'bike'
    ? (kmh > 0 ? kmh.toFixed(1) : '—')
    : paceStr;
  const speedLabel = activityType === 'bike' ? t('run.ui_kmh') : t('run.ui_pace_short');
  // Hero metric: durata se Free Run, distanza se workout strutturato
  const heroValue = hasSteps && currentStep
    ? formatTime(Math.max(currentStep.duration_seconds - stepElapsed, 0))
    : distance.toFixed(2);
  const heroUnit = hasSteps && currentStep ? 'rimanenti' : 'KM';

  // Pace color: green if on target, red if outside, white if no target
  const paceColor =
    paceState === 'onTarget' ? '#34D399'
    : paceState === 'tooFast' ? '#3B82F6'
    : paceState === 'tooSlow' ? '#FF6B6B'
    : '#fff';

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
          <View style={styles.stepBadgeRow}>
            <Text style={[styles.stepBadge, { color: stepColor }]}>
              {(stepTypeLabels[currentStep.type] || currentStep.type).toUpperCase()}
              {currentStep.target_pace ? `  ·  TARGET ${currentStep.target_pace}` : ''}
            </Text>
            {paceState !== 'unknown' ? (
              <View style={[styles.paceChip, {
                backgroundColor: paceState === 'onTarget' ? 'rgba(52,211,153,0.18)'
                  : paceState === 'tooFast' ? 'rgba(59,130,246,0.18)'
                  : 'rgba(255,107,107,0.18)',
                borderColor: paceColor,
              }]}>
                <Text style={[styles.paceChipText, { color: paceColor }]}>
                  {paceState === 'onTarget' ? t('run.ui_in_target') : paceState === 'tooFast' ? t('run.ui_too_fast') : t('run.ui_too_slow')}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <Text style={[styles.stepBadge, { color: stepColor }]}>
            {activity.label} {autoPaused ? '· AUTO-PAUSA' : isPaused ? '· IN PAUSA' : '· LIVE'}
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

        {/* Stats grid — 2 rows x up to 4 cols */}
        <View style={styles.statsGrid}>
          <StatItem value={distance.toFixed(2)} label="DISTANZA · KM" />
          <StatItem value={formatTime(elapsed)} label="TEMPO" />
          <StatItem value={speedDisplay} label={speedLabel} valueColor={paceColor} />
          <StatItem value={String(liveCalories)} label="KCAL" />
        </View>
        {/* Secondary row: elevation + last km */}
        {(elevationGain > 0 || splits.length > 0) ? (
          <View style={styles.statsGridSecondary}>
            {elevationGain > 0 ? (
              <StatItem value={`${elevationGain}`} label="DISLIVELLO · M" small />
            ) : null}
            {splits.length > 0 ? (
              <StatItem
                value={formatPace(splits[splits.length - 1].paceMinPerKm)}
                label={`ULTIMO KM (${splits.length})`}
                small
              />
            ) : null}
          </View>
        ) : null}

        {/* Splits chips — horizontal scroll */}
        {splits.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.splitsStrip}
            contentContainerStyle={styles.splitsStripContent}
          >
            {splits.map((s, i) => {
              const avgPace = pace || s.paceMinPerKm;
              const isFaster = s.paceMinPerKm < avgPace;
              return (
                <View key={`s-${i}`} style={[styles.splitChip, {
                  borderColor: isFaster ? 'rgba(52,211,153,0.5)' : 'rgba(255,107,107,0.4)',
                }]}>
                  <Text style={styles.splitChipKm}>KM {s.km}</Text>
                  <Text style={styles.splitChipPace}>{formatPace(s.paceMinPerKm)}</Text>
                  <Ionicons
                    name={isFaster ? 'trending-up' : 'trending-down'}
                    size={11}
                    color={isFaster ? '#34D399' : '#FF6B6B'}
                  />
                </View>
              );
            })}
          </ScrollView>
        ) : null}
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
            {/* Weather widget */}
            {weather && hasPerformance ? (
              <View style={styles.weatherBadge}>
                <Text style={styles.weatherEmoji}>{weather.emoji}</Text>
                <View>
                  <Text style={styles.weatherTemp}>{weather.tempC}°C</Text>
                  <Text style={styles.weatherWind}>{weather.windKmh} km/h</Text>
                </View>
              </View>
            ) : null}
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
                  ? t('run.gps_waiting_signal')
                  : hasLocationPermission === false
                  ? t('run.gps_not_active')
                  : t('run.ui_gps_init')}
              </Text>
            </View>
            {gpsError ? <Text style={styles.placeholderText}>{gpsError}</Text> : null}
            {hasLocationPermission !== true ? (
              <TouchableOpacity style={styles.retryBtn} onPress={retryGps} testID="retry-gps-button">
                <Ionicons name="location" size={18} color="#fff" />
                <Text style={styles.retryText}>{t('run.activate_gps')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* ─── Bottom controls flottanti ─────────────────────────────── */}
      <SafeAreaView edges={['bottom']} style={styles.controlsWrap}>
        <View style={styles.controls}>
          <TouchableOpacity
            testID="lap-button"
            style={[styles.lapBtn, (isPaused || !running) && styles.lapBtnDisabled]}
            onPress={doManualLap}
            activeOpacity={0.85}
            disabled={isPaused || !running}
          >
            <Ionicons name="flag" size={20} color="#fff" />
            <Text style={styles.lapLabel}>LAP</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="pause-button"
            style={styles.pauseBtn}
            onPress={() => { setIsPaused(p => !p); setAutoPaused(false); }}
            activeOpacity={0.85}
          >
            <Ionicons name={isPaused ? 'play' : 'pause'} size={26} color="#0F1115" />
            <Text style={styles.pauseLabel}>{isPaused ? t('run.ui_resume') : t('run.ui_pause')}</Text>
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

function StatItem({ value, label, valueColor, small }: { value: string; label: string; valueColor?: string; small?: boolean }) {
  return (
    <View style={[styles.statItem, small && styles.statItemSmall]}>
      <Text style={[
        styles.statValue,
        small && styles.statValueSmall,
        valueColor ? { color: valueColor } : null,
      ]}>{value}</Text>
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
  statItemSmall: { flex: 0, minWidth: 90 },
  statValue: {
    color: '#fff', fontSize: 24, letterSpacing: -0.5,
    fontFamily: fonts.heading,
    fontVariant: ['tabular-nums'],
  },
  statValueSmall: { fontSize: 18 },
  statLabel: {
    color: 'rgba(255,255,255,0.45)', fontSize: 9,
    letterSpacing: 1.5, marginTop: 4,
    fontFamily: fonts.headingBold,
  },
  statsGridSecondary: {
    flexDirection: 'row', gap: spacing.lg,
    marginTop: spacing.sm, paddingTop: spacing.sm,
  },

  // Step badge row (with pace target chip)
  stepBadgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    flexWrap: 'wrap',
  },
  paceChip: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  paceChipText: {
    fontSize: 9, letterSpacing: 1.2,
    fontFamily: fonts.headingBold,
  },

  // Splits horizontal strip
  splitsStrip: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.lg,
  },
  splitsStripContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  splitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  splitChipKm: {
    color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: 1,
    fontFamily: fonts.headingBold,
  },
  splitChipPace: {
    color: '#fff', fontSize: 13,
    fontFamily: fonts.headingBold,
    fontVariant: ['tabular-nums'],
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

  // Weather widget — top-left of map
  weatherBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.78)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  weatherEmoji: { fontSize: 18 },
  weatherTemp: {
    color: '#fff', fontSize: 13, lineHeight: 14,
    fontFamily: fonts.headingBold,
    fontVariant: ['tabular-nums'],
  },
  weatherWind: {
    color: 'rgba(255,255,255,0.55)', fontSize: 9, letterSpacing: 0.5,
    fontFamily: fonts.medium,
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

  // Lap button
  lapBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  lapBtnDisabled: {
    opacity: 0.4,
  },
  lapLabel: {
    color: '#fff', fontSize: 9, letterSpacing: 1.5,
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
