import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Amount } from '@/components/ui/Amount';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Donut } from '@/components/ui/Donut';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { fonts, palette, radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

type Target = 'signup' | 'login';

interface Slide {
  key: string;
  title: string;
  body: string;
  visual: ReactNode;
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuth();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);

  const last = index === SLIDES.length - 1;

  const goTo = (next: number) => {
    setIndex(next);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
  };

  const start = async (target: Target) => {
    await completeOnboarding();
    router.replace(target === 'signup' ? '/(auth)/signup' : '/(auth)/login');
  };

  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Feather name="trending-up" size={15} color={palette.ink} />
          </View>
          <AppText variant="heading">Expns</AppText>
        </View>
        {!last ? (
          <Pressable accessibilityRole="button" hitSlop={10} onPress={() => void start('login')}>
            <AppText variant="label" color={palette.textMuted}>
              Skip
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}>
        {SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.slide, { width }]}>
            {slide.visual}
            <View style={styles.slideCopy}>
              <AppText variant="title">{slide.title}</AppText>
              <AppText variant="body" color={palette.textMuted} style={styles.slideBody}>
                {slide.body}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button
          label={last ? 'Get started' : 'Continue'}
          onPress={() => (last ? void start('signup') : goTo(index + 1))}
        />
        <Button
          label="I already have an account"
          variant="ghost"
          onPress={() => void start('login')}
        />
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ slides */

const SLIDES: Slide[] = [
  {
    key: 'track',
    title: 'Every expense, under control',
    body: 'Log income and spending in seconds — cash, cards, wallets. One clear picture of where your money goes.',
    visual: <PlanVisual />,
  },
  {
    key: 'recurring',
    title: 'Bills run on autopilot',
    body: 'Recurring expenses post themselves on schedule — rent, subscriptions, salary — so your history stays accurate without the busywork.',
    visual: <RecurringVisual />,
  },
  {
    key: 'limits',
    title: 'Never blow a budget again',
    body: 'Set a monthly limit per category. We warn you at 80% and the moment you go over.',
    visual: <LimitVisual />,
  },
];

function PlanVisual() {
  return (
    <Card variant="lime" style={styles.visualCard}>
      <View style={styles.visualHeaderRow}>
        <AppText variant="display" color={palette.ink}>
          68%
        </AppText>
        <View style={styles.visualHeaderRight}>
          <AppText variant="label" color={palette.ink}>
            Plan expenses
          </AppText>
          <AppText variant="caption" color={palette.inkMuted}>
            October
          </AppText>
        </View>
      </View>
      <ProgressBar
        value={0.68}
        height={14}
        color={palette.ink}
        track="rgba(23,23,23,0.08)"
        stripe="rgba(23,23,23,0.16)"
      />
      <View style={styles.miniList}>
        <MiniRow emoji="🍔" label="Dining" amount="$86.40" />
        <MiniRow emoji="🚗" label="Transport" amount="$32.00" />
      </View>
    </Card>
  );
}

function RecurringVisual() {
  return (
    <Card variant="white" style={styles.visualCard}>
      <View style={styles.visualHeaderRow}>
        <AppText variant="heading" color={palette.ink}>
          Upcoming bills
        </AppText>
        <View style={styles.autoChip}>
          <AppText variant="tiny" color={palette.lime} style={styles.autoChipText}>
            Auto
          </AppText>
        </View>
      </View>
      <View style={styles.miniList}>
        <MiniRow emoji="🎬" label="Netflix" amount="$15.99" />
        <MiniRow emoji="🏠" label="Rent" amount="$920.00" />
      </View>
      <ProgressBar
        value={0.8}
        height={14}
        color={palette.ink}
        track="rgba(23,23,23,0.08)"
        stripe="rgba(23,23,23,0.16)"
      />
      <AppText variant="caption" color={palette.inkMuted}>
        $920 of $1,150 spent this month
      </AppText>
    </Card>
  );
}

function LimitVisual() {
  return (
    <Card variant="deep" style={[styles.visualCard, styles.visualCenter]}>
      <Donut
        size={170}
        thickness={26}
        segments={[
          { value: 62, color: palette.lime },
          { value: 24, color: palette.blue },
          { value: 14, color: palette.green },
        ]}>
        <AppText variant="caption" color={palette.textMuted}>
          Total
        </AppText>
        <Amount value={1420} size={28} />
      </Donut>
      <View style={styles.alertChip}>
        <Feather name="alert-triangle" size={14} color={palette.red} />
        <AppText variant="caption" color={palette.red}>
          Groceries at 92% of budget
        </AppText>
      </View>
    </Card>
  );
}

function MiniRow({ emoji, label, amount }: { emoji: string; label: string; amount: string }) {
  return (
    <View style={styles.miniRow}>
      <View style={styles.miniLabel}>
        <AppText style={styles.miniEmoji}>{emoji}</AppText>
        <AppText variant="label" color={palette.inkMuted}>
          {label}
        </AppText>
      </View>
      <AppText style={styles.miniAmount} color={palette.ink}>
        {amount}
      </AppText>
    </View>
  );
}

/* ------------------------------------------------------------------ styles */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: { flex: 1 },
  pagerContent: { flexGrow: 1 },
  slide: { paddingHorizontal: 24, paddingVertical: 16, gap: 30, justifyContent: 'center' },
  slideCopy: { gap: 12 },
  slideBody: { fontSize: 16, lineHeight: 24 },
  visualCard: { gap: 16 },
  visualCenter: { alignItems: 'center' },
  visualHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  visualHeaderRight: { alignItems: 'flex-end', gap: 2 },
  miniList: { gap: 12 },
  miniRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  miniLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniEmoji: { fontSize: 15 },
  miniAmount: { fontFamily: fonts.semibold, fontSize: 14 },
  autoChip: { backgroundColor: palette.ink, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  autoChipText: { color: palette.lime },
  alertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.redSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bottom: { paddingHorizontal: 24, gap: 12 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { width: 24, backgroundColor: palette.lime },
});
