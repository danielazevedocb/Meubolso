import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';

export default function AddAccountPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar conta</Text>
      <Text style={styles.body}>
        O cadastro detalhado de contas (lista, valores e edição) entra na próxima entrega do app.
        Por enquanto, use a visão geral do mês para acompanhar totais e saldos.
      </Text>
      <PrimaryButton label="Voltar à visão geral" onPress={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.85,
  },
});
