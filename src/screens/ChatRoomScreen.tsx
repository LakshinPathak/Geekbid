import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';
import { RootStackParamList } from '../types/navigation';
import { formatDateTime } from '../utils/time';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

export const ChatRoomScreen = ({ route }: Props) => {
  const { chatMessages, currentUser, users, sendMessage } = useApp();
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const roomMessages = useMemo(
    () => chatMessages.filter((m) => m.roomId === route.params.roomId),
    [chatMessages, route.params.roomId]
  );

  const onSend = () => {
    const result = sendMessage(route.params.roomId, text);
    if (!result.ok) return Alert.alert('Cannot send', result.message);
    setText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={flatListRef}
        data={roomMessages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMine = item.senderId === currentUser.id;
          const sender = users.find((u) => u.id === item.senderId);
          return (
            <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
              <View style={styles.bubbleHeader}>
                <Text style={styles.sender}>{sender?.fullName ?? 'User'}</Text>
                <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.body}>{item.text}</Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={onSend}
          disabled={!text.trim()}
        >
          <Text style={styles.sendText}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  listContent: { padding: 16, gap: 8, paddingBottom: 16 },
  bubble: {
    maxWidth: '82%',
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentDim,
    borderBottomRightRadius: 4,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  sender: { ...typography.label, color: colors.muted },
  time: { ...typography.label, color: colors.muted, fontSize: 9 },
  body: { ...typography.body, color: colors.text },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyText: { ...typography.caption, color: colors.muted },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    ...typography.body,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendText: { ...typography.bodyBold, color: colors.text, fontSize: 18 },
});
