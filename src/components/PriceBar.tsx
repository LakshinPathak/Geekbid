import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { formatMoney } from '../utils/pricing';

type Props = {
  startPrice: number;
  floorPrice: number;
  currentPrice: number;
};

export const PriceBar = ({ startPrice, floorPrice, currentPrice }: Props) => {
  const range = startPrice - floorPrice;
  const position = range > 0 ? (currentPrice - floorPrice) / range : 0;
  const percent = Math.max(0, Math.min(1, position));

  return (
    <View style={styles.wrapper}>
      <View style={styles.labels}>
        <Text style={styles.label}>{formatMoney(floorPrice)}</Text>
        <Text style={styles.label}>{formatMoney(startPrice)}</Text>
      </View>
      <View style={styles.track}>
        <LinearGradient
          colors={[colors.danger, colors.warning, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${percent * 100}%` }]}
        />
        <View style={[styles.marker, { left: `${percent * 100}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.caption,
    color: colors.muted,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
  marker: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.accent,
    marginLeft: -6,
  },
});
