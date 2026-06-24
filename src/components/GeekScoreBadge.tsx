import { StyleSheet, Text, View } from 'react-native';
import { getGeekTier } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = {
  score: number;
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = {
  sm: { outer: 48, inner: 40, fontSize: 14, labelSize: 9 },
  md: { outer: 72, inner: 60, fontSize: 22, labelSize: 11 },
  lg: { outer: 100, inner: 84, fontSize: 30, labelSize: 13 },
};

export const GeekScoreBadge = ({ score, size = 'md' }: Props) => {
  const tier = getGeekTier(score);
  const dim = SIZES[size];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.outer, { width: dim.outer, height: dim.outer, borderColor: tier.color }]}>
        <View style={[styles.inner, { width: dim.inner, height: dim.inner, backgroundColor: `${tier.color}18` }]}>
          <Text style={[styles.score, { fontSize: dim.fontSize, color: tier.color }]}>{score}</Text>
        </View>
      </View>
      <View style={styles.labelRow}>
        <Text style={[styles.icon, { fontSize: dim.labelSize + 2 }]}>{tier.icon}</Text>
        <Text style={[styles.label, { fontSize: dim.labelSize, color: tier.color }]}>{tier.label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 6 },
  outer: {
    borderRadius: 999,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    fontWeight: '900',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {},
  label: {
    ...typography.captionBold,
  },
});
