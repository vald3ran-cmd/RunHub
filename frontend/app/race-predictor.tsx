import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { colors, spacing, radius } from '../src/theme';
import { useT } from '../src/i18n';

type Predictions = {
  predictions: Record<string, { distance_km: number; seconds: number; hms: string; pace_min_per_km: number }>;
  vo2max_estimate: number;
};

export default function RacePredictor() {
  const router = useRouter();
  const { t } = useT();
  const [km, setKm] = useState('5');
  const [minutes, setMinutes] = useState('25');
  const [seconds, setSeconds] = useState('0');
  const [result, setResult] = useState<Predictions | null>(null);
  const [loading, setLoading] = useState(false);

  const onPredict = async () => {
    const tSec = (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0);
    const d = parseFloat(km) || 0;
    if (tSec <= 0 || d <= 0) { Alert.alert(t('common.error'), t('race.subtitle')); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/stats/predict-races', {
        recent_distance_km: d, recent_time_seconds: tSec,
      });
      setResult(data);
    } catch (e: any) {
      const det = e?.response?.data?.detail;
      Alert.alert(t('common.error'), typeof det === 'string' ? det : t('common.retry'));
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

          <View style={styles.icon}>
            <Ionicons name="stopwatch" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>{t('race.title')}</Text>
          <Text style={styles.sub}>{t('race.subtitle')}</Text>

          <Text style={styles.label}>{t('race.distance_label')}</Text>
          <TextInput
            testID="predict-km-input"
            style={styles.input} keyboardType="numeric"
            value={km} onChangeText={setKm}
          />

          <Text style={styles.label}>{t('race.time_label')}</Text>
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                testID="predict-minutes-input"
                style={styles.input} keyboardType="numeric" placeholder="min" placeholderTextColor={colors.textMuted}
                value={minutes} onChangeText={setMinutes}
              />
              <Text style={styles.unit}>{t('race.minutes')}</Text>
            </View>
            <Text style={styles.colon}>:</Text>
            <View style={{ flex: 1 }}>
              <TextInput
                testID="predict-seconds-input"
                style={styles.input} keyboardType="numeric" placeholder="sec" placeholderTextColor={colors.textMuted}
                value={seconds} onChangeText={setSeconds}
              />
              <Text style={styles.unit}>{t('race.seconds')}</Text>
            </View>
          </View>

          <TouchableOpacity
            testID="predict-submit-button"
            style={styles.btn} onPress={onPredict} disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="analytics" size={18} color="#fff" />
                <Text style={styles.btnText}>{t('race.calculate')}</Text>
              </>
            )}
          </TouchableOpacity>

          {result ? (
            <>
              <View style={styles.vo2Card}>
                <Text style={styles.vo2Label}>{t('race.vo2max').toUpperCase()}</Text>
                <Text style={styles.vo2Value}>{result.vo2max_estimate}</Text>
                <Text style={styles.vo2Unit}>ml/kg/min</Text>
                <Text style={styles.vo2Desc}>{vo2Comment(result.vo2max_estimate)}</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('race.predictions').toUpperCase()}</Text>
              {Object.entries(result.predictions).map(([name, p]) => (
                <View key={name} style={styles.raceRow}>
                  <Text style={styles.raceName}>{name}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.raceTime}>{p.hms}</Text>
                    <Text style={styles.racePace}>{p.pace_min_per_km.toFixed(2)} min/km</Text>
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function vo2Comment(v: number) {
  if (v < 35) return 'Buona base aerobica, c\'e\' margine di miglioramento';
  if (v < 45) return 'Fitness cardio solida — livello intermedio';
  if (v < 55) return 'Ottimo livello — runner avanzato';
  return 'Eccellente — livello elite';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { alignItems: 'flex-end' },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center', marginTop: spacing.md },
  sub: { color: colors.textSecondary, textAlign: 'center', marginTop: 4 },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: spacing.md, borderRadius: radius.md, fontSize: 16, borderWidth: 1, borderColor: colors.border },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  colon: { color: colors.textSecondary, fontSize: 32, fontWeight: '900' },
  unit: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 4, textAlign: 'center' },
  btn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.pill, marginTop: spacing.xl },
  btnText: { color: '#fff', fontWeight: '900', letterSpacing: 2, fontSize: 14 },
  vo2Card: { marginTop: spacing.xl, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
  vo2Label: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  vo2Value: { color: colors.primary, fontSize: 56, fontWeight: '900', letterSpacing: -2 },
  vo2Unit: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  vo2Desc: { color: colors.textPrimary, fontSize: 13, marginTop: spacing.sm, textAlign: 'center' },
  sectionTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', letterSpacing: 2, marginTop: spacing.xl, marginBottom: spacing.md },
  raceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  raceName: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
  raceTime: { color: colors.primary, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  racePace: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
