import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, spacing, radius } from '../src/theme';
import { useT } from '../src/i18n';

export default function GpsTest() {
  const router = useRouter();
  const { t } = useT();
  const [logs, setLogs] = useState<string[]>([]);
  const [info, setInfo] = useState<Record<string, string>>({});

  const log = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const i: Record<string, string> = {};
    i[t('gps_test.label_platform')] = Platform.OS;
    i[t('gps_test.label_platform_version')] = String(Platform.Version || 'n/a');
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        i[t('gps_test.label_url')] = window.location.href;
        i[t('gps_test.label_protocol')] = window.location.protocol;
        i[t('gps_test.label_iframe')] = (window.self !== window.top) ? t('gps_test.iframe_yes') : t('gps_test.iframe_no');
        i[t('gps_test.label_secure')] = String((window as any).isSecureContext);
      }
      if (typeof navigator !== 'undefined') {
        i[t('gps_test.label_useragent')] = (navigator.userAgent || 'n/a').slice(0, 80);
        i[t('gps_test.label_geo_api')] = navigator.geolocation ? t('gps_test.geo_available') : t('gps_test.geo_missing');
        i[t('gps_test.label_perm_api')] = (navigator as any).permissions ? t('gps_test.geo_available') : t('gps_test.geo_missing');
      }
    } else {
      i[t('gps_test.label_mode')] = t('gps_test.mode_native');
      i[t('gps_test.label_expo_loc')] = t('gps_test.native_api');
    }
    setInfo(i);
    log(t('gps_test.mounted'));

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
      (navigator as any).permissions.query({ name: 'geolocation' })
        .then((res: any) => {
          log(t('gps_test.initial_perm', { state: res.state }));
          setInfo(prev => ({ ...prev, [t('gps_test.label_perm_state')]: res.state }));
        })
        .catch((e: any) => log(t('gps_test.err_query', { msg: e.message })));
    } else if (Platform.OS !== 'web') {
      Location.getForegroundPermissionsAsync().then(res => {
        log(t('gps_test.initial_perm_native', { status: res.status, canAskAgain: String(res.canAskAgain) }));
        setInfo(prev => ({ ...prev, [t('gps_test.label_perm_state')]: res.status, [t('gps_test.label_can_ask')]: String(res.canAskAgain) }));
      }).catch(e => log(t('gps_test.err_check', { msg: e?.message })));
    }
  }, []);

  const testGps = async () => {
    log(t('gps_test.test_clicked'));
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          log(t('gps_test.err_geo_unavailable')); return;
        }
        log(t('gps_test.calling_getposition'));
        const to = setTimeout(() => log(t('gps_test.warn_timeout')), 15000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(to);
            log(t('gps_test.success_pos', { lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }));
            log(t('gps_test.accuracy', { value: pos.coords.accuracy.toFixed(0) }));
          },
          (err) => {
            clearTimeout(to);
            log(t('gps_test.err_code', { code: err.code, msg: err.message }));
            if (err.code === 1) log(t('gps_test.err_denied'));
            if (err.code === 2) log(t('gps_test.err_unavail'));
            if (err.code === 3) log(t('gps_test.err_timeout'));
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      } else {
        log(t('gps_test.calling_native'));
        const perm = await Location.requestForegroundPermissionsAsync();
        log(t('gps_test.perm_status', { status: perm.status, canAskAgain: String(perm.canAskAgain) }));
        if (perm.status !== 'granted') {
          log(t('gps_test.not_granted'));
          return;
        }
        log(t('gps_test.calling_getpos'));
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        log(t('gps_test.success_pos', { lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }));
        log(t('gps_test.accuracy', { value: pos.coords.accuracy?.toFixed(0) || '?' }));
      }
    } catch (e: any) {
      log(t('gps_test.exception', { msg: e?.message || String(e) }));
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('gps_test.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <Text style={styles.sectionTitle}>{t('gps_test.env_info')}</Text>
        <View style={styles.card}>
          {Object.entries(info).map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text style={styles.key}>{k}</Text>
              <Text style={styles.value} numberOfLines={2}>{v}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={testGps} testID="gps-test-button">
          <Ionicons name="location" size={20} color="#fff" />
          <Text style={styles.btnText}>{t('gps_test.test_now')}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <TouchableOpacity style={styles.smallBtn} onPress={clearLogs}>
            <Text style={styles.smallBtnText}>{t('gps_test.clear_log')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>{t('gps_test.live_log')}</Text>
        <View style={styles.logBox}>
          {logs.length === 0 ? (
            <Text style={styles.emptyLog}>{t('gps_test.click_to_start')}</Text>
          ) : logs.map((l, i) => (
            <Text key={i} style={styles.logLine}>{l}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  key: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', flex: 1 },
  value: { color: colors.textPrimary, fontSize: 12, flex: 2, textAlign: 'right' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.pill, marginTop: spacing.lg },
  btnText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  smallBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  logBox: { backgroundColor: '#000', padding: spacing.md, borderRadius: radius.md, minHeight: 200, borderWidth: 1, borderColor: colors.border },
  logLine: { color: '#0f0', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, marginVertical: 2 },
  emptyLog: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
});
