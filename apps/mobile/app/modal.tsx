import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function ModalScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Sobre',
          headerShown: true,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.closeBtn}>
              <Text style={styles.closeLabel}>Fechar</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <Text style={styles.lead}>
          MeuBolso — visão geral das contas e do mês. Use as abas em baixo para navegar.
        </Text>
        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.9,
  },
  closeBtn: {
    marginRight: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  closeLabel: {
    fontSize: 17,
    color: '#2f95dc',
    fontWeight: '600',
  },
});
