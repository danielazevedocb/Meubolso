import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, router } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function OnboardingLayout() {
  const { session } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Stack initialRouteName="index">
      <Stack.Screen
        name="index"
        options={{
          title: 'Como você vai usar?',
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
        }}
      />
    </Stack>
  );
}
