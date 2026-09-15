import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, TextInput, Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Calendar, MapPin, Users, Plus, ChevronRight, Trash2,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { tokens, FontProvider, Card, Chip } from '../../src/design-system';
import { api } from '../../src/api';
import { useT } from '../../src/i18n';

const { brand, neutral, text, semantic, spacing, typography, radius } = tokens;

type EventLevel = 'beginner' | 'intermediate' | 'advanced';
type EventStatus = 'active' | 'cancelled' | 'completed';
type EventMode = 'feed' | 'my_events';

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
  cover_image?: string | null;
  participants: string[];
  participant_count: number;
  is_participant: boolean;
  is_organizer: boolean;
  distance_from_user_km?: number;
  status: EventStatus;
  chat: ChatMessage[];
};

type ChatMessage = {
  user_id: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: string;
};

const RADII = [5, 10, 25, 50];
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
    const datePart = d.toLocaleDateString(loc, { weekday: 'short', day: '2-digit', month: 'short' });
    const timePart = d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  } catch {
    return iso;
  }
}

function EventiInner() {
  const router = useRouter();
  const { t, locale } = useT();

  const [mode, setMode] = useState<EventMode>('feed');
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [myOrganized, setMyOrganized] = useState<RunEvent[]>([]);
  const [myJoined, setMyJoined] = useState<RunEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [radiusKm, setRadiusKm] = useState(10);
  const [levelFilter, setLevelFilter] = useState<'all' | EventLevel>('all');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const requestLocation = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setUserLocation(null);
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(loc);
      return loc;
    } catch {
      setUserLocation(null);
      return null;
    }
  }, []);

  const fetchEvents = useCallback(async (locOverride?: { lat: number; lng: number } | null) => {
    const target = locOverride !== undefined ? locOverride : userLocation;
    if (!target) {
      setEvents([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/events', {
        params: {
          lat: target.lat,
          lng: target.lng,
          radius_km: radiusKm,
          ...(levelFilter !== 'all' ? { level: levelFilter } : {}),
        },
      });
      setEvents(data || []);
    } catch (e) {
      console.warn('[eventi] fetch events error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userLocation, radiusKm, levelFilter]);

  const fetchMyEvents = useCallback(async () => {
    setLoading(true);
    try {
      const [org, joined] = await Promise.all([
        api.get('/events/my/organized'),
        api.get('/events/my/joined'),
      ]);
      setMyOrganized(org.data || []);
      setMyJoined(joined.data || []);
    } catch (e) {
      console.warn('[eventi] fetch my events error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    (async () => {
      const loc = await requestLocation();
      await fetchEvents(loc);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestLocation]));

  useEffect(() => {
    if (userLocation) fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm, levelFilter]);

  useEffect(() => {
    if (mode === 'my_events') fetchMyEvents();
  }, [mode, fetchMyEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (mode === 'feed') {
      const loc = await requestLocation();
      await fetchEvents(loc);
    } else {
      await fetchMyEvents();
    }
  }, [mode, requestLocation, fetchEvents, fetchMyEvents]);

  const joinEvent = useCallback(async (event_id: string) => {
    try {
      await api.post(`/events/${event_id}/join`);
      fetchEvents();
      fetchMyEvents();
    } catch {
      Alert.alert(t('eventi.error'), t('eventi.join_error'));
    }
  }, [fetchEvents, fetchMyEvents, t]);

  const deleteEvent = useCallback((event_id: string) => {
    Alert.alert(t('eventi.delete'), t('eventi.delete_confirm'), [
      { text: t('eventi.cancel'), style: 'cancel' },
      {
        text: t('eventi.delete'), style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/events/${event_id}`);
            fetchMyEvents();
          } catch {
            Alert.alert(t('eventi.error'), t('eventi.delete_error'));
          }
        },
      },
    ]);
  }, [fetchMyEvents, t]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={neutral.background} />

      <View style={styles.header}>
        <Text style={styles.title}>{t('eventi.title')}</Text>
        <Text style={styles.subtitle}>{t('eventi.subtitle')}</Text>
      </View>

      <View style={styles.segment}>
        <SegmentBtn label={t('eventi.feed')} Icon={Calendar} active={mode === 'feed'} onPress={() => setMode('feed')} />
        <SegmentBtn label={t('eventi.my_events')} Icon={Users} active={mode === 'my_events'} onPress={() => setMode('my_events')} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand.primary} />}
      >
        {mode === 'feed' ? (
          <FeedView
            events={events}
            loading={loading}
            radiusKm={radiusKm}
            setRadiusKm={setRadiusKm}
            levelFilter={levelFilter}
            setLevelFilter={setLevelFilter}
            userLocation={userLocation}
            onRequestLocation={() => requestLocation().then(loc => fetchEvents(loc))}
            onJoin={joinEvent}
            locale={locale}
          />
        ) : (
          <MyEventsView
            myOrganized={myOrganized}
            myJoined={myJoined}
            loading={loading}
            onJoin={joinEvent}
            onDelete={deleteEvent}
            locale={locale}
          />
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreateModal(true)} activeOpacity={0.85}>
        <Plus size={26} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>

      <CreateEventModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          setShowCreateModal(false);
          if (mode === 'feed') fetchEvents();
          else fetchMyEvents();
        }}
      />
    </SafeAreaView>
  );
}

// ── FEED VIEW ──
function FeedView({
  events, loading, radiusKm, setRadiusKm, levelFilter, setLevelFilter,
  userLocation, onRequestLocation, onJoin, locale,
}: {
  events: RunEvent[];
  loading: boolean;
  radiusKm: number;
  setRadiusKm: (n: number) => void;
  levelFilter: 'all' | EventLevel;
  setLevelFilter: (l: 'all' | EventLevel) => void;
  userLocation: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
  onJoin: (id: string) => void;
  locale: string;
}) {
  const { t } = useT();

  return (
    <>
      <Text style={styles.filterLabel}>{t('eventi.radius')}</Text>
      <View style={styles.chipsRow}>
        {RADII.map(r => (
          <Chip
            key={r}
            label={`${r} km`}
            selected={radiusKm === r}
            onPress={() => setRadiusKm(r)}
            style={{ marginRight: 8 }}
          />
        ))}
      </View>

      <View style={styles.chipsRow}>
        <Chip label={t('eventi.level_all')} selected={levelFilter === 'all'} onPress={() => setLevelFilter('all')} style={{ marginRight: 8 }} />
        <Chip label={t('eventi.level_beginner')} tone="success" selected={levelFilter === 'beginner'} onPress={() => setLevelFilter('beginner')} style={{ marginRight: 8 }} />
        <Chip label={t('eventi.level_intermediate')} tone="warning" selected={levelFilter === 'intermediate'} onPress={() => setLevelFilter('intermediate')} style={{ marginRight: 8 }} />
        <Chip label={t('eventi.level_advanced')} tone="danger" selected={levelFilter === 'advanced'} onPress={() => setLevelFilter('advanced')} />
      </View>

      {!userLocation ? (
        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.gpsBanner}>
            <MapPin size={24} color={brand.primary} strokeWidth={2} />
            <Text style={styles.gpsBannerText}>{t('eventi.no_gps')}</Text>
            <TouchableOpacity style={styles.gpsBtn} onPress={onRequestLocation} activeOpacity={0.85}>
              <Text style={styles.gpsBtnText}>{t('eventi.gps_cta')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand.primary} />
        </View>
      ) : events.length === 0 ? (
        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.emptyState}>
            <Calendar size={32} color={text.muted} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>{t('eventi.no_events')}</Text>
            <Text style={styles.emptySub}>{t('eventi.no_events_sub')}</Text>
          </View>
        </Card>
      ) : (
        <View style={{ marginTop: spacing.md, gap: spacing.md }}>
          {events.map(ev => (
            <EventCard key={ev.event_id} event={ev} locale={locale} onJoin={onJoin} />
          ))}
        </View>
      )}
    </>
  );
}

// ── MY EVENTS VIEW ──
function MyEventsView({ myOrganized, myJoined, loading, onJoin, onDelete, locale }: {
  myOrganized: RunEvent[];
  myJoined: RunEvent[];
  loading: boolean;
  onJoin: (id: string) => void;
  onDelete: (id: string) => void;
  locale: string;
}) {
  const { t } = useT();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={brand.primary} />
      </View>
    );
  }

  return (
    <>
      <Text style={styles.sectionKicker}>{t('eventi.organized')}</Text>
      {myOrganized.length === 0 ? (
        <Text style={styles.sectionEmpty}>{t('eventi.no_events')}</Text>
      ) : (
        <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
          {myOrganized.map(ev => (
            <EventCard key={ev.event_id} event={ev} locale={locale} onJoin={onJoin} onDelete={onDelete} />
          ))}
        </View>
      )}

      <Text style={styles.sectionKicker}>{t('eventi.participating')}</Text>
      {myJoined.length === 0 ? (
        <Text style={styles.sectionEmpty}>{t('eventi.no_events')}</Text>
      ) : (
        <View style={{ gap: spacing.md }}>
          {myJoined.map(ev => (
            <EventCard key={ev.event_id} event={ev} locale={locale} onJoin={onJoin} />
          ))}
        </View>
      )}
    </>
  );
}

// ── EVENT CARD ──
function EventCard({ event, locale, onJoin, onDelete }: {
  event: RunEvent;
  locale: string;
  onJoin: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { t } = useT();
  const router = useRouter();

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/event/${event.event_id}`)}>
      <Card>
        <View style={styles.eventCardHeader}>
          <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
          {onDelete && event.is_organizer ? (
            <TouchableOpacity onPress={() => onDelete(event.event_id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Trash2 size={16} color={text.muted} strokeWidth={2} />
            </TouchableOpacity>
          ) : (
            <ChevronRight size={18} color={text.muted} strokeWidth={2} />
          )}
        </View>

        <View style={styles.eventMetaRow}>
          <Calendar size={13} color={text.muted} strokeWidth={2} />
          <Text style={styles.eventMetaText}>{formatEventDate(event.date, locale)}</Text>
        </View>
        <View style={styles.eventMetaRow}>
          <MapPin size={13} color={text.muted} strokeWidth={2} />
          <Text style={styles.eventMetaText} numberOfLines={1}>{event.location?.address}</Text>
        </View>

        <View style={styles.eventTagsRow}>
          <Chip label={`${event.distance_km} km`} tone="neutral" style={{ marginRight: 8 }} />
          <Chip label={t(`eventi.level_${event.level}`)} tone={LEVEL_TONES[event.level]} />
        </View>

        <View style={styles.eventFooterRow}>
          <View style={styles.eventFooterItem}>
            <Users size={13} color={text.muted} strokeWidth={2} />
            <Text style={styles.eventFooterText}>{event.participant_count} {t('eventi.participants')}</Text>
          </View>
          {typeof event.distance_from_user_km === 'number' ? (
            <Text style={styles.eventFooterText}>{event.distance_from_user_km} km {t('eventi.distance_from_you')}</Text>
          ) : null}
        </View>

        {event.is_organizer ? (
          <View style={[styles.statusPill, styles.statusPillNeutral]}>
            <Text style={styles.statusPillText}>{t('eventi.organizer')}</Text>
          </View>
        ) : event.is_participant ? (
          <View style={[styles.statusPill, styles.statusPillJoined]}>
            <Text style={[styles.statusPillText, { color: semantic.success }]}>{t('eventi.joined')}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={(e) => { e.stopPropagation(); onJoin(event.event_id); }}
            activeOpacity={0.85}
          >
            <Text style={styles.joinBtnText}>{t('eventi.join')}</Text>
          </TouchableOpacity>
        )}
      </Card>
    </TouchableOpacity>
  );
}

// ── CREATE EVENT MODAL ──
function CreateEventModal({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [address, setAddress] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [level, setLevel] = useState<EventLevel>('beginner');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(''); setDescription(''); setDate(''); setTime('');
    setAddress(''); setDistanceKm(''); setLevel('beginner');
  };

  const save = async () => {
    if (!title.trim() || !date.trim() || !time.trim() || !address.trim() || !distanceKm.trim()) {
      Alert.alert(t('eventi.error'), t('eventi.missing_fields'));
      return;
    }
    setSaving(true);
    try {
      const geo = await Location.geocodeAsync(address.trim());
      if (!geo || geo.length === 0) {
        Alert.alert(t('eventi.error'), t('eventi.geocode_error'));
        setSaving(false);
        return;
      }
      const { latitude, longitude } = geo[0];
      const isoDate = new Date(`${date.trim()}T${time.trim()}`).toISOString();

      await api.post('/events', {
        title: title.trim(),
        description: description.trim(),
        date: isoDate,
        location: { lat: latitude, lng: longitude, address: address.trim() },
        distance_km: parseFloat(distanceKm),
        level,
      });
      Alert.alert(t('eventi.create'), t('eventi.create_success'));
      reset();
      onSaved();
    } catch {
      Alert.alert(t('eventi.error'), t('eventi.create_error'));
    } finally {
      setSaving(false);
    }
  };

  const levelLabel = (lv: EventLevel) => {
    if (lv === 'beginner') return t('eventi.level_beginner');
    if (lv === 'intermediate') return t('eventi.level_intermediate');
    return t('eventi.level_advanced');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t('eventi.create')}</Text>
          <TouchableOpacity onPress={onClose}><Text style={styles.modalClose}>{t('eventi.cancel')}</Text></TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <Text style={styles.fieldLabel}>{t('eventi.form_title')}</Text>
          <TextInput style={styles.fieldInput} value={title} onChangeText={setTitle}
            placeholder={t('eventi.form_title')} placeholderTextColor={text.muted} />

          <Text style={styles.fieldLabel}>{t('eventi.form_description')}</Text>
          <TextInput style={[styles.fieldInput, styles.fieldInputMultiline]} value={description} onChangeText={setDescription}
            placeholder={t('eventi.form_description')} placeholderTextColor={text.muted} multiline numberOfLines={3} />

          <Text style={styles.fieldLabel}>{t('eventi.form_date')}</Text>
          <TextInput style={styles.fieldInput} value={date} onChangeText={setDate}
            placeholder="2026-10-15" placeholderTextColor={text.muted} />

          <Text style={styles.fieldLabel}>{t('eventi.form_time')}</Text>
          <TextInput style={styles.fieldInput} value={time} onChangeText={setTime}
            placeholder="09:00" placeholderTextColor={text.muted} />

          <Text style={styles.fieldLabel}>{t('eventi.form_address')}</Text>
          <TextInput style={styles.fieldInput} value={address} onChangeText={setAddress}
            placeholder={t('eventi.form_address')} placeholderTextColor={text.muted} />

          <Text style={styles.fieldLabel}>{t('eventi.form_distance')}</Text>
          <TextInput style={styles.fieldInput} value={distanceKm} onChangeText={setDistanceKm}
            placeholder="10" placeholderTextColor={text.muted} keyboardType="decimal-pad" />

          <Text style={styles.fieldLabel}>{t('eventi.form_level')}</Text>
          <View style={styles.typeRow}>
            {(['beginner', 'intermediate', 'advanced'] as EventLevel[]).map(lv => (
              <TouchableOpacity
                key={lv}
                style={[styles.typeBtn, level === lv && styles.typeBtnActive]}
                onPress={() => setLevel(lv)}
              >
                <Text style={[styles.typeBtnText, level === lv && styles.typeBtnTextActive]}>
                  {levelLabel(lv).toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> :
              <Text style={styles.saveBtnText}>{t('eventi.create')}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ── HELPERS ──
function SegmentBtn({ label, Icon, active, onPress }: { label: string; Icon: any; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.segBtn, active && styles.segBtnActive]} onPress={onPress} activeOpacity={0.8}>
      <Icon size={14} color={active ? '#fff' : text.secondary} strokeWidth={2.2} />
      <Text style={[styles.segBtnText, active && { color: '#fff' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EventiScreen() {
  return <FontProvider><EventiInner /></FontProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: neutral.background },
  header: { paddingHorizontal: spacing.marginApp, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.sectionTitle, color: text.primary, fontSize: 26 },
  subtitle: { ...typography.caption, color: text.muted, marginTop: 2 },
  segment: {
    flexDirection: 'row', marginHorizontal: spacing.marginApp,
    backgroundColor: neutral.surfaceSoft, borderRadius: 999,
    padding: 4, gap: 4, marginBottom: spacing.sm,
  },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 999 },
  segBtnActive: { backgroundColor: brand.primary },
  segBtnText: { ...typography.kpiLabel, color: text.secondary, fontSize: 11 },
  scroll: { padding: spacing.marginApp, paddingTop: spacing.sm },
  center: { padding: 40, alignItems: 'center' },

  filterLabel: { ...typography.kpiLabel, color: text.muted, fontSize: 10, marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },

  gpsBanner: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  gpsBannerText: { ...typography.body, color: text.secondary, textAlign: 'center' },
  gpsBtn: { backgroundColor: brand.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: 999 },
  gpsBtnText: { color: '#fff', ...typography.kpiLabel, fontSize: 11 },

  emptyState: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  emptyTitle: { ...typography.bodyBold, color: text.primary, fontSize: 16, textAlign: 'center' },
  emptySub: { ...typography.body, color: text.secondary, textAlign: 'center', lineHeight: 20 },

  sectionKicker: { ...typography.kpiLabel, color: text.muted, fontSize: 11, marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionEmpty: { ...typography.caption, color: text.muted, marginBottom: spacing.lg },

  eventCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  eventTitle: { ...typography.bodyBold, color: text.primary, fontSize: 17, flex: 1 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  eventMetaText: { ...typography.caption, color: text.secondary, flex: 1 },
  eventTagsRow: { flexDirection: 'row', marginTop: spacing.sm, marginBottom: spacing.sm },
  eventFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  eventFooterItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventFooterText: { ...typography.caption, color: text.muted },

  statusPill: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 999 },
  statusPillNeutral: { backgroundColor: neutral.surfaceSoft },
  statusPillJoined: { backgroundColor: '#D1FAE5' },
  statusPillText: { ...typography.kpiLabel, color: text.secondary, fontSize: 10 },
  joinBtn: { alignSelf: 'flex-start', backgroundColor: brand.primary, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: 999 },
  joinBtnText: { color: '#fff', ...typography.kpiLabel, fontSize: 11 },

  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: brand.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 4,
  },

  modalSafe: { flex: 1, backgroundColor: neutral.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.marginApp, borderBottomWidth: 1, borderBottomColor: neutral.border },
  modalTitle: { ...typography.bodyBold, color: text.primary, fontSize: 18 },
  modalClose: { color: brand.primary, fontSize: 16, fontWeight: '600' },
  modalBody: { padding: spacing.marginApp },
  fieldLabel: { ...typography.kpiLabel, color: text.muted, fontSize: 10, marginBottom: 6, marginTop: spacing.md },
  fieldInput: { borderWidth: 1, borderColor: neutral.border, borderRadius: 10, padding: 12, color: text.primary, fontSize: 15, backgroundColor: neutral.card },
  fieldInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: neutral.border, alignItems: 'center' },
  typeBtnActive: { backgroundColor: brand.primary, borderColor: brand.primary },
  typeBtnText: { ...typography.kpiLabel, color: text.secondary, fontSize: 9 },
  typeBtnTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: brand.primary, paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xl },
  saveBtnText: { color: '#fff', ...typography.kpiLabel, fontSize: 12 },
});
