import { Stack } from 'expo-router';

import PerfilScreen from '../(tabs)/perfil';

export default function OnboardingContaScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Conta' }} />
      <PerfilScreen />
    </>
  );
}
