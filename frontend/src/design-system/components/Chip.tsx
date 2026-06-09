import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { brand, neutral, semantic, text, radius, spacing, typography } from '../tokens';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  label: string;
  tone?: Tone;
  filled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const TONE_MAP: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: neutral.surfaceSoft, fg: text.secondary, border: neutral.border },
  brand:   { bg: brand.subtle, fg: brand.primary, border: brand.light },
  success: { bg: '#D1FAE5', fg: semantic.success, border: '#A7F3D0' },
  warning: { bg: '#FEF3C7', fg: semantic.warning, border: '#FDE68A' },
  danger:  { bg: '#FEE2E2', fg: semantic.danger, border: '#FECACA' },
  info:    { bg: '#DBEAFE', fg: semantic.info, border: '#BFDBFE' },
};

export function Chip({ label, tone = 'neutral', filled = true, icon, style }: Props) {
  const c = TONE_MAP[tone];
  return (
    <View
      style={[
        styles.chip,
        filled
          ? { backgroundColor: c.bg, borderColor: c.border }
          : { backgroundColor: 'transparent', borderColor: c.fg },
        style,
      ]}
    >
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text style={[styles.text, { color: c.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.caption,
    fontFamily: typography.kpiLabel.fontFamily,
    letterSpacing: 0.5,
  },
});
