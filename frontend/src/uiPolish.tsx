// ─────────────────────────────────────────────────────────────
// UI Polish primitives: AnimatedCounter, Skeleton, Haptic helper
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { Text, TextStyle, View, StyleSheet, ViewStyle, Animated, Easing, Platform } from 'react-native';
import { colors } from './theme';

// ─────────────────────────────────────────────────────────────
// 1) AnimatedCounter — numeri che salgono smooth
// ─────────────────────────────────────────────────────────────
type CounterProps = {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: TextStyle | TextStyle[];
};

export function AnimatedCounter({
  value,
  duration = 900,
  decimals = 0,
  prefix = '',
  suffix = '',
  style,
}: CounterProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const prev = useRef(0);
  const [display, setDisplay] = React.useState<string>(
    `${prefix}${value.toFixed(decimals)}${suffix}`,
  );

  useEffect(() => {
    const startVal = prev.current;
    const endVal = value;
    anim.setValue(0);
    const listener = anim.addListener(({ value: t }) => {
      const v = startVal + (endVal - startVal) * t;
      setDisplay(`${prefix}${v.toFixed(decimals)}${suffix}`);
    });
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      prev.current = endVal;
      setDisplay(`${prefix}${endVal.toFixed(decimals)}${suffix}`);
    });
    return () => anim.removeListener(listener);
  }, [value, duration, decimals, prefix, suffix]);

  return <Text style={style}>{display}</Text>;
}

// ─────────────────────────────────────────────────────────────
// 2) Skeleton — shimmer pulse per loading state
// ─────────────────────────────────────────────────────────────
type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const bg = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surfaceSecondary, '#E0E2E7'],
  });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: bg },
        style,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// 3) Haptic helper — wraps expo-haptics safely
// ─────────────────────────────────────────────────────────────
export const haptics = {
  light: async () => {
    if (Platform.OS === 'web') return;
    try {
      const H = require('expo-haptics');
      await H.impactAsync(H.ImpactFeedbackStyle.Light);
    } catch {}
  },
  medium: async () => {
    if (Platform.OS === 'web') return;
    try {
      const H = require('expo-haptics');
      await H.impactAsync(H.ImpactFeedbackStyle.Medium);
    } catch {}
  },
  success: async () => {
    if (Platform.OS === 'web') return;
    try {
      const H = require('expo-haptics');
      await H.notificationAsync(H.NotificationFeedbackType.Success);
    } catch {}
  },
  warning: async () => {
    if (Platform.OS === 'web') return;
    try {
      const H = require('expo-haptics');
      await H.notificationAsync(H.NotificationFeedbackType.Warning);
    } catch {}
  },
};

// ─────────────────────────────────────────────────────────────
// 4) Skeleton presets per la Home
// ─────────────────────────────────────────────────────────────
export function HomeStatsSkeleton() {
  return (
    <View style={s.statsRow}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={s.statCard}>
          <Skeleton width={70} height={70} borderRadius={35} />
          <Skeleton width={60} height={10} style={{ marginTop: 12 }} />
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 8 },
  statCard: { flex: 1, backgroundColor: colors.surface, paddingVertical: 16, alignItems: 'center', borderRadius: 18 },
});
