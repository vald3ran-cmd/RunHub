/**
 * Importa — Hub di connessione dispositivi e file.
 * Cards: Apple HealthKit · Health Connect Android · File upload · Phone GPS (secondary).
 * Per ora stato 'placeholder' — l'implementazione reale arriva con HealthKit integration (P0).
 */
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Apple, Smartphone, FileUp, Watch, ChevronRight, Cloud, Activity,
} from 'lucide-react-native';
import { tokens, FontProvider, Card } from '../../src/design-system';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

function ImportaInner() {
  const router = useRouter();
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <Text style={styles.title}>Importa</Text>
        <Text style={styles.subtitle}>
          Collega il tuo smartwatch o carica file. RunHub Lab analizza i dati per te.
        </Text>

        {/* STATUS BANNER */}
        <View style={styles.statusBanner}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            Nessuna sorgente connessa  ·  <Text style={{ color: text.muted }}>3 disponibili</Text>
          </Text>
        </View>

        {/* PRIMARY SOURCES */}
        <Text style={styles.sectionLabel}>SORGENTI PRINCIPALI</Text>

        <SourceCard
          Icon={Apple}
          iconBg="#0F172A"
          iconColor="#FFFFFF"
          title="Apple HealthKit"
          desc="Importa Apple Watch, iPhone & app collegate (Strava, Garmin, Polar)."
          available={isIOS}
          subnote={isIOS ? 'Backfill ultimi 90 giorni in ~10 secondi' : 'Disponibile solo su iOS'}
        />

        <SourceCard
          Icon={Activity}
          iconBg="#1A73E8"
          iconColor="#FFFFFF"
          title="Health Connect"
          desc="Importa Samsung Health, Google Fit, Garmin, Polar, Wahoo, Coros, Suunto."
          available={isAndroid}
          subnote={isAndroid ? 'Backfill ultimi 90 giorni in ~10 secondi' : 'Disponibile solo su Android'}
        />

        <SourceCard
          Icon={FileUp}
          iconBg={brand.subtle}
          iconColor={brand.primary}
          title="Carica file .fit / .gpx / .tcx"
          desc="Esportati da qualsiasi piattaforma. Anche via Condividi da Strava/Garmin Connect."
          available={true}
          subnote="Free: 5/mese · Starter: 30/mese · Performance+: illimitati"
        />

        {/* SECONDARY */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>SORGENTE SECONDARIA</Text>

        <SourceCard
          Icon={Smartphone}
          iconBg={neutral.surfaceSoft}
          iconColor={text.secondary}
          title="Telefono · GPS"
          desc="Avvia un tracking direttamente da RunHub se non hai con te lo smartwatch."
          available={true}
          ctaLabel="AVVIA"
          onPress={() => router.push('/(tabs)/run')}
        />

        {/* INFO BOX */}
        <Card background={brand.subtle} style={{ borderColor: brand.light, marginTop: spacing.lg }}>
          <View style={styles.infoBoxHead}>
            <Cloud size={18} color={brand.primary} strokeWidth={2.2} />
            <Text style={styles.infoBoxTitle}>Come funziona l&apos;import</Text>
          </View>
          <Text style={styles.infoBoxBody}>
            Dopo aver autorizzato la sorgente, RunHub Lab scarica le tue sessioni in background.
            Ogni corsa viene analizzata per estrarre <Text style={styles.infoBoxStrong}>HR, pace, GAP, splits, training load</Text>.
            I tuoi dati restano sul tuo dispositivo e sul nostro server cifrato — mai venduti.
          </Text>
        </Card>

        {/* COMING SOON */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>IN ARRIVO</Text>
        <Card>
          <View style={styles.comingRow}>
            <Watch size={18} color={text.muted} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.comingTitle}>Strava OAuth nativo</Text>
              <Text style={styles.comingDesc}>Sync automatico senza file. Post‑1.6.</Text>
            </View>
            <View style={styles.comingBadge}><Text style={styles.comingBadgeText}>SOON</Text></View>
          </View>
          <View style={styles.divider} />
          <View style={styles.comingRow}>
            <Watch size={18} color={text.muted} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.comingTitle}>Garmin Connect IQ</Text>
              <Text style={styles.comingDesc}>App nativa Garmin. Post‑1.6 (NDA in approvazione).</Text>
            </View>
            <View style={styles.comingBadge}><Text style={styles.comingBadgeText}>SOON</Text></View>
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SourceCard({
  Icon, iconBg, iconColor, title, desc, available, subnote, ctaLabel, onPress,
}: {
  Icon: any; iconBg: string; iconColor: string;
  title: string; desc: string; available: boolean;
  subnote?: string; ctaLabel?: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={available ? 0.7 : 1}
      onPress={available ? onPress : undefined}
      disabled={!available}
      style={[styles.sourceCard, !available && { opacity: 0.55 }]}
    >
      <View style={[styles.sourceIcon, { backgroundColor: iconBg }]}>
        <Icon size={22} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sourceTitle}>{title}</Text>
        <Text style={styles.sourceDesc}>{desc}</Text>
        {subnote ? <Text style={styles.sourceSubnote}>{subnote}</Text> : null}
      </View>
      {available ? (
        ctaLabel ? (
          <View style={styles.sourceCta}>
            <Text style={styles.sourceCtaText}>{ctaLabel}</Text>
          </View>
        ) : (
          <ChevronRight size={18} color={text.muted} strokeWidth={2} />
        )
      ) : null}
    </TouchableOpacity>
  );
}

export default function ImportaScreen() {
  return (
    <FontProvider>
      <ImportaInner />
    </FontProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  scroll: {
    padding: spacing.marginApp, paddingTop: spacing.md, gap: spacing.md,
  },
  title: { ...typography.sectionTitle, color: text.primary, fontSize: 28 },
  subtitle: { ...typography.body, color: text.secondary, marginTop: 4, marginBottom: spacing.md },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: neutral.card, borderRadius: 12,
    borderWidth: 1, borderColor: neutral.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: semantic.warning },
  statusText: { ...typography.body, color: text.primary, fontSize: 13 },

  sectionLabel: {
    ...typography.kpiLabel, color: text.muted, fontSize: 10,
    marginTop: spacing.md, marginBottom: -spacing.xs,
  },

  sourceCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: neutral.card,
    borderRadius: radius.card,
    borderWidth: 1, borderColor: neutral.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  sourceIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  sourceTitle: { ...typography.bodyBold, color: text.primary, fontSize: 15 },
  sourceDesc: { ...typography.caption, color: text.secondary, marginTop: 3, fontSize: 12 },
  sourceSubnote: { ...typography.caption, color: text.muted, marginTop: 4, fontSize: 11, fontStyle: 'italic' },
  sourceCta: {
    backgroundColor: brand.primary,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 999,
  },
  sourceCtaText: { ...typography.kpiLabel, color: '#fff', fontSize: 10 },

  infoBoxHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoBoxTitle: { ...typography.bodyBold, color: text.primary, fontSize: 14 },
  infoBoxBody: { ...typography.body, color: text.secondary, fontSize: 13, lineHeight: 19 },
  infoBoxStrong: { color: text.primary, fontFamily: typography.bodyBold.fontFamily },

  comingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 4 },
  comingTitle: { ...typography.bodyBold, color: text.primary, fontSize: 14 },
  comingDesc: { ...typography.caption, color: text.muted, marginTop: 2 },
  comingBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: neutral.surfaceSoft, borderRadius: 999,
  },
  comingBadgeText: { ...typography.kpiLabel, color: text.muted, fontSize: 9 },
  divider: { height: 1, backgroundColor: neutral.border, marginVertical: spacing.sm },
});
