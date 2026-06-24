import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Button } from './Button';

type Props = {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const EmptyState = ({ icon = '📭', title, subtitle, actionLabel, onAction }: Props) => (
  <View style={styles.wrapper}>
    <Text style={styles.icon}>{icon}</Text>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    {actionLabel && onAction ? (
      <Button title={actionLabel} onPress={onAction} variant="outline" />
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  icon: { fontSize: 40 },
  title: { ...typography.h3, color: colors.textSecondary, textAlign: 'center' },
  subtitle: { ...typography.caption, color: colors.muted, textAlign: 'center', maxWidth: 260 },
});
