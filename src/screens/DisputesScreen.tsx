import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { formatDateTime } from '../utils/time';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';

export const DisputesScreen = () => {
  const { disputes, transactions, users, jobs } = useApp();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>⚖️ Dispute Queue</Text>
      <Text style={styles.subtitle}>
        {disputes.filter((d) => d.status !== 'resolved').length} active • {disputes.length} total
      </Text>

      {disputes.length === 0 && (
        <EmptyState icon="✅" title="No disputes" subtitle="All clear! No disputes to review." />
      )}

      {disputes.map((d) => {
        const tx = transactions.find((t) => t.id === d.transactionId);
        const raiser = users.find((u) => u.id === d.raisedBy);
        const jobTitle = tx ? jobs.find((j) => j.id === tx.jobId)?.title : '—';
        const statusVariant = d.status === 'open' ? 'danger' : d.status === 'in_review' ? 'warning' : 'success';

        return (
          <View key={d.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <StatusBadge label={d.status.replace('_', ' ').toUpperCase()} variant={statusVariant} />
              <Text style={styles.cardTime}>{formatDateTime(d.createdAt)}</Text>
            </View>
            <Text style={styles.jobTitle}>{jobTitle ?? 'Unknown Job'}</Text>
            <View style={styles.detailRow}>
              <DetailItem label="Raised By" value={raiser?.fullName ?? d.raisedBy} />
              <DetailItem label="Transaction" value={d.transactionId} />
            </View>
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason</Text>
              <Text style={styles.reasonText}>{d.reason}</Text>
            </View>
            {d.status !== 'resolved' && (
              <View style={styles.actionRow}>
                <Button title="🔍 Review Chat" onPress={() => {}} variant="outline" style={{ flex: 1 }} />
                <Button title="✅ Resolve" onPress={() => {}} variant="primary" style={{ flex: 1 }} />
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailItem}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTime: { ...typography.caption, color: colors.muted, fontSize: 11 },
  jobTitle: { ...typography.bodyBold, color: colors.text },
  detailRow: { flexDirection: 'row', gap: 8 },
  detailItem: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: radius.sm, padding: 8, gap: 2 },
  detailLabel: { ...typography.label, color: colors.muted },
  detailValue: { ...typography.captionBold, color: colors.text },
  reasonBox: { backgroundColor: colors.bgSecondary, borderRadius: radius.md, padding: 12, gap: 4, borderLeftWidth: 3, borderLeftColor: colors.danger },
  reasonLabel: { ...typography.label, color: colors.danger },
  reasonText: { ...typography.body, color: colors.textSecondary, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 8 },
});
