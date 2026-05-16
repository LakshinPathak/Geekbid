import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { JobCard } from '../components/JobCard';
import { EmptyState } from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { SKILL_TAXONOMY } from '../data/mockData';
import { SortOption } from '../types/models';
import { RootStackParamList } from '../types/navigation';
import { getCurrentPrice } from '../utils/pricing';

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: 'newest', label: 'Newest', icon: '🆕' },
  { key: 'highest_price', label: 'Highest Price', icon: '💰' },
  { key: 'fastest_decay', label: 'Fastest Decay', icon: '🔥' },
  { key: 'nearest_deadline', label: 'Nearest Deadline', icon: '⏰' },
  { key: 'best_match', label: 'Best Match', icon: '🎯' },
];

export const FeedScreen = () => {
  const { jobs, now, currentUser, isLoadingJobs, jobsError, isMockMode, refreshJobs, acceptJob, toggleWatch, watchedJobIds, users } = useApp();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const openJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = jobs
      .filter((j) => j.status === 'open')
      .filter((j) => (q ? `${j.title} ${j.skillsRequired.join(' ')}`.toLowerCase().includes(q) : true))
      .filter((j) =>
        filterSkills.length > 0
          ? filterSkills.some((skill) => j.skillsRequired.includes(skill))
          : true
      );

    switch (sortBy) {
      case 'highest_price':
        filtered.sort((a, b) => getCurrentPrice(b, now) - getCurrentPrice(a, now));
        break;
      case 'fastest_decay':
        filtered.sort((a, b) => b.decayRatePerHour - a.decayRatePerHour);
        break;
      case 'nearest_deadline':
        filtered.sort((a, b) => new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime());
        break;
      case 'best_match':
        filtered.sort((a, b) => {
          const matchA = a.skillsRequired.filter((s) => currentUser.skills.includes(s)).length;
          const matchB = b.skillsRequired.filter((s) => currentUser.skills.includes(s)).length;
          return matchB - matchA;
        });
        break;
      default:
        filtered.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    }
    return filtered;
  }, [jobs, search, sortBy, filterSkills, now, currentUser.skills]);

  const handleAccept = useCallback(async (jobId: string) => {
    const result = await acceptJob(jobId);
    if (!result.ok) Alert.alert('Unable to accept', result.message);
    else Alert.alert('🎉 Job Won!', 'You accepted this job successfully!');
  }, [acceptJob]);

  const toggleFilterSkill = (skill: string) => {
    setFilterSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={colors.gradientHero as any} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>⚡ Live Feed</Text>
            <Text style={styles.headerSub}>{openJobs.length} reverse-bid jobs active</Text>
          </View>
          <Pressable style={styles.filterBtn} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterBtnText}>
              🔧 Filter{filterSkills.length > 0 ? ` (${filterSkills.length})` : ''}
            </Text>
          </Pressable>
        </View>

        {/* Search */}
        <TextInput
          testID="feed-search-input"
          value={search}
          onChangeText={setSearch}
          placeholder="Search by title or skill..."
          placeholderTextColor={colors.placeholder}
          style={styles.searchInput}
        />

        {/* Sort pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.sortPill, sortBy === opt.key && styles.sortPillActive]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text style={[styles.sortText, sortBy === opt.key && styles.sortTextActive]}>
                {opt.icon} {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Error / loading */}
      {jobsError ? <Text style={styles.error}>{jobsError}</Text> : null}

      {/* Job list */}
      <FlatList
        data={openJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={() => void refreshJobs()}
        refreshing={isLoadingJobs}
        renderItem={({ item }) => {
          const client = users.find((u) => u.id === item.clientId);
          return (
            <JobCard
              job={item}
              now={now}
              clientName={client?.fullName}
              isClientVerified={client?.isVerified}
              isWatching={watchedJobIds.includes(item.id)}
              onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
              onAccept={currentUser.role === 'freelancer' ? () => void handleAccept(item.id) : undefined}
              onWatch={() => void toggleWatch(item.id)}
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="🔍"
            title="No matching jobs"
            subtitle="Try adjusting your filters or check back soon."
          />
        }
      />

      {/* Filter Modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Skills</Text>
              <Pressable onPress={() => setShowFilters(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.skillGrid}>
                {SKILL_TAXONOMY.map((skill) => {
                  const isActive = filterSkills.includes(skill);
                  return (
                    <Pressable
                      key={skill}
                      style={[styles.filterChip, isActive && styles.filterChipActive]}
                      onPress={() => toggleFilterSkill(skill)}
                    >
                      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                        {skill}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable style={styles.clearBtn} onPress={() => setFilterSkills([])}>
                <Text style={styles.clearText}>Clear All</Text>
              </Pressable>
              <Pressable style={styles.applyBtn} onPress={() => setShowFilters(false)}>
                <Text style={styles.applyText}>Apply ({filterSkills.length})</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    padding: 16,
    paddingTop: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { ...typography.h2, color: colors.text },
  headerSub: { ...typography.caption, color: colors.muted },
  filterBtn: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  filterBtnText: { ...typography.captionBold, color: colors.textSecondary },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: colors.text,
    ...typography.body,
  },
  sortRow: { gap: 8, paddingBottom: 2 },
  sortPill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
  },
  sortPillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
  },
  sortText: { ...typography.caption, color: colors.muted },
  sortTextActive: { color: colors.accent },
  error: { ...typography.caption, color: colors.danger, paddingHorizontal: 16, paddingTop: 8 },
  listContent: { padding: 16, paddingBottom: 30 },

  // Filter modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.h3, color: colors.text },
  modalClose: { ...typography.h2, color: colors.muted },
  modalScroll: { padding: 16 },
  skillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  filterChipActive: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  filterChipText: { ...typography.caption, color: colors.muted },
  filterChipTextActive: { color: colors.accent },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clearText: { ...typography.bodyBold, color: colors.muted },
  applyBtn: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyText: { ...typography.bodyBold, color: colors.text },
});
