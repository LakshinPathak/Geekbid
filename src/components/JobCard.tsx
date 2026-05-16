import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Job } from '../types/models';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { formatHoursToFloor, formatMoney, getCurrentPrice, getHoursToFloor } from '../utils/pricing';
import { AnimatedPrice } from './AnimatedPrice';
import { PriceBar } from './PriceBar';
import { StatusBadge } from './StatusBadge';

type Props = {
  job: Job;
  now: Date;
  onPress: () => void;
  onAccept?: () => void;
  onWatch?: () => void;
  isWatching?: boolean;
  clientName?: string;
  isClientVerified?: boolean;
};

export const JobCard = ({
  job,
  now,
  onPress,
  onAccept,
  onWatch,
  isWatching = false,
  clientName,
  isClientVerified = false,
}: Props) => {
  const current = getCurrentPrice(job, now);
  const eta = getHoursToFloor(job, now);
  const isAtFloor = eta <= 0;
  const timePosted = getTimeAgo(job.postedAt);

  return (
    <Pressable style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]} onPress={onPress}>
      {/* Header: Client info + status */}
      <View style={styles.headerRow}>
        <View style={styles.clientInfo}>
          {clientName && (
            <View style={styles.clientRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{clientName.charAt(0)}</Text>
              </View>
              <Text style={styles.clientName}>{clientName}</Text>
              {isClientVerified && <Text style={styles.verifiedBadge}>✓</Text>}
            </View>
          )}
          <Text style={styles.timeAgo}>{timePosted}</Text>
        </View>
        <StatusBadge
          label={isAtFloor ? 'AT FLOOR' : formatHoursToFloor(eta)}
          variant={isAtFloor ? 'danger' : eta < 4 ? 'warning' : 'info'}
          icon={isAtFloor ? '🔻' : '⏱'}
        />
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{job.title}</Text>

      {/* Skills */}
      <View style={styles.skillRow}>
        {job.skillsRequired.slice(0, 4).map((skill) => (
          <View key={skill} style={styles.skillChip}>
            <Text style={styles.skillText}>{skill}</Text>
          </View>
        ))}
        {job.skillsRequired.length > 4 && (
          <View style={styles.skillChip}>
            <Text style={styles.skillText}>+{job.skillsRequired.length - 4}</Text>
          </View>
        )}
      </View>

      {/* Price section */}
      <View style={styles.priceSection}>
        <AnimatedPrice value={current} style={typography.priceLG} />
        <PriceBar startPrice={job.startingPrice} floorPrice={job.minimumPrice} currentPrice={current} />
      </View>

      {/* Quick metadata */}
      <View style={styles.metaRow}>
        <Text style={styles.meta}>⏱ {job.estimatedHours}h est.</Text>
        <Text style={styles.meta}>📉 ${job.decayRatePerHour}/hr decay</Text>
        <Text style={styles.meta}>📊 {formatMoney(job.startingPrice)} start</Text>
      </View>

      {/* Quick actions */}
      {job.status === 'open' && (
        <View style={styles.actionRow}>
          {onAccept && (
            <Pressable style={styles.acceptBtn} onPress={onAccept}>
              <LinearGradient
                colors={colors.gradientAccent as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.acceptGradient}
              >
                <Text style={styles.acceptText}>✅ Accept {formatMoney(current)}</Text>
              </LinearGradient>
            </Pressable>
          )}
          {onWatch && (
            <Pressable
              style={[styles.watchBtn, isWatching && styles.watchBtnActive]}
              onPress={onWatch}
            >
              <Text style={[styles.watchText, isWatching && styles.watchTextActive]}>
                {isWatching ? '🔖 Watching' : '🔖 Watch'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
};

const getTimeAgo = (isoDate: string): string => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientInfo: { gap: 2 },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentBlueDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.label, color: colors.accentBlue, fontSize: 10 },
  clientName: { ...typography.caption, color: colors.textSecondary },
  verifiedBadge: { ...typography.caption, color: colors.accent },
  timeAgo: { ...typography.caption, color: colors.muted },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  skillRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  skillChip: {
    backgroundColor: colors.badge,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  skillText: {
    ...typography.caption,
    color: colors.badgeText,
    fontSize: 11,
  },
  priceSection: { gap: 8 },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  meta: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  acceptBtn: {
    flex: 2,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  acceptGradient: {
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  acceptText: {
    ...typography.captionBold,
    color: colors.text,
  },
  watchBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  watchBtnActive: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.accentBlueGlow,
  },
  watchText: {
    ...typography.captionBold,
    color: colors.muted,
  },
  watchTextActive: {
    color: colors.accentBlue,
  },
});
