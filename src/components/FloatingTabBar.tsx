import Feather from '@expo/vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette, shadows } from '@/constants/theme';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'home',
  transactions: 'list',
  budgets: 'pie-chart',
  settings: 'user',
};

const LABELS: Record<string, string> = {
  index: 'Home',
  transactions: 'Transactions',
  budgets: 'Budgets',
  settings: 'Profile',
};

/** Floating pill tab bar with a lime add button, per the design reference. */
export function FloatingTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.pill, shadows.float]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icon = ICONS[route.name] ?? 'circle';
          const label = LABELS[route.name] ?? route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                void Haptics.selectionAsync();
                if (!focused) {
                  navigateToTab(route.key);
                }
              }}
              style={styles.item}>
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <Feather
                  name={icon}
                  size={20}
                  color={focused ? palette.ink : 'rgba(255,255,255,0.55)'}
                />
              </View>
            </Pressable>
          );
        })}
        <View style={styles.divider} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add transaction"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/transaction/new');
          }}
          style={({ pressed }) => [styles.iconWrap, styles.plus, pressed && styles.pressed]}>
          <Feather name="plus" size={22} color={palette.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pill: {
    width: '100%',
    maxWidth: 440,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141313',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 2,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: palette.lime },
  divider: { width: 1, height: 26, backgroundColor: palette.border, marginHorizontal: 6 },
  plus: { backgroundColor: palette.lime, ...shadows.lime },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
});
