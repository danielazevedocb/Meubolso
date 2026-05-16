import { Stack } from 'expo-router';

import { useColorScheme } from '@/hooks/useColorScheme';
import { stackHeaderScreenOptions, type AppColorScheme } from '@/navigation/theme';

export default function AuthLayout() {
  const scheme: AppColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <Stack
      screenOptions={{ ...stackHeaderScreenOptions(scheme), title: 'Conta' }}
      initialRouteName="sign-in">
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
