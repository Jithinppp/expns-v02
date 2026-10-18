import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { ConfigNotice } from '@/components/ConfigNotice';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button, IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { palette } from '@/constants/theme';
import { friendlyAuthError } from '@/lib/auth-errors';
import { CURRENCIES } from '@/lib/format';
import { emailRedirectTo, supabase } from '@/lib/supabase';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);

  const submit = async () => {
    if (!fullName.trim()) {
      setError('Tell us your name.');
      return;
    }
    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), currency },
        emailRedirectTo: emailRedirectTo(),
      },
    });
    setBusy(false);
    if (signUpError) {
      setError(friendlyAuthError(signUpError.message));
      return;
    }
    if (data.session) {
      router.replace('/(tabs)');
      return;
    }
    setAwaitingEmail(email.trim());
  };

  const resend = async () => {
    if (!awaitingEmail) return;
    setError(null);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: awaitingEmail,
      options: { emailRedirectTo: emailRedirectTo() },
    });
    if (resendError) {
      setError(friendlyAuthError(resendError.message));
      return;
    }
    setInfo('Confirmation email sent again.');
  };

  if (awaitingEmail) {
    return (
      <Screen contentStyle={styles.content}>
        <IconButton
          icon="chevron-left"
          label="Back to log in"
          variant="deep"
          onPress={() => router.replace('/(auth)/login')}
        />
        <Card variant="lime" style={styles.verifyCard}>
          <View style={styles.verifyIcon}>
            <Feather name="mail" size={22} color={palette.ink} />
          </View>
          <AppText variant="heading" color={palette.ink}>
            Check your inbox
          </AppText>
          <AppText variant="caption" color={palette.inkMuted}>
            We sent a confirmation link to {awaitingEmail}. Open it to verify your account, then
            log in here.
          </AppText>
        </Card>
        {error ? <Banner text={error} /> : null}
        {info ? <Banner tone="info" text={info} /> : null}
        <Button label="Go to log in" onPress={() => router.replace('/(auth)/login')} />
        <Button label="Resend email" variant="dark" onPress={() => void resend()} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <View>
        <IconButton
          icon="chevron-left"
          label="Back"
          variant="deep"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
        />
      </View>

      <View style={styles.heading}>
        <AppText variant="title">Create your account</AppText>
        <AppText variant="body" color={palette.textMuted}>
          Set up your expense tracker in under a minute.
        </AppText>
      </View>

      <ConfigNotice />

      <View style={styles.form}>
        <Field
          label="Name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Jithin"
          autoCapitalize="words"
          returnKeyType="next"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          returnKeyType="next"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          returnKeyType="done"
        />
        <View style={styles.currencyBlock}>
          <AppText variant="caption" color={palette.textMuted}>
            Currency
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.currencyRow}>
            {CURRENCIES.map((option) => (
              <Chip
                key={option.code}
                label={`${option.symbol} ${option.code}`}
                active={option.code === currency}
                onPress={() => setCurrency(option.code)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {error ? <Banner text={error} /> : null}
      {info ? <Banner tone="info" text={info} /> : null}

      <Button label="Create account" loading={busy} onPress={() => void submit()} />

      <View style={styles.footer}>
        <AppText variant="label" color={palette.textMuted}>
          Already have an account?
        </AppText>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.replace('/(auth)/login')}>
          <AppText variant="label" color={palette.lime}>
            Log in
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingTop: 12 },
  heading: { gap: 8 },
  form: { gap: 16 },
  currencyBlock: { gap: 8 },
  currencyRow: { gap: 8, paddingRight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  verifyCard: { gap: 14, alignItems: 'flex-start' },
  verifyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
