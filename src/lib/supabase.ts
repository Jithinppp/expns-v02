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
 * Where auth emails send the user after Supabase verifies them.
 *
 * Preferred: the hosted verification page — set EXPO_PUBLIC_EMAIL_REDIRECT_URL
 * to its deployed URL (see `verification/`). Reset links add `?type=recovery`
 * (path kept so the `/**` redirect allowlist matches) so the page can show
 * the right copy. Fallback: deep link straight into the matching in-app screen
 * (`expns://auth/confirm` / `expns://auth/reset` in a build; the dev-server
 * URL in Expo Go). Whatever value this returns must be allow-listed under
 * Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export function emailRedirectTo(kind: 'confirm' | 'reset' = 'confirm'): string {
  const path = kind === 'reset' ? 'auth/reset' : 'auth/confirm';
  const hosted = process.env.EXPO_PUBLIC_EMAIL_REDIRECT_URL?.trim();
  if (hosted) {
    const base = hosted.replace(/\/+$/, '');
    return kind === 'reset' ? `${base}/?type=recovery` : base;
  }
  if (Constants.expoGoConfig?.developer) {
    return Linking.createURL(path);
  }
  return `expns://${path}`;
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
