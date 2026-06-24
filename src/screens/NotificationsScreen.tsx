import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { formatDateTime } from '../utils/time';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';

const NOTIFICATION_ICONS: Record<string, string> = {
  job_posted: '⚡',
  price_drop: '📉',
  job_accepted: '🎉',
  counter_bid_received: '💬',
  payment_released: '💰',
  new_message: '✉️',
  dispute_raised: '⚖️',
};

export const NotificationsScreen = () => {
  const { notifications, currentUser, markNotificationRead, markAllNotificationsRead } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const mine = useMemo(
    () => notifications
      .filter((n) => n.userId === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notifications, currentUser.id]
  );

  const unread = mine.filter((n) => !n.isRead).length;

  const handlePress = (n: typeof mine[0]) => {
    markNotificationRead(n.id);
    if (n.jobId) navigation.navigate('JobDetail', { jobId: n.jobId });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>🔔 Notifications</Text>
          <Text style={styles.subtitle}>{unread} unread</Text>
        </View>
        {unread > 0 && (
          <Button title="Mark All Read" onPress={markAllNotificationsRead} variant="outline" />
        )}
      </View>

      {mine.length === 0 && (
        <EmptyState icon="🔔" title="No notifications" subtitle="You'll see price drops, job accepts, and payment alerts here." />
      )}

      {mine.map((n) => (
        <Pressable
          key={n.id}
          style={[styles.card, !n.isRead && styles.cardUnread]}
          onPress={() => handlePress(n)}
        >
          <Text style={styles.icon}>{NOTIFICATION_ICONS[n.type] ?? '📩'}</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{n.title}</Text>
            <Text style={styles.cardBody}>{n.body}</Text>
            <Text style={styles.cardTime}>{formatDateTime(n.createdAt)}</Text>
          </View>
          {!n.isRead && <View style={styles.unreadDot} />}
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.muted },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
  },
  cardUnread: { borderColor: colors.accent, backgroundColor: colors.accentGlow },
  icon: { fontSize: 22, marginTop: 2 },
  cardContent: { flex: 1, gap: 3 },
  cardTitle: { ...typography.bodyBold, color: colors.text },
  cardBody: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  cardTime: { ...typography.caption, color: colors.muted, fontSize: 11 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 },
});
