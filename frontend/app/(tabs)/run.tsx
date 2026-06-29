import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { tokens, FontProvider } from '../../src/design-system';
import { useT } from '../../src/i18n';

const { brand, neutral, text, spacing, typography, radius } = tokens;

type ActivityKey = 'run' | 'walk' | 'bike';

const THEMES: Record<ActivityKey, { primary: string; subtle: string }> = {
  run:  { primary: brand.primary, subtle: brand.subtle },
  walk: { primary: '#16A34A',     subtle: '#D1FAE5'    },
  bike: { primary: '#2563EB',     subtle: '#DBEAFE'    },
};

const ICONS: Record<ActivityKey, any> = {
  run:  require('../../assets/lab/activity/corsa.png'),
  walk: require('../../assets/lab/activity/camminata.png'),
  bike: require('../../assets/lab/activity/bici.png'),
};

const ACT_KEYS: ActivityKey[] = ['run', 'walk', 'bike'];

const NAME_KEY:  Record<ActivityKey, string> = {
  run:  'run.activity_run_title',
  walk: 'run.activity_walk_title',
  bike: 'run.activity_bike_title',
};
const DESC_KEY:  Record<ActivityKey, string> = {
  run:  'run.activity_run_sub',
  walk: 'run.activity_walk_sub',
  bike: 'run.activity_bike_sub',
};
const TITLE_KEY: Record<ActivityKey, string> = {
  run:  'run.free_run',
  walk: 'run.walk_free',
  bike: 'run.bike_free',
};

function RunInner() {
  const router = useRouter();
  const { t } = useT();
  const [selected, setSelected] = useState<ActivityKey>('run');

  const theme = THEMES[selected];
  const icon  = ICONS[selected];
  const name  = t(NAME_KEY[selected]);
  const desc  = t(DESC_KEY[selected]);

  const startSession = () => {
    router.push({
      pathname: '/run-active',
      params: {
        title: t(TITLE_KEY[selected]),
        activity_type: selected,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={text.primary} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* KICKER + TITLE */}
        <Text style={[styles.kicker, { color: theme.primary }]}>
          {t('run.tab_eyebrow')}
        </Text>
        <Text style={styles.title}>{t('run.tab_title')}</Text>
        <Text style={styles.subtitle}>{t('run.tab_subtitle')}</Text>

        {/* ACTIVITY SELECTOR */}
        <View style={styles.grid}>
          {ACT_KEYS.map(key => {
            const th    = THEMES[key];
            const isSel = key === selected;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.card, isSel && { borderColor: th.primary, borderWidth: 2 }]}
                onPress={() => setSelected(key)}
                activeOpacity={0.8}
              >
                <View style={[styles.cardIconWrap, { backgroundColor: th.subtle }]}>
                  <Image source={ICONS[key]} style={styles.cardIcon} resizeMode="contain" />
                </View>
                <Text style={[styles.cardName, isSel && { color: th.primary }]}>
                  {t(NAME_KEY[key])}
                </Text>
                {isSel && <View style={[styles.cardDot, { backgroundColor: th.primary }]} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* DETAIL */}
        <View style={[styles.detail, { borderLeftColor: theme.primary, backgroundColor: theme.subtle + '33' }]}>
          <View style={[styles.detailIconWrap, { backgroundColor: theme.subtle }]}>
            <Image source={icon} style={styles.detailIcon} resizeMode="contain" />
          </View>
          <View style={styles.detailText}>
            <Text style={[styles.detailName, { color: theme.primary }]}>{name}</Text>
            <Text style={styles.detailDesc}>{desc}</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.primary }]}
          onPress={startSession}
          activeOpacity={0.88}
        >
          <Image source={icon} style={styles.ctaIcon} resizeMode="contain" />
          <Text style={styles.ctaText}>
            {t('run.start_with', { name: name.toUpperCase() })}
          </Text>
        </TouchableOpacity>

        {/* GPS DIAGNOSTICS */}
        <TouchableOpacity
          style={styles.diagLink}
          onPress={() => router.push('/gps-test')}
          activeOpacity={0.7}
        >
          <Text style={styles.diagText}>{t('run.gps_diagnostic')}</Text>
          <ChevronRight size={14} color={text.muted} strokeWidth={2} />
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function RunScreen() {
  return (
    <FontProvider>
      <RunInner />
    </FontProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },

  header: {
    paddingHorizontal: spacing.marginApp,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: neutral.card,
    borderWidth: 1, borderColor: neutral.border,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: {
    paddingHorizontal: spacing.marginApp,
    paddingTop: spacing.sm,
  },

  kicker: {
    ...typography.kpiLabel,
    fontSize: 11,
    letterSpacing: 1.4,
    marginTop: spacing.lg,
  },
  title: {
    ...typography.sectionTitle,
    color: text.primary,
    fontSize: 30,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    color: text.secondary,
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },

  grid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    backgroundColor: neutral.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: neutral.border,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  cardIconWrap: {
    width: 52, height: 52,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIcon:  { width: 36, height: 36 },
  cardName:  { ...typography.bodyBold, color: text.primary, fontSize: 12 },
  cardDot:   { width: 6, height: 6, borderRadius: 3 },

  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.card,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailIconWrap: {
    width: 48, height: 48,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  detailIcon: { width: 34, height: 34 },
  detailText: { flex: 1 },
  detailName: { ...typography.bodyBold, fontSize: 16 },
  detailDesc: {
    ...typography.caption,
    color: text.secondary,
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: radius.button,
    marginBottom: spacing.md,
  },
  ctaIcon: { width: 22, height: 22 },
  ctaText: { ...typography.kpiLabel, color: '#fff', fontSize: 13 },

  diagLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  diagText: { ...typography.body, color: text.muted, fontSize: 13 },
});
