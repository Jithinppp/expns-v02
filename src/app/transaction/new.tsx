import { format, getDaysInMonth, parseISO } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/AppText';
import { Button, IconButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { fonts, palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { currencySymbol, dayLabel, isSameMonth, toISODate } from '@/lib/format';
import { createCategory, createTransaction, fetchAccounts, fetchCategories } from '@/lib/queries';
import type { Account, Category } from '@/lib/types';
import { getViewedMonth } from '@/lib/view-month';

/** Sentinel chip id that opens the "new category" sheet. */
const NEW_TYPE_ID = '__new__';

/** Parses a `YYYY-MM-DD` route param into a valid Date, or null. */
function monthFromParam(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Curated emoji palette for user-created expense/income types. */
const EMOJI_CHOICES = [
  '🍔', '🍕', '☕', '🍺', '🛒', '🍎', '🧾', '🚗',
  '⛽', '🚌', '✈️', '🏠', '💡', '📱', '🌐', '👕',
  '👟', '💄', '💊', '🏥', '🎬', '🎮', '🎵', '🎁',
  '📚', '🐶', '🔧', '🏋️', '✂️', '💼', '💰', '💳',
  '✨', '📦', '🎓', '🧸', '🎯', '🏖️', '🚿', '🧹',
];

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string; month?: string }>();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const currency = profile?.base_currency ?? 'USD';

  const [type, setType] = useState<'expense' | 'income'>(
    params.type === 'income' ? 'income' : 'expense',
  );
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [month, setMonth] = useState<Date>(
    () => monthFromParam(params.month) ?? monthFromParam(getViewedMonth() ?? '') ?? new Date(),
  );
  const [selectedDay, setSelectedDay] = useState(() => {
    const initial = monthFromParam(params.month) ?? monthFromParam(getViewedMonth() ?? '');
    if (!initial) return new Date().getDate();
    return isSameMonth(initial, new Date()) ? new Date().getDate() : 1;
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // "New type" sheet (user-created expense/income categories)
  const [typeOpen, setTypeOpen] = useState(false);
  const [typeName, setTypeName] = useState('');
  const [typeEmoji, setTypeEmoji] = useState(EMOJI_CHOICES[0]);
  const [savingType, setSavingType] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [cats, accs] = await Promise.all([fetchCategories(type), fetchAccounts()]);
        setCategories(cats);
        setAccounts(accs);
        setAccountId((prev) =>
          prev && accs.some((account) => account.id === prev) ? prev : (accs[0]?.id ?? null),
        );
        setCategoryId((prev) =>
          prev && cats.some((category) => category.id === prev) ? prev : (cats[0]?.id ?? null),
        );
      } catch (cause) {
        setError(errorMessage(cause, 'Could not load options'));
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, [type]);

  const amount = useMemo(() => {
    const parsed = Number.parseFloat(amountText);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amountText]);

  const today = new Date();
  const monthId = `${month.getFullYear()}-${month.getMonth()}`;
  const daysInMonth = getDaysInMonth(month);
  const isCurrentMonth = isSameMonth(month, today);
  const dayItems = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const label =
      isCurrentMonth && day === today.getDate()
        ? 'Today'
        : isCurrentMonth && day === today.getDate() - 1
          ? 'Yesterday'
          : format(new Date(month.getFullYear(), month.getMonth(), day), 'EEE d');
    return { id: String(day), label };
  });
  const date = new Date(month.getFullYear(), month.getMonth(), Math.min(selectedDay, daysInMonth));

  const changeMonth = (next: Date) => {
    setSelectedDay((prev) =>
      isSameMonth(next, new Date()) ? new Date().getDate() : Math.min(prev, getDaysInMonth(next)),
    );
    setMonth(next);
  };

  const onAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const [whole, ...decimals] = cleaned.split('.');
    const next =
      decimals.length > 0
        ? `${whole.slice(0, 8)}.${decimals.join('').slice(0, 2)}`
        : whole.slice(0, 8);
    setAmountText(next.startsWith('.') ? `0${next}` : next);
  };

  const handleCategorySelect = (id: string) => {
    if (id === NEW_TYPE_ID) {
      setTypeError(null);
      setTypeOpen(true);
      return;
    }
    setCategoryId(id);
  };

  const saveType = async () => {
    const name = typeName.trim();
    if (!name) {
      setTypeError('Give it a name first.');
      return;
    }
    setSavingType(true);
    setTypeError(null);
    try {
      const created = await createCategory({ name, kind: type, icon: typeEmoji });
      setCategories((prev) => [...prev, created]);
      setCategoryId(created.id);
      setTypeOpen(false);
      setTypeName('');
      setTypeEmoji(EMOJI_CHOICES[0]);
    } catch (cause) {
      const message = errorMessage(cause, 'Could not create the type');
      setTypeError(
        message.toLowerCase().includes('duplicate')
          ? 'You already have a type with this name.'
          : message,
      );
    } finally {
      setSavingType(false);
    }
  };

  const save = async () => {
    if (amount <= 0) {
      setError('Enter an amount first.');
      return;
    }
    if (!accountId) {
      setError('Add an account in Profile first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createTransaction({
        type,
        amount,
        accountId,
        categoryId,
        occurredOn: date,
        note,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (cause) {
      setError(errorMessage(cause, 'Could not save'));
      setBusy(false);
    }
  };

  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <IconButton icon="chevron-down" label="Close" variant="deep" onPress={() => router.back()} />
        <View style={styles.segment}>
          <Chip label="Expense" active={type === 'expense'} onPress={() => setType('expense')} />
          <Chip label="Income" active={type === 'income'} onPress={() => setType('income')} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={styles.amountBlock}>
          <AppText variant="caption" color={palette.textDim}>
            {`${dayLabel(toISODate(date))} · ${type === 'expense' ? 'Expense' : 'Income'}`}
          </AppText>
          <View style={styles.amountEntry}>
            <AppText style={styles.amountCurrency}>{currencySymbol(currency)}</AppText>
            <TextInput
              value={amountText}
              onChangeText={onAmountChange}
              style={[styles.amountInput, !amountText && styles.amountInputEmpty]}
              placeholder="0"
              placeholderTextColor={palette.textDim}
              keyboardType="decimal-pad"
              returnKeyType="done"
              autoFocus
              selectionColor={palette.lime}
              accessibilityLabel="Amount"
            />
          </View>
        </View>

        {loadingOptions ? (
          <ActivityIndicator color={palette.lime} />
        ) : (
          <>
            <ChipRow
              items={[
                ...categories.map((category) => ({
                  id: category.id,
                  label: category.name,
                  emoji: category.icon,
                })),
                { id: NEW_TYPE_ID, label: 'New', emoji: '➕' },
              ]}
              selectedId={categoryId}
              onSelect={handleCategorySelect}
            />
            <ChipRow
              items={accounts.map((account) => ({ id: account.id, label: account.name }))}
              selectedId={accountId}
              onSelect={setAccountId}
            />
            <View style={styles.dateBlock}>
              <MonthSwitcher month={month} onChange={changeMonth} style={styles.monthRow} />
              <ChipRow
                key={monthId}
                items={dayItems}
                selectedId={String(selectedDay)}
                onSelect={(id) => setSelectedDay(Number(id))}
                autoScrollToSelected
              />
            </View>
            <Field
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="What was it for?"
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </>
        )}

        {error ? (
          <AppText variant="caption" color={palette.red}>
            {error}
          </AppText>
        ) : null}

        <Button
          label={type === 'expense' ? 'Save expense' : 'Save income'}
          loading={busy}
          onPress={() => void save()}
        />
      </ScrollView>

      <Sheet
        visible={typeOpen}
        onClose={() => setTypeOpen(false)}
        title={type === 'expense' ? 'New expense type' : 'New income type'}>
        <View style={styles.field}>
          <AppText variant="caption" color={palette.textMuted}>
            Emoji
          </AppText>
          <View style={styles.emojiGrid}>
            {EMOJI_CHOICES.map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Emoji ${emoji}`}
                accessibilityState={{ selected: typeEmoji === emoji }}
                onPress={() => setTypeEmoji(emoji)}
                style={[styles.emojiCell, typeEmoji === emoji && styles.emojiCellActive]}>
                <AppText style={styles.emojiText}>{emoji}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <Field
          label="Name"
          value={typeName}
          onChangeText={setTypeName}
          placeholder={type === 'expense' ? 'Coffee, Rent, Gym…' : 'Freelance, Bonus…'}
          autoCapitalize="words"
        />

        <View style={styles.previewRow}>
          <Chip label={typeName.trim() || 'Preview'} emoji={typeEmoji} active />
        </View>

        {typeError ? (
          <AppText variant="caption" color={palette.red}>
            {typeError}
          </AppText>
        ) : null}

        <Button label="Create type" loading={savingType} onPress={() => void saveType()} />
      </Sheet>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------- chip row */

function ChipRow({
  items,
  selectedId,
  onSelect,
  autoScrollToSelected = false,
}: {
  items: { id: string; label: string; emoji?: string | null }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Scrolls the selected chip into view once (used for the month date row). */
  autoScrollToSelected?: boolean;
}) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const didScroll = useRef(false);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.chipRowContent}>
      {items.map((item) => (
        <View
          key={item.id}
          onLayout={
            autoScrollToSelected && item.id === selectedId
              ? (event) => {
                  if (didScroll.current) return;
                  didScroll.current = true;
                  const x = event.nativeEvent.layout.x;
                  scrollRef.current?.scrollTo({ x: Math.max(x - 96, 0), animated: false });
                }
              : undefined
          }>
          <Chip
            label={item.label}
            emoji={item.emoji}
            active={selectedId === item.id}
            onPress={() => onSelect(item.id)}
          />
        </View>
      ))}
    </ScrollView>
  );
}

/* ---------------------------------------------------------------- styles */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  segment: { flexDirection: 'row', gap: 8 },
  headerSpacer: { width: 44 },
  content: { padding: 20, gap: 18, paddingBottom: 16 },
  amountBlock: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  amountEntry: { flexDirection: 'row', alignItems: 'flex-end' },
  amountCurrency: {
    fontFamily: fonts.semibold,
    fontSize: 23,
    color: palette.white,
    marginRight: 3,
    marginBottom: 6,
    opacity: 0.7,
  },
  amountInput: {
    fontFamily: fonts.bold,
    fontSize: 54,
    lineHeight: 60,
    letterSpacing: -1.4,
    color: palette.white,
    padding: 0,
    includeFontPadding: false,
    textAlign: 'center',
    minWidth: 80,
  },
  amountInputEmpty: { color: palette.textDim },
  dateBlock: { gap: 10 },
  monthRow: { alignSelf: 'center' },
  chipRowContent: { gap: 8, paddingRight: 20 },
  field: { gap: 8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  emojiCellActive: { backgroundColor: palette.lime, borderColor: palette.lime },
  emojiText: { fontSize: 20 },
  previewRow: { flexDirection: 'row' },
});
