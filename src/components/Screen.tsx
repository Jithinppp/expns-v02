import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, TAB_BAR_INSET } from '@/constants/theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Reserve room at the bottom for the floating tab bar. */
  tabInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  tabInset = false,
  contentStyle,
  style,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = (tabInset ? TAB_BAR_INSET : 24) + insets.bottom;

  if (!scroll) {
    return (
      <SafeAreaView edges={['top']} style={[styles.root, style]}>
        {children}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.root, style]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ padding: 20, paddingBottom, gap: 20 }, contentStyle]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={palette.lime}
              colors={[palette.lime]}
              progressBackgroundColor={palette.surface}
            />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
});
