import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

/** Entry gate: routes the user to onboarding, auth, or the app. */
export default function Index() {
  const { gate } = useAuth();

  if (gate === 'loading') {
    return (
      <View style={styles.root}>
        <ActivityIndicator color={palette.lime} />
      </View>
    );
  }
  if (gate === 'onboarding') return <Redirect href="/onboarding" />;
  if (gate === 'signedOut') return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
  },
});
