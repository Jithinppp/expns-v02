import Feather from '@expo/vector-icons/Feather';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { fetchNotifications, markAllNotificationsRead } from '@/lib/queries';
import { useLoad } from '@/lib/use-load';

const KIND_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  budget_threshold: 'alert-circle',
  budget_exceeded: 'alert-triangle',
  recurring_posted: 'repeat',
};

export default function NotificationsScreen() {
  const { session } = useAuth();

  const state = useLoad(async () => {
    const items = await fetchNotifications();
    await markAllNotificationsRead();
    return items;
  });

  const { data, loading, refreshing, reload, refresh } = state;

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (!session) return <Redirect href="/(auth)/login" />;

  const items = data ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh} contentStyle={styles.content}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" label="Back" variant="deep" onPress={() => router.back()} />
        <AppText variant="title">Alerts</AppText>
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator color={palette.lime} style={styles.loader} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No alerts yet"
          message="Budget warnings and recurring posts will land here."
        />
      ) : (
        items.map((item) => {
          const icon = KIND_ICONS[item.kind] ?? 'bell';
          const tone =
            item.kind === 'budget_exceeded'
              ? palette.red
              : item.kind === 'budget_threshold'
                ? palette.lime
                : palette.blue;
          return (
            <Card key={item.id} variant="surface" style={styles.item}>
              <View style={[styles.iconWrap, { backgroundColor: `${tone}22` }]}>
                <Feather name={icon} size={18} color={tone} />
              </View>
              <View style={styles.itemText}>
                <View style={styles.itemTop}>
                  <AppText variant="label" style={styles.itemTitle}>
                    {item.title}
                  </AppText>
                  {!item.read_at ? <View style={styles.unreadDot} /> : null}
                </View>
                {item.body ? (
                  <AppText variant="caption" color={palette.textMuted}>
                    {item.body}
                  </AppText>
                ) : null}
                <AppText variant="caption" color={palette.textDim}>
                  {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
                </AppText>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  loader: { marginTop: 40 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1, gap: 4 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.lime },
});
