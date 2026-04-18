import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, TextInput, Alert, Modal, FlatList, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { colors, spacing, radius } from '../src/theme';

type FeedItem = {
  session_id: string;
  user: { user_id: string; name: string; tier: string };
  title: string;
  distance_km: number;
  duration_seconds: number;
  avg_pace_min_per_km?: string | null;
  calories: number;
  completed_at: string;
  likes_count: number;
  liked_by_me: boolean;
  comments_count: number;
};

type Friend = {
  user_id: string; name: string; email: string; tier: string;
  total_km: number; total_runs: number;
};

type Request = {
  friendship_id: string;
  from?: { user_id: string; name: string; email: string };
  to?: { user_id: string; name: string; email: string };
  created_at: string;
};

type LeaderboardEntry = {
  rank: number; user_id: string; name: string; tier: string;
  value: number; is_me: boolean;
};

type Tab = 'feed' | 'friends' | 'leaderboard';
type Period = 'weekly' | 'monthly' | 'all';
type Metric = 'km' | 'runs' | 'calories';

export default function SocialScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('feed');
  const [refreshing, setRefreshing] = useState(false);

  // Feed
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Friends
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<Request[]>([]);
  const [outgoing, setOutgoing] = useState<Request[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState<any[]>([]);
  const [addModal, setAddModal] = useState(false);

  // Leaderboard
  const [period, setPeriod] = useState<Period>('weekly');
  const [metric, setMetric] = useState<Metric>('km');
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);

  // Comments modal
  const [commentsFor, setCommentsFor] = useState<FeedItem | null>(null);

  const loadFeed = async () => {
    try {
      setFeedLoading(true);
      const { data } = await api.get('/social/feed');
      setFeed(data);
    } catch {} finally { setFeedLoading(false); }
  };
  const loadFriends = async () => {
    try {
      const [fr, inc, out] = await Promise.all([
        api.get('/social/friends'),
        api.get('/social/friends/requests'),
        api.get('/social/friends/outgoing'),
      ]);
      setFriends(fr.data); setIncoming(inc.data); setOutgoing(out.data);
    } catch {}
  };
  const loadBoard = async () => {
    try {
      const { data } = await api.get(`/social/leaderboard?period=${period}&metric=${metric}`);
      setBoard(data.entries || []);
    } catch {}
  };

  useFocusEffect(useCallback(() => {
    if (tab === 'feed') loadFeed();
    else if (tab === 'friends') loadFriends();
    else loadBoard();
  }, [tab, period, metric]));

  const onRefresh = async () => {
    setRefreshing(true);
    if (tab === 'feed') await loadFeed();
    else if (tab === 'friends') await loadFriends();
    else await loadBoard();
    setRefreshing(false);
  };

  const toggleLike = async (item: FeedItem) => {
    // Optimistic
    setFeed(prev => prev.map(f => f.session_id === item.session_id ? {
      ...f,
      liked_by_me: !f.liked_by_me,
      likes_count: f.likes_count + (f.liked_by_me ? -1 : 1),
    } : f));
    try {
      if (item.liked_by_me) await api.delete(`/social/workouts/${item.session_id}/like`);
      else await api.post(`/social/workouts/${item.session_id}/like`);
    } catch {
      loadFeed();
    }
  };

  const doSearch = async (q: string) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchRes([]); return; }
    try {
      const { data } = await api.get(`/social/users/search?q=${encodeURIComponent(q)}`);
      setSearchRes(data);
    } catch {}
  };

  const sendRequest = async (email: string) => {
    try {
      await api.post('/social/friends/request', { email });
      Alert.alert('Inviata', 'Richiesta di amicizia inviata');
      setAddModal(false); setSearchQ(''); setSearchRes([]);
      await loadFriends();
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Impossibile inviare la richiesta');
    }
  };

  const respondRequest = async (friendshipId: string, action: 'accept' | 'reject') => {
    try {
      await api.post(`/social/friends/respond/${friendshipId}?action=${action}`);
      await loadFriends();
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Operazione non riuscita');
    }
  };

  const unfriend = (f: Friend) => {
    Alert.alert('Rimuovere amico?', f.name, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rimuovi', style: 'destructive', onPress: async () => {
        try { await api.delete(`/social/friends/${f.user_id}`); await loadFriends(); } catch {}
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>COMMUNITY</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.segment}>
        {(['feed', 'friends', 'leaderboard'] as Tab[]).map(t => (
          <TouchableOpacity key={t} testID={`tab-${t}`}
            style={[styles.segBtn, tab === t && styles.segBtnActive]}
            onPress={() => setTab(t)}>
            <Ionicons
              name={t === 'feed' ? 'newspaper' : t === 'friends' ? 'people' : 'trophy'}
              size={16}
              color={tab === t ? '#fff' : colors.textSecondary}
            />
            <Text style={[styles.segText, tab === t && styles.segTextActive]}>
              {t === 'feed' ? 'FEED' : t === 'friends' ? 'AMICI' : 'CLASSIFICA'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {tab === 'feed' && (
          feedLoading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> :
          feed.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="newspaper-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Nessuna attivita'</Text>
              <Text style={styles.emptyText}>Aggiungi amici per vedere le loro corse qui</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setTab('friends')}>
                <Text style={styles.emptyBtnText}>TROVA AMICI</Text>
              </TouchableOpacity>
            </View>
          ) : feed.map(item => (
            <FeedCard key={item.session_id} item={item} onLike={() => toggleLike(item)} onComments={() => setCommentsFor(item)} />
          ))
        )}

        {tab === 'friends' && (
          <>
            <TouchableOpacity testID="add-friend-btn" style={styles.addBtn} onPress={() => setAddModal(true)}>
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.addBtnText}>AGGIUNGI AMICO</Text>
            </TouchableOpacity>

            {incoming.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>RICHIESTE IN ARRIVO</Text>
                {incoming.map(r => (
                  <View key={r.friendship_id} style={styles.reqCard}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{r.from?.name?.[0]?.toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{r.from?.name}</Text>
                      <Text style={styles.friendEmail}>{r.from?.email}</Text>
                    </View>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => respondRequest(r.friendship_id, 'accept')}>
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => respondRequest(r.friendship_id, 'reject')}>
                      <Ionicons name="close" size={18} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {outgoing.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>RICHIESTE INVIATE</Text>
                {outgoing.map(r => (
                  <View key={r.friendship_id} style={styles.reqCard}>
                    <View style={[styles.avatar, { backgroundColor: colors.textMuted }]}><Text style={styles.avatarText}>{r.to?.name?.[0]?.toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{r.to?.name}</Text>
                      <Text style={styles.friendEmail}>{r.to?.email}</Text>
                    </View>
                    <Text style={styles.pendingTag}>IN ATTESA</Text>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>AMICI ({friends.length})</Text>
            {friends.length === 0 ? (
              <Text style={styles.emptyText}>Nessun amico ancora. Aggiungine uno per iniziare!</Text>
            ) : friends.map(f => (
              <View key={f.user_id} style={styles.friendCard}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{f.name?.[0]?.toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{f.name}</Text>
                  <Text style={styles.friendStats}>{f.total_km.toFixed(1)} km · {f.total_runs} corse</Text>
                </View>
                <TouchableOpacity onPress={() => unfriend(f)} style={styles.iconBtn}>
                  <Ionicons name="person-remove" size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {tab === 'leaderboard' && (
          <>
            <View style={styles.filterRow}>
              {(['weekly', 'monthly', 'all'] as Period[]).map(p => (
                <TouchableOpacity key={p} style={[styles.chip, period === p && styles.chipActive]} onPress={() => setPeriod(p)}>
                  <Text style={[styles.chipText, period === p && styles.chipTextActive]}>
                    {p === 'weekly' ? 'SETTIMANA' : p === 'monthly' ? 'MESE' : 'TUTTI'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterRow}>
              {(['km', 'runs', 'calories'] as Metric[]).map(m => (
                <TouchableOpacity key={m} style={[styles.chip, metric === m && styles.chipActive]} onPress={() => setMetric(m)}>
                  <Text style={[styles.chipText, metric === m && styles.chipTextActive]}>
                    {m === 'km' ? 'KM' : m === 'runs' ? 'CORSE' : 'KCAL'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {board.length === 0 ? (
              <Text style={styles.emptyText}>Nessun dato per questo periodo.</Text>
            ) : board.map(e => (
              <View key={e.user_id} style={[styles.boardRow, e.is_me && styles.boardRowMe]}>
                <View style={[styles.rankPill, e.rank === 1 && { backgroundColor: '#F59E0B' }, e.rank === 2 && { backgroundColor: '#A1A1AA' }, e.rank === 3 && { backgroundColor: '#CD7F32' }]}>
                  <Text style={styles.rankText}>{e.rank}</Text>
                </View>
                <View style={styles.avatar}><Text style={styles.avatarText}>{e.name?.[0]?.toUpperCase()}</Text></View>
                <Text style={[styles.friendName, { flex: 1 }]} numberOfLines={1}>{e.name}{e.is_me ? ' (tu)' : ''}</Text>
                <Text style={styles.boardValue}>
                  {metric === 'km' ? `${e.value.toFixed(1)} km` : metric === 'runs' ? `${e.value}` : `${e.value} kcal`}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Add friend modal */}
      <Modal visible={addModal} animationType="slide" transparent onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setAddModal(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Aggiungi un amico</Text>
            <TextInput
              testID="search-friend-input"
              value={searchQ} onChangeText={doSearch}
              placeholder="Cerca per email o nome"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none" autoCorrect={false}
            />
            <FlatList
              data={searchRes}
              keyExtractor={i => i.user_id}
              style={{ maxHeight: 280 }}
              ListEmptyComponent={searchQ.length >= 2 ? <Text style={[styles.emptyText, { padding: spacing.md }]}>Nessun risultato</Text> : null}
              renderItem={({ item }) => (
                <View style={styles.searchRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.[0]?.toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{item.name}</Text>
                    <Text style={styles.friendEmail}>{item.email}</Text>
                  </View>
                  {item.relation === 'friend' ? (
                    <Text style={styles.pendingTag}>AMICI</Text>
                  ) : item.relation === 'pending' ? (
                    <Text style={styles.pendingTag}>IN ATTESA</Text>
                  ) : (
                    <TouchableOpacity style={styles.smallAddBtn} onPress={() => sendRequest(item.email)}>
                      <Ionicons name="person-add" size={14} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => { setAddModal(false); setSearchQ(''); setSearchRes([]); }}>
              <Text style={styles.modalCloseText}>CHIUDI</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Comments modal */}
      {commentsFor && (
        <CommentsModal
          item={commentsFor}
          onClose={() => { setCommentsFor(null); loadFeed(); }}
        />
      )}
    </SafeAreaView>
  );
}

function FeedCard({ item, onLike, onComments }: { item: FeedItem; onLike: () => void; onComments: () => void }) {
  const dateStr = new Date(item.completed_at).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };
  return (
    <View style={styles.feedCard} testID={`feed-${item.session_id}`}>
      <View style={styles.feedHeader}>
        <View style={[styles.avatar, item.user.tier === 'elite' && { backgroundColor: '#F59E0B' }]}>
          <Text style={styles.avatarText}>{item.user.name?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedUserName}>{item.user.name}</Text>
          <Text style={styles.feedDate}>{dateStr}</Text>
        </View>
      </View>
      <Text style={styles.feedTitle}>{item.title}</Text>
      <View style={styles.feedStats}>
        <Stat label="KM" value={item.distance_km.toFixed(2)} />
        <Stat label="TEMPO" value={fmt(item.duration_seconds)} />
        <Stat label="PACE" value={item.avg_pace_min_per_km || '-'} />
        <Stat label="KCAL" value={`${Math.round(item.calories || 0)}`} />
      </View>
      <View style={styles.feedActions}>
        <TouchableOpacity testID={`like-${item.session_id}`} style={styles.actionBtn} onPress={onLike}>
          <Ionicons name={item.liked_by_me ? 'heart' : 'heart-outline'} size={20} color={item.liked_by_me ? colors.primary : colors.textSecondary} />
          <Text style={[styles.actionText, item.liked_by_me && { color: colors.primary }]}>{item.likes_count}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`comments-${item.session_id}`} style={styles.actionBtn} onPress={onComments}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.actionText}>{item.comments_count}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

function CommentsModal({ item, onClose }: { item: FeedItem; onClose: () => void }) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/social/workouts/${item.session_id}/comments`);
      setComments(data);
    } catch {} finally { setLoading(false); }
  };
  useFocusEffect(useCallback(() => { load(); }, []));

  const send = async () => {
    const t = text.trim(); if (!t) return;
    setSending(true);
    try {
      await api.post(`/social/workouts/${item.session_id}/comments`, { text: t });
      setText('');
      await load();
    } catch (e: any) {
      Alert.alert('Errore', e?.response?.data?.detail || 'Commento non inviato');
    } finally { setSending(false); }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalCard, { maxHeight: '80%' }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Commenti</Text>
          {loading ? <ActivityIndicator color={colors.primary} /> :
            <FlatList
              data={comments}
              keyExtractor={c => c.comment_id}
              style={{ maxHeight: 380 }}
              ListEmptyComponent={<Text style={[styles.emptyText, { padding: spacing.md }]}>Nessun commento. Inizia tu!</Text>}
              renderItem={({ item: c }) => (
                <View style={styles.commentRow}>
                  <View style={styles.avatarSm}><Text style={styles.avatarText}>{(c.user_name || 'R')[0]?.toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentName}>{c.user_name}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                </View>
              )}
            />
          }
          <View style={styles.commentInputRow}>
            <TextInput
              testID="comment-input"
              value={text} onChangeText={setText}
              placeholder="Scrivi un commento..."
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { flex: 1 }]}
              multiline maxLength={500}
            />
            <TouchableOpacity testID="send-comment" style={styles.sendBtn} onPress={send} disabled={sending || !text.trim()}>
              {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  segment: { flexDirection: 'row', marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4, marginBottom: spacing.sm },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.pill },
  segBtnActive: { backgroundColor: colors.primary },
  segText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  segTextActive: { color: '#fff' },

  feedCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  feedUserName: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  feedDate: { color: colors.textMuted, fontSize: 11 },
  feedTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  feedStats: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.surfaceSecondary, padding: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  statBoxValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  statBoxLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  feedActions: { flexDirection: 'row', gap: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },

  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarSm: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '900' },

  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: spacing.lg, marginBottom: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm },
  addBtnText: { color: '#fff', fontWeight: '800', letterSpacing: 1 },

  friendCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  reqCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  friendName: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  friendEmail: { color: colors.textSecondary, fontSize: 12 },
  friendStats: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  pendingTag: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  acceptBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },

  emptyBox: { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginTop: spacing.md },
  emptyText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, marginTop: spacing.md },
  emptyBtnText: { color: '#fff', fontWeight: '800', letterSpacing: 1 },

  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  chipTextActive: { color: '#fff' },

  boardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  boardRowMe: { borderColor: colors.primary, backgroundColor: 'rgba(255,59,48,0.08)' },
  rankPill: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  rankText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  boardValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },

  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: { backgroundColor: colors.surface, padding: spacing.lg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: spacing.xxl },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, alignSelf: 'center', marginBottom: spacing.md },
  modalTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '900', marginBottom: spacing.md },
  input: { backgroundColor: colors.surfaceSecondary, color: colors.textPrimary, padding: spacing.md, borderRadius: radius.md, fontSize: 14, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md },
  smallAddBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  modalClose: { alignSelf: 'center', padding: spacing.md },
  modalCloseText: { color: colors.textSecondary, fontWeight: '800', letterSpacing: 1 },

  commentRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  commentName: { color: colors.textPrimary, fontSize: 13, fontWeight: '800' },
  commentText: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
});
