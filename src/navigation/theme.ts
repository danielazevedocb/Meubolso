import type { Theme } from '@react-navigation/native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

import Colors from '@/constants/Colors';

export type AppColorScheme = 'light' | 'dark';

export function headerBarColor(scheme: AppColorScheme): string {
  return Colors[scheme].headerBar;
}

/** System status bar strip — separate from opaque navigation header below it. */
export function statusBarBackgroundColor(scheme: AppColorScheme): string {
  return scheme === 'dark' ? '#000000' : '#f2f2f7';
}

export function statusBarStyle(scheme: AppColorScheme): 'light' | 'dark' {
  return scheme === 'dark' ? 'light' : 'dark';
}

export function buildNavigationTheme(scheme: AppColorScheme): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const palette = Colors[scheme];
  const headerBg = headerBarColor(scheme);
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.tint,
      background: palette.background,
      card: headerBg,
      text: palette.text,
      border: palette.borderSubtle,
    },
  };
}

/**
 * Opaque stack/tab headers — native bar only, no custom `header` / `headerBackground`.
 *
 * On Android, do not set `statusBarTranslucent: false`: React Navigation maps that boolean to
 * `headerTopInsetEnabled`, so `false` disables top inset even when safe-area `top` is non-zero
 * (edge-to-edge / modern devices) and the header draws under the status bar.
 * Leave translucency unset so inset follows `useSafeAreaInsets().top`.
 *
 * Custom headers duplicated status-bar inset (wrapper padding + Header spacer) → extra-tall bar.
 * `headerBackground` forces translucent mode and content draws under the bar on Android.
 */
export function stackHeaderScreenOptions(scheme: AppColorScheme): NativeStackNavigationOptions {
  const palette = Colors[scheme];
  const headerBg = headerBarColor(scheme);

  const statusBarBg = statusBarBackgroundColor(scheme);
  const barStyle = statusBarStyle(scheme);

  return {
    headerTransparent: false,
    headerStyle: { backgroundColor: headerBg },
    headerBlurEffect: 'none',
    headerShadowVisible: Platform.OS !== 'android',
    headerTintColor: palette.text,
    headerTitleStyle: { color: palette.text },
    contentStyle: { backgroundColor: palette.background },
    scrollEdgeEffects: { top: 'hidden' },
    statusBarStyle: barStyle,
    ...(Platform.OS === 'android'
      ? {
          statusBarColor: statusBarBg,
        }
      : null),
  };
}

/** Visão geral / modal pattern — per-screen `Stack.Screen` must spread this or options reset the opaque bar. */
export function mergeStackHeaderOptions(
  scheme: AppColorScheme,
  overrides: NativeStackNavigationOptions = {},
): NativeStackNavigationOptions {
  return {
    ...stackHeaderScreenOptions(scheme),
    headerShown: true,
    ...overrides,
  };
}
