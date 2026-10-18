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
 * Where the confirmation email sends the user after Supabase verifies them.
 *
 * Preferred: the hosted verification page — set EXPO_PUBLIC_EMAIL_REDIRECT_URL
 * to its deployed URL (see `verification/`). The link arrives with `?code=`
 * plus `open=<app url>` in Expo Go, so the page's "Open Expns" button can hand
 * the code back to the running app (a real build uses `expns://`). Without the
 * page, confirmation links deep-link straight to the app's own auth/confirm
 * screen. Whatever value this returns must be allow-listed under Supabase →
 * Authentication → URL Configuration.
 *
 * Password resets don't pass through here: the reset email template links
 * straight to the page, where the new password is set in the browser.
 */
export function emailRedirectTo(): string {
  const isExpoGo = Boolean(Constants.expoGoConfig?.developer);
  const appLink = isExpoGo ? Linking.createURL('auth/confirm') : 'expns://auth/confirm';

  const hosted = process.env.EXPO_PUBLIC_EMAIL_REDIRECT_URL?.trim();
  if (!hosted) return appLink;

  const base = hosted.replace(/\/+$/, '');
  return isExpoGo ? `${base}/?open=${encodeURIComponent(appLink)}` : `${base}/`;
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
