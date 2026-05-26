import { ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { useT } from '../src/i18n';

const PRIVACY_VERSION = '2026-04-21';
const EFFECTIVE_DATE = '21/04/2026';

// Helper: render text with {b_open}...{b_close} as bold + preserve \n
const RichText = ({ value, style }: { value: string; style: any }) => {
  const parts = value.split(/(\{b_open\}|\{b_close\})/g);
  let isBold = false;
  return (
    <Text style={style}>
      {parts.map((p, i) => {
        if (p === '{b_open}') { isBold = true; return null; }
        if (p === '{b_close}') { isBold = false; return null; }
        return <Text key={i} style={isBold ? { fontWeight: '700' } : undefined}>{p}</Text>;
      })}
    </Text>
  );
};

export default function PrivacyScreen() {
  const router = useRouter();
  const { t } = useT();

  const notice = t('privacy.binding_notice');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('privacy.header_title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.versionBadge}>{t('privacy.version', { ver: PRIVACY_VERSION })}</Text>
        <Text style={styles.effectiveDate}>{t('privacy.effective_label', { date: EFFECTIVE_DATE })}</Text>

        {notice && notice.length > 0 ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{notice}</Text>
          </View>
        ) : null}

        <RichText value={t('privacy.intro')} style={styles.intro} />

        <Text style={styles.h2}>{t('privacy.sec1_h')}</Text>
        <RichText value={t('privacy.sec1_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec2_h')}</Text>
        <RichText value={t('privacy.sec2_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec3_h')}</Text>
        <RichText value={t('privacy.sec3_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec4_h')}</Text>
        <RichText value={t('privacy.sec4_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec5_h')}</Text>
        <RichText value={t('privacy.sec5_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec6_h')}</Text>
        <RichText value={t('privacy.sec6_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec7_h')}</Text>
        <RichText value={t('privacy.sec7_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec8_h')}</Text>
        <RichText value={t('privacy.sec8_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec9_h')}</Text>
        <RichText value={t('privacy.sec9_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec10_h')}</Text>
        <RichText value={t('privacy.sec10_p')} style={styles.p} />

        <Text style={styles.h2}>{t('privacy.sec11_h')}</Text>
        <RichText value={t('privacy.sec11_p')} style={styles.p} />

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },
  versionBadge: {
    alignSelf: 'flex-start',
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
  },
  effectiveDate: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.md, fontStyle: 'italic' },
  noticeBox: {
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  noticeText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  intro: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, marginBottom: spacing.md },
  h2: { color: colors.primary, fontSize: 19, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  p: { color: colors.textPrimary, fontSize: 14, lineHeight: 22, marginBottom: spacing.sm },
});
