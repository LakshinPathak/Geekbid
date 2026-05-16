import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

  if (grad && variant !== 'outline' && variant !== 'ghost') {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : isDisabled ? 0.5 : 1 })}
      >
        <LinearGradient
          colors={grad as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.button, style]}
        >
          {inner}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'outline' && styles.outlineBtn,
        variant === 'ghost' && styles.ghostBtn,
        { opacity: pressed ? 0.85 : isDisabled ? 0.5 : 1 },
        style,
      ]}
    >
      {inner}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 20,
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
