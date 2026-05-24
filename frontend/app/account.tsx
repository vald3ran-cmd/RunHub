import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../src/theme';
import { api } from '../src/api';
import { useAuth } from '../src/auth';
import { useT } from '../src/i18n';

export default function AccountScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useT();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/user/export');
      const data = res.data;
      const json = JSON.stringify(data, null, 2);
      const filename = `runhub-export-${new Date().toISOString().split('T')[0]}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert(t('account.export_ok_title'), t('account.export_ok_msg'));
      } else {
        await Share.share({
          title: filename,
          message: json,
        });
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.detail || err?.message || t('account.export_error'));
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('account.delete_step1_title'),
      t('account.delete_step1_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('account.delete_continue'),
          style: 'destructive',
          onPress: confirmDeleteStep2,
        },
      ]
    );
  };

  const confirmDeleteStep2 = () => {
    Alert.alert(
      t('account.delete_step2_title'),
      t('account.delete_step2_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('account.delete_confirm'),
          style: 'destructive',
          onPress: executeDelete,
        },
      ]
    );
  };

  const executeDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete('/user/me');
      if (res.data?.ok) {
        Alert.alert(
          t('account.delete_done_title'),
          t('account.delete_done_msg'),
          [
            {
              text: t('common.ok'),
              onPress: async () => {
                await logout();
                router.replace('/(auth)/login');
              },
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.detail || err?.message || t('account.delete_error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('account.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Info account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account.your_account')}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('account.email')}</Text>
            <Text style={styles.infoValue}>{user?.email || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('account.name')}</Text>
            <Text style={styles.infoValue}>{user?.name || '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('account.plan')}</Text>
            <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>
              {(user?.tier || 'free').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* GDPR Export */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account.export_title')}</Text>
          <Text style={styles.sectionDesc}>{t('account.export_desc')}</Text>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleExport}
            disabled={exporting}
            testID="export-data-button"
          >
            {exporting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>{t('account.export_cta')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Privacy settings shortcuts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('account.legal_docs')}</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/terms')}>
            <Ionicons name="document-text" size={20} color={colors.primary} />
            <Text style={styles.linkText}>{t('account.terms')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/privacy')}>
            <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            <Text style={styles.linkText}>{t('account.privacy')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Danger zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t('account.danger_zone')}</Text>
          <Text style={styles.sectionDesc}>{t('account.danger_desc')}</Text>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleDeleteAccount}
            disabled={deleting}
            testID="delete-account-button"
          >
            {deleting ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Ionicons name="trash" size={20} color={colors.primary} />
                <Text style={styles.dangerBtnText}>{t('account.delete_cta')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>{t('account.footer')}</Text>

        <View style={{ height: 40 }} />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  dangerSection: { borderWidth: 1, borderColor: colors.primary },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.textSecondary, fontSize: 14 },
  infoValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkText: { flex: 1, color: colors.textPrimary, fontSize: 15, fontWeight: '500' },

  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  dangerBtnText: { color: colors.primary, fontSize: 15, fontWeight: '700' },

  footer: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 18,
  },
});
