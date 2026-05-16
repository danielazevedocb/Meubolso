import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Themed';

import Colors from '@/constants/Colors';

import { useColorScheme } from '@/hooks/useColorScheme';

type Props = {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
};

export function PrimaryButton({ label, onPress, disabled, loading }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || loading }}
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={() => void onPress()}
      style={({ pressed }) => [
        styles.press,
        {
          backgroundColor: tint,
          opacity: pressed || loading ? 0.85 : disabled ? 0.45 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={scheme === 'dark' ? '#000' : '#fff'} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
