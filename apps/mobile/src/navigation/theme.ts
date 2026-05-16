import type { Theme } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import Colors from '@/constants/Colors';

export type AppColorScheme = 'light' | 'dark';

export function buildNavigationTheme(scheme: AppColorScheme): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.tint,
      background: palette.background,
      card: palette.surfaceSubtle,
      text: palette.text,
      border: palette.borderSubtle,
    },
  };
}

/** Opaque stack/tab headers — uses elevated surface token, not translucent blur. */
export function stackHeaderScreenOptions(scheme: AppColorScheme): NativeStackNavigationOptions {
  const palette = Colors[scheme];
  return {
    headerTransparent: false,
    headerStyle: { backgroundColor: palette.surfaceSubtle },
    headerShadowVisible: true,
    headerTintColor: palette.text,
    headerTitleStyle: { color: palette.text },
    contentStyle: { backgroundColor: palette.background },
  };
}
