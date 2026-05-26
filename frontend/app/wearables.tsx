import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { api } from '../src/api';
import { colors, spacing, radius } from '../src/theme';
import { isWearablesAvailable, connectWearable, fetchWearableStats } from '../src/wearables';
import { useT } from '../src/i18n';

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
  const { t } = useT();
  const [today, setToday] = useState<Stats>({});
  const [history, setHistory] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Detect iPad correttamente (Platform.isPad NON esiste in React Native — serve expo-device)
  const isIpad = Platform.OS === 'ios' && Device.deviceType === Device.DeviceType.TABLET;

  const loadData = async () => {
    try {
      const [tData, h] = await Promise.all([
        api.get('/wearables/today'),
        api.get('/wearables/history?days=7'),
      ]);
      setToday(tData.data || {});
      setHistory(h.data || []);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    loadData().finally(() => setLoading(false));
  }, []));

  const performSync = async () => {
    setSyncing(true);
    // DEBUG: traccia ogni step per capire dove fallisce in TestFlight (console.log è strippato)
    let step = 'start';
    try {
      step = 'connectWearable';
      const conn = await connectWearable();
      step = `connectWearable→${JSON.stringify(conn)}`;
      if (!conn.ok) {
        Alert.alert(
          t('wearables.permission_denied_title'),
          t('wearables.permission_denied_msg', { platform: conn.platform, reason: (conn as any).reason || 'denied/cancel' })
        );
        setSyncing(false);
        return;
      }
      step = 'fetchWearableStats';
      const stats = await fetchWearableStats();
      step = `fetchWearableStats→${stats ? 'ok' : 'null'}`;
      if (!stats) {
        Alert.alert(
          t('wearables.no_data_dialog_title'),
          t('wearables.no_data_dialog_msg')
        );
        setSyncing(false);
        return;
      }
      step = 'api.post /wearables/sync';
      await api.post('/wearables/sync', { ...stats, platform: conn.platform });
      step = 'loadData';
      await loadData();
      Alert.alert(t('wearables.synced_title'), t('wearables.synced_msg'));
    } catch (e: any) {
      // Esponi l'errore reale on-screen perché in TestFlight i console.log sono strippati
      const msg = String(e?.message || e || 'unknown');
      const stack = String(e?.stack || '').substring(0, 400);
      const name = String(e?.name || 'Error');
      Alert.alert(
        t('wearables.sync_failed_debug_title'),
        `Step: ${step}\nError: ${name}: ${msg}\n\nStack:\n${stack}`,
        [{ text: 'OK' }]
      );
    } finally {
      setSyncing(false);
    }
  };

  const onSync = async () => {
    if (!isWearablesAvailable()) {
      Alert.alert(
        t('wearables.expo_go_unavailable_title'),
        t('wearables.expo_go_unavailable_msg'),
      );
      return;
    }

    // Su iPad HealthKit è progettato per iPhone — informa l'utente e non procede
    if (isIpad) {
      Alert.alert(
        t('wearables.ipad_dialog_title'),
        t('wearables.ipad_dialog_msg'),
        [{ text: 'OK' }]
      );
      return;
    }

    // Pre-permission info: nessun bottone "Annulla" (Apple Guideline 5.1.1).
    // Se l'utente vuole rifiutare, può farlo nella finestra nativa di iOS che apparirà.
    if (Platform.OS === 'ios') {
      Alert.alert(
        t('wearables.connect_title'),
        t('wearables.connect_msg'),
        [
          { text: t('common.continue') || 'Continua', onPress: () => performSync() },
        ]
      );
      return;
    }

    // Android Health Connect → procedi direttamente (Health Connect ha già il proprio dialog)
    await performSync();
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
            {Platform.OS === 'ios' ? t('wearables.apple_health_brand') : Platform.OS === 'android' ? t('wearables.health_connect_brand') : t('wearables.wearables_brand')}
          </Text>
        </View>

        {!isWearablesAvailable() ? (
          <View style={styles.warnBox}>
            <Ionicons name="information-circle" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>{t('wearables.expogo_warn_title')}</Text>
              <Text style={styles.warnText}>
                {t('wearables.expogo_warn_text')}
              </Text>
            </View>
          </View>
        ) : null}

        {isIpad ? (
          <View style={styles.warnBox}>
            <Ionicons name="information-circle" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>{t('wearables.ipad_warn_title')}</Text>
              <Text style={styles.warnText}>
                {t('wearables.ipad_warn_text')}
              </Text>
            </View>
          </View>
        ) : null}

        <TouchableOpacity
          testID="sync-wearable-btn"
          style={[styles.syncBtn, (syncing || isIpad) && { opacity: 0.6 }]}
          onPress={onSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="sync" size={20} color="#fff" />
              <Text style={styles.syncText}>{t('wearables.sync_now')}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>{t('wearables.today_section')}</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.grid}>
            <StatCard icon="walk" label={t('wearables.steps')} value={(today.steps ?? 0).toLocaleString('it-IT')} />
            <StatCard icon="map" label="KM" value={(today.distance_km ?? 0).toFixed(2)} />
            <StatCard icon="flame" label="KCAL" value={Math.round(today.active_calories ?? 0).toString()} />
            <StatCard icon="heart" label="BPM" value={today.heart_rate_avg ? Math.round(today.heart_rate_avg).toString() : '—'} />
          </View>
        )}
        <Text style={styles.meta}>
          {today.updated_at ? t('wearables.last_sync', { when: new Date(today.updated_at).toLocaleString('it-IT') }) : t('wearables.no_data_today')}
          {today.platform ? ` · ${platformLabel}` : ''}
        </Text>

        <Text style={styles.sectionTitle}>{t('wearables.last_7_days')}</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>{t('wearables.no_sync_7_days')}</Text>
        ) : history.map((d, i) => (
          <View key={i} style={styles.histRow}>
            <Text style={styles.histDate}>{new Date(d.date as any).toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</Text>
            <View style={{ flex: 1, flexDirection: 'row', gap: spacing.md, justifyContent: 'flex-end' }}>
              <Text style={styles.histStat}>{(d.steps ?? 0).toLocaleString('it-IT')} {t('wearables.steps_short')}</Text>
              <Text style={styles.histStat}>{(d.distance_km ?? 0).toFixed(1)} {t('wearables.km_short')}</Text>
            </View>
          </View>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="bulb" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            {Platform.OS === 'android'
              ? t('wearables.info_android')
              : t('wearables.info_ios')}
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
  infoBox: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, marginTop: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  infoText: { color: colors.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
});
