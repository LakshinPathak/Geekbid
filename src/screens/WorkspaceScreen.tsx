import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { formatMoney } from '../utils/pricing';

export const WorkspaceScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentUser, unreadNotificationsCount, disputes, jobs, bids, transactions } = useApp();

  const isFreelancer = currentUser.role === 'freelancer';
  const isClient = currentUser.role === 'client';
  const isAdmin = currentUser.role === 'admin';

  const openJobs = jobs.filter((j) => j.status === 'open').length;
  const wonJobs = jobs.filter((j) => j.acceptedBy === currentUser.id).length;
  const myPosted = jobs.filter((j) => j.clientId === currentUser.id).length;
  const pendingEscrow = transactions.filter((t) => t.escrowStatus === 'held').reduce((s, t) => s + t.netAmount, 0);
  const activeDisputes = disputes.filter((d) => d.status !== 'resolved').length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={colors.gradientHero as any} style={styles.hero}>
        <Text style={styles.greeting}>
          {isFreelancer ? '🧑‍💻' : isClient ? '🏢' : '🛡️'} Hey, {currentUser.fullName.split(' ')[0]}
        </Text>
        <Text style={styles.heroTitle}>Your Workspace</Text>
        <Text style={styles.heroSub}>Quick access to everything for your {currentUser.role} workflow.</Text>
      </LinearGradient>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        {isFreelancer && (
          <>
            <QuickStat icon="🏆" value={String(wonJobs)} label="Won" />
            <QuickStat icon="📊" value={String(bids.filter((b) => b.freelancerId === currentUser.id).length)} label="Bids" />
            <QuickStat icon="💰" value={formatMoney(pendingEscrow)} label="Pending" />
          </>
        )}
        {isClient && (
          <>
            <QuickStat icon="📋" value={String(myPosted)} label="Posted" />
            <QuickStat icon="⚡" value={String(openJobs)} label="Open" />
            <QuickStat icon="💰" value={formatMoney(pendingEscrow)} label="In Escrow" />
          </>
        )}
        {isAdmin && (
          <>
            <QuickStat icon="🔴" value={String(activeDisputes)} label="Disputes" />
            <QuickStat icon="👥" value="6" label="Users" />
            <QuickStat icon="📋" value={String(jobs.length)} label="Jobs" />
          </>
        )}
      </View>

      {/* Navigation cards */}
      <WsCard
        icon="📋"
        title="My Jobs"
        desc={isClient ? 'Track posted, active, and closed jobs' : 'Jobs you\'ve won and ongoing work'}
        onPress={() => navigation.navigate('MyJobs')}
      />
      {isFreelancer && (
        <WsCard
          icon="💬"
          title="My Bids"
          desc="Counter-bids, watchlist, and bid history"
          onPress={() => navigation.navigate('MyBids')}
        />
      )}
      <WsCard
        icon="🔔"
        title={`Notifications${unreadNotificationsCount > 0 ? ` (${unreadNotificationsCount} new)` : ''}`}
        desc="Price drops, accepts, payments, and alerts"
        onPress={() => navigation.navigate('Notifications')}
        highlight={unreadNotificationsCount > 0}
      />
      <WsCard
        icon="💰"
        title="Earnings"
        desc="Available balance, pending payouts, and history"
        onPress={() => navigation.navigate('Earnings')}
      />
      <WsCard
        icon="🔒"
        title="Payments & Escrow"
        desc="Release funds, view escrow status, or raise disputes"
        onPress={() => navigation.navigate('Payments')}
      />
      {isAdmin && (
        <>
          <WsCard
            icon="🛡️"
            title="Admin Dashboard"
            desc={`Platform health, fraud flags (${activeDisputes} active disputes)`}
            onPress={() => navigation.navigate('AdminDashboard')}
            highlight
          />
          <WsCard
            icon="⚖️"
            title="Dispute Queue"
            desc="Review and resolve active disputes"
            onPress={() => navigation.navigate('Disputes')}
          />
        </>
      )}
    </ScrollView>
  );
};

const QuickStat = ({ icon, value, label }: { icon: string; value: string; label: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const WsCard = ({ icon, title, desc, onPress, highlight }: {
  icon: string; title: string; desc: string; onPress: () => void; highlight?: boolean;
}) => (
  <Pressable style={[styles.card, highlight && styles.cardHighlight]} onPress={onPress}>
    <Text style={styles.cardIcon}>{icon}</Text>
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </View>
    <Text style={styles.cardArrow}>›</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 4,
  },
  greeting: { ...typography.caption, color: colors.muted },
  heroTitle: { ...typography.h1, color: colors.text },
  heroSub: { ...typography.caption, color: colors.muted },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: { fontSize: 18 },
  statValue: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
  statLabel: { ...typography.label, color: colors.muted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
  },
  cardHighlight: { borderColor: colors.accent },
  cardIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  cardContent: { flex: 1, gap: 2 },
  cardTitle: { ...typography.bodyBold, color: colors.text },
  cardDesc: { ...typography.caption, color: colors.muted },
  cardArrow: { ...typography.h2, color: colors.muted },
});
