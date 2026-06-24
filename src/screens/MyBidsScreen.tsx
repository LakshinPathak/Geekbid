import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { formatMoney } from '../utils/pricing';
import { formatDateTime } from '../utils/time';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

type Tab = 'all' | 'counter' | 'won' | 'watching';

export const MyBidsScreen = () => {
  const { bids, currentUser, watchedJobIds, jobs } = useApp();
  const [tab, setTab] = useState<Tab>('all');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const myBids = useMemo(
    () => bids.filter((b) => b.freelancerId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [bids, currentUser.id]
  );

  const watchedJobs = useMemo(
    () => jobs.filter((j) => watchedJobIds.includes(j.id)),
    [jobs, watchedJobIds]
  );

  const counters = myBids.filter((b) => b.bidType === 'counter');
  const wins = myBids.filter((b) => b.bidType === 'accept');

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: myBids.length },
    { key: 'counter', label: '💬 Counter', count: counters.length },
    { key: 'won', label: '🏆 Won', count: wins.length },
    { key: 'watching', label: '🔖 Watching', count: watchedJobs.length },
  ];

  const displayBids = tab === 'counter' ? counters : tab === 'won' ? wins : tab === 'all' ? myBids : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>💬 My Bids</Text>

      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label} ({t.count})</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'watching' ? (
        <>
          {watchedJobs.length === 0 && <EmptyState icon="🔖" title="No watched jobs" subtitle="Tap Watch on any job to track it here." />}
          {watchedJobs.map((job) => (
            <Pressable key={job.id} style={styles.card} onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}>
              <Text style={styles.bidJobTitle}>{job.title}</Text>
              <View style={styles.metaRow}>
                <StatusBadge label={job.status.toUpperCase()} variant={job.status === 'open' ? 'success' : 'info'} />
                <Text style={styles.meta}>{formatMoney(job.startingPrice)} start</Text>
              </View>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          {displayBids.length === 0 && <EmptyState icon="💬" title="No bids yet" subtitle="Start bidding on jobs to see your history here." />}
          {displayBids.map((bid) => {
            const jobTitle = jobs.find((j) => j.id === bid.jobId)?.title ?? bid.jobId;
            return (
              <Pressable key={bid.id} style={styles.card} onPress={() => navigation.navigate('JobDetail', { jobId: bid.jobId })}>
                <View style={styles.cardHeader}>
                  <Text style={styles.bidJobTitle} numberOfLines={1}>{jobTitle}</Text>
                  <StatusBadge
                    label={bid.bidType.toUpperCase()}
                    variant={bid.bidType === 'accept' ? 'success' : 'info'}
                  />
                </View>
                <Text style={styles.bidPrice}>{formatMoney(bid.bidPrice)}</Text>
                {bid.message && <Text style={styles.bidMessage} numberOfLines={2}>{bid.message}</Text>}
                <Text style={styles.bidTime}>{formatDateTime(bid.createdAt)}</Text>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  title: { ...typography.h2, color: colors.text },
  tabRow: { flexDirection: 'row', gap: 5 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.card },
  tabActive: { borderColor: colors.accentBlue, backgroundColor: colors.accentBlueGlow },
  tabText: { ...typography.label, color: colors.muted, fontSize: 10 },
  tabTextActive: { color: colors.accentBlue },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    gap: 6,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bidJobTitle: { ...typography.bodyBold, color: colors.text, flex: 1, marginRight: 8 },
  bidPrice: { ...typography.priceMD, color: colors.accent },
  bidMessage: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },
  bidTime: { ...typography.caption, color: colors.muted, fontSize: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { ...typography.caption, color: colors.muted },
});
