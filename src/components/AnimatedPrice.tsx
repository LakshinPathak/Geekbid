import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type Props = {
  value: number;
  prefix?: string;
  style?: TextStyle;
};

export const AnimatedPrice = ({ value, prefix = '$', style }: Props) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [value, pulseAnim]);

  return (
    <Animated.Text style={[styles.price, style, { transform: [{ scale: pulseAnim }] }]}>
      {prefix}{value.toFixed(2)}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  price: {
    ...typography.priceXL,
    color: colors.accent,
  },
});
