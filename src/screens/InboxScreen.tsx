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
import { EmptyState } from '../components/EmptyState';

export const InboxScreen = () => {
  const { chatRooms, chatMessages, jobs, users, currentUser } = useApp();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const myRooms = useMemo(
    () => chatRooms
      .filter((r) => r.participantIds.includes(currentUser.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [chatRooms, currentUser.id]
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>💬 Inbox</Text>
      <Text style={styles.subtitle}>{myRooms.length} conversation{myRooms.length !== 1 ? 's' : ''}</Text>

      {myRooms.map((room) => {
        const lastMsg = [...chatMessages].filter((m) => m.roomId === room.id).pop();
        const jobTitle = jobs.find((j) => j.id === room.jobId)?.title ?? room.jobId;
        const otherUserId = room.participantIds.find((id) => id !== currentUser.id);
        const otherUser = users.find((u) => u.id === otherUserId);
        const isMine = lastMsg?.senderId === currentUser.id;

        return (
          <Pressable
            key={room.id}
            style={styles.card}
            onPress={() => navigation.navigate('ChatRoom', { roomId: room.id, title: jobTitle })}
          >
            <View style={styles.avatarSmall}>
              <Text style={styles.avatarText}>{otherUser?.avatarInitial ?? '?'}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.jobTitle} numberOfLines={1}>{jobTitle}</Text>
              <Text style={styles.otherName}>{otherUser?.fullName ?? 'User'}</Text>
              <Text style={styles.preview} numberOfLines={1}>
                {isMine ? 'You: ' : ''}{lastMsg?.text ?? 'No messages yet'}
              </Text>
            </View>
            <Text style={styles.time}>{formatDateTime(room.updatedAt)}</Text>
          </Pressable>
        );
      })}

      {myRooms.length === 0 && (
        <EmptyState
          icon="💬"
          title="No conversations yet"
          subtitle="Chat activates after a job is accepted. Accept a job to start messaging!"
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.muted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentBlueDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.captionBold, color: colors.accentBlue },
  cardContent: { flex: 1, gap: 2 },
  jobTitle: { ...typography.bodyBold, color: colors.text },
  otherName: { ...typography.caption, color: colors.muted },
  preview: { ...typography.caption, color: colors.textSecondary },
  time: { ...typography.caption, color: colors.muted, fontSize: 10 },
});
