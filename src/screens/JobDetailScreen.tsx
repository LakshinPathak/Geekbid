import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { formatHoursToFloor, formatMoney, getCurrentPrice, getHoursToFloor } from '../utils/pricing';
import { formatDateTime } from '../utils/time';
import { AnimatedPrice } from '../components/AnimatedPrice';
import { PriceBar } from '../components/PriceBar';
import { StatusBadge } from '../components/StatusBadge';
import { GeekScoreBadge } from '../components/GeekScoreBadge';
import { Button } from '../components/Button';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

export const JobDetailScreen = ({ route, navigation }: Props) => {
  const { jobs, bids, users, now, currentUser, acceptJob, counterBid, watchedJobIds, toggleWatch } = useApp();
  const [counterPrice, setCounterPrice] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const job = useMemo(() => jobs.find((j) => j.id === route.params.jobId), [jobs, route.params.jobId]);
  const jobBids = useMemo(
    () => bids.filter((b) => b.jobId === route.params.jobId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [bids, route.params.jobId]
  );

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyText}>Job not found.</Text>
      </View>
    );
  }

  const client = users.find((u) => u.id === job.clientId);
  const current = getCurrentPrice(job, now);
  const eta = getHoursToFloor(job, now);
  const isWatching = watchedJobIds.includes(job.id);
  const isAtFloor = eta <= 0;
  const isFreelancer = currentUser.role === 'freelancer';
  const isOpen = job.status === 'open';
  const pricePercent = job.startingPrice > 0 ? Math.round((current / job.startingPrice) * 100) : 0;

  const onAccept = async () => {
    setIsSubmitting(true);
    const result = await acceptJob(job.id);
    setIsSubmitting(false);
    if (!result.ok) return Alert.alert('Unable to accept', result.message);
    Alert.alert('🎉 Job Won!', `You accepted at ${formatMoney(current)}!`);
  };

  const onCounter = async () => {
    const price = Number(counterPrice);
    if (Number.isNaN(price) || price <= 0) {
      return Alert.alert('Invalid', 'Please enter a valid price.');
    }
    setIsSubmitting(true);
    const result = await counterBid(job.id, price, message);
    setIsSubmitting(false);
    if (!result.ok) return Alert.alert('Counter-bid failed', result.message);
    setCounterPrice('');
    setMessage('');
    Alert.alert('✅ Sent', `Counter-bid at ${formatMoney(price)} submitted.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={styles.statusRow}>
        <StatusBadge
          label={job.status.toUpperCase()}
          variant={job.status === 'open' ? 'success' : job.status === 'accepted' ? 'info' : 'danger'}
        />
        {isAtFloor && isOpen && <StatusBadge label="AT FLOOR" variant="danger" icon="🔻" />}
        {job.visibility === 'invite_only' && <StatusBadge label="INVITE ONLY" variant="warning" icon="🔒" />}
      </View>

      {/* Title & client */}
      <Text style={styles.title}>{job.title}</Text>
      {client && (
        <View style={styles.clientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{client.avatarInitial}</Text>
          </View>
          <View>
            <Text style={styles.clientName}>{client.fullName}</Text>
            <Text style={styles.clientMeta}>
              {client.company ?? 'Independent'} {client.isVerified ? '• ✓ Verified' : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Price Section */}
      <LinearGradient colors={colors.gradientCard as any} style={styles.priceCard}>
        <Text style={styles.priceLabel}>CURRENT PRICE</Text>
        <AnimatedPrice value={current} />
        <PriceBar startPrice={job.startingPrice} floorPrice={job.minimumPrice} currentPrice={current} />
        <View style={styles.priceMetaRow}>
          <View style={styles.priceMeta}>
            <Text style={styles.priceMetaLabel}>Start</Text>
            <Text style={styles.priceMetaValue}>{formatMoney(job.startingPrice)}</Text>
          </View>
          <View style={styles.priceMeta}>
            <Text style={styles.priceMetaLabel}>Floor</Text>
            <Text style={styles.priceMetaValue}>{formatMoney(job.minimumPrice)}</Text>
          </View>
          <View style={styles.priceMeta}>
            <Text style={styles.priceMetaLabel}>Decay</Text>
            <Text style={styles.priceMetaValue}>${job.decayRatePerHour}/hr</Text>
          </View>
          <View style={styles.priceMeta}>
            <Text style={styles.priceMetaLabel}>At</Text>
            <Text style={styles.priceMetaValue}>{pricePercent}%</Text>
          </View>
        </View>
        {!isAtFloor && isOpen && (
          <Text style={styles.etaText}>⏱ Drops to floor in {formatHoursToFloor(eta)}</Text>
        )}
      </LinearGradient>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Description</Text>
        <Text style={styles.body}>{job.description}</Text>
      </View>

      {/* Skills */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🛠 Required Skills</Text>
        <View style={styles.skillRow}>
          {job.skillsRequired.map((s) => {
            const isMatch = currentUser.skills.includes(s);
            return (
              <View key={s} style={[styles.skillChip, isMatch && styles.skillChipMatch]}>
                <Text style={[styles.skillText, isMatch && styles.skillTextMatch]}>
                  {isMatch ? '✓ ' : ''}{s}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Job details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Details</Text>
        <View style={styles.detailGrid}>
          <DetailItem label="Est. Hours" value={`${job.estimatedHours}h`} />
          <DetailItem label="Deadline" value={formatDateTime(job.deadlineAt)} />
          <DetailItem label="Posted" value={formatDateTime(job.postedAt)} />
          <DetailItem label="Visibility" value={job.visibility === 'invite_only' ? 'Invite Only' : 'Public'} />
        </View>
      </View>

      {/* Watch button */}
      <Button
        title={isWatching ? '🔖 Watching' : '🔖 Watch this Job'}
        onPress={() => void toggleWatch(job.id)}
        variant={isWatching ? 'secondary' : 'outline'}
      />

      {/* Accept + Counter (freelancer only, open only) */}
      {isFreelancer && isOpen && (
        <>
          <Button
            title={`✅ Accept Now at ${formatMoney(current)}`}
            onPress={() => void onAccept()}
            loading={isSubmitting}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 Counter-Bid</Text>
            <TextInput
              value={counterPrice}
              onChangeText={setCounterPrice}
              placeholder={`Between ${formatMoney(job.minimumPrice)} and ${formatMoney(current)}`}
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Why should the client pick you?"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, styles.multiline]}
              multiline
            />
            <Button
              title="Submit Counter-Bid"
              onPress={() => void onCounter()}
              variant="secondary"
              loading={isSubmitting}
            />
          </View>
        </>
      )}

      {/* Status message for non-open jobs */}
      {job.status === 'accepted' && (
        <View style={styles.closedCard}>
          <Text style={styles.closedIcon}>🏆</Text>
          <Text style={styles.closedTitle}>Job Closed</Text>
          <Text style={styles.closedMeta}>Final price: {formatMoney(job.finalPrice ?? current)}</Text>
          {job.acceptedAt && <Text style={styles.closedMeta}>Accepted: {formatDateTime(job.acceptedAt)}</Text>}
        </View>
      )}

      {/* Bid history */}
      {jobBids.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Bid History ({jobBids.length})</Text>
          {jobBids.map((bid) => {
            const bidder = users.find((u) => u.id === bid.freelancerId);
            return (
              <View key={bid.id} style={styles.bidCard}>
                <View style={styles.bidHeader}>
                  <View style={styles.bidderRow}>
                    <View style={styles.bidderAvatar}>
                      <Text style={styles.bidderAvatarText}>{bidder?.avatarInitial ?? '?'}</Text>
                    </View>
                    <View>
                      <Text style={styles.bidderName}>{bidder?.fullName ?? 'Freelancer'}</Text>
                      {bidder && <GeekScoreBadge score={bidder.geekScore} size="sm" />}
                    </View>
                  </View>
                  <StatusBadge
                    label={bid.bidType.toUpperCase()}
                    variant={bid.bidType === 'accept' ? 'success' : 'info'}
                  />
                </View>
                <Text style={styles.bidPrice}>{formatMoney(bid.bidPrice)}</Text>
                {bid.message && <Text style={styles.bidMessage}>{bid.message}</Text>}
                <Text style={styles.bidTime}>{formatDateTime(bid.createdAt)}</Text>
              </View>
            );
          })}
        </View>
      )}
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
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { ...typography.body, color: colors.muted },

  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  title: { ...typography.h1, color: colors.text },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentBlueDim, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.captionBold, color: colors.accentBlue },
  clientName: { ...typography.bodyBold, color: colors.text },
  clientMeta: { ...typography.caption, color: colors.muted },

  priceCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
    alignItems: 'center',
  },
  priceLabel: { ...typography.label, color: colors.muted },
  priceMetaRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  priceMeta: { alignItems: 'center', gap: 2 },
  priceMetaLabel: { ...typography.label, color: colors.muted },
  priceMetaValue: { ...typography.captionBold, color: colors.textSecondary },
  etaText: { ...typography.caption, color: colors.warning },

  section: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  sectionTitle: { ...typography.bodyBold, color: colors.text },
  body: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { backgroundColor: colors.badge, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  skillChipMatch: { backgroundColor: colors.accentGlow, borderWidth: 1, borderColor: colors.accentDim },
  skillText: { ...typography.caption, color: colors.badgeText },
  skillTextMatch: { color: colors.accent },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailItem: { width: '47%', backgroundColor: colors.bgSecondary, borderRadius: radius.md, padding: 10, gap: 2 },
  detailLabel: { ...typography.label, color: colors.muted },
  detailValue: { ...typography.captionBold, color: colors.text },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    ...typography.body,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },

  closedCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  closedIcon: { fontSize: 32 },
  closedTitle: { ...typography.h3, color: colors.accent },
  closedMeta: { ...typography.caption, color: colors.muted },

  bidCard: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bidHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bidderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bidderAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.badge, alignItems: 'center', justifyContent: 'center' },
  bidderAvatarText: { ...typography.label, color: colors.text, fontSize: 10 },
  bidderName: { ...typography.captionBold, color: colors.text },
  bidPrice: { ...typography.priceMD, color: colors.accent },
  bidMessage: { ...typography.caption, color: colors.textSecondary, fontStyle: 'italic' },
  bidTime: { ...typography.caption, color: colors.muted, fontSize: 11 },
});
