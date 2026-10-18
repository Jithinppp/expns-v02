import { StyleSheet, Text, type TextProps } from 'react-native';

import { fonts, palette } from '@/constants/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption' | 'tiny';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

/** Themed text. Weight maps to a Space Grotesk family (no synthetic bolding). */
export function AppText({ variant = 'body', color = palette.white, style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[styles[variant], { color }, style]} />;
}

const styles = StyleSheet.create({
  display: { fontFamily: fonts.bold, fontSize: 44, lineHeight: 48, letterSpacing: -1.2 },
  title: { fontFamily: fonts.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17 },
  tiny: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
