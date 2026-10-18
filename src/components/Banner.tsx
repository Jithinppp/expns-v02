import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { palette, radius } from '@/constants/theme';

interface BannerProps {
  tone?: 'error' | 'info';
  text: string;
}

export function Banner({ tone = 'error', text }: BannerProps) {
  return (
    <View accessibilityRole="alert" style={[styles.base, tone === 'error' ? styles.error : styles.info]}>
      <AppText variant="caption" color={tone === 'error' ? palette.red : palette.green}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, padding: 14 },
  error: { backgroundColor: palette.redSoft },
  info: { backgroundColor: palette.greenSoft },
});
