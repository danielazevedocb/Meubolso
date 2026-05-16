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

/** Dark theme uses white tint for primary actions — label must be dark for contrast. */
function labelColorForTint(tint: string): string {
  const normalized = tint.trim().toLowerCase();
  if (normalized === '#fff' || normalized === '#ffffff') {
    return '#111827';
  }
  return '#fff';
}

export function PrimaryButton({ label, onPress, disabled, loading }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const labelColor = labelColorForTint(tint);

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
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
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
    fontSize: 16,
    fontWeight: '700',
  },
});
