import 'expo-sqlite/localStorage/install';

import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

/**
 * True once .env.local holds a real project URL + publishable (anon) key.
 * Screens show a setup notice while this is false so the app never crashes
 * on placeholders.
 */
export const isSupabaseConfigured =
  /^https?:\/\//.test(supabaseUrl) && supabaseKey.length > 20;

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseKey : 'placeholder-key',
  {
    auth: {
      // expo-sqlite's localStorage keeps the session on device across launches.
      storage: globalThis.localStorage as unknown as SupportedStorage,
      // PKCE is the recommended flow for mobile apps: the email link comes
      // back as `?code=` which we exchange in src/app/auth/confirm.tsx.
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/**
 * Where confirmation emails send the user after Supabase verifies them.
 *
 * Preferred: the hosted verification page — set EXPO_PUBLIC_EMAIL_REDIRECT_URL
 * to its deployed URL (see `verification/`). Fallback: deep link straight into
 * the app's own auth/confirm screen (`expns://auth/confirm` in a build; the
 * dev-server URL in Expo Go). Whatever value this returns must be allow-listed
 * under Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export function emailRedirectTo(): string {
  const hosted = process.env.EXPO_PUBLIC_EMAIL_REDIRECT_URL?.trim();
  if (hosted) return hosted;
  if (Constants.expoGoConfig?.developer) {
    return Linking.createURL('auth/confirm');
  }
  return 'expns://auth/confirm';
}

// Only run the token refresh loop while the app is foregrounded.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
