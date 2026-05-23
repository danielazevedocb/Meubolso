import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { HeaderBackButton } from 'expo-router/react-navigation';
import { Link, Stack, router } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { mergeStackHeaderOptions, type AppColorScheme } from '@/navigation/theme';

export default function AppLayout() {
  const { session } = useAuth();
  const scheme: AppColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = Colors[scheme];

  return (
    <Stack initialRouteName="index" screenOptions={mergeStackHeaderOptions(scheme)}>
      <Stack.Screen
        name="index"
        options={mergeStackHeaderOptions(scheme, {
          title: 'Como você vai usar?',
          headerTitleAlign: 'left',
          headerBackVisible: false,
          headerRight:
            session != null
              ? () => (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Conta e perfil"
                    hitSlop={12}
                    onPress={() => router.push('/(app)/conta')}
                    style={{
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
        options={mergeStackHeaderOptions(scheme, {
          title: 'Meus grupos',
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              testID="nav-back"
              displayMode="minimal"
              tintColor={palette.text}
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="overview"
        options={mergeStackHeaderOptions(scheme, {
          title: 'Visão geral',
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              testID="nav-back"
              displayMode="minimal"
              tintColor={palette.text}
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Informações do app"
                hitSlop={12}
                style={{
                  marginRight: 15,
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={palette.text}
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        })}
      />
      <Stack.Screen
        name="contas"
        options={mergeStackHeaderOptions(scheme, {
          title: 'Contas',
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              testID="nav-back"
              displayMode="minimal"
              tintColor={palette.text}
              accessibilityLabel="Voltar"
              onPress={() => router.back()}
            />
          ),
        })}
      />
      <Stack.Screen
        name="perfil"
        options={mergeStackHeaderOptions(scheme, { title: 'Conta' })}
      />
      <Stack.Screen
        name="conta"
        options={mergeStackHeaderOptions(scheme, { title: 'Conta' })}
      />
      <Stack.Screen name="add-account" options={{ headerShown: false }} />
    </Stack>
  );
}
