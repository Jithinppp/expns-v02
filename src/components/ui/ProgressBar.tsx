import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { palette } from '@/constants/theme';

interface ProgressBarProps {
  /** 0..1 (values above 1 render as full). */
  value: number;
  color?: string;
  track?: string;
  height?: number;
  /**
   * Stripe color for the unfilled remainder — the hatched look from the
   * design reference. Pass null for a plain track.
   */
  stripe?: string | null;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  value,
  color = palette.lime,
  track = palette.track,
  height = 10,
  stripe = 'rgba(255,255,255,0.16)',
  style,
}: ProgressBarProps) {
  const patternId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const radiusValue = height / 2;

  return (
    <View
      accessibilityRole="progressbar"
      style={[
        { height, borderRadius: radiusValue, backgroundColor: track, overflow: 'hidden' },
        style,
      ]}>
      {stripe ? (
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern
              id={patternId}
              patternUnits="userSpaceOnUse"
              width={12}
              height={12}
              patternTransform="rotate(45)">
              <Rect x={0} y={0} width={6} height={12} fill={stripe} />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </Svg>
      ) : null}
      <View
        style={{
          width: `${clamped * 100}%`,
          height,
          borderRadius: radiusValue,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
