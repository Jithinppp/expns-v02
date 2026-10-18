import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { palette } from '@/constants/theme';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View accessibilityRole="summary" style={styles.root}>
      <View style={styles.iconWrap}>
        <Feather name={icon} size={26} color={palette.lime} />
      </View>
      <AppText variant="heading" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" color={palette.textMuted} style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="dark" style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, gap: 10 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: { textAlign: 'center' },
  message: { textAlign: 'center' },
  action: { alignSelf: 'center', marginTop: 12, paddingHorizontal: 24 },
});
