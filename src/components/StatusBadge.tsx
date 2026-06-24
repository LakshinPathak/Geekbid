import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const variantColors: Record<Variant, { bg: string; text: string }> = {
  success: { bg: colors.accentDim, text: colors.accent },
  warning: { bg: colors.warningDim, text: colors.warning },
  danger: { bg: colors.dangerDim, text: colors.danger },
  info: { bg: colors.accentBlueDim, text: colors.accentBlue },
  neutral: { bg: colors.badge, text: colors.muted },
};

type Props = {
  label: string;
  variant?: Variant;
  icon?: string;
};

export const StatusBadge = ({ label, variant = 'neutral', icon }: Props) => {
  const vc = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: vc.bg }]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.text, { color: vc.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  icon: { fontSize: 12 },
  text: {
    ...typography.label,
    textTransform: 'uppercase',
  },
});
