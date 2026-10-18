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
 * to its deployed URL (see `verification/`). The page receives the code plus
 * two hints: `?type=recovery` for reset links, and `open=<app url>` in Expo Go
 * (its exp:// URL is the only way back into the app there) so its "Open Expns"
 * button can hand the code along. Fallback without the page: deep link straight
 * into the matching in-app screen (`expns://auth/confirm` / `expns://auth/reset`
 * in a build; the dev-server URL in Expo Go). Whatever value this returns must
 * be allow-listed under Supabase → Authentication → URL Configuration.
 */
export function emailRedirectTo(kind: 'confirm' | 'reset' = 'confirm'): string {
  const path = kind === 'reset' ? 'auth/reset' : 'auth/confirm';
  const isExpoGo = Boolean(Constants.expoGoConfig?.developer);
  const appLink = isExpoGo ? Linking.createURL(path) : `expns://${path}`;

  const hosted = process.env.EXPO_PUBLIC_EMAIL_REDIRECT_URL?.trim();
  if (!hosted) return appLink;

  const base = hosted.replace(/\/+$/, '');
  const query: string[] = [];
  if (kind === 'reset') query.push('type=recovery');
  if (isExpoGo) query.push(`open=${encodeURIComponent(appLink)}`);
  return `${base}/${query.length ? `?${query.join('&')}` : ''}`;
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
