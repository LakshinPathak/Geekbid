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
  wrapper: { gap: 6 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.caption,
    color: colors.muted,
    fontSize: 11,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'visible',
    position: 'relative',
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  marker: {
    position: 'absolute',
    top: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginLeft: -4,
  },
});
