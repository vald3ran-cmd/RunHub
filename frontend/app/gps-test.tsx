import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';

export default function GpsTest() {
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);
  const [info, setInfo] = useState<Record<string, string>>({});

  const log = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  useEffect(() => {
    const i: Record<string, string> = {};
    i['Platform'] = Platform.OS;
    if (typeof window !== 'undefined') {
      i['URL'] = window.location.href;
      i['Protocol'] = window.location.protocol;
      i['In iframe?'] = (window.self !== window.top) ? 'SI (problema!)' : 'NO';
      i['Secure context'] = String((window as any).isSecureContext);
    }
    if (typeof navigator !== 'undefined') {
      i['UserAgent'] = navigator.userAgent.slice(0, 80);
      i['geolocation API'] = navigator.geolocation ? 'DISPONIBILE' : 'MANCANTE';
      i['permissions API'] = (navigator as any).permissions ? 'DISPONIBILE' : 'MANCANTE';
    }
    setInfo(i);
    log('Componente montato');

    if (typeof navigator !== 'undefined' && (navigator as any).permissions?.query) {
      (navigator as any).permissions.query({ name: 'geolocation' })
        .then((res: any) => {
          log(`Stato permesso iniziale: ${res.state}`);
          setInfo(prev => ({ ...prev, 'Stato permesso': res.state }));
        })
        .catch((e: any) => log(`Errore query permesso: ${e.message}`));
    }
  }, []);

  const testGps = () => {
    log('--- TEST GPS CLICCATO ---');
    if (typeof navigator === 'undefined') { log('ERRORE: navigator non definito'); return; }
    if (!navigator.geolocation) { log('ERRORE: navigator.geolocation non disponibile'); return; }
    log('Chiamata getCurrentPosition...');
    const t = setTimeout(() => log('ATTENZIONE: 15 sec passati, nessuna risposta. Il popup forse e\' stato bloccato silenziosamente.'), 15000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(t);
        log(`SUCCESSO: lat=${pos.coords.latitude.toFixed(5)}, lng=${pos.coords.longitude.toFixed(5)}`);
        log(`Accuracy: ${pos.coords.accuracy.toFixed(0)}m`);
      },
      (err) => {
        clearTimeout(t);
        log(`ERRORE code=${err.code}: ${err.message}`);
        if (err.code === 1) log('(PERMISSION_DENIED — utente ha negato o permesso bloccato)');
        if (err.code === 2) log('(POSITION_UNAVAILABLE — GPS non disponibile)');
        if (err.code === 3) log('(TIMEOUT)');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const clearLogs = () => setLogs([]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>TEST GPS</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}>
        <Text style={styles.sectionTitle}>INFO AMBIENTE</Text>
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
          <Text style={styles.btnText}>TESTA GPS ORA</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
          <TouchableOpacity style={styles.smallBtn} onPress={clearLogs}>
            <Text style={styles.smallBtnText}>PULISCI LOG</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>LOG IN TEMPO REALE</Text>
        <View style={styles.logBox}>
          {logs.length === 0 ? (
            <Text style={styles.emptyLog}>Nessun log ancora. Click &quot;TESTA GPS ORA&quot; per iniziare.</Text>
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
