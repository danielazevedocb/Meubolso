import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useClientOnlyValue } from '@/hooks/useClientOnlyValue';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
      }}
    >
        <Tabs.Screen
        name="index"
        options={{
          title: 'Visão geral',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          tabBarStyle: { display: 'none' },
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Informações do app"
                hitSlop={12}
                style={{ marginRight: 15, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                {({ pressed }) => (
                  <FontAwesome
                    name="info-circle"
                    size={25}
                    color={Colors[colorScheme ?? 'light'].text}
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="contas"
        options={{
          href: null,
          title: 'Contas',
          /** Tela em modo “folha”; utilizador volta pela seta. */
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          href: null,
          title: 'Conta',
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="add-account"
        options={{
          href: null,
          title: 'Nova conta',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
          title: 'Tab Two',
          tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
        }}
      />
    </Tabs>
  );
}
