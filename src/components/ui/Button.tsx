import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { fonts, palette, radius, shadows } from '@/constants/theme';

type ButtonVariant = 'primary' | 'dark' | 'white' | 'ghost' | 'danger';

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: palette.lime },
  dark: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  white: { backgroundColor: palette.white },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: palette.redSoft },
};

const labelColors: Record<ButtonVariant, string> = {
  primary: palette.ink,
  dark: palette.white,
  white: palette.ink,
  ghost: palette.textMuted,
  danger: palette.red,
};

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        variant === 'primary' && shadows.lime,
        variant === 'white' && shadows.card,
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'white' ? palette.ink : palette.white}
        />
      ) : (
        <>
          {icon}
          <AppText style={[styles.label, { color: labelColors[variant] }]}>{label}</AppText>
        </>
      )}
    </Pressable>
  );
}

type IconButtonVariant = 'dark' | 'deep' | 'lime' | 'white' | 'ghost';

const iconButtonStyles: Record<IconButtonVariant, ViewStyle> = {
  dark: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  deep: { backgroundColor: palette.deep, borderWidth: 1, borderColor: palette.border },
  lime: { backgroundColor: palette.lime },
  white: { backgroundColor: palette.white },
  ghost: { backgroundColor: 'transparent' },
};

interface IconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  onLongPress?: () => void;
  size?: number;
  iconSize?: number;
  variant?: IconButtonVariant;
  disabled?: boolean;
  /** Lime dot in the corner, e.g. unread notifications. */
  badge?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  label,
  onPress,
  onLongPress,
  size = 44,
  iconSize,
  variant = 'dark',
  disabled = false,
  badge = false,
  style,
}: IconButtonProps) {
  const iconColor = variant === 'lime' || variant === 'white' ? palette.ink : palette.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2 },
        iconButtonStyles[variant],
        variant === 'lime' && shadows.lime,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      <Feather name={icon} size={iconSize ?? Math.round(size * 0.45)} color={iconColor} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  label: { fontFamily: fonts.semibold, fontSize: 16.5 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.lime,
    borderWidth: 2,
    borderColor: palette.bg,
  },
});
