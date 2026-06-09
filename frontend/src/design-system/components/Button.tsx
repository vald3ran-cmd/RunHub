import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { brand, neutral, text, semantic, radius, spacing, typography } from '../tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = false, icon, style,
}: Props) {
  const sizeStyle = SIZE_MAP[size];
  const variantStyle = VARIANT_MAP[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.btn,
        sizeStyle.container,
        variantStyle.container,
        fullWidth ? { alignSelf: 'stretch' } : null,
        disabled ? { opacity: 0.4 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, sizeStyle.text, variantStyle.text, icon ? { marginLeft: 8 } : null]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const SIZE_MAP = {
  sm: { container: { paddingVertical: 10, paddingHorizontal: 16 }, text: { fontSize: 13 } },
  md: { container: { paddingVertical: 14, paddingHorizontal: 20 }, text: { fontSize: 15 } },
  lg: { container: { paddingVertical: 18, paddingHorizontal: 28 }, text: { fontSize: 16 } },
};

const VARIANT_MAP = {
  primary:   { container: { backgroundColor: brand.primary }, text: { color: text.inverse } },
  secondary: { container: { backgroundColor: neutral.surfaceSoft, borderWidth: 1, borderColor: neutral.border }, text: { color: text.primary } },
  ghost:     { container: { backgroundColor: 'transparent' }, text: { color: brand.primary } },
  danger:    { container: { backgroundColor: semantic.danger }, text: { color: text.inverse } },
};

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.button },
  text: { ...typography.bodyBold },
});
