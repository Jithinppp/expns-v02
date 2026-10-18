import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { fonts, palette, radius } from '@/constants/theme';

interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Static prefix inside the input, e.g. a currency symbol. */
  prefix?: string;
  error?: string | null;
  multiline?: boolean;
  returnKeyType?: 'done' | 'next' | 'go';
  style?: StyleProp<ViewStyle>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  prefix,
  error,
  multiline = false,
  returnKeyType,
  style,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={styles.group}>
      {label ? (
        <AppText variant="caption" color={palette.textMuted}>
          {label}
        </AppText>
      ) : null}
      <View
        style={[
          styles.wrap,
          multiline && styles.wrapMultiline,
          focused && styles.wrapFocused,
          error ? styles.wrapError : null,
          style,
        ]}>
        {prefix ? (
          <AppText variant="heading" color={palette.textMuted}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={palette.textDim}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          multiline={multiline}
          returnKeyType={returnKeyType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={palette.lime}
          accessibilityLabel={label ?? placeholder}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={10}
            onPress={() => setHidden((prev) => !prev)}>
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={palette.textDim} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={palette.red}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  wrap: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wrapMultiline: { minHeight: 104, alignItems: 'flex-start', paddingVertical: 14 },
  wrapFocused: { borderColor: palette.lime },
  wrapError: { borderColor: palette.red },
  input: {
    flex: 1,
    color: palette.white,
    fontFamily: fonts.medium,
    fontSize: 15.5,
    paddingVertical: 0,
    minHeight: 54,
  },
  inputMultiline: { minHeight: 76, textAlignVertical: 'top' },
});
