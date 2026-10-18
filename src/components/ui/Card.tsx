import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { palette, radius, shadows } from '@/constants/theme';

type CardVariant = 'surface' | 'deep' | 'low' | 'lime' | 'white' | 'green' | 'blue';

const variantStyles: Record<CardVariant, ViewStyle> = {
  surface: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  deep: { backgroundColor: palette.deep, borderWidth: 1, borderColor: palette.border },
  low: { backgroundColor: palette.surfaceLow, borderWidth: 1, borderColor: palette.border },
  lime: { backgroundColor: palette.lime, ...shadows.lime },
  white: { backgroundColor: palette.white, ...shadows.card },
  green: { backgroundColor: palette.green },
  blue: { backgroundColor: palette.blue },
};

interface CardProps {
  variant?: CardVariant;
  padded?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Card({ variant = 'surface', padded = true, onPress, style, children }: CardProps) {
  const base = [styles.base, padded && styles.padded, variantStyles[variant], style];

  if (!onPress) {
    return <View style={base}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [base, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.card, overflow: 'hidden' },
  padded: { padding: 20 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
