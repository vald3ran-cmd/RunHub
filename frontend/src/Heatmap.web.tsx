import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from './theme';
import { useT } from './i18n';

type Props = { routes?: any[]; height?: number };

export function HeatmapView({ height = 400 }: Props) {
  const { t } = useT();
  return (
    <View style={[styles.box, { height }]}>
      <Text style={styles.title}>{t('heatmap_web.title')}</Text>
      <Text style={styles.text}>{t('heatmap_web.sub')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  text: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
});
