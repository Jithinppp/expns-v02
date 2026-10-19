import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { fonts, palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import {
  CURRENCIES,
  currencyName,
  currencySymbol,
  formatMoney,
  longDate,
  nextRecurringDate,
  shortDate,
  toISODate,
} from '@/lib/format';
import {
  createAccount,
  createRecurringRule,
  deleteOwnAccount,
  deleteRecurringRule,
  fetchAccountBalances,
  fetchCategories,
  fetchRecurringRules,
  updateBaseCurrency,
  updateFullName,
} from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import type { AccountKind, Category, Frequency, RecurringRule } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

const ACCOUNT_KINDS: { value: AccountKind; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'credit_card', label: 'Card' },
  { value: 'wallet', label: 'Wallet' },
];

const ACCOUNT_ICONS: Record<AccountKind, keyof typeof Feather.glyphMap> = {
  cash: 'dollar-sign',
  bank: 'briefcase',
  credit_card: 'credit-card',
  wallet: 'shopping-bag',
};

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function SettingsScreen() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const currency = profile?.base_currency ?? 'USD';

  const balances = useLoad(fetchAccountBalances);
  const recurring = useLoad(fetchRecurringRules);
  const {
    reload: reloadBalances,
    refreshing: balancesRefreshing,
    refresh: refreshBalances,
  } = balances;
  const { reload: reloadRecurring } = recurring;

  useFocusEffect(
    useCallback(() => {
      void reloadBalances();
      void reloadRecurring();
    }, [reloadBalances, reloadRecurring]),
  );

  const [categories, setCategories] = useState<Category[]>([]);
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  const accounts = balances.data ?? [];
  const rules = recurring.data ?? [];

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // inline name editing
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // currency sheet
  const [currencyOpen, setCurrencyOpen] = useState(false);

  // account sheet
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountKind, setAccountKind] = useState<AccountKind>('cash');
  const [openingText, setOpeningText] = useState('');

  // recurring sheet
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recType, setRecType] = useState<'expense' | 'income'>('expense');
  const [recAmount, setRecAmount] = useState('');
  const [recCategoryId, setRecCategoryId] = useState<string | null>(null);
  const [recFrequency, setRecFrequency] = useState<Frequency>('monthly');
  const [recAccountId, setRecAccountId] = useState<string | null>(null);
  const [recNote, setRecNote] = useState('');

  const startEditName = () => {
    setNameDraft(profile?.full_name ?? '');
    setNameError(null);
    setEditingName(true);
  };

  const cancelEditName = () => {
    setNameError(null);
    setEditingName(false);
  };

  const saveName = async () => {
    if (!profile) return;
    const name = nameDraft.trim();
    if (!name) {
      setNameError('Enter your name.');
      return;
    }
    if (name === (profile.full_name ?? '').trim()) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    setNameError(null);
    try {
      await updateFullName(profile.id, name);
      await refreshProfile();
      setEditingName(false);
    } catch (cause) {
      setNameError(errorMessage(cause, 'Could not save your name'));
    } finally {
      setSavingName(false);
    }
  };

  const pickCurrency = async (code: string) => {
    if (!profile) return;
    setCurrencyOpen(false);
    try {
      await updateBaseCurrency(profile.id, code);
      await refreshProfile();
    } catch (cause) {
      Alert.alert('Could not update currency', errorMessage(cause, 'Try again.'));
    }
  };

  const openAccountSheet = () => {
    setFormError(null);
    setAccountOpen(true);
  };

  const saveAccount = async () => {
    if (!accountName.trim()) {
      setFormError('Give the account a name.');
      return;
    }
    const opening = Number.parseFloat(openingText.replace(',', '.')) || 0;
    setBusy(true);
    setFormError(null);
    try {
      await createAccount({ name: accountName, kind: accountKind, openingBalance: opening });
      setAccountOpen(false);
      setAccountName('');
      setAccountKind('cash');
      setOpeningText('');
      await reloadBalances();
    } catch (cause) {
      setFormError(errorMessage(cause, 'Could not add account'));
    } finally {
      setBusy(false);
    }
  };

  const openRecurringSheet = () => {
    setFormError(null);
    setRecAccountId((prev) => prev ?? accounts[0]?.id ?? null);
    setRecurringOpen(true);
  };

  const saveRecurring = async () => {
    const amount = Number.parseFloat(recAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter an amount greater than zero.');
      return;
    }
    if (!recAccountId) {
      setFormError('Pick an account.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createRecurringRule({
        type: recType,
        amount,
        accountId: recAccountId,
        categoryId: recCategoryId,
        frequency: recFrequency,
        nextRunOn: nextRecurringDate(recFrequency),
        note: recNote,
      });
      setRecurringOpen(false);
      setRecAmount('');
      setRecCategoryId(null);
      setRecFrequency('monthly');
      setRecNote('');
      await reloadRecurring();
    } catch (cause) {
      setFormError(errorMessage(cause, 'Could not save rule'));
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteRule = (rule: RecurringRule) => {
    Alert.alert('Remove recurring rule?', 'Future posts will stop immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteRecurringRule(rule.id);
              await reloadRecurring();
            } catch (cause) {
              Alert.alert('Could not remove', errorMessage(cause, 'Try again.'));
            }
          })();
        },
      },
    ]);
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You can log back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await signOut();
            router.replace('/(auth)/login');
          })();
        },
      },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently erases your profile and everything in it — accounts, transactions, budgets, categories and recurring rules. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete forever',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteOwnAccount();
                await supabase.auth.signOut({ scope: 'local' });
                router.replace('/(auth)/login');
              } catch (cause) {
                Alert.alert('Could not delete account', errorMessage(cause, 'Try again.'));
              }
            })();
          },
        },
      ],
    );
  };

  const recCategoryOptions = categories.filter((category) => category.kind === recType);

  return (
    <Screen tabInset refreshing={balancesRefreshing} onRefresh={refreshBalances}>
      <AppText variant="title">Profile</AppText>

      <Card variant="surface" style={styles.profileCard}>
        <Avatar name={editingName ? nameDraft : profile?.full_name} size={56} />
        <View style={styles.profileText}>
          {editingName ? (
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Your name"
              placeholderTextColor={palette.textDim}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void saveName()}
              selectionColor={palette.lime}
              accessibilityLabel="Name"
              style={styles.nameInput}
            />
          ) : (
            <AppText variant="heading">{profile?.full_name ?? 'Your profile'}</AppText>
          )}
          <AppText variant="caption" color={palette.textMuted}>
            {session?.user.email ?? ''}
          </AppText>
          {nameError ? (
            <AppText variant="caption" color={palette.red}>
              {nameError}
            </AppText>
          ) : null}
        </View>
        {editingName ? (
          <View style={styles.nameActions}>
            <IconButton
              icon="x"
              label="Cancel"
              variant="dark"
              size={40}
              iconSize={16}
              disabled={savingName}
              onPress={cancelEditName}
            />
            <IconButton
              icon="check"
              label="Save name"
              variant="lime"
              size={40}
              iconSize={16}
              disabled={savingName}
              onPress={() => void saveName()}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit name"
            hitSlop={12}
            onPress={startEditName}>
            <Feather name="edit-3" size={16} color={palette.textDim} />
          </Pressable>
        )}
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Preferences" />
        <Card variant="surface" padded={false} style={styles.rows}>
          <Row
            icon="globe"
            label="Currency"
            hint={currencyName(currency)}
            value={`${currencySymbol(currency)} ${currency}`}
            onPress={() => setCurrencyOpen(true)}
            last
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Accounts" actionLabel="Add" onAction={openAccountSheet} />
        <Card variant="surface" padded={false} style={styles.rows}>
          {accounts.length === 0 ? (
            <Row icon="plus" label="Add your first account" onPress={openAccountSheet} last />
          ) : (
            accounts.map((account, index) => (
              <Row
                key={account.id}
                icon={ACCOUNT_ICONS[account.kind]}
                label={account.name}
                value={formatMoney(account.balance, currency)}
                last={index === accounts.length - 1}
              />
            ))
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recurring" actionLabel="Add" onAction={openRecurringSheet} />
        {rules.length === 0 ? (
          <Card variant="surface" onPress={openRecurringSheet} style={styles.hintCard}>
            <Feather name="repeat" size={18} color={palette.lime} />
            <View style={styles.hintText}>
              <AppText variant="label">Automate a bill</AppText>
              <AppText variant="caption" color={palette.textMuted}>
                Rent, subscriptions and salary post themselves on schedule.
              </AppText>
            </View>
          </Card>
        ) : (
          <>
            <Card variant="surface" padded={false} style={styles.rows}>
              {rules.map((rule, index) => (
                <Row
                  key={rule.id}
                  icon="repeat"
                  label={rule.note ?? rule.category?.name ?? (rule.type === 'income' ? 'Income' : 'Expense')}
                  hint={`Next ${shortDate(rule.next_run_on)} · ${rule.frequency}`}
                  value={`${rule.type === 'income' ? '+' : '-'}${formatMoney(rule.amount, currency)}`}
                  onLongPress={() => confirmDeleteRule(rule)}
                  last={index === rules.length - 1}
                />
              ))}
            </Card>
            <AppText variant="caption" color={palette.textDim}>
              Long-press a rule to remove it.
            </AppText>
          </>
        )}
      </View>

      <Button label="Sign out" variant="danger" onPress={confirmSignOut} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        hitSlop={10}
        onPress={confirmDeleteAccount}
        style={styles.deleteAccount}>
        <AppText variant="caption" color={palette.red}>
          Delete account
        </AppText>
      </Pressable>
      <AppText variant="caption" color={palette.textDim} style={styles.version}>
        Expns 1.0.0
      </AppText>

      {/* ------------------------------------------------------------ sheets */}

      <Sheet visible={currencyOpen} onClose={() => setCurrencyOpen(false)} title="Currency">
        <View style={styles.chipWrap}>
          {CURRENCIES.map((option) => (
            <Chip
              key={option.code}
              label={`${option.symbol} ${option.code}`}
              active={option.code === currency}
              onPress={() => void pickCurrency(option.code)}
            />
          ))}
        </View>
        <AppText variant="caption" color={palette.textDim}>
          Changing currency only relabels amounts — it doesn&apos;t convert past transactions.
        </AppText>
      </Sheet>

      <Sheet visible={accountOpen} onClose={() => setAccountOpen(false)} title="New account">
        <Field
          label="Name"
          value={accountName}
          onChangeText={setAccountName}
          placeholder="Everyday card"
          autoCapitalize="words"
        />
        <View style={styles.field}>
          <AppText variant="caption" color={palette.textMuted}>
            Type
          </AppText>
          <View style={styles.chipRow}>
            {ACCOUNT_KINDS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                active={accountKind === option.value}
                onPress={() => setAccountKind(option.value)}
              />
            ))}
          </View>
        </View>
        <Field
          label="Opening balance"
          value={openingText}
          onChangeText={setOpeningText}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
        />
        {formError ? (
          <AppText variant="caption" color={palette.red}>
            {formError}
          </AppText>
        ) : null}
        <Button label="Add account" loading={busy} onPress={() => void saveAccount()} />
      </Sheet>

      <Sheet visible={recurringOpen} onClose={() => setRecurringOpen(false)} title="Recurring rule">
        <View style={styles.chipRow}>
          <Chip
            label="Expense"
            active={recType === 'expense'}
            onPress={() => {
              setRecType('expense');
              setRecCategoryId(null);
            }}
          />
          <Chip
            label="Income"
            active={recType === 'income'}
            onPress={() => {
              setRecType('income');
              setRecCategoryId(null);
            }}
          />
        </View>

        <Field
          label="Amount"
          value={recAmount}
          onChangeText={setRecAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
        />

        <View style={styles.field}>
          <AppText variant="caption" color={palette.textMuted}>
            Category
          </AppText>
          <View style={styles.chipWrap}>
            {recCategoryOptions.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                emoji={category.icon}
                active={recCategoryId === category.id}
                onPress={() => setRecCategoryId(category.id)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color={palette.textMuted}>
            Frequency
          </AppText>
          <View style={styles.chipRow}>
            {FREQUENCIES.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                active={recFrequency === option.value}
                onPress={() => setRecFrequency(option.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color={palette.textMuted}>
            Account
          </AppText>
          <View style={styles.chipWrap}>
            {accounts.map((account) => (
              <Chip
                key={account.id}
                label={account.name}
                active={recAccountId === account.id}
                onPress={() => setRecAccountId(account.id)}
              />
            ))}
          </View>
        </View>

        <Field
          label="Note"
          value={recNote}
          onChangeText={setRecNote}
          placeholder="Rent, Netflix…"
          autoCapitalize="sentences"
        />

        <AppText variant="caption" color={palette.textDim}>
          {`First post on ${longDate(toISODate(nextRecurringDate(recFrequency)))} — then it repeats.`}
        </AppText>

        {formError ? (
          <AppText variant="caption" color={palette.red}>
            {formError}
          </AppText>
        ) : null}
        <Button label="Save recurring" loading={busy} onPress={() => void saveRecurring()} />
      </Sheet>
    </Screen>
  );
}

/* --------------------------------------------------------------- row part */

interface RowProps {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  hint?: string;
  value?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  last?: boolean;
}

function Row({ icon, label, hint, value, onPress, onLongPress, last = false }: RowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.rowPressed]}>
      <View style={styles.rowLeft}>
        {icon ? <Feather name={icon} size={16} color={palette.textMuted} /> : null}
        <View style={styles.rowLabel}>
          <AppText variant="label">{label}</AppText>
          {hint ? (
            <AppText variant="caption" color={palette.textDim}>
              {hint}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        {value ? (
          <AppText variant="label" color={palette.textMuted}>
            {value}
          </AppText>
        ) : null}
        {onPress ? <Feather name="chevron-right" size={16} color={palette.textDim} /> : null}
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ styles */

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  profileText: { flex: 1, gap: 2 },
  section: { gap: 14 },
  rows: { overflow: 'hidden', padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  rowPressed: { opacity: 0.85 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowLabel: { flex: 1, gap: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  hintText: { flex: 1, gap: 2 },
  field: { gap: 8 },
  nameInput: {
    fontFamily: fonts.semibold,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.2,
    color: palette.white,
    padding: 0,
    margin: 0,
    borderBottomWidth: 1,
    borderBottomColor: palette.lime,
  },
  nameActions: { flexDirection: 'row', gap: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deleteAccount: { alignSelf: 'center', paddingVertical: 2 },
  version: { textAlign: 'center', marginTop: 4 },
});
