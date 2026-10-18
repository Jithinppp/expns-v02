import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { ConfigNotice } from '@/components/ConfigNotice';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { palette } from '@/constants/theme';
import { friendlyAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signInError) {
      setError(friendlyAuthError(signInError.message));
      return;
    }
    router.replace('/(tabs)');
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError('Enter your email first, then tap "Forgot password".');
      return;
    }
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo('Password reset link sent — check your inbox.');
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.heading}>
        <AppText variant="title">Welcome back</AppText>
        <AppText variant="body" color={palette.textMuted}>
          Log in to keep tracking your money.
        </AppText>
      </View>

      <ConfigNotice />

      <View style={styles.form}>
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
          placeholder="••••••••"
          secureTextEntry
          returnKeyType="done"
        />
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => void forgot()}
          style={styles.forgot}>
          <AppText variant="caption" color={palette.textMuted}>
            Forgot password?
          </AppText>
        </Pressable>
      </View>

      {error ? <Banner text={error} /> : null}
      {info ? <Banner tone="info" text={info} /> : null}

      <Button label="Log in" loading={busy} onPress={() => void submit()} />

      <View style={styles.footer}>
        <AppText variant="label" color={palette.textMuted}>
          New here?
        </AppText>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push('/(auth)/signup')}>
          <AppText variant="label" color={palette.lime}>
            Create an account
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingTop: 24 },
  heading: { gap: 8 },
  form: { gap: 16 },
  forgot: { alignSelf: 'flex-end' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
});
