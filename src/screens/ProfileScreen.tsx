import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { GeekScoreBadge } from '../components/GeekScoreBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';

export const ProfileScreen = () => {
  const { currentUser, switchRole, jobs, bids } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const roles: Array<'freelancer' | 'admin' | 'client'> = ['freelancer', 'admin', 'client'];
  const nextRole = roles[(roles.indexOf(currentUser.role as typeof roles[number]) + 1) % roles.length];

  const wonJobs = jobs.filter((j) => j.acceptedBy === currentUser.id);
  const myBids = bids.filter((b) => b.freelancerId === currentUser.id);
  const myPostedJobs = jobs.filter((j) => j.clientId === currentUser.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <LinearGradient colors={colors.gradientHero as any} style={styles.hero}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{currentUser.avatarInitial}</Text>
        </View>
        <Text style={styles.name}>{currentUser.fullName}</Text>
        <Text style={styles.email}>{currentUser.email}</Text>
        <View style={styles.badgeRow}>
          <StatusBadge
            label={currentUser.role.toUpperCase()}
            variant={currentUser.role === 'freelancer' ? 'success' : currentUser.role === 'client' ? 'info' : 'warning'}
          />
          {currentUser.isVerified && <StatusBadge label="VERIFIED" variant="success" icon="✓" />}
          {currentUser.availability && (
            <StatusBadge
              label={currentUser.availability.toUpperCase()}
              variant={currentUser.availability === 'available' ? 'success' : currentUser.availability === 'part-time' ? 'warning' : 'danger'}
            />
          )}
        </View>
      </LinearGradient>

      {/* Geek Score */}
      {currentUser.role === 'freelancer' && (
        <View style={styles.section}>
          <View style={styles.scoreCenter}>
            <GeekScoreBadge score={currentUser.geekScore} size="lg" />
          </View>
        </View>
      )}

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Bio</Text>
        <Text style={styles.bio}>{currentUser.bio}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {currentUser.role === 'freelancer' ? (
          <>
            <StatCard label="Jobs Won" value={String(wonJobs.length)} icon="🏆" />
            <StatCard label="Bids Made" value={String(myBids.length)} icon="💬" />
            <StatCard label="Rate" value={`$${currentUser.hourlyRateMin ?? 0}-${currentUser.hourlyRateMax ?? 0}/hr`} icon="💰" />
          </>
        ) : currentUser.role === 'client' ? (
          <>
            <StatCard label="Jobs Posted" value={String(myPostedJobs.length)} icon="📋" />
            <StatCard label="Active" value={String(myPostedJobs.filter((j) => j.status === 'open').length)} icon="⚡" />
            <StatCard label="Avg Pay" value={currentUser.avgPaymentSpeed ?? '—'} icon="⏱" />
          </>
        ) : null}
      </View>

      {/* Skills */}
      {currentUser.skills.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛠 Skills</Text>
          <View style={styles.skillRow}>
            {currentUser.skills.map((s) => (
              <View key={s} style={styles.skillChip}>
                <Text style={styles.skillText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* GitHub */}
      {currentUser.githubUsername && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚫ GitHub</Text>
          <Text style={styles.githubUser}>@{currentUser.githubUsername}</Text>
          <Text style={styles.githubMeta}>Connected • Pulls repos, languages, and contribution data</Text>
        </View>
      )}

      {/* Company (Client) */}
      {currentUser.company && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 Company</Text>
          <Text style={styles.companyName}>{currentUser.company}</Text>
        </View>
      )}

      {/* Quick links */}
      <View style={styles.linksSection}>
        <LinkCard title="My Jobs" desc="Track active and completed jobs" onPress={() => navigation.navigate('MyJobs')} />
        <LinkCard title="My Bids" desc="View bid history and watchlist" onPress={() => navigation.navigate('MyBids')} />
        <LinkCard title="Earnings" desc="Balance and payout history" onPress={() => navigation.navigate('Earnings')} />
      </View>

      {/* Role Switcher */}
      <Button
        title={`Switch to ${nextRole.charAt(0).toUpperCase() + nextRole.slice(1)}`}
        onPress={() => switchRole(nextRole)}
        variant="outline"
        testID="profile-switch-role-btn"
      />
    </ScrollView>
  );
};

const StatCard = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const LinkCard = ({ title, desc, onPress }: { title: string; desc: string; onPress: () => void }) => (
  <Pressable style={styles.linkCard} onPress={onPress}>
    <Text style={styles.linkTitle}>{title}</Text>
    <Text style={styles.linkDesc}>{desc}</Text>
    <Text style={styles.linkArrow}>→</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  hero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  avatarText: { ...typography.h2, color: colors.text, fontWeight: '700' },
  name: { ...typography.h2, color: colors.text },
  email: { ...typography.caption, color: colors.muted },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  section: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  sectionTitle: { ...typography.bodyBold, color: colors.text },
  scoreCenter: { alignItems: 'center', paddingVertical: 8 },
  bio: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 20 },
  statValue: { ...typography.bodyBold, color: colors.text },
  statLabel: { ...typography.label, color: colors.muted },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: {
    backgroundColor: colors.badge,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillText: {
    ...typography.caption,
    color: colors.badgeText,
    fontWeight: '500',
  },
  githubUser: { ...typography.bodyBold, color: colors.text },
  githubMeta: { ...typography.caption, color: colors.muted },
  companyName: { ...typography.bodyBold, color: colors.text },
  linksSection: { gap: 8 },
  linkCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    gap: 2,
    position: 'relative',
  },
  linkTitle: { ...typography.bodyBold, color: colors.text },
  linkDesc: { ...typography.caption, color: colors.muted },
  linkArrow: { position: 'absolute', right: 14, top: 16, ...typography.h3, color: colors.muted },
});
