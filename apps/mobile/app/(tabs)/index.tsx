import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';

import { useAuth } from '@/hooks/useAuth';

export default function HomeScreen() {
  const { profile, user, signOut } = useAuth();

  const displayName =
    profile?.display_name?.trim() || user?.email?.split('@')[0] || 'usuário';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Olá, {displayName}</Text>
      <Text style={styles.caption}>
        Você está autenticado. As telas de mês/contas virão nas próximas entregas do backlog.
      </Text>
      <PrimaryButton label="Encerrar sessão" onPress={() => void signOut()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
});
