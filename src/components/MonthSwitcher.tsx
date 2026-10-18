import * as Haptics from 'expo-haptics';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { IconButton } from '@/components/ui/Button';
import { addMonthsToDate, isSameMonth, monthLabel } from '@/lib/format';

interface MonthSwitcherProps {
  month: Date;
  onChange: (next: Date) => void;
  style?: StyleProp<ViewStyle>;
}

export function MonthSwitcher({ month, onChange, style }: MonthSwitcherProps) {
  const atCurrentMonth = isSameMonth(month, new Date());

  return (
    <View style={[styles.row, style]}>
      <IconButton
        icon="chevron-left"
        label="Previous month"
        variant="deep"
        size={38}
        iconSize={18}
        onPress={() => {
          void Haptics.selectionAsync();
          onChange(addMonthsToDate(month, -1));
        }}
      />
      <AppText variant="heading" style={styles.label} numberOfLines={1}>
        {monthLabel(month)}
      </AppText>
      <IconButton
        icon="chevron-right"
        label="Next month"
        variant="deep"
        size={38}
        iconSize={18}
        disabled={atCurrentMonth}
        onPress={() => {
          if (atCurrentMonth) return;
          void Haptics.selectionAsync();
          onChange(addMonthsToDate(month, 1));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { minWidth: 128, textAlign: 'center' },
});
