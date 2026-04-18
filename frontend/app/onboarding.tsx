import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { colors, spacing, radius } from '../src/theme';

const LEVELS = [
  { key: 'beginner', label: 'PRINCIPIANTE', desc: 'Mai corso o ricomincio' },
  { key: 'intermediate', label: 'INTERMEDIO', desc: 'Corro occasionalmente' },
  { key: 'expert', label: 'ESPERTO', desc: 'Alleno da anni' },
];

const GOALS = [
  { key: '5k', label: 'Correre 5K', icon: 'flag' },
  { key: '10k', label: 'Correre 10K', icon: 'ribbon' },
  { key: 'half', label: 'Mezza Maratona', icon: 'medal' },
  { key: 'fitness', label: 'Forma fisica', icon: 'fitness' },
  { key: 'weight_loss', label: 'Dimagrire', icon: 'flame' },
];

const DAYS = [2, 3, 4, 5, 6];

export default function Onboarding() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState('');
  const [goal, setGoal] = useState('');
  const [days, setDays] = useState(3);
  const [saving, setSaving] = useState(false);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => Math.max(0, s - 1));

  const finish = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/onboarding', {
        level, goal, days_per_week: days,
      });
      await refresh();
      router.replace({ pathname: '/plan/[id]', params: { id: data.recommended_plan_id } });
    } catch (e: any) {
      Alert.alert('Errore', 'Salvataggio fallito');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressBar}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.dot, step >= i && styles.dotActive]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <>
            <Text style={styles.h1}>QUAL&apos;E&apos; IL TUO LIVELLO?</Text>
            <Text style={styles.sub}>Scegli quello che ti descrive meglio</Text>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l.key}
                testID={`onb-level-${l.key}`}
                style={[styles.optionCard, level === l.key && styles.optionActive]}
                onPress={() => setLevel(l.key)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{l.label}</Text>
                  <Text style={styles.optionDesc}>{l.desc}</Text>
                </View>
                {level === l.key && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.h1}>IL TUO OBIETTIVO?</Text>
            <Text style={styles.sub}>Cosa vuoi raggiungere con RunHub</Text>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.key}
                testID={`onb-goal-${g.key}`}
                style={[styles.optionCard, goal === g.key && styles.optionActive]}
                onPress={() => setGoal(g.key)}
              >
                <Ionicons name={g.icon as any} size={28} color={goal === g.key ? colors.primary : colors.textSecondary} />
                <Text style={[styles.optionTitle, { flex: 1, marginLeft: spacing.md }]}>{g.label}</Text>
                {goal === g.key && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.h1}>QUANTI GIORNI/SETTIMANA?</Text>
            <Text style={styles.sub}>Quanto tempo puoi dedicare</Text>
            <View style={styles.daysRow}>
              {DAYS.map(d => (
                <TouchableOpacity
                  key={d}
                  testID={`onb-days-${d}`}
                  style={[styles.dayCard, days === d && styles.dayActive]}
                  onPress={() => setDays(d)}
                >
                  <Text style={[styles.dayNum, days === d && { color: '#fff' }]}>{d}</Text>
                  <Text style={[styles.dayLabel, days === d && { color: '#fff' }]}>GIORNI</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>IL TUO PROFILO</Text>
              <Text style={styles.summaryText}>
                {LEVELS.find(l => l.key === level)?.label} ·{' '}
                {GOALS.find(g => g.key === goal)?.label} ·{' '}
                {days} allenamenti a settimana
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 ? (
          <TouchableOpacity testID="onb-back" style={styles.backBtn} onPress={back}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : <View style={{ width: 50 }} />}
        {step < 2 ? (
          <TouchableOpacity
            testID="onb-next"
            style={[styles.nextBtn, !((step === 0 && level) || (step === 1 && goal)) && { opacity: 0.4 }]}
            disabled={!((step === 0 && level) || (step === 1 && goal))}
            onPress={next}
          >
            <Text style={styles.nextText}>CONTINUA</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="onb-finish"
            style={styles.nextBtn} onPress={finish} disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.nextText}>VAI AL MIO PIANO</Text>
                <Ionicons name="rocket" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  progressBar: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.md },
  dot: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.surface },
  dotActive: { backgroundColor: colors.primary },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  h1: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: spacing.lg },
  sub: { color: colors.textSecondary, marginTop: 4, marginBottom: spacing.lg },
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 2, borderColor: colors.border, marginBottom: spacing.md,
  },
  optionActive: { borderColor: colors.primary },
  optionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  optionDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  dayCard: {
    width: 90, height: 90, borderRadius: radius.lg, backgroundColor: colors.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border,
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayNum: { color: colors.textPrimary, fontSize: 36, fontWeight: '900' },
  dayLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  summary: { marginTop: spacing.xl, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  summaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  summaryText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg, alignItems: 'center' },
  backBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.pill, marginLeft: spacing.md },
  nextText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});
