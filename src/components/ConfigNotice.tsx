import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { palette } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';

/** Shown on auth screens until real Supabase credentials are in .env.local. */
export function ConfigNotice() {
  if (isSupabaseConfigured) return null;

  return (
    <Card variant="surface" style={{ gap: 8, borderColor: palette.borderStrong }}>
      <AppText variant="label">Supabase not connected</AppText>
      <AppText variant="caption" color={palette.textMuted}>
        Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then
        restart the dev server.
      </AppText>
    </Card>
  );
}
