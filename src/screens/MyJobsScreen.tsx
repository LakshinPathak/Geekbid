import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { formatMoney, getCurrentPrice } from '../utils/pricing';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

type Tab = 'active' | 'accepted' | 'expired';

export const MyJobsScreen = () => {
  const { jobs, now, currentUser } = useApp();
  const [tab, setTab] = useState<Tab>('active');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const myJobs = useMemo(() => {
    if (currentUser.role === 'client') return jobs.filter((j) => j.clientId === currentUser.id);
    return jobs.filter((j) => j.acceptedBy === currentUser.id || j.status === 'open');
  }, [jobs, currentUser]);

  const filtered = useMemo(() => {
    if (tab === 'active') return myJobs.filter((j) => j.status === 'open');
    if (tab === 'accepted') return myJobs.filter((j) => j.status === 'accepted');
    return myJobs.filter((j) => j.status === 'expired' || j.status === 'cancelled');
  }, [myJobs, tab]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'active', label: '⚡ Active', count: myJobs.filter((j) => j.status === 'open').length },
    { key: 'accepted', label: '✅ Accepted', count: myJobs.filter((j) => j.status === 'accepted').length },
    { key: 'expired', label: '⏰ Expired', count: myJobs.filter((j) => j.status === 'expired' || j.status === 'cancelled').length },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>📋 My Jobs</Text>

      <View style={styles.tabRow}>
        {tabs.map((t) => (
          <Pressable key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label} ({t.count})</Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 && (
        <EmptyState icon="📋" title={`No ${tab} jobs`} subtitle="Jobs will appear here based on your activity." />
      )}

      {filtered.map((job) => {
        const price = getCurrentPrice(job, now);
        return (
          <Pressable key={job.id} style={styles.card} onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}>
            <View style={styles.cardHeader}>
              <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
              <StatusBadge
                label={job.status.toUpperCase()}
                variant={job.status === 'open' ? 'success' : job.status === 'accepted' ? 'info' : 'danger'}
              />
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>💰 {formatMoney(job.status === 'accepted' ? (job.finalPrice ?? price) : price)}</Text>
              <Text style={styles.meta}>📊 {formatMoney(job.startingPrice)} start</Text>
              <Text style={styles.meta}>🔻 {formatMoney(job.minimumPrice)} floor</Text>
            </View>
            <View style={styles.skillRow}>
              {job.skillsRequired.slice(0, 3).map((s) => (
                <View key={s} style={styles.skillChip}><Text style={styles.skillText}>{s}</Text></View>
              ))}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  title: { ...typography.h2, color: colors.text },
  tabRow: { flexDirection: 'row', gap: 6 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.card },
  tabActive: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  tabText: { ...typography.captionBold, color: colors.muted },
  tabTextActive: { color: colors.accent },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobTitle: { ...typography.bodyBold, color: colors.text, flex: 1, marginRight: 8 },
  metaRow: { flexDirection: 'row', gap: 12 },
  meta: { ...typography.caption, color: colors.muted },
  skillRow: { flexDirection: 'row', gap: 6 },
  skillChip: { backgroundColor: colors.badge, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  skillText: { ...typography.caption, color: colors.badgeText, fontSize: 11 },
});
