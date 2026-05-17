import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth';
import { api } from '../../src/api';
import { colors, spacing, radius, shadows, typography } from '../../src/theme';
import { showPrivacyOptionsForm } from '../../src/ConsentManager';
import { isAdMobAvailable } from '../../src/adMobConfig';

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
          <>
            <TouchableOpacity
              testID="manage-premium-button"
              style={styles.row} onPress={() => router.push('/premium')}
            >
              <Ionicons name="star" size={20} color={colors.primary} />
              <Text style={styles.rowText}>Cambia piano</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              testID="billing-portal-button"
              style={styles.row}
              onPress={async () => {
                try {
                  const { data } = await api.post('/stripe/portal');
                  if (data?.url) Linking.openURL(data.url);
                } catch (e: any) {
                  Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile aprire il portale');
                }
              }}
            >
              <Ionicons name="card" size={20} color={colors.primary} />
              <Text style={styles.rowText}>Gestisci pagamento e fatture</Text>
              <Ionicons name="open-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          testID="badges-button"
          style={styles.row} onPress={() => router.push('/badges')}
        >
          <Ionicons name="trophy" size={20} color={colors.primary} />
          <Text style={styles.rowText}>Achievement & Badge</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

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

        {user?.role === 'admin' ? (
          <TouchableOpacity
            testID="admin-panel-button"
            style={[styles.row, { borderColor: colors.primary, borderWidth: 1 }]} onPress={() => router.push('/admin')}
          >
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={[styles.rowText, { color: colors.primary }]}>Admin Panel</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          testID="community-button"
          style={styles.row} onPress={() => router.push('/social')}
        >
          <Ionicons name="people" size={20} color={colors.primary} />
          <Text style={styles.rowText}>Community (amici, feed, classifica)</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="heatmap-button"
          style={styles.row} onPress={() => router.push('/heatmap')}
        >
          <Ionicons name="map" size={20} color={colors.primary} />
          <Text style={styles.rowText}>La mia mappa corse (heatmap)</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="wearables-button"
          style={styles.row} onPress={() => router.push('/wearables')}
        >
          <Ionicons name="watch" size={20} color={colors.primary} />
          <Text style={styles.rowText}>Wearables (Apple Health / Google Fit)</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="paywall-button"
          style={styles.row} onPress={() => router.push('/paywall')}
        >
          <Ionicons name="rocket" size={20} color={colors.primary} />
          <Text style={styles.rowText}>Abbonamenti & Piani</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="account-button"
          style={styles.row} onPress={() => router.push('/account')}
        >
          <Ionicons name="person-circle" size={20} color={colors.primary} />
          <Text style={styles.rowText}>Account & Privacy</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="terms-button"
          style={styles.row} onPress={() => router.push('/terms')}
        >
          <Ionicons name="document-text" size={20} color={colors.primary} />
          <Text style={styles.rowText}>Termini di Servizio</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          testID="privacy-button"
          style={styles.row} onPress={() => router.push('/privacy')}
        >
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.rowText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {isAdMobAvailable ? (
          <TouchableOpacity
            testID="privacy-options-button"
            style={styles.row}
            onPress={async () => {
              try {
                await showPrivacyOptionsForm();
                Alert.alert('Preferenze aggiornate', 'Le tue scelte sono state salvate.');
              } catch (e: any) {
                Alert.alert(
                  'Non disponibile',
                  'Le preferenze privacy per la pubblicità non sono disponibili su questo dispositivo.',
                );
              }
            }}
          >
            <Ionicons name="options" size={20} color={colors.primary} />
            <Text style={styles.rowText}>Preferenze privacy ads (GDPR)</Text>
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
    width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary,
    alignSelf: 'center', justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarText: { color: '#fff', fontSize: 38, fontWeight: '900' },
  name: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: spacing.md, letterSpacing: -0.4 },
  email: { color: colors.textSecondary, textAlign: 'center', marginTop: 4, fontSize: 13 },
  badgeRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  premiumCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.lg,
    marginTop: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  premiumLabel: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 2, opacity: 0.9 },
  premiumTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 4 },
  premiumSub: { color: '#fff', fontSize: 12, marginTop: 4, opacity: 0.9 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.lg,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  rowText: { color: colors.textPrimary, flex: 1, fontSize: 14, fontWeight: '600' },
  modalBg: { flex: 1, backgroundColor: 'rgba(15,17,21,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface, padding: spacing.lg,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', letterSpacing: -0.3, marginBottom: spacing.md },
  inputLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: spacing.sm, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, padding: spacing.md, borderRadius: radius.md, fontSize: 16, fontWeight: '600' },
  cancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, alignItems: 'center' },
  saveBtn: { flex: 1, padding: spacing.md, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center' },
  cancelText: { color: colors.textPrimary, fontWeight: '800', letterSpacing: 0.5 },
  saveText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5 },
});
