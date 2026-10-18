import { Redirect, Stack } from 'expo-router';

import { palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function AuthLayout() {
  const { session } = useAuth();

  if (session) return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.bg },
      }}
    />
  );
}
