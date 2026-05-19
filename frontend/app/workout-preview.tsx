import { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fonts, stepTypeLabels } from '../src/theme';
import {
  ChevronLeft, Sun, Activity, Wind, MapPin, Clock, Flame,
} from 'lucide-react-native';
import { haptics } from '../src/uiPolish';

type Step = {
  type: string;
  duration_seconds?: number;
  distance_m?: number;
  repeats?: number;
  pace?: string;
  notes?: string;
  recovery_seconds?: number;
  recovery_distance_m?: number;
};

type PhaseKey = 'warmup' | 'main' | 'cooldown';

// ─────────────────────────────────────────────────────────────
// Heuristic: split steps into 3 phases
// ─────────────────────────────────────────────────────────────
function classifyPhases(steps: Step[]): Record<PhaseKey, Step[]> {
  const warmup: Step[] = [];
  const main: Step[] = [];
  const cooldown: Step[] = [];

  if (!steps || steps.length === 0) return { warmup, main, cooldown };

  let i = 0;
  // warmup: consecutive warmup-type steps at start
  while (i < steps.length && (steps[i].type === 'warmup' || steps[i].type === 'walk')) {
    warmup.push(steps[i]);
    i++;
  }
  // cooldown: consecutive stretching/recovery/walk steps at end
  let j = steps.length - 1;
  const cdTypes = new Set(['stretching', 'gymnastics', 'recovery', 'walk']);
  while (j > i && cdTypes.has(steps[j].type)) {
    cooldown.unshift(steps[j]);
    j--;
  }
  // main: rest
  for (let k = i; k <= j; k++) main.push(steps[k]);

  // edge case: if no warmup, take first step
  if (warmup.length === 0 && main.length > 1) {
    warmup.push(main.shift() as Step);
  }
  // edge case: if no cooldown, take last step
  if (cooldown.length === 0 && main.length > 1) {
    cooldown.push(main.pop() as Step);
  }
  return { warmup, main, cooldown };
}

function totalSeconds(steps: Step[]): number {
  return steps.reduce((acc, s) => {
    const reps = s.repeats || 1;
    const stepDur = (s.duration_seconds || 0) + (s.recovery_seconds || 0);
    return acc + stepDur * reps;
  }, 0);
}

function totalMeters(steps: Step[]): number {
  return steps.reduce((acc, s) => {
    const reps = s.repeats || 1;
    const stepDist = (s.distance_m || 0) + (s.recovery_distance_m || 0);
    return acc + stepDist * reps;
  }, 0);
}

function fmtMinutes(s: number): string {
  return `${Math.round(s / 60)} min`;
}

function describePhase(steps: Step[]): string[] {
  return steps.map((s) => {
    const label = stepTypeLabels[s.type] || s.type.toUpperCase();
    if (s.distance_m && s.repeats && s.repeats > 1) {
      const km = s.distance_m >= 1000 ? `${s.distance_m / 1000} km` : `${s.distance_m} m`;
      return `${s.repeats} × ${km}${s.pace ? ` · ${s.pace}` : ''}`;
    }
    if (s.duration_seconds) {
      return `${Math.round(s.duration_seconds / 60)} min · ${label.toLowerCase()}`;
    }
    if (s.distance_m) {
      const km = s.distance_m >= 1000 ? `${s.distance_m / 1000} km` : `${s.distance_m} m`;
      return `${km} · ${label.toLowerCase()}`;
    }
    return label;
  });
}

function intensityFromSteps(steps: Step[]): { label: string; color: string } {
  // simple heuristic: presence of sprint/run with pace ratio
  const types = new Set(steps.map(s => s.type));
  if (types.has('sprint')) return { label: 'Massima', color: '#EF4444' };
  if (types.has('run') && (steps.some(s => (s.repeats || 1) >= 4))) return { label: 'Alta', color: colors.primary };
  if (types.has('run')) return { label: 'Media', color: colors.warning };
  return { label: 'Bassa', color: colors.success };
}

// ─────────────────────────────────────────────────────────────
export default function WorkoutPreview() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    subtitle?: string;
    plan_id?: string;
    workout_id?: string;
    steps?: string;
    estimated_duration_min?: string;
    estimated_distance_km?: string;
  }>();

  const steps: Step[] = useMemo(() => {
    try { return JSON.parse(params.steps || '[]'); } catch { return []; }
  }, [params.steps]);

  const phases = useMemo(() => classifyPhases(steps), [steps]);
  const intensity = useMemo(() => intensityFromSteps(steps), [steps]);

  const totalDurationSec = totalSeconds(steps);
  const totalDistanceM = totalMeters(steps);
  const distanceKm = params.estimated_distance_km
    ? parseFloat(params.estimated_distance_km)
    : (totalDistanceM > 0 ? totalDistanceM / 1000 : 0);
  const durationMin = params.estimated_duration_min
    ? parseInt(params.estimated_duration_min, 10)
    : Math.round(totalDurationSec / 60);

  const onStart = () => {
    haptics.medium();
    router.replace({
      pathname: '/run-active',
      params: {
        title: params.title || 'Allenamento',
        workout_id: params.workout_id,
        plan_id: params.plan_id,
        steps: params.steps,
      },
    });
  };

  const title = params.title || 'Allenamento';
  const subtitle = params.subtitle || (steps.length > 0 ? `${steps.length} step` : '');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {/* Phase: RISCALDAMENTO */}
        {phases.warmup.length > 0 ? (
          <PhaseCard
            icon={<Sun size={16} color={colors.textSecondary} strokeWidth={2.4} />}
            label="RISCALDAMENTO"
            lines={describePhase(phases.warmup)}
          />
        ) : null}

        {/* Phase: PARTE PRINCIPALE (highlighted) */}
        {phases.main.length > 0 ? (
          <PhaseCard
            icon={<Activity size={16} color={colors.primary} strokeWidth={2.4} />}
            label="PARTE PRINCIPALE"
            lines={describePhase(phases.main)}
            highlight
          />
        ) : null}

        {/* Phase: DEFATICAMENTO */}
        {phases.cooldown.length > 0 ? (
          <PhaseCard
            icon={<Wind size={16} color={colors.textSecondary} strokeWidth={2.4} />}
            label="DEFATICAMENTO"
            lines={describePhase(phases.cooldown)}
          />
        ) : null}

        {/* DETTAGLI */}
        <View style={styles.detailsHeader}>
          <View style={styles.sectionDot} />
          <Text style={styles.detailsHeaderText}>DETTAGLI</Text>
        </View>
        <View style={styles.detailsCard}>
          <DetailRow
            icon={<MapPin size={16} color={colors.textSecondary} strokeWidth={2.4} />}
            label="Distanza"
            value={distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : '—'}
          />
          <View style={styles.detailsDivider} />
          <DetailRow
            icon={<Clock size={16} color={colors.textSecondary} strokeWidth={2.4} />}
            label="Durata stimata"
            value={durationMin > 0 ? `${durationMin} min` : '—'}
          />
          <View style={styles.detailsDivider} />
          <DetailRowBadge
            icon={<Flame size={16} color={colors.textSecondary} strokeWidth={2.4} />}
            label="Intensità"
            badgeText={intensity.label}
            badgeColor={intensity.color}
          />
        </View>
      </ScrollView>

      {/* CTA fissa in basso */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity
          testID="start-workout-button"
          style={styles.cta}
          onPress={onStart}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Inizia allenamento</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
function PhaseCard({
  icon, label, lines, highlight,
}: { icon: React.ReactNode; label: string; lines: string[]; highlight?: boolean }) {
  return (
    <View style={[styles.phaseCard, highlight && styles.phaseCardHighlight]}>
      <View style={styles.phaseHeader}>
        {icon}
        <Text style={[styles.phaseLabel, highlight && { color: colors.primary }]}>{label}</Text>
      </View>
      {lines.map((line, idx) => (
        <Text
          key={idx}
          style={[styles.phaseLine, idx === 0 && styles.phaseLineFirst, highlight && idx === 0 && { color: '#fff' }]}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>{icon}<Text style={styles.detailLabel}>{label}</Text></View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function DetailRowBadge({
  icon, label, badgeText, badgeColor,
}: { icon: React.ReactNode; label: string; badgeText: string; badgeColor: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>{icon}<Text style={styles.detailLabel}>{label}</Text></View>
      <View style={[styles.intensityBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.intensityBadgeText}>{badgeText}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontFamily: fonts.heading,
    letterSpacing: -0.6,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    fontFamily: fonts.medium,
    marginTop: 4,
  },

  // Phase
  phaseCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phaseCardHighlight: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: '#1A1410',
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  phaseLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontFamily: fonts.headingBold,
    letterSpacing: 1.6,
  },
  phaseLine: {
    color: colors.textSecondary,
    fontSize: 13,
    fontFamily: fonts.medium,
    marginTop: 4,
  },
  phaseLineFirst: {
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.bold,
    marginTop: 0,
  },

  // Details
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionDot: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  detailsHeaderText: {
    color: colors.primary,
    fontSize: 11,
    fontFamily: fonts.headingBold,
    letterSpacing: 1.6,
  },
  detailsCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  detailValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  detailsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  intensityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  intensityBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
  },

  // CTA
  ctaWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cta: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.headingBold,
    letterSpacing: 0.3,
  },
});
