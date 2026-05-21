// Post-onboarding referral modal — shown once, then never again.
// Driven by AsyncStorage flag `runhub.referralModal.shown`.

import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, fonts } from './theme';
import { useT } from './i18n';
import { useAuth } from './auth';

const STORAGE_KEY = 'runhub.referralModal.shown.v1';
const { width } = Dimensions.get('window');

export function ReferralModal() {
  const { t } = useT();
  const router = useRouter();
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Wait a bit to ensure onboarding is finished and main UI is rendered
    const timer = setTimeout(async () => {
      try {
        const shown = await AsyncStorage.getItem(STORAGE_KEY);
        if (shown) return;
        // Don't show to users who registered today (avoid right-after-signup spam)
        // Show only if user has at least 3 minutes of session = settled in
        setVisible(true);
      } catch {}
    }, 2500);
    return () => clearTimeout(timer);
  }, [user]);

  const close = async (goToReferral: boolean) => {
    try { await AsyncStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setVisible(false);
    if (goToReferral) {
      setTimeout(() => router.push('/referral' as any), 250);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => close(false)}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={() => close(false)}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.iconWrap}>
            <Text style={styles.giftEmoji}>🎁</Text>
          </View>
          <Text style={styles.title}>{t('referral.modal_title')}</Text>
          <Text style={styles.subtitle}>{t('referral.modal_subtitle')}</Text>

          <View style={styles.benefitsRow}>
            <View style={styles.benefitChip}>
              <Ionicons name="gift-outline" size={16} color={colors.primary} />
              <Text style={styles.benefitText}>1 {t('common.continue').toLowerCase() === 'continue' ? 'month' : 'mese'}</Text>
            </View>
            <View style={styles.benefitChip}>
              <Ionicons name="flash-outline" size={16} color={colors.primary} />
              <Text style={styles.benefitText}>Performance</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => close(true)}
            activeOpacity={0.85}
            testID="referral-modal-cta"
          >
            <Text style={styles.primaryBtnText}>{t('referral.modal_cta_invite')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => close(false)}
            activeOpacity={0.7}
            testID="referral-modal-later"
          >
            <Text style={styles.secondaryBtnText}>{t('referral.modal_cta_later')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: Math.min(width - spacing.lg * 2, 420),
    backgroundColor: '#1a1d23',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,107,31,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  giftEmoji: { fontSize: 36 },
  title: {
    color: '#fff', fontSize: 22, textAlign: 'center',
    fontFamily: fonts.headingBold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', lineHeight: 20,
    fontFamily: fonts.medium,
    marginBottom: spacing.lg,
  },
  benefitsRow: {
    flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg,
    flexWrap: 'wrap', justifyContent: 'center',
  },
  benefitChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,107,31,0.12)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,107,31,0.25)',
  },
  benefitText: {
    color: '#fff', fontSize: 12, letterSpacing: 0.5,
    fontFamily: fonts.headingBold,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 52,
    backgroundColor: colors.primary, borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  primaryBtnText: {
    color: '#fff', fontSize: 15, letterSpacing: 0.5,
    fontFamily: fonts.headingBold,
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 14,
    fontFamily: fonts.medium,
  },
});
