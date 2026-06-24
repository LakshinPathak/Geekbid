import { ColorValue } from 'react-native';

/**
 * Type-safe gradient colors helper for expo-linear-gradient.
 * Converts a readonly or mutable string array/tuple to the required gradient tuple type.
 */
export type GradientColors = readonly [ColorValue, ColorValue, ...ColorValue[]];

export const asGradient = (
  colors: readonly string[] | string[]
): GradientColors => colors as unknown as GradientColors;
