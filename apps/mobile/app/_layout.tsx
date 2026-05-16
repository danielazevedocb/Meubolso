import '@/lib/supabase';

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import 'react-native-reanimated';

import { AuthProvider } from '@/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

import { useColorScheme } from '@/hooks/useColorScheme';
import { buildNavigationTheme, type AppColorScheme } from '@/navigation/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) {
    return null;
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
  const { session, initialized, routingReady, onboardingComplete, reopenOnboarding } = useAuth();

  const splashMayHide = initialized && (!session || routingReady);

  useEffect(() => {
    if (!splashMayHide) return undefined;
    const t = requestAnimationFrame(() => {
      void SplashScreen.hideAsync();
    });
    return () => cancelAnimationFrame(t);
  }, [splashMayHide]);

  if (!splashMayHide) {
    return null;
  }

  const gatedAuth = !session;
  /** Grupo: `onboardingComplete` fica true com membros — `reopenOnboarding` força o stack inicial. */
  const gatedOnboarding = Boolean(session && (!onboardingComplete || reopenOnboarding));
  const gatedApp = Boolean(session && onboardingComplete && !reopenOnboarding);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={gatedAuth}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={gatedOnboarding}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>

        <Stack.Protected guard={gatedApp}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
