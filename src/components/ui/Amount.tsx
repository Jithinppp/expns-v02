import { View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { fonts, palette } from '@/constants/theme';
import { currencySymbol, splitAmount } from '@/lib/format';

interface AmountProps {
  value: number;
  currency?: string;
  /** Font size of the whole-number part. */
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Hero money display: "$ 420̃.50" style — symbol and decimals small,
 * whole number large, everything baseline-aligned.
 */
export function Amount({ value, currency = 'USD', size = 40, color = palette.white, style }: AmountProps) {
  const { negative, whole, decimals } = splitAmount(value);
  const symbol = currencySymbol(currency);

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end' }, style]}>
      <AppText
        style={{
          fontFamily: fonts.semibold,
          fontSize: Math.round(size * 0.42),
          color,
          marginRight: 3,
          marginBottom: Math.round(size * 0.08),
          letterSpacing: -0.3,
        }}>
        {`${negative ? '-' : ''}${symbol}`}
      </AppText>
      <AppText
        style={{
          fontFamily: fonts.bold,
          fontSize: size,
          lineHeight: Math.round(size * 1.12),
          color,
          letterSpacing: -1.4,
        }}>
        {whole}
      </AppText>
      <AppText
        style={{
          fontFamily: fonts.semibold,
          fontSize: Math.round(size * 0.4),
          color,
          opacity: 0.62,
          marginBottom: Math.round(size * 0.12),
        }}>
        {`.${decimals}`}
      </AppText>
    </View>
  );
}
