/**
 * Onboarding 1.6 Lab Edition — 3 schermate post-signup.
 * Schermate: Lab · Importa · AI Coach. Atterra su /(tabs)/importa.
 * Flag: AsyncStorage 'runhub.onboarding16.done' = '1'.
 */
import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlaskConical, Watch, Sparkles, ChevronRight } from 'lucide-react-native';
import { tokens, FontProvider } from '../src/design-system';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;
const { width } = Dimensions.get('window');

export const ONBOARDING_FLAG = 'runhub.onboarding16.done';

type Slide = {
  Icon: any;
  title: string;
  subtitle: string;
  bullets: string[];
  accent: string;
};

const SLIDES: Slide[] = [
  {
    Icon: FlaskConical,
    title: 'Il tuo laboratorio personale',
    subtitle: 'Analizza ogni dettaglio della tua forma — come un coach con un PhD.',
    bullets: ['Run Score · Training Load · GAP', 'Previsioni 5K/10K/21K/42K', 'AI Insight aggiornato ogni settimana'],
    accent: brand.primary,
  },
  {
    Icon: Watch,
    title: 'Importa una volta, analizza per sempre',
    subtitle: 'Apple Watch, Garmin, file FIT/GPX — tutto in un\'unica dashboard.',
    bullets: ['Apple HealthKit · Health Connect', 'File .fit / .gpx / .tcx', 'Tracking GPS dal telefono'],
    accent: semantic.info,
  },
  {
    Icon: Sparkles,
    title: 'Migliora ogni settimana',
    subtitle: 'L\'AI Coach legge i tuoi dati reali e ti dice cosa fare oggi.',
    bullets: ['Piani personalizzati sulla tua forma', 'Carico progressivo intelligente', 'Recupero quando serve davvero'],
    accent: brand.primary,
  },
];

function OnboardingInner() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);

  const goNext = async () => {
    if (step < SLIDES.length - 1) {
      const next = step + 1;
      setStep(next);
      scrollRef.current?.scrollTo({ x: width * next, animated: true });
    } else {
      await finish();
    }
  };

  const finish = async () => {
    try { await AsyncStorage.setItem(ONBOARDING_FLAG, '1'); } catch {}
    router.replace('/(tabs)/importa');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <Image source={require('../assets/lab/logo-symbol.png')} style={styles.logo} />
        <Text style={styles.brand}>RunHub <Text style={{ color: brand.primary }}>LAB</Text></Text>
        <TouchableOpacity onPress={finish} style={styles.skip}>
          <Text style={styles.skipText}>Salta</Text>
        </TouchableOpacity>
      </View>

      {/* SLIDES */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setStep(idx);
        }}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width }]}>
            <View style={[styles.iconWrap, { backgroundColor: brand.subtle }]}>
              <s.Icon size={60} color={s.accent} strokeWidth={1.8} />
            </View>
            <Text style={styles.slideTitle}>{s.title}</Text>
            <Text style={styles.slideSubtitle}>{s.subtitle}</Text>
            <View style={styles.bullets}>
              {s.bullets.map((b, j) => (
                <View key={j} style={styles.bulletRow}>
                  <View style={[styles.bulletDot, { backgroundColor: s.accent }]} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* PAGINATION DOTS */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === step && { backgroundColor: brand.primary, width: 22 },
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <View style={styles.ctaWrap}>
        <TouchableOpacity style={styles.cta} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.ctaText}>
            {step === SLIDES.length - 1 ? 'INIZIA' : 'CONTINUA'}
          </Text>
          <ChevronRight size={18} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function OnboardingLab() {
  return (
    <FontProvider>
      <OnboardingInner />
    </FontProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: 8 },
  logo: { width: 28, height: 28 },
  brand: { ...typography.bodyBold, color: text.primary, fontSize: 16, letterSpacing: 0.5, flex: 1 },
  skip: { padding: 8 },
  skipText: { ...typography.kpiLabel, color: text.muted, fontSize: 11 },

  slide: { paddingHorizontal: 36, paddingTop: 30, alignItems: 'center', justifyContent: 'flex-start' },
  iconWrap: { width: 140, height: 140, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  slideTitle: { ...typography.sectionTitle, color: text.primary, fontSize: 28, textAlign: 'center', marginBottom: spacing.md, letterSpacing: -0.5 },
  slideSubtitle: { ...typography.body, color: text.secondary, fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: spacing.xl, maxWidth: 320 },
  bullets: { gap: spacing.md, alignSelf: 'stretch', paddingHorizontal: spacing.sm },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bulletDot: { width: 8, height: 8, borderRadius: 999 },
  bulletText: { ...typography.body, color: text.primary, fontSize: 14, flex: 1 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 999, backgroundColor: neutral.border },

  ctaWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: brand.primary, paddingVertical: 16, borderRadius: radius.button,
  },
  ctaText: { ...typography.kpiLabel, color: '#fff', fontSize: 13 },
});
