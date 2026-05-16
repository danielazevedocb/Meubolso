import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { mergeStackHeaderOptions, type AppColorScheme } from '@/navigation/theme';

export default function OnboardingLayout() {
  const { session } = useAuth();
  const scheme: AppColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = Colors[scheme];

  return (
    <Stack initialRouteName="index" screenOptions={mergeStackHeaderOptions(scheme)}>
      <Stack.Screen
        name="create-group"
        options={mergeStackHeaderOptions(scheme, { title: 'Criar grupo' })}
      />
      <Stack.Screen
        name="join-group"
        options={mergeStackHeaderOptions(scheme, { title: 'Entrar com código' })}
      />
      <Stack.Screen
        name="my-groups"
        options={mergeStackHeaderOptions(scheme, { title: 'Meus grupos' })}
      />
      <Stack.Screen
        name="conta"
        options={mergeStackHeaderOptions(scheme, { title: 'Conta' })}
      />
      <Stack.Screen
        name="index"
        options={mergeStackHeaderOptions(scheme, {
          title: 'Como você vai usar?',
          headerBackVisible: false,
          headerRight:
            session != null
              ? () => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Conta e perfil"
                    hitSlop={12}
                    onPress={() => router.push('/(onboarding)/conta')}
                    style={{
                      marginRight: 15,
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {({ pressed }) => (
                      <Ionicons
                        name="person-circle-outline"
                        size={28}
                        color={palette.text}
                        style={{ opacity: pressed ? 0.5 : 1 }}
                      />
                    )}
                  </Pressable>
                )
              : undefined,
        })}
      />
    </Stack>
  );
}
