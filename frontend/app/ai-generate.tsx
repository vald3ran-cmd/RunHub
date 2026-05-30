import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { colors, spacing, radius } from '../src/theme';
import { useT, useLocale } from '../src/i18n';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 180_000; // 3 minutes hard cap

export default function AIGenerate() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useT();
  const { locale } = useLocale();
  const LEVELS = [
    { key: 'beginner',     label: t('ai_generate.level_beginner') },
    { key: 'intermediate', label: t('ai_generate.level_intermediate') },
    { key: 'expert',       label: t('ai_generate.level_expert') },
  ];
  const [level, setLevel] = useState('beginner');
  const [goal, setGoal] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  const [weeks, setWeeks] = useState('4');
  const [minutes, setMinutes] = useState('45');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Polling state
  const [jobId, setJobId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds since job started
  const [estimatedTotal, setEstimatedTotal] = useState(90);
  const cancelledRef = useRef(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animate the progress bar smoothly based on elapsed/estimated.
  useEffect(() => {
    const target = Math.min(elapsed / Math.max(estimatedTotal, 30), 0.97);
    Animated.timing(progressAnim, {
      toValue: target,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [elapsed, estimatedTotal, progressAnim]);

  // Cleanup on unmount: cancel any in-flight polling.
  useEffect(() => () => { cancelledRef.current = true; }, []);

  const progressLabel = () => {
    if (elapsed < 5) return t('ai_generate.progress_starting');
    if (elapsed < 20) return t('ai_generate.progress_thinking');
    if (elapsed < 50) return t('ai_generate.progress_designing');
    if (elapsed < 75) return t('ai_generate.progress_finalizing');
    return t('ai_generate.progress_almost');
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const onGenerate = async () => {
    if (!user?.is_premium) {
      Alert.alert(t('ai_generate.premium_required_title'), t('ai_generate.premium_required_msg'), [
        { text: t('common.later') },
        { text: t('ai_generate.upgrade'), onPress: () => router.replace('/premium') },
      ]);
      return;
    }
    if (!goal.trim()) { Alert.alert(t('common.error'), t('ai_generate.goal_required')); return; }

    cancelledRef.current = false;
    setLoading(true);
    setElapsed(0);
    setJobId(null);
    progressAnim.setValue(0);

    try {
      // Step 1: enqueue the job. Backend returns 202 immediately with {job_id}.
      const { data: createRes } = await api.post('/plans/ai-generate', {
        level, goal: goal.trim(),
        days_per_week: parseInt(daysPerWeek) || 3,
        duration_weeks: parseInt(weeks) || 4,
        available_minutes: parseInt(minutes) || 45,
        notes: notes.trim() || null,
        locale,
      }, { timeout: 15000 });

      const newJobId: string = createRes.job_id;
      if (!newJobId) throw new Error('No job_id returned');
      setJobId(newJobId);

      // Step 2: poll the status endpoint until 'done' or 'error' or timeout.
      const startTime = Date.now();
      while (!cancelledRef.current) {
        const ageMs = Date.now() - startTime;
        if (ageMs > MAX_POLL_DURATION_MS) {
          throw new Error('TIMEOUT_POLLING');
        }
        try {
          const { data: status } = await api.get(`/plans/ai-generate/status/${newJobId}`, {
            timeout: 8000,
          });
          setElapsed(status.elapsed_seconds || Math.floor(ageMs / 1000));
          if (status.estimated_total_seconds) setEstimatedTotal(status.estimated_total_seconds);

          if (status.status === 'done' && status.plan_id) {
            // Complete the progress bar before navigating
            Animated.timing(progressAnim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: false,
            }).start(() => {
              if (!cancelledRef.current) {
                router.replace({ pathname: '/plan/[id]', params: { id: status.plan_id } });
              }
            });
            return;
          }
          if (status.status === 'error') {
            const detail = status.error_detail || t('ai_generate.generate_failed');
            throw new Error(detail);
          }
        } catch (pollErr: any) {
          // Ignore transient network errors during polling, but if the error
          // is one we threw above (status === 'error'), rethrow.
          if (pollErr?.message && (pollErr.message === 'TIMEOUT_POLLING' || pollErr.message.length > 5 && !pollErr.config)) {
            throw pollErr;
          }
          // else: network blip, just retry
        }
        await sleep(POLL_INTERVAL_MS);
      }
      // If cancelled, exit silently.
    } catch (e: any) {
      if (cancelledRef.current) return; // user cancelled, no alert
      const isTimeout = e?.message === 'TIMEOUT_POLLING';
      const detail = e?.response?.data?.detail || (typeof e?.message === 'string' ? e.message : null);
      Alert.alert(
        t('common.error'),
        isTimeout
          ? t('ai_generate.timeout_long')
          : (detail || t('ai_generate.generate_failed'))
      );
    } finally {
      setLoading(false);
    }
  };

  const onCancel = () => {
    cancelledRef.current = true;
    setLoading(false);
    setJobId(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>{t('ai_generate.title')}</Text>
          <Text style={styles.sub}>{t('ai_generate.subtitle')}</Text>

          {!user?.is_premium ? (
            <View style={styles.warnBox}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Text style={styles.warnText}>{t('ai_generate.premium_locked_warn')}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>{t('ai_generate.label_level')}</Text>
          <View style={styles.pillRow}>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l.key}
                testID={`level-${l.key}`}
                style={[styles.pill, level === l.key && styles.pillActive]}
                onPress={() => setLevel(l.key)}
              >
                <Text
                  style={[styles.pillText, level === l.key && styles.pillTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{t('ai_generate.label_goal')}</Text>
          <TextInput
            testID="goal-input"
            style={styles.input} placeholder={t('ai_generate.goal_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={goal} onChangeText={setGoal} multiline
          />

          <View style={styles.gridRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('ai_generate.label_weeks')}</Text>
              <TextInput
                testID="weeks-input"
                style={styles.input} keyboardType="numeric" value={weeks} onChangeText={setWeeks}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('ai_generate.label_days_per_week')}</Text>
              <TextInput
                testID="days-input"
                style={styles.input} keyboardType="numeric" value={daysPerWeek} onChangeText={setDaysPerWeek}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{t('ai_generate.label_minutes')}</Text>
              <TextInput
                testID="minutes-input"
                style={styles.input} keyboardType="numeric" value={minutes} onChangeText={setMinutes}
              />
            </View>
          </View>

          <Text style={styles.label}>{t('ai_generate.label_notes')}</Text>
          <TextInput
            testID="notes-input"
            style={[styles.input, { minHeight: 80 }]}
            placeholder={t('ai_generate.notes_placeholder')}
            placeholderTextColor={colors.textMuted}
            value={notes} onChangeText={setNotes} multiline
          />

          <TouchableOpacity
            testID="ai-generate-button"
            style={styles.generateBtn} onPress={onGenerate} disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#fff" />
                <Text style={styles.generateText}>{t('ai_generate.generate_btn')}</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Progress Overlay — shown while job is being processed by Claude */}
      {loading && (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={styles.overlayCard}>
            <View style={styles.overlayIconBox}>
              <Ionicons name="sparkles" size={42} color="#fff" />
            </View>
            <Text style={styles.overlayTitle}>{progressLabel()}</Text>
            <Text style={styles.overlaySub}>{t('ai_generate.do_not_close')}</Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            <Text style={styles.overlayEta}>
              {t('ai_generate.eta_seconds', { s: Math.max(0, estimatedTotal - elapsed) })}
            </Text>

            <TouchableOpacity
              style={styles.overlayCancelBtn}
              onPress={onCancel}
              testID="ai-cancel-button"
            >
              <Text style={styles.overlayCancelText}>{t('ai_generate.cancel_generation')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { alignItems: 'flex-end' },
  aiIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary,
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginTop: spacing.md,
  },
  title: { color: colors.textPrimary, fontSize: 32, fontWeight: '900', textAlign: 'center', marginTop: spacing.md, letterSpacing: -1 },
  sub: { color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  warnBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary },
  warnText: { color: colors.textPrimary, flex: 1, fontSize: 12 },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: spacing.lg, marginBottom: spacing.sm },
  pillRow: { flexDirection: 'row', gap: spacing.sm },
  pill: { flex: 1, paddingVertical: spacing.md, paddingHorizontal: 4, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  pillTextActive: { color: '#fff' },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, borderRadius: radius.md, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  gridRow: { flexDirection: 'row', gap: spacing.sm },
  generateBtn: {
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl,
  },
  generateText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 16 },

  /* --------- Progress Overlay (shown during AI generation) --------- */
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  overlayCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  overlayIconBox: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  overlayTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  overlaySub: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  overlayEta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.lg,
  },
  overlayCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  overlayCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
