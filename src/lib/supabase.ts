import 'expo-sqlite/localStorage/install';

import { createClient, type SupportedStorage } from '@supabase/supabase-js';
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
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

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
