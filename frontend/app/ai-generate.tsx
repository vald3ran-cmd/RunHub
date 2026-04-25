import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { colors, spacing, radius } from '../src/theme';

const LEVELS = [
  { key: 'beginner', label: 'PRINCIPIANTE' },
  { key: 'intermediate', label: 'INTERMEDIO' },
  { key: 'expert', label: 'ESPERTO' },
];

export default function AIGenerate() {
  const router = useRouter();
  const { user } = useAuth();
  const [level, setLevel] = useState('beginner');
  const [goal, setGoal] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  const [weeks, setWeeks] = useState('4');
  const [minutes, setMinutes] = useState('45');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const onGenerate = async () => {
    if (!user?.is_premium) {
      Alert.alert('Premium richiesto', 'Abbonati per generare piani con AI', [
        { text: 'Dopo' },
        { text: 'Upgrade', onPress: () => router.replace('/premium') },
      ]);
      return;
    }
    if (!goal.trim()) { Alert.alert('Errore', 'Inserisci il tuo obiettivo'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/plans/ai-generate', {
        level, goal: goal.trim(),
        days_per_week: parseInt(daysPerWeek) || 3,
        duration_weeks: parseInt(weeks) || 4,
        available_minutes: parseInt(minutes) || 45,
        notes: notes.trim() || null,
      }, {
        // L'AI può impiegare 60-90s per generare un piano completo.
        // Default global timeout (30s) è troppo poco.
        timeout: 150000,
      });
      router.replace({ pathname: '/plan/[id]', params: { id: data.plan_id } });
    } catch (e: any) {
      const d = e?.response?.data?.detail;
      const isTimeout = e?.code === 'ECONNABORTED' || /timeout/i.test(e?.message || '');
      Alert.alert('Errore', typeof d === 'string' ? d : isTimeout
        ? 'L\'AI sta impiegando più tempo del previsto. Riprova tra qualche istante.'
        : 'Generazione fallita');
    } finally { setLoading(false); }
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
          <Text style={styles.title}>AI COACH</Text>
          <Text style={styles.sub}>Un piano personalizzato su misura in pochi secondi</Text>

          {!user?.is_premium ? (
            <View style={styles.warnBox}>
              <Ionicons name="lock-closed" size={16} color={colors.primary} />
              <Text style={styles.warnText}>Funzione Premium — passa a Premium per generare piani AI</Text>
            </View>
          ) : null}

          <Text style={styles.label}>LIVELLO</Text>
          <View style={styles.pillRow}>
            {LEVELS.map(l => (
              <TouchableOpacity
                key={l.key}
                testID={`level-${l.key}`}
                style={[styles.pill, level === l.key && styles.pillActive]}
                onPress={() => setLevel(l.key)}
              >
                <Text style={[styles.pillText, level === l.key && styles.pillTextActive]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>OBIETTIVO</Text>
          <TextInput
            testID="goal-input"
            style={styles.input} placeholder="Es. Correre 10K senza fermarmi"
            placeholderTextColor={colors.textMuted}
            value={goal} onChangeText={setGoal} multiline
          />

          <View style={styles.gridRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>SETTIMANE</Text>
              <TextInput
                testID="weeks-input"
                style={styles.input} keyboardType="numeric" value={weeks} onChangeText={setWeeks}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>GIORNI/SETT</Text>
              <TextInput
                testID="days-input"
                style={styles.input} keyboardType="numeric" value={daysPerWeek} onChangeText={setDaysPerWeek}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>MIN/SESS</Text>
              <TextInput
                testID="minutes-input"
                style={styles.input} keyboardType="numeric" value={minutes} onChangeText={setMinutes}
              />
            </View>
          </View>

          <Text style={styles.label}>NOTE (OPZIONALE)</Text>
          <TextInput
            testID="notes-input"
            style={[styles.input, { minHeight: 80 }]}
            placeholder="Infortuni, preferenze, ecc."
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
                <Text style={styles.generateText}>GENERA PIANO</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  pill: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  pillTextActive: { color: '#fff' },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, borderRadius: radius.md, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  gridRow: { flexDirection: 'row', gap: spacing.sm },
  generateBtn: {
    backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.pill,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl,
  },
  generateText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 16 },
});
