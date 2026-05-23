import { useLayoutEffect, type DependencyList } from 'react';
import { useNavigation } from 'expo-router';
import type { NativeStackNavigationOptions } from 'expo-router/build/react-navigation/native-stack';

import { mergeStackHeaderOptions, type AppColorScheme } from '@/navigation/theme';
import { useColorScheme } from '@/hooks/useColorScheme';

/**
 * Re-applies opaque stack header options on the active screen (same as Visão geral `setOptions`).
 * Use when layout `screenOptions` are not enough or when `headerLeft` / `headerRight` change.
 */
export function useSolidStackHeader(
  overrides?: NativeStackNavigationOptions,
  deps: DependencyList = [],
): void {
  const navigation = useNavigation();
  const scheme: AppColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  useLayoutEffect(() => {
    navigation.setOptions(mergeStackHeaderOptions(scheme, overrides));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` carries dynamic header pieces
  }, [navigation, scheme, ...deps]);
}
