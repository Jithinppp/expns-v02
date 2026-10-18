import Feather from '@expo/vector-icons/Feather';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/Banner';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { friendlyAuthError } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

type Status = 'opening' | 'form' | 'done' | 'failed';

const EXPIRED_COPY =
  'That reset link has expired or was already used. Request a new one from the log in screen.';

/** GoTrue sends readable error codes on the redirect (?error_code=otp_expired). */
function linkErrorCopy(code: string, description?: string): string {
  if (code === 'otp_expired') return EXPIRED_COPY;
  if (code === 'access_denied') {
    return 'Password reset was cancelled. Open the link in your email to try again.';
  }
  return (
    description?.trim() || "That link didn't work. Request a new reset link from the log in screen."
  );
}

function exchangeErrorCopy(message: string): string {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('expired') ||
    normalized.includes('invalid') ||
    normalized.includes('already')
  ) {
    return EXPIRED_COPY;
  }
  return message;
}

/**
 * Landing page for password reset links (Supabase PKCE recovery). Supabase
 * sends the user here with `?code=…`; exchanging it signs them in for one
 * purpose — choosing a new password.
 */
export default function ResetPasswordScreen() {
  const { gate, session } = useAuth();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>();
  const [status, setStatus] = useState<Status>('opening');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      // Parameters normally arrive as route params; fall back to the raw
      // launch URL for safety (cold start through the OS).
      let code = params.code;
      let errorCode = params.error_code ?? params.error;
      let description = params.error_description;

      if (!code && !errorCode) {
        const raw = Linking.getLinkingURL();
        const query = raw ? Linking.parse(raw).queryParams : null;
        const pick = (value: string | string[] | undefined) =>
          Array.isArray(value) ? value[0] : value;
        code = pick(query?.code);
        errorCode = pick(query?.error_code) ?? pick(query?.error);
        description = pick(query?.error_description);
      }

      if (errorCode) {
        if (!active) return;
        setStatus('failed');
        setMessage(linkErrorCopy(errorCode, description));
        return;
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (exchangeError) {
          setStatus('failed');
          setMessage(exchangeErrorCopy(exchangeError.message));
        } else {
          setStatus('form');
        }
        return;
      }

      // No link parameters — allow setting a password while signed in.
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setStatus('form');
      } else {
        setStatus('failed');
        setMessage('Open the reset link from your email to choose a new password.');
      }
    })();

    return () => {
      active = false;
    };
  }, [params.code, params.error, params.error_code, params.error_description]);

  const save = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(friendlyAuthError(updateError.message));
      return;
    }
    setStatus('done');
  };

  const signedIn = Boolean(session) || gate === 'signedIn';

  return (
    <Screen contentStyle={styles.content}>
      <AppText variant="title">New password</AppText>

      {status === 'opening' ? (
        <>
          <Card variant="deep" style={styles.card}>
            <View style={styles.badge}>
              <ActivityIndicator color={palette.lime} />
            </View>
            <AppText variant="heading">Opening your reset link…</AppText>
            <AppText variant="caption" color={palette.textMuted}>
              This only takes a second.
            </AppText>
          </Card>
          <Button
            label="Back to log in"
            variant="ghost"
            onPress={() => router.replace('/(auth)/login')}
          />
        </>
      ) : null}

      {status === 'form' ? (
        <>
          <AppText variant="body" color={palette.textMuted}>
            Choose a new password for your Expns account.
          </AppText>
          <View style={styles.form}>
            <Field
              label="New password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              autoFocus
            />
            <Field
              label="Confirm password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repeat your new password"
              secureTextEntry
              returnKeyType="done"
            />
          </View>
          {error ? <Banner text={error} /> : null}
          <Button label="Save new password" loading={busy} onPress={() => void save()} />
        </>
      ) : null}

      {status === 'done' ? (
        <>
          <Card variant="green" style={styles.card}>
            <View style={[styles.badge, styles.badgeOk]}>
              <Feather name="check" size={22} color={palette.ink} />
            </View>
            <AppText variant="heading" color={palette.ink}>
              Password updated
            </AppText>
            <AppText variant="caption" color={palette.inkMuted}>
              You&apos;re signed in with your new password.
            </AppText>
          </Card>
          <Button label="Start tracking" onPress={() => router.replace('/(tabs)')} />
        </>
      ) : null}

      {status === 'failed' ? (
        <>
          <Card variant="deep" style={styles.card}>
            <View style={[styles.badge, styles.badgeBad]}>
              <Feather name="alert-triangle" size={20} color={palette.red} />
            </View>
            <AppText variant="heading">Couldn&apos;t reset</AppText>
            <AppText variant="caption" color={palette.textMuted}>
              {message}
            </AppText>
          </Card>
          <Button
            label={signedIn ? 'Continue to app' : 'Back to log in'}
            onPress={() => router.replace(signedIn ? '/(tabs)' : '/(auth)/login')}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 20, paddingTop: 40 },
  card: { gap: 12, alignItems: 'flex-start' },
  form: { gap: 16 },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeOk: { backgroundColor: palette.white },
  badgeBad: { backgroundColor: palette.redSoft },
});
