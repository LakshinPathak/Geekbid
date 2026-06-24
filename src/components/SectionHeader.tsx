import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const SectionHeader = ({ title, subtitle, actionLabel, onAction }: Props) => (
  <View style={styles.wrapper}>
    <View style={styles.left}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {actionLabel && onAction ? (
      <Pressable onPress={onAction}>
        <Text style={styles.action}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  left: { flex: 1, gap: 2 },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.muted },
  action: { ...typography.captionBold, color: colors.accentBlue },
});
