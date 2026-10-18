import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { palette } from '@/constants/theme';

export interface DonutSegment {
  value: number;
  color: string;
}

interface DonutProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  track?: string;
  /** Visual gap between segments in px. Defaults to just over the stroke width. */
  gap?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** Multi-segment ring chart with rounded caps, used for spending by category. */
export function Donut({
  segments,
  size = 180,
  thickness = 26,
  track = palette.track,
  gap,
  style,
  children,
}: DonutProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const gapLength = gap ?? thickness + 8;
  const center = size / 2;
  let consumed = 0;

  return (
    <View style={[{ width: size, height: size }, styles.center, style]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={radius} stroke={track} strokeWidth={thickness} fill="none" />
        {total > 0
          ? segments.map((segment, index) => {
              const fraction = Math.max(0, segment.value) / total;
              const length = Math.min(
                circumference,
                Math.max(fraction * circumference - gapLength, 4),
              );
              const offset = -consumed * circumference;
              consumed += fraction;
              return (
                <Circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={segment.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={[length, circumference - length]}
                  strokeDashoffset={offset}
                  transform={`rotate(-90 ${center} ${center})`}
                />
              );
            })
          : null}
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
