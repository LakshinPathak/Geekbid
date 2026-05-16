import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { formatMoney } from '../utils/pricing';
import { formatDateTime } from '../utils/time';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';

export const EarningsScreen = () => {
  const { transactions, currentUser, jobs } = useApp();

  const mine = useMemo(
    () => transactions.filter((t) => t.freelancerId === currentUser.id),
    [transactions, currentUser.id]
  );

  const available = mine.filter((t) => t.escrowStatus === 'released').reduce((s, t) => s + t.netAmount, 0);
  const pending = mine.filter((t) => t.escrowStatus === 'held' || t.escrowStatus === 'pending').reduce((s, t) => s + t.netAmount, 0);
  const totalEarned = mine.filter((t) => t.escrowStatus === 'released').reduce((s, t) => s + t.grossAmount, 0);
  const totalFees = mine.filter((t) => t.escrowStatus === 'released').reduce((s, t) => s + t.platformFee, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Balance cards */}
      <LinearGradient colors={colors.gradientAccent as any} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
        <Text style={styles.balanceValue}>{formatMoney(available)}</Text>
        <Button title="💸 Withdraw" onPress={() => {}} variant="outline" style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
      </LinearGradient>

      <View style={styles.miniRow}>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Pending</Text>
          <Text style={[styles.miniValue, { color: colors.warning }]}>{formatMoney(pending)}</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Total Earned</Text>
          <Text style={[styles.miniValue, { color: colors.accent }]}>{formatMoney(totalEarned)}</Text>
        </View>
        <View style={styles.miniCard}>
          <Text style={styles.miniLabel}>Fees Paid</Text>
          <Text style={[styles.miniValue, { color: colors.danger }]}>{formatMoney(totalFees)}</Text>
        </View>
      </View>

      {/* Transaction history */}
      <Text style={styles.sectionTitle}>📜 Transaction History</Text>
      {mine.length === 0 && (
        <EmptyState icon="💰" title="No earnings yet" subtitle="Accept and complete jobs to start earning!" />
      )}
      {mine.map((t) => {
        const jobTitle = jobs.find((j) => j.id === t.jobId)?.title ?? t.jobId;
        const statusVariant = t.escrowStatus === 'released' ? 'success'
          : t.escrowStatus === 'held' ? 'warning'
          : t.escrowStatus === 'disputed' ? 'danger' : 'neutral';
        return (
          <View key={t.id} style={styles.txCard}>
            <View style={styles.txHeader}>
              <Text style={styles.txJob} numberOfLines={1}>{jobTitle}</Text>
              <StatusBadge label={t.escrowStatus.toUpperCase()} variant={statusVariant} />
            </View>
            <View style={styles.txRow}>
              <TxItem label="Gross" value={formatMoney(t.grossAmount)} />
              <TxItem label="Fee (10%)" value={`-${formatMoney(t.platformFee)}`} />
              <TxItem label="Net" value={formatMoney(t.netAmount)} highlight />
            </View>
            <Text style={styles.txTime}>
              {t.releasedAt ? `Released: ${formatDateTime(t.releasedAt)}` : `Created: ${formatDateTime(t.createdAt)}`}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

const TxItem = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={styles.txItem}>
    <Text style={styles.txItemLabel}>{label}</Text>
    <Text style={[styles.txItemValue, highlight && { color: colors.accent }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    alignItems: 'center',
  },
  balanceLabel: { ...typography.label, color: 'rgba(255,255,255,0.7)' },
  balanceValue: { ...typography.priceXL, color: colors.text },
  miniRow: { flexDirection: 'row', gap: 8 },
  miniCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  miniLabel: { ...typography.label, color: colors.muted },
  miniValue: { ...typography.bodyBold, fontSize: 16 },
  sectionTitle: { ...typography.h3, color: colors.text },
  txCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    gap: 8,
  },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txJob: { ...typography.bodyBold, color: colors.text, flex: 1, marginRight: 8 },
  txRow: { flexDirection: 'row', gap: 6 },
  txItem: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: radius.sm, padding: 8, alignItems: 'center', gap: 2 },
  txItemLabel: { ...typography.label, color: colors.muted },
  txItemValue: { ...typography.captionBold, color: colors.text },
  txTime: { ...typography.caption, color: colors.muted, fontSize: 11 },
});
