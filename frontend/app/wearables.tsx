import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { colors, spacing, radius } from '../src/theme';
import { isWearablesAvailable, connectWearable, fetchWearableStats } from '../src/wearables';

type Stats = {
  steps?: number;
  distance_km?: number;
  active_calories?: number;
  heart_rate_avg?: number | null;
  platform?: string;
  updated_at?: string;
};

export default function WearablesScreen() {
  const router = useRouter();
  const [today, setToday] = useState<Stats>({});
  const [history, setHistory] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [t, h] = await Promise.all([
        api.get('/wearables/today'),
        api.get('/wearables/history?days=7'),
      ]);
      setToday(t.data || {});
      setHistory(h.data || []);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    loadData().finally(() => setLoading(false));
  }, []));

  const onSync = async () => {
    if (!isWearablesAvailable()) {
      Alert.alert(
        'Sincronizzazione wearable',
        'La sincronizzazione con Apple Health / Google Health Connect funziona solo in build nativa (EAS). In Expo Go non è disponibile.',
      );
      return;
    }
    // Su iPad HealthKit ha funzionalità limitate; informa l'utente prima di tentare
    if (Platform.OS === 'ios' && (Platform as any).isPad) {
      Alert.alert(
        'Apple Health su iPad',
        'Apple Health è progettata per iPhone. Su iPad la sincronizzazione potrebbe non avere dati disponibili. Per la migliore esperienza usa l\'app su iPhone.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSyncing(true);
    try {
      const conn = await connectWearable();
      if (!conn.ok) {
        Alert.alert(
          'Permesso non concesso',
          'Per sincronizzare Apple Health concedi il permesso nelle Impostazioni > Privacy > Salute. Puoi anche continuare a usare l\'app senza Apple Health.'
        );
        setSyncing(false);
        return;
      }
      const stats = await fetchWearableStats();
      if (!stats) {
        Alert.alert(
          'Nessun dato disponibile',
          'Apple Health non ha ancora dati per oggi. Sincronizza dopo aver fatto attività fisica monitorata da iPhone o Apple Watch.'
        );
        setSyncing(false);
        return;
      }
      await api.post('/wearables/sync', { ...stats, platform: conn.platform });
      await loadData();
      Alert.alert('Sincronizzato!', 'I dati di oggi sono stati aggiornati.');
    } catch (e: any) {
      // Errore generico → messaggio user-friendly, niente stack trace
      console.warn('[Wearables] sync error', e);
      Alert.alert(
        'Sincronizzazione non disponibile',
        'Non è stato possibile collegarsi ad Apple Health al momento. Riprova più tardi o usa l\'app senza sync.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const platformLabel = today.platform === 'apple_health' ? 'Apple Health' : today.platform === 'health_connect' ? 'Google Health Connect' : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>WEARABLES</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.brandRow}>
          <Ionicons
            name={Platform.OS === 'ios' ? 'logo-apple' : 'logo-google'}
            size={28}
            color={colors.textPrimary}
          />
          <Text style={styles.brandText}>
            {Platform.OS === 'ios' ? 'APPLE HEALTH' : Platform.OS === 'android' ? 'HEALTH CONNECT' : 'WEARABLES'}
          </Text>
        </View>

        {!isWearablesAvailable() ? (
          <View style={styles.warnBox}>
            <Ionicons name="information-circle" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>Non disponibile in Expo Go</Text>
              <Text style={styles.warnText}>
                La sincronizzazione con Apple Health / Google Health Connect richiede una build nativa (EAS). Gli endpoint backend sono pronti.
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          testID="sync-wearable-btn"
          style={[styles.syncBtn, syncing && { opacity: 0.6 }]}
          onPress={onSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sync" size={20} color="#fff" />
              <Text style={styles.syncText}>SINCRONIZZA ORA</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>OGGI</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.grid}>
            <StatCard icon="walk" label="PASSI" value={(today.steps ?? 0).toLocaleString('it-IT')} />
            <StatCard icon="map" label="KM" value={(today.distance_km ?? 0).toFixed(2)} />
            <StatCard icon="flame" label="KCAL" value={Math.round(today.active_calories ?? 0).toString()} />
            <StatCard icon="heart" label="BPM" value={today.heart_rate_avg ? Math.round(today.heart_rate_avg).toString() : '—'} />
          </View>
        )}
        <Text style={styles.meta}>
          {today.updated_at ? `Ultimo sync: ${new Date(today.updated_at).toLocaleString('it-IT')}` : 'Nessun dato sincronizzato oggi'}
          {today.platform ? ` · ${platformLabel}` : ''}
        </Text>

        <Text style={styles.sectionTitle}>ULTIMI 7 GIORNI</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>Nessuna sincronizzazione negli ultimi 7 giorni.</Text>
        ) : history.map((d, i) => (
          <View key={i} style={styles.histRow}>
            <Text style={styles.histDate}>{new Date(d.date as any).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</Text>
            <View style={{ flex: 1, flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' }}>
              <Text style={styles.histStat}>{(d.steps ?? 0).toLocaleString('it-IT')} passi</Text>
              <Text style={styles.histStat}>{(d.distance_km ?? 0).toFixed(1)} km</Text>
            </View>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="bulb" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            {Platform.OS === 'android'
              ? 'Su Android, installa Health Connect dal Play Store e connetti le tue app (Google Fit, Samsung Health, ecc).'
              : 'Su iOS, i dati sono condivisi da Apple Watch o dall\'iPhone stesso. Attiva i permessi al primo sync.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  brandText: { color: colors.textPrimary, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  warnBox: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(255,149,0,0.1)', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.warning, marginBottom: spacing.lg },
  warnTitle: { color: colors.warning, fontSize: 13, fontWeight: '800' },
  warnText: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.pill, minHeight: 52 },
  syncText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: spacing.xl, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: { flex: 1, minWidth: '45%', padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 6 },
  cardValue: { color: colors.textPrimary, fontSize: 24, fontWeight: '900', marginTop: 4 },
  cardLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm, textAlign: 'center' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  histDate: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', textTransform: 'capitalize', width: 90 },
  histStat: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: 13, padding: spacing.md, textAlign: 'center' },
  infoBox: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.border },
  infoText: { color: colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
});
