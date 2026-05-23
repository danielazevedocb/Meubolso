import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import 'react-native-reanimated';

import { SupabaseConfigMissing } from '@/components/SupabaseConfigMissing';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AuthProvider } from '@/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

import { useColorScheme } from '@/hooks/useColorScheme';
import {
  buildNavigationTheme,
  statusBarBackgroundColor,
  statusBarStyle,
  type AppColorScheme,
} from '@/navigation/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded || isSupabaseConfigured) return undefined;
    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync();
    });
    return () => cancelAnimationFrame(frame);
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  if (!isSupabaseConfigured) {
    return <SupabaseConfigMissing />;
  }

  return (
    <AuthProvider>
      <RootGate />
    </AuthProvider>
  );
}

function RootGate() {
  const colorScheme = useColorScheme();
  const scheme: AppColorScheme = colorScheme === 'dark' ? 'dark' : 'light';
  const navigationTheme = buildNavigationTheme(scheme);
  const { session, initialized, routingReady } = useAuth();
  const [bootFallback, setBootFallback] = useState(false);

  const splashMayHide = initialized && (!session || routingReady);
  const canRender = splashMayHide || bootFallback;

  useEffect(() => {
    const timer = setTimeout(() => setBootFallback(true), 12_000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!canRender) return undefined;
    const frame = requestAnimationFrame(() => {
      void SplashScreen.hideAsync();
    });
    return () => cancelAnimationFrame(frame);
  }, [canRender]);

  if (!canRender) {
    return null;
  }

  const gatedAuth = !session;
  const gatedApp = Boolean(session);

  const statusBarBg = statusBarBackgroundColor(scheme);
  const barStyle = statusBarStyle(scheme);

  return (
    <SafeAreaProvider>
      <StatusBar
        style={barStyle}
        {...(Platform.OS === 'android' ? { backgroundColor: statusBarBg } : null)}
      />
      <ThemeProvider value={navigationTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={gatedAuth}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>

          <Stack.Protected guard={gatedApp}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
