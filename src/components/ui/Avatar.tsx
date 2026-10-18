import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { fonts, palette } from '@/constants/theme';

interface AvatarProps {
  name?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('');
  return initials || '?';
}

export function Avatar({ name, size = 44, style }: AvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(2, size * 0.05),
        },
        style,
      ]}>
      <AppText style={{ fontFamily: fonts.bold, fontSize: size * 0.36, color: palette.ink }}>
        {initialsOf(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: palette.bg,
  },
});
