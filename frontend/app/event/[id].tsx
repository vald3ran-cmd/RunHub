import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ChevronLeft, MapPin, Calendar, Users, MessageCircle, Send, Trash2,
} from 'lucide-react-native';
import { tokens, FontProvider, Card, Chip } from '../../src/design-system';
import { EventMap } from '../../src/EventMap';
import { api } from '../../src/api';
import { useT } from '../../src/i18n';
import { useTierAccess, LockedTeaser } from '../../src/PremiumGate';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

type EventLevel = 'beginner' | 'intermediate' | 'advanced';
type ParticipantDetail = { user_id: string; name: string; avatar_base64?: string | null };
type ChatMessage = { user_id: string; username: string; avatar: string; message: string; timestamp: string };
type RunEvent = {
  event_id: string;
  organizer_id: string;
  organizer_name: string;
  organizer_avatar: string;
  title: string;
  description: string;
  date: string;
  location: { lat: number; lng: number; address: string };
  distance_km: number;
  level: EventLevel;
  participants: string[];
  participants_detail: ParticipantDetail[];
  participant_count: number;
  is_participant: boolean;
  is_organizer: boolean;
  status: 'active' | 'cancelled' | 'completed';
  chat: ChatMessage[];
};

const LEVEL_TONES: Record<EventLevel, 'success' | 'warning' | 'danger'> = {
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'danger',
};

function formatEventDate(iso: string, locale: string) {
  try {
    const d = new Date(iso);
    const localeMap: Record<string, string> = { it: 'it-IT', en: 'en-US', es: 'es-ES' };
    const loc = localeMap[locale] || 'it-IT';
    const datePart = d.toLocaleDateString(loc, { weekday: 'long', day: '2-digit', month: 'long' });
    const timePart = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  } catch {
    return iso;
  }
}

function initials(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function EventDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useT();
  const { hasAccess: hasStarter } = useTierAccess('starter');

  const [event, setEvent] = useState<RunEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const { data } = await api.get(`/events/${id}`);
      setEvent(data);
    } catch (e) {
      console.warn('[event-detail] fetch error:', e);
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { fetchEvent(); }, [fetchEvent]));

  const join = async () => {
    setJoining(true);
    try {
      await api.post(`/events/${id}/join`);
      await fetchEvent();
    } catch {
      Alert.alert(t('eventi.error'), t('eventi.join_error'));
    } finally {
      setJoining(false);
    }
  };

  const leave = async () => {
    setJoining(true);
    try {
      await api.post(`/events/${id}/leave`);
      await fetchEvent();
    } catch {
      Alert.alert(t('eventi.error'), t('eventi.leave_error'));
    } finally {
      setJoining(false);
    }
  };

  const remove = () => {
    Alert.alert(t('eventi.delete'), t('eventi.delete_confirm'), [
      { text: t('eventi.cancel'), style: 'cancel' },
      {
        text: t('eventi.delete'), style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/events/${id}`);
            router.back();
          } catch {
            Alert.alert(t('eventi.error'), t('eventi.delete_error'));
          }
        },
      },
    ]);
  };

  const sendMessage = async () => {
    const msg = chatText.trim();
    if (!msg || !event) return;
    setSending(true);
    try {
      const { data } = await api.post(`/events/${id}/chat`, { message: msg });
      setEvent(prev => prev ? { ...prev, chat: [...prev.chat, data] } : prev);
      setChatText('');
    } catch {
      Alert.alert(t('eventi.error'), t('event_detail.chat_send_error'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
          <Text style={styles.loadingText}>{t('event_detail.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={text.primary} strokeWidth={2.4} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.loadingText}>{t('event_detail.not_found')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={text.primary} strokeWidth={2.4} />
          </TouchableOpacity>
          {event.is_organizer ? (
            <TouchableOpacity style={styles.iconBtn} onPress={remove}>
              <Trash2 size={20} color={semantic.danger} strokeWidth={2.2} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {event.status === 'cancelled' ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledBannerText}>{t('event_detail.cancelled_badge')}</Text>
            </View>
          ) : null}

          <Text style={styles.title}>{event.title}</Text>
          {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

          <View style={styles.tagsRow}>
            <Chip label={`${event.distance_km} km`} tone="neutral" style={{ marginRight: 8 }} />
            <Chip label={t(`eventi.level_${event.level}`)} tone={LEVEL_TONES[event.level]} />
          </View>

          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.infoRow}>
              <Calendar size={16} color={brand.primary} strokeWidth={2} />
              <Text style={styles.infoText}>{formatEventDate(event.date, locale)}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={16} color={brand.primary} strokeWidth={2} />
              <Text style={styles.infoText}>{event.location?.address}</Text>
            </View>
            <View style={styles.infoRow}>
              <Users size={16} color={brand.primary} strokeWidth={2} />
              <Text style={styles.infoText}>
                {t('event_detail.organized_by', { name: event.organizer_name })} · {event.participant_count} {t('eventi.participants')}
              </Text>
            </View>
          </Card>

          {event.location ? (
            <EventMap
              lat={event.location.lat}
              lng={event.location.lng}
              address={event.location.address}
              height={180}
            />
          ) : null}

          {event.is_organizer ? (
            <View style={[styles.actionPill, styles.actionPillNeutral]}>
              <Text style={styles.actionPillText}>{t('eventi.organizer')}</Text>
            </View>
          ) : event.is_participant ? (
            <TouchableOpacity style={[styles.actionBtn, styles.leaveBtn]} onPress={leave} disabled={joining} activeOpacity={0.85}>
              {joining ? <ActivityIndicator size="small" color={semantic.danger} /> :
                <Text style={styles.leaveBtnText}>{t('eventi.leave')}</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={join} disabled={joining} activeOpacity={0.85}>
              {joining ? <ActivityIndicator size="small" color="#fff" /> :
                <Text style={styles.actionBtnText}>{t('eventi.join')}</Text>}
            </TouchableOpacity>
          )}

          <Text style={styles.sectionKicker}>{t('event_detail.participants_title')}</Text>
          {event.participants_detail && event.participants_detail.length > 0 ? (
            <View style={styles.participantsRow}>
              {event.participants_detail.map(p => (
                <View key={p.user_id} style={styles.participantItem}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>{initials(p.name)}</Text>
                  </View>
                  <Text style={styles.participantName} numberOfLines={1}>{p.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>{t('event_detail.no_participants')}</Text>
          )}

          <Text style={styles.sectionKicker}>{t('event_detail.chat_title')}</Text>
          {!hasStarter ? (
            <LockedTeaser
              require="starter"
              title={t('event_detail.chat_locked_title')}
              description={t('event_detail.chat_locked_desc')}
            />
          ) : (
            <>
              {event.chat.length === 0 ? (
                <Text style={styles.emptyText}>{t('event_detail.no_messages')}</Text>
              ) : (
                <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
                  {event.chat.map((msg, idx) => (
                    <View key={`${msg.user_id}-${idx}`} style={styles.chatBubble}>
                      <Text style={styles.chatAuthor}>{msg.username}</Text>
                      <Text style={styles.chatMessage}>{msg.message}</Text>
                    </View>
                  ))}
                </View>
              )}
              {event.is_participant ? (
                <View style={styles.chatInputRow}>
                  <TextInput
                    style={styles.chatInput}
                    value={chatText}
                    onChangeText={setChatText}
                    placeholder={t('event_detail.chat_placeholder')}
                    placeholderTextColor={text.muted}
                    multiline
                  />
                  <TouchableOpacity style={styles.chatSendBtn} onPress={sendMessage} disabled={sending || !chatText.trim()} activeOpacity={0.85}>
                    {sending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={16} color="#fff" strokeWidth={2.4} />}
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function EventDetailScreen() {
  return <FontProvider><EventDetailInner /></FontProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { ...typography.body, color: text.secondary },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.marginApp, paddingVertical: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: neutral.surfaceSoft, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: spacing.marginApp, paddingBottom: spacing.xl, gap: spacing.sm },

  cancelledBanner: { backgroundColor: '#FEE2E2', borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  cancelledBannerText: { ...typography.kpiLabel, color: semantic.danger, fontSize: 11 },

  title: { ...typography.sectionTitle, color: text.primary, fontSize: 24 },
  description: { ...typography.body, color: text.secondary, marginTop: spacing.xs },
  tagsRow: { flexDirection: 'row', marginTop: spacing.sm },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  infoText: { ...typography.body, color: text.primary, flex: 1 },

  actionPill: { alignSelf: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: 12, borderRadius: 999, marginTop: spacing.md },
  actionPillNeutral: { backgroundColor: neutral.surfaceSoft },
  actionPillText: { ...typography.kpiLabel, color: text.secondary, fontSize: 11 },
  actionBtn: { backgroundColor: brand.primary, paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginTop: spacing.md },
  actionBtnText: { color: '#fff', ...typography.kpiLabel, fontSize: 12 },
  leaveBtn: { backgroundColor: '#FEE2E2' },
  leaveBtnText: { color: semantic.danger, ...typography.kpiLabel, fontSize: 12 },

  sectionKicker: { ...typography.kpiLabel, color: text.muted, fontSize: 11, marginTop: spacing.xl, marginBottom: spacing.sm },
  emptyText: { ...typography.caption, color: text.muted, marginBottom: spacing.sm },

  participantsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  participantItem: { alignItems: 'center', width: 60 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: brand.subtle, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarInitial: { ...typography.bodyBold, color: brand.primary, fontSize: 16 },
  participantName: { ...typography.caption, color: text.secondary, fontSize: 11, textAlign: 'center' },

  chatBubble: { backgroundColor: neutral.surfaceSoft, borderRadius: radius.sm, padding: spacing.sm },
  chatAuthor: { ...typography.kpiLabel, color: brand.primary, fontSize: 10, marginBottom: 2 },
  chatMessage: { ...typography.body, color: text.primary, fontSize: 14 },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  chatInput: { flex: 1, borderWidth: 1, borderColor: neutral.border, borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: 10, color: text.primary, fontSize: 14, backgroundColor: neutral.card, maxHeight: 100 },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center' },
});
