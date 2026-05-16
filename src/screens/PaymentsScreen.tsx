import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { formatMoney } from '../utils/pricing';
import { formatDateTime } from '../utils/time';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';

export const PaymentsScreen = () => {
  const { transactions, jobs, releaseEscrow, raiseDispute } = useApp();
  const [reason, setReason] = useState('');

  const onRelease = (id: string) => {
    const result = releaseEscrow(id);
    if (!result.ok) return Alert.alert('Cannot release', result.message);
    Alert.alert('✅ Released', 'Escrow released successfully. Funds sent to freelancer.');
  };

  const onDispute = (id: string) => {
    const result = raiseDispute(id, reason || 'Quality mismatch — review requested.');
    if (!result.ok) return Alert.alert('Cannot dispute', result.message);
    setReason('');
    Alert.alert('⚖️ Dispute Raised', 'Admin team has been notified and will mediate.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🔒 Payments & Escrow</Text>
      <Text style={styles.subtitle}>{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</Text>

      <View style={styles.reasonField}>
        <Text style={styles.label}>Dispute Reason (preset for quick disputes)</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          style={styles.input}
          placeholder="e.g. Deliverable quality mismatch"
          placeholderTextColor={colors.placeholder}
        />
      </View>

      {transactions.map((t) => {
        const jobTitle = jobs.find((j) => j.id === t.jobId)?.title ?? t.jobId;
        const statusVariant = t.escrowStatus === 'released' ? 'success'
          : t.escrowStatus === 'held' ? 'warning'
          : t.escrowStatus === 'disputed' ? 'danger'
          : t.escrowStatus === 'refunded' ? 'info' : 'neutral';

        return (
          <View key={t.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.jobTitle} numberOfLines={1}>{jobTitle}</Text>
              <StatusBadge label={t.escrowStatus.toUpperCase()} variant={statusVariant} />
            </View>
            <View style={styles.detailRow}>
              <DetailItem label="Gross" value={formatMoney(t.grossAmount)} />
              <DetailItem label="Fee" value={formatMoney(t.platformFee)} />
              <DetailItem label="Net" value={formatMoney(t.netAmount)} />
            </View>
            <Text style={styles.time}>
              {t.releasedAt ? `Released: ${formatDateTime(t.releasedAt)}` : `Created: ${formatDateTime(t.createdAt)}`}
            </Text>
            {t.escrowStatus === 'held' && (
              <View style={styles.actionRow}>
                <Button title="✅ Release" onPress={() => onRelease(t.id)} style={{ flex: 1 }} />
                <Button title="⚖️ Dispute" onPress={() => onDispute(t.id)} variant="danger" style={{ flex: 1 }} />
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
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.muted },
  reasonField: { gap: 4 },
  label: { ...typography.label, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typography.body,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  jobTitle: { ...typography.bodyBold, color: colors.text, flex: 1, marginRight: 8 },
  detailRow: { flexDirection: 'row', gap: 6 },
  detailItem: { flex: 1, backgroundColor: colors.bgSecondary, borderRadius: radius.sm, padding: 8, alignItems: 'center', gap: 2 },
  detailLabel: { ...typography.label, color: colors.muted },
  detailValue: { ...typography.captionBold, color: colors.text },
  time: { ...typography.caption, color: colors.muted, fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8 },
});
