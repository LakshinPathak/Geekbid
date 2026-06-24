import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { formatMoney } from '../utils/pricing';
import { Button } from '../components/Button';

export const AdminDashboardScreen = () => {
  const { jobs, users, disputes, transactions } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const stats = {
    totalUsers: users.length,
    freelancers: users.filter((u) => u.role === 'freelancer').length,
    clients: users.filter((u) => u.role === 'client').length,
    openJobs: jobs.filter((j) => j.status === 'open').length,
    acceptedJobs: jobs.filter((j) => j.status === 'accepted').length,
    totalJobs: jobs.length,
    activeDisputes: disputes.filter((d) => d.status !== 'resolved').length,
    disputedTx: transactions.filter((t) => t.escrowStatus === 'disputed').length,
    totalGMV: transactions.reduce((s, t) => s + t.grossAmount, 0),
    totalFees: transactions.reduce((s, t) => s + t.platformFee, 0),
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={colors.gradientHero as any} style={styles.hero}>
        <Text style={styles.heroIcon}>🛡️</Text>
        <Text style={styles.heroTitle}>Admin Dashboard</Text>
        <Text style={styles.heroSub}>Platform health and moderation tools</Text>
      </LinearGradient>

      <Text style={styles.sectionTitle}>👥 Users</Text>
      <View style={styles.statsRow}>
        <StatCard label="Total" value={String(stats.totalUsers)} color={colors.text} />
        <StatCard label="Freelancers" value={String(stats.freelancers)} color={colors.accent} />
        <StatCard label="Clients" value={String(stats.clients)} color={colors.accentBlue} />
      </View>

      <Text style={styles.sectionTitle}>📋 Jobs</Text>
      <View style={styles.statsRow}>
        <StatCard label="Total" value={String(stats.totalJobs)} color={colors.text} />
        <StatCard label="Open" value={String(stats.openJobs)} color={colors.accent} />
        <StatCard label="Accepted" value={String(stats.acceptedJobs)} color={colors.accentBlue} />
      </View>

      <Text style={styles.sectionTitle}>💰 Revenue</Text>
      <View style={styles.statsRow}>
        <StatCard label="GMV" value={formatMoney(stats.totalGMV)} color={colors.text} />
        <StatCard label="Fees" value={formatMoney(stats.totalFees)} color={colors.accent} />
      </View>

      <Text style={styles.sectionTitle}>⚖️ Trust & Safety</Text>
      <View style={styles.statsRow}>
        <StatCard label="Disputes" value={String(stats.activeDisputes)} color={stats.activeDisputes > 0 ? colors.danger : colors.accent} />
        <StatCard label="Disputed $" value={String(stats.disputedTx)} color={colors.warning} />
      </View>

      <Button
        title="⚖️ Open Dispute Queue"
        onPress={() => navigation.navigate('Disputes')}
        variant={stats.activeDisputes > 0 ? 'danger' : 'secondary'}
      />
    </ScrollView>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View style={styles.statCard}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  heroIcon: { fontSize: 32 },
  heroTitle: { ...typography.h2, color: colors.text },
  heroSub: { ...typography.caption, color: colors.muted },
  sectionTitle: { ...typography.bodyBold, color: colors.text },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: { ...typography.label, color: colors.muted },
  statValue: { ...typography.h3, fontWeight: '900' },
});
