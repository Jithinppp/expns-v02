import Feather from '@expo/vector-icons/Feather';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Status = 'verifying' | 'verified' | 'failed';

const EXPIRED_COPY =
  'That confirmation link has expired or was already used. Log in, or sign up again for a fresh email.';

/** GoTrue sends readable error codes on the redirect (?error_code=otp_expired). */
function linkErrorCopy(code: string, description?: string): string {
  if (code === 'otp_expired') return EXPIRED_COPY;
  if (code === 'access_denied') {
    return 'Confirmation was cancelled. Open the link in your email to try again.';
  }
  return description?.trim() || "That link didn't work. Log in and try again.";
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
 * Landing page for email confirmation links. Supabase (PKCE flow) sends
 * the user here with `?code=…`; we exchange it for a session — so clicking
 * the link verifies the account AND signs the user in.
 */
export default function ConfirmEmailScreen() {
  const { gate, session } = useAuth();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_code?: string;
    error_description?: string;
  }>();
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');

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

      if (!code) {
        if (!active) return;
        setStatus('failed');
        setMessage('Open the confirmation link from your email to verify your account.');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!active) return;
      if (error) {
        setStatus('failed');
        setMessage(exchangeErrorCopy(error.message));
      } else {
        setStatus('verified');
      }
    })();

    return () => {
      active = false;
    };
  }, [params.code, params.error, params.error_code, params.error_description]);

  const signedIn = Boolean(session) || gate === 'signedIn';

  return (
    <Screen contentStyle={styles.content}>
      <AppText variant="title">Verify email</AppText>

      {status === 'verifying' ? (
        <>
          <Card variant="deep" style={styles.card}>
            <View style={styles.badge}>
              <ActivityIndicator color={palette.lime} />
            </View>
            <AppText variant="heading">Verifying your email…</AppText>
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

      {status === 'verified' ? (
        <>
          <Card variant="green" style={styles.card}>
            <View style={[styles.badge, styles.badgeOk]}>
              <Feather name="check" size={22} color={palette.ink} />
            </View>
            <AppText variant="heading" color={palette.ink}>
              Email verified
            </AppText>
            <AppText variant="caption" color={palette.inkMuted}>
              You&apos;re signed in — welcome to Expns.
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
            <AppText variant="heading">Couldn&apos;t verify</AppText>
            <AppText variant="caption" color={palette.textMuted}>
              {message}
            </AppText>
          </Card>
          <Button
            label={signedIn ? 'Continue to app' : 'Go to log in'}
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
