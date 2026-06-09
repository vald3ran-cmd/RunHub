/**
 * Importa — Hub di connessione dispositivi e file (RunHub 1.6 Lab Edition).
 *
 * Sorgenti:
 *  - Apple HealthKit  (richiede build nativo iOS — non funziona in Expo Go)
 *  - Health Connect Android (placeholder — implementazione futura)
 *  - File upload .fit / .gpx / .tcx (funziona già, anche su web)
 *  - Phone GPS (sorgente secondaria — apre la tab Run)
 */
import React, { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Apple, Smartphone, FileUp, Watch, ChevronRight, Cloud, Activity,
  CheckCircle2, AlertCircle,
} from 'lucide-react-native';
import { tokens, FontProvider, Card } from '../../src/design-system';
import { useAuth } from '../../src/auth';
import { pickAndImportFile, getImportQuota, ImportQuota, ImportResult } from '../../src/fileImporter';
import { connectAndImport, isHealthKitSupported, healthKitStatusReason, ImportBatchResult } from '../../src/healthkit';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

function ImportaInner() {
  const router = useRouter();
  const { user } = useAuth();
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';

  const [quota, setQuota] = useState<ImportQuota | null>(null);
  const [fileImporting, setFileImporting] = useState(false);
  const [hkImporting, setHkImporting] = useState(false);
  const [lastResult, setLastResult] = useState<
    | { kind: 'file'; data: ImportResult }
    | { kind: 'health'; data: ImportBatchResult }
    | null
  >(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carica quota all'ingresso
  useEffect(() => {
    if (!user) return;
    getImportQuota().then(setQuota).catch((e) => {
      console.warn('[importa] quota fetch failed:', e);
    });
  }, [user]);

  // ─── Handler: upload file ───────────────────────────────
  const onPickFile = async () => {
    if (fileImporting) return;
    setErrorMsg(null);
    setFileImporting(true);
    try {
      const result = await pickAndImportFile();
      if (!result) {
        setFileImporting(false);
        return; // user canceled
      }
      setLastResult({ kind: 'file', data: result });
      setQuota(result.import_quota);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Errore durante l\'import del file.';
      console.warn('[importa] file upload error:', msg);
      setErrorMsg(msg);
      if (Platform.OS === 'web') {
        // su web Alert.alert non blocca: mostriamo solo via state
      } else {
        Alert.alert('Import non riuscito', msg);
      }
    } finally {
      setFileImporting(false);
    }
  };

  // ─── Handler: Apple HealthKit ───────────────────────────
  const onConnectHealthKit = async () => {
    if (hkImporting) return;
    setErrorMsg(null);

    const reason = healthKitStatusReason();
    if (reason) {
      setErrorMsg(reason);
      if (Platform.OS !== 'web') Alert.alert('Apple Salute', reason);
      return;
    }
    setHkImporting(true);
    try {
      const result = await connectAndImport(90);
      setLastResult({ kind: 'health', data: result });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || 'Impossibile collegare Apple Salute.';
      setErrorMsg(msg);
      if (Platform.OS !== 'web') Alert.alert('Apple Salute', msg);
    } finally {
      setHkImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <Text style={styles.title}>Importa</Text>
        <Text style={styles.subtitle}>
          Collega il tuo smartwatch o carica file. RunHub Lab analizza i dati per te.
        </Text>

        {/* STATUS BANNER + QUOTA */}
        <View style={styles.statusBanner}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>
            {quota
              ? (quota.is_unlimited
                  ? <>Tier <Text style={{ fontWeight: '700' }}>{quota.tier.toUpperCase()}</Text> · Import illimitati</>
                  : <>Import questo mese: <Text style={{ fontWeight: '700' }}>{quota.used_this_month}/{quota.monthly_limit}</Text></>
                )
              : 'Caricamento quota import…'
            }
          </Text>
        </View>

        {/* SUCCESS BANNER */}
        {lastResult ? (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color={semantic.success} strokeWidth={2.4} />
            <View style={{ flex: 1 }}>
              {lastResult.kind === 'file' ? (
                <>
                  <Text style={styles.successTitle}>Import completato</Text>
                  <Text style={styles.successBody}>
                    {lastResult.data.title} · {lastResult.data.distance_km.toFixed(2)} km · {Math.round(lastResult.data.duration_seconds / 60)} min
                  </Text>
                  <TouchableOpacity onPress={() => router.push(`/workout/${lastResult.data.session_id}`)}>
                    <Text style={styles.successLink}>APRI DETTAGLI →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.successTitle}>Apple Salute sincronizzato</Text>
                  <Text style={styles.successBody}>
                    {lastResult.data.inserted} nuovi · {lastResult.data.updated} aggiornati · {lastResult.data.skipped} saltati · {lastResult.data.total} totali
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/diario')}>
                    <Text style={styles.successLink}>VAI AL DIARIO →</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* ERROR BANNER */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color={semantic.danger} strokeWidth={2.4} />
            <Text style={styles.errorText} numberOfLines={3}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* PRIMARY SOURCES */}
        <Text style={styles.sectionLabel}>SORGENTI PRINCIPALI</Text>

        <SourceCard
          Icon={Apple}
          iconBg="#0F172A"
          iconColor="#FFFFFF"
          title="Apple HealthKit"
          desc="Importa Apple Watch, iPhone & app collegate (Strava, Garmin, Polar)."
          available={isIOS}
          loading={hkImporting}
          subnote={
            isIOS
              ? (isHealthKitSupported()
                  ? 'Backfill ultimi 90 giorni · richiede iOS build nativo'
                  : '⚠️ Funziona solo in app build nativa (non Expo Go)')
              : 'Disponibile solo su iPhone'
          }
          ctaLabel={isIOS ? 'CONNETTI' : undefined}
          onPress={isIOS ? onConnectHealthKit : undefined}
        />

        <SourceCard
          Icon={Activity}
          iconBg="#1A73E8"
          iconColor="#FFFFFF"
          title="Health Connect"
          desc="Importa Samsung Health, Google Fit, Garmin, Polar, Wahoo, Coros, Suunto."
          available={isAndroid}
          subnote={isAndroid ? 'In arrivo · richiede build nativo Android' : 'Disponibile solo su Android'}
        />

        <SourceCard
          Icon={FileUp}
          iconBg={brand.subtle}
          iconColor={brand.primary}
          title="Carica file .fit / .gpx / .tcx"
          desc="Esportati da qualsiasi piattaforma. Anche via Condividi da Strava/Garmin Connect."
          available={true}
          loading={fileImporting}
          subnote={
            quota
              ? (quota.is_unlimited
                  ? `${quota.tier.charAt(0).toUpperCase()}${quota.tier.slice(1)} · import illimitati`
                  : `Free: 5/mese · Starter: 30/mese · ${quota.remaining ?? 0} ancora disponibili`
                )
              : 'Free: 5/mese · Starter: 30/mese · Performance+: illimitati'
          }
          ctaLabel="CARICA"
          onPress={onPickFile}
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
              <Text style={styles.comingDesc}>Sync automatico senza file. Post-1.6.</Text>
            </View>
            <View style={styles.comingBadge}><Text style={styles.comingBadgeText}>SOON</Text></View>
          </View>
          <View style={styles.divider} />
          <View style={styles.comingRow}>
            <Watch size={18} color={text.muted} strokeWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.comingTitle}>Garmin Connect IQ</Text>
              <Text style={styles.comingDesc}>App nativa Garmin. Post-1.6 (NDA in approvazione).</Text>
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
  Icon, iconBg, iconColor, title, desc, available, subnote, ctaLabel, onPress, loading,
}: {
  Icon: any; iconBg: string; iconColor: string;
  title: string; desc: string; available: boolean;
  subnote?: string; ctaLabel?: string; onPress?: () => void; loading?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={available && !loading ? 0.7 : 1}
      onPress={available && !loading ? onPress : undefined}
      disabled={!available || loading}
      style={[styles.sourceCard, (!available || loading) && { opacity: 0.7 }]}
    >
      <View style={[styles.sourceIcon, { backgroundColor: iconBg }]}>
        <Icon size={22} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sourceTitle}>{title}</Text>
        <Text style={styles.sourceDesc}>{desc}</Text>
        {subnote ? <Text style={styles.sourceSubnote}>{subnote}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={brand.primary} />
      ) : available ? (
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

  successBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#ECFDF5', borderRadius: 12,
    borderWidth: 1, borderColor: '#A7F3D0',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  successTitle: { ...typography.bodyBold, color: semantic.success, fontSize: 13 },
  successBody: { ...typography.caption, color: text.primary, marginTop: 2, fontSize: 12 },
  successLink: { ...typography.kpiLabel, color: semantic.success, fontSize: 11, marginTop: 6 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 12,
    borderWidth: 1, borderColor: '#FCA5A5',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  errorText: { ...typography.caption, color: semantic.danger, flex: 1, fontSize: 12 },

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
