import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { radius } from '../theme/spacing';

type Props = PropsWithChildren<{
  gradient?: readonly [string, string, ...string[]];
  onPress?: () => void;
  style?: ViewStyle;
}>;

export const GradientCard = ({
  children,
  gradient = colors.gradientCard,
  onPress,
  style,
}: Props) => {
  const content = (
    <LinearGradient colors={gradient as any} style={[styles.card, style]}>
      {children}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
});
