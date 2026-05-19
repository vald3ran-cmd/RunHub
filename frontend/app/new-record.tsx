import { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Share, Easing, Dimensions, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { Trophy, Share2, Home } from 'lucide-react-native';
import { colors, spacing, radius, fonts } from '../src/theme';
import { haptics } from '../src/uiPolish';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CONFETTI_COLORS = ['#FF6B1F', '#FFFFFF', '#F59E0B', '#22C55E', '#3B82F6', '#FF8543'];
const CONFETTI_COUNT = 60;

export default function NewRecord() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    value?: string;
    unit?: string;
    label?: string;
    session_id?: string;
  }>();

  const title = params.title || 'NUOVO RECORD';
  const label = params.label || 'Personal Best';
  const value = params.value || '—';
  const unit = params.unit || '';
  const sessionId = params.session_id;

  const scale = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(40)).current;
  const titleOp = useRef(new Animated.Value(0)).current;
  const ctaOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    haptics.success();
    // Trophy zoom-in
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.15, friction: 6, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
    // Title fade-up
    Animated.parallel([
      Animated.timing(titleY, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(titleOp, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
    // CTA fade in
    Animated.timing(ctaOp, { toValue: 1, duration: 600, delay: 800, useNativeDriver: true }).start();
  }, []);

  const shareRecord = async () => {
    haptics.light();
    try {
      await Share.share({
        message: `🏆 Nuovo Personal Best! ${value} ${unit} · ${label}\nScarica RunHub e mettiti alla prova!`,
      });
    } catch {}
  };

  const goHome = () => {
    haptics.light();
    if (sessionId) {
      router.replace({ pathname: '/workout/[id]', params: { id: sessionId } });
    } else {
      router.replace('/(tabs)/home');
    }
  };

  return (
    <View style={styles.root}>
      {/* Confetti layer */}
      <ConfettiBurst />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Hex trophy */}
        <View style={styles.hexWrap}>
          <Animated.View style={[styles.hexInner, { transform: [{ scale }] }]}>
            <HexBadge size={180} />
            <View style={styles.hexIconWrap}>
              <Trophy size={64} color="#FFFFFF" strokeWidth={2.2} fill="rgba(255,255,255,0.18)" />
            </View>
          </Animated.View>
        </View>

        {/* Text */}
        <Animated.View style={{ opacity: titleOp, transform: [{ translateY: titleY }], alignItems: 'center' }}>
          <Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
          <Text style={styles.title}>{title.toUpperCase()}</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{value}</Text>
            {unit ? <Text style={styles.unit}>{unit}</Text> : null}
            <View style={styles.pbPill}>
              <Text style={styles.pbPillText}>+ PB</Text>
            </View>
          </View>
          <Text style={styles.tagline}>
            Hai superato te stesso. Continua così! 🔥
          </Text>
        </Animated.View>

        {/* CTAs */}
        <Animated.View style={[styles.ctaWrap, { opacity: ctaOp }]}>
          <TouchableOpacity
            testID="share-record-button"
            style={styles.shareBtn}
            onPress={shareRecord}
            activeOpacity={0.85}
          >
            <Share2 size={18} color="#fff" strokeWidth={2.4} />
            <Text style={styles.shareText}>CONDIVIDI</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="home-record-button"
            style={styles.homeBtn}
            onPress={goHome}
            activeOpacity={0.85}
          >
            <Home size={18} color={colors.textPrimary} strokeWidth={2.4} />
            <Text style={styles.homeText}>VAI ALL'ALLENAMENTO</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// HexBadge - hexagonal/octagonal trophy badge with gradient
// ─────────────────────────────────────────────────────────────
function HexBadge({ size = 160 }: { size?: number }) {
  // Octagon
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const points = Array.from({ length: 8 }).map((_, i) => {
    const a = (Math.PI / 4) * i - Math.PI / 8;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    return `${x},${y}`;
  }).join(' ');
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="hexGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF8543" />
          <Stop offset="1" stopColor="#E55A0F" />
        </SvgGradient>
      </Defs>
      <Polygon
        points={points}
        fill="url(#hexGrad)"
        stroke="#FFFFFF"
        strokeWidth={3}
        strokeOpacity={0.7}
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────────────────────
// ConfettiBurst — animated confetti using Animated API
// ─────────────────────────────────────────────────────────────
function ConfettiBurst() {
  const particles = useMemo(() => {
    return Array.from({ length: CONFETTI_COUNT }).map((_, i) => ({
      key: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 6 + Math.random() * 8,
      startX: Math.random() * SCREEN_W,
      driftX: (Math.random() - 0.5) * 120,
      delay: Math.random() * 800,
      duration: 2400 + Math.random() * 1800,
      rotateMul: Math.random() > 0.5 ? 1 : -1,
      shape: Math.random() > 0.5 ? 'square' : 'circle',
    }));
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      {particles.map(p => <Particle key={p.key} {...p} />)}
    </View>
  );
}

function Particle({
  color, size, startX, driftX, delay, duration, rotateMul, shape,
}: {
  color: string; size: number; startX: number; driftX: number;
  delay: number; duration: number; rotateMul: number; shape: string;
}) {
  const fall = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fall, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);
  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, SCREEN_H + 60],
  });
  const translateX = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [0, driftX],
  });
  const rotate = fall.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${720 * rotateMul}deg`],
  });
  const opacity = fall.interpolate({
    inputRange: [0, 0.1, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        top: 0,
        width: size,
        height: shape === 'circle' ? size : size * 0.6,
        backgroundColor: color,
        borderRadius: shape === 'circle' ? size / 2 : 2,
        transform: [{ translateY }, { translateX }, { rotate }],
        opacity,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  safe: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },

  hexWrap: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 12,
  },
  hexInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexIconWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: fonts.headingBold,
    marginTop: spacing.xl,
  },
  title: {
    color: '#fff',
    fontSize: 34,
    fontFamily: fonts.heading,
    letterSpacing: -0.8,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: spacing.md,
  },
  value: {
    color: '#fff',
    fontSize: 64,
    fontFamily: fonts.heading,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: colors.textSecondary,
    fontSize: 22,
    fontFamily: fonts.headingBold,
    marginLeft: 4,
  },
  pbPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginLeft: 8,
    transform: [{ translateY: -6 }],
  },
  pbPillText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fonts.headingBold,
    letterSpacing: 1,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: 14,
    fontFamily: fonts.medium,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  ctaWrap: {
    width: '100%',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 6,
  },
  shareText: {
    color: '#fff',
    fontSize: 14,
    letterSpacing: 1.2,
    fontFamily: fonts.headingBold,
  },
  homeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingVertical: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  homeText: {
    color: colors.textPrimary,
    fontSize: 13,
    letterSpacing: 1.2,
    fontFamily: fonts.headingBold,
  },
});
