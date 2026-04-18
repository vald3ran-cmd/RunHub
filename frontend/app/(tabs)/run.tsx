import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../src/theme';

export default function RunTab() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.label}>RUN LIBERO</Text>
        <Text style={styles.title}>CORSA LIBERA</Text>
        <Text style={styles.sub}>Traccia distanza, tempo, passo con GPS — senza piano.</Text>

        <View style={styles.circleWrap}>
          <TouchableOpacity
            testID="start-free-run-button"
            style={styles.bigBtn}
            onPress={() => router.push({ pathname: '/run-active', params: { title: 'Run Libero' } })}
          >
            <Ionicons name="play" size={48} color="#fff" />
            <Text style={styles.bigBtnText}>AVVIA</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <Text style={styles.infoText}>
            Necessario il permesso di localizzazione per tracciare la tua corsa.
          </Text>
        </View>

        <TouchableOpacity
          testID="gps-test-link"
          style={styles.testLink} onPress={() => router.push('/gps-test')}
        >
          <Ionicons name="bug" size={14} color={colors.textSecondary} />
          <Text style={styles.testLinkText}>Diagnostica GPS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, alignItems: 'center' },
  label: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: spacing.md },
  title: { color: colors.textPrimary, fontSize: 36, fontWeight: '900', letterSpacing: -1, marginTop: spacing.sm },
  sub: { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.lg },
  circleWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bigBtn: {
    width: 220, height: 220, borderRadius: 110, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 6, borderColor: 'rgba(255,59,48,0.25)',
  },
  bigBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 3, marginTop: spacing.sm, fontSize: 18 },
  infoBox: {
    flexDirection: 'row', gap: spacing.sm, alignItems: 'center',
    backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  infoText: { color: colors.textSecondary, flex: 1, fontSize: 13 },
  testLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginBottom: spacing.sm, padding: spacing.sm },
  testLinkText: { color: colors.textSecondary, fontSize: 12, textDecorationLine: 'underline' },
});
