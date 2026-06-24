import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = {
  label: string;
  matchPercent?: number;
  variant?: 'default' | 'active' | 'outline';
};

export const SkillChip = ({ label, matchPercent, variant = 'default' }: Props) => {
  const chipStyles = [
    styles.chip,
    variant === 'active' && styles.active,
    variant === 'outline' && styles.outline,
  ];

  return (
    <View style={chipStyles}>
      <Text style={[styles.text, variant === 'active' && styles.activeText]}>{label}</Text>
      {matchPercent != null && (
        <Text style={styles.match}>{matchPercent}%</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.badge,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  active: {
    backgroundColor: colors.accentDim,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  text: {
    ...typography.caption,
    color: colors.badgeText,
  },
  activeText: {
    color: colors.accent,
  },
  match: {
    ...typography.label,
    color: colors.accent,
    fontSize: 9,
  },
});
