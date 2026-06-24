import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radius } from '../theme/spacing';

type Variant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
  testID?: string;
};

const gradients: Partial<Record<Variant, readonly string[]>> = {
  primary: colors.gradientAccent,
  secondary: colors.gradientBlue,
  danger: ['#991B1B', '#DC2626'],
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  style,
  testID,
}: Props) => {
  const isDisabled = disabled || loading;
  const grad = gradients[variant];
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!isDisabled) {
      Animated.spring(scaleValue, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!isDisabled) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 8,
      }).start();
    }
  };

  const inner = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          {icon ? <Text style={styles.icon}>{icon}</Text> : null}
          <Text style={[styles.text, variant === 'outline' && styles.outlineText, variant === 'ghost' && styles.ghostText]}>
            {title}
          </Text>
        </>
      )}
    </>
  );

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.pressableContainer,
        style,
      ]}
    >
      <Animated.View style={[{ transform: [{ scale: scaleValue }], opacity: isDisabled ? 0.5 : 1 }, styles.fullWidth]}>
        {grad && variant !== 'outline' && variant !== 'ghost' ? (
          <LinearGradient
            colors={grad as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {inner}
          </LinearGradient>
        ) : (
          <View
            style={[
              styles.button,
              variant === 'outline' && styles.outlineBtn,
              variant === 'ghost' && styles.ghostBtn,
            ]}
          >
            {inner}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressableContainer: {
    width: '100%',
    alignItems: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 20,
    width: '100%',
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    backgroundColor: 'transparent',
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  text: {
    ...typography.bodyBold,
    color: colors.text,
  },
  outlineText: {
    color: colors.textSecondary,
  },
  ghostText: {
    color: colors.accentBlue,
  },
  icon: {
    fontSize: 16,
  },
});
