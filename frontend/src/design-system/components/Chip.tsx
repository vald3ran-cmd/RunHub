import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { brand, neutral, semantic, text, radius, spacing, typography, semanticSoft } from '../tokens';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

type Props = {
  label: string;
  tone?: Tone;
  filled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
  onPress?: () => void;
};

const TONE_MAP: Record<Tone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: neutral.surfaceSoft, fg: text.secondary, border: neutral.border },
  brand:   { bg: brand.subtle, fg: brand.primary, border: brand.light },
  success: { bg: semanticSoft.successBg, fg: semantic.success, border: semanticSoft.successBorder },
  warning: { bg: semanticSoft.warningBg, fg: semantic.warning, border: semanticSoft.warningBorder },
  danger:  { bg: semanticSoft.dangerBg, fg: semantic.danger, border: semanticSoft.dangerBorder },
  info:    { bg: semanticSoft.infoBg, fg: semantic.info, border: semanticSoft.infoBorder },
};

export function Chip({ label, tone = 'neutral', filled = true, icon, style, selected, onPress }: Props) {
  const c = TONE_MAP[tone];
  // When `selected` is true → render orange brand fill irrespective of tone.
  const colors = selected
    ? { bg: brand.primary, fg: text.inverse, border: brand.primary }
    : c;
  const Wrap: any = onPress ? TouchableOpacity : View;
  const wrapProps = onPress ? { onPress, activeOpacity: 0.7 } : {};
  return (
    <Wrap
      {...wrapProps}
      style={[
        styles.chip,
        filled
          ? { backgroundColor: colors.bg, borderColor: colors.border }
          : { backgroundColor: 'transparent', borderColor: colors.fg },
        style,
      ]}
    >
      {icon ? <View style={{ marginRight: 6 }}>{icon}</View> : null}
      <Text style={[styles.text, { color: colors.fg }]} numberOfLines={1}>{label}</Text>
    </Wrap>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.caption,
    fontFamily: typography.kpiLabel.fontFamily,
    letterSpacing: 0.5,
    fontSize: 12,
  },
});
