import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/Themed';

import Colors from '@/constants/Colors';

import { useColorScheme } from '@/hooks/useColorScheme';

type Props = {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  testID?: PressableProps['testID'];
};

/** Dark theme uses white tint for primary actions — label must be dark for contrast. */
function labelColorForTint(tint: string): string {
  const normalized = tint.trim().toLowerCase();
  if (normalized === '#fff' || normalized === '#ffffff') {
    return '#111827';
  }
  return '#fff';
}

function shellElevation(scheme: 'light' | 'dark') {
  if (scheme === 'light') {
    return {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    } as const;
  }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  } as const;
}

const pressSpring = { damping: 18, stiffness: 420, mass: 0.35 };

export function PrimaryButton({ label, onPress, disabled, loading, testID }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const labelColor = labelColorForTint(tint);
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const shellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    if (disabled || loading || reducedMotion) return;
    scale.value = withSpring(0.98, pressSpring);
  };

  const onPressOut = () => {
    if (disabled || loading || reducedMotion) return;
    scale.value = withSpring(1, pressSpring);
  };

  return (
    <Animated.View style={[styles.buttonShell, shellElevation(scheme), shellStyle]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled || loading }}
        accessibilityLabel={label}
        disabled={disabled || loading}
        onPress={() => void onPress()}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.press,
          {
            backgroundColor: tint,
            opacity: pressed || loading ? 0.88 : disabled ? 0.45 : 1,
          },
        ]}>
        {loading ? (
          <ActivityIndicator color={labelColor} />
        ) : (
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  buttonShell: {
    alignSelf: 'stretch',
    borderRadius: 10,
  },
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
