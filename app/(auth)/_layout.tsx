import { Stack } from 'expo-router';

import { useColorScheme } from '@/hooks/useColorScheme';
import { mergeStackHeaderOptions, type AppColorScheme } from '@/navigation/theme';

export default function AuthLayout() {
  const scheme: AppColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <Stack initialRouteName="sign-in" screenOptions={mergeStackHeaderOptions(scheme)}>
      <Stack.Screen
        name="sign-in"
        options={mergeStackHeaderOptions(scheme, { title: 'Entrar' })}
      />
      <Stack.Screen
        name="sign-up"
        options={mergeStackHeaderOptions(scheme, { title: 'Criar conta' })}
      />
    </Stack>
  );
}
