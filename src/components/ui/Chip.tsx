import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { palette, radius } from '@/constants/theme';

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Leading emoji (category icons are emoji in the database). */
  emoji?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, active = false, onPress, emoji, style }: ChipProps) {
  const content = (
    <>
      {emoji ? <AppText style={styles.emoji}>{emoji}</AppText> : null}
      <AppText variant="label" color={active ? palette.ink : palette.white}>
        {label}
      </AppText>
    </>
  );

  if (!onPress) {
    return <Pressable disabled style={[styles.base, active && styles.active, style]}>{content}</Pressable>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.base, active && styles.active, pressed && styles.pressed, style]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  active: { backgroundColor: palette.lime, borderColor: palette.lime },
  pressed: { opacity: 0.85 },
  emoji: { fontSize: 14 },
});
