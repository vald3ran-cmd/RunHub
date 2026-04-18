import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { api } from '../../src/api';
import { colors, spacing, radius } from '../../src/theme';

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState({ daily_km: '3', weekly_km: '15', monthly_km: '60' });
  const [showGoals, setShowGoals] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const { data } = await api.get('/stats/progress');
        setGoals({
          daily_km: String(data.goals.daily_km),
          weekly_km: String(data.goals.weekly_km),
          monthly_km: String(data.goals.monthly_km),
        });
      } catch {}
      await refresh();
    })();
  }, []));

  const saveGoals = async () => {
    setSaving(true);
    try {
      await api.put('/stats/goals', {
        daily_km: parseFloat(goals.daily_km) || 0,
        weekly_km: parseFloat(goals.weekly_km) || 0,
        monthly_km: parseFloat(goals.monthly_km) || 0,
      });
      setShowGoals(false);
    } catch {
      Alert.alert('Errore', 'Impossibile aggiornare i traguardi');
    } finally { setSaving(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? 'R'}</Text>
        </View>
        <Text style={styles.name} testID="profile-name">{user?.name ?? 'Runner'}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: tierColor(user?.tier || (user?.is_premium ? 'performance' : 'free')) }]}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.badgeText}>{tierLabel(user?.tier || (user?.is_premium ? 'performance' : 'free'))}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={styles.badgeText}>{(user?.level ?? 'beginner').toUpperCase()}</Text>
          </View>
        </View>

        {(!user?.tier || user.tier === 'free') ? (
          <TouchableOpacity
            testID="goto-premium-button"
            style={styles.premiumCard} onPress={() => router.push('/premium')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumLabel}>SBLOCCA FUNZIONI PREMIUM</Text>
              <Text style={styles.premiumTitle}>Passa a Starter, Performance o Elite</Text>
              <Text style={styles.premiumSub}>AI Coach, piani avanzati, analisi complete</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="manage-premium-button"
            style={styles.row} onPress={() => router.push('/premium')}
          >
            <Ionicons name="star" size={20} color={colors.primary} />
            <Text style={styles.rowText}>Gestisci abbonamento</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          testID="edit-goals-button"
          style={styles.row} onPress={() => setShowGoals(true)}
        >
          <Ionicons name="flag" size={20} color={colors.primary} />
          <Text style={styles.rowText}>Modifica traguardi</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {user?.tier === 'performance' || user?.tier === 'elite' ? (
          <TouchableOpacity
            testID="race-predictor-button"
            style={styles.row} onPress={() => router.push('/race-predictor')}
          >
            <Ionicons name="stopwatch" size={20} color={colors.primary} />
            <Text style={styles.rowText}>Proiezione tempi gara & VO2max</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}

        {user?.tier === 'elite' ? (
          <TouchableOpacity
            testID="coach-dashboard-button"
            style={styles.row} onPress={() => router.push('/coach')}
          >
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={styles.rowText}>Coach Dashboard</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          testID="logout-button"
          style={styles.row} onPress={async () => { await logout(); router.replace('/(auth)/login'); }}
        >
          <Ionicons name="log-out" size={20} color={colors.primary} />
          <Text style={styles.rowText}>Esci</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showGoals} transparent animationType="slide" onRequestClose={() => setShowGoals(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>MODIFICA TRAGUARDI (KM)</Text>
            <Text style={styles.inputLabel}>GIORNALIERO</Text>
            <TextInput
              testID="goals-daily-input"
              style={styles.input} keyboardType="numeric"
              value={goals.daily_km} onChangeText={(v) => setGoals(g => ({ ...g, daily_km: v }))}
            />
            <Text style={styles.inputLabel}>SETTIMANALE</Text>
            <TextInput
              testID="goals-weekly-input"
              style={styles.input} keyboardType="numeric"
              value={goals.weekly_km} onChangeText={(v) => setGoals(g => ({ ...g, weekly_km: v }))}
            />
            <Text style={styles.inputLabel}>MENSILE</Text>
            <TextInput
              testID="goals-monthly-input"
              style={styles.input} keyboardType="numeric"
              value={goals.monthly_km} onChangeText={(v) => setGoals(g => ({ ...g, monthly_km: v }))}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGoals(false)}>
                <Text style={styles.cancelText}>ANNULLA</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="save-goals-button"
                style={styles.saveBtn} onPress={saveGoals} disabled={saving}
              >
                <Text style={styles.saveText}>{saving ? 'SALVO...' : 'SALVA'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function tierColor(t: string) {
  if (t === 'elite') return '#F59E0B';
  if (t === 'performance') return colors.primary;
  if (t === 'starter') return '#10B981';
  return colors.textMuted;
}
function tierLabel(t: string) {
  if (t === 'elite') return 'ELITE';
  if (t === 'performance') return 'PERFORMANCE';
  if (t === 'starter') return 'STARTER';
  return 'FREE';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary,
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '900' },
  name: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: spacing.md },
  email: { color: colors.textSecondary, textAlign: 'center', marginTop: 2 },
  badgeRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  premiumCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  premiumLabel: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 2, opacity: 0.9 },
  premiumTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  premiumSub: { color: '#fff', fontSize: 12, marginTop: 4, opacity: 0.9 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginTop: spacing.md,
  },
  rowText: { color: colors.textPrimary, flex: 1, fontSize: 15, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.background, padding: spacing.lg,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 1, borderColor: colors.border,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: spacing.md },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: spacing.sm, marginBottom: 4 },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, borderRadius: radius.md, fontSize: 16 },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center' },
  saveBtn: { flex: 1, padding: spacing.md, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center' },
  cancelText: { color: colors.textPrimary, fontWeight: '800', letterSpacing: 1 },
  saveText: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
});
