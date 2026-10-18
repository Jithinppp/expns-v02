/**
 * Expns design system.
 *
 * Palette comes straight from the brand reference:
 *   lime #CEF62E · green #30E48D · blue #61A4F4 · white #FFFFFF · ink #201F1F
 * The app is dark-first: ink background, lifted surfaces, lime as the hero accent.
 */

export const palette = {
  bg: '#201F1F',
  deep: '#171616',
  surface: '#2A2929',
  surfaceHigh: '#343333',
  surfaceLow: '#1A1919',
  white: '#FFFFFF',
  lime: '#CEF62E',
  green: '#30E48D',
  blue: '#61A4F4',
  red: '#FF7A6B',
  ink: '#171717',
  // text on dark
  textMuted: 'rgba(255,255,255,0.62)',
  textDim: 'rgba(255,255,255,0.40)',
  // text on light (lime / white / green) cards
  inkMuted: 'rgba(23,23,23,0.62)',
  inkDim: 'rgba(23,23,23,0.40)',
  // progress + dividers
  track: 'rgba(255,255,255,0.10)',
  trackInk: 'rgba(23,23,23,0.10)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  // soft tints
  limeSoft: 'rgba(206,246,46,0.14)',
  greenSoft: 'rgba(48,228,141,0.14)',
  blueSoft: 'rgba(97,164,244,0.16)',
  redSoft: 'rgba(255,122,107,0.16)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  card: 28,
  pill: 999,
} as const;

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  float: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  lime: {
    shadowColor: palette.lime,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
} as const;

/** Cycled accent colors for charts when a category has no stored color. */
export const chartPalette = [
  palette.lime,
  palette.blue,
  palette.green,
  '#9A9A9A',
  '#5F5F5F',
  '#3D3D3D',
] as const;

/** Bottom padding screens need so content clears the floating tab bar. */
export const TAB_BAR_INSET = 96;
