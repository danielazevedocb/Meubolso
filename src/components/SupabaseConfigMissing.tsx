import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';

/**
 * Exibido quando o bundle foi gerado sem EXPO_PUBLIC_SUPABASE_* (comum em builds EAS sem secrets).
 */
export function SupabaseConfigMissing() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Configuração incompleta</Text>
        <Text style={styles.body}>
          Este app precisa das variáveis{' '}
          <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_URL</Text> e{' '}
          <Text style={styles.mono}>EXPO_PUBLIC_SUPABASE_ANON_KEY</Text> no build (EAS Secrets ou
          arquivo .env local).
        </Text>
        <Text style={styles.hint}>
          No painel Expo: projeto Meubolso → Environment variables. Depois gere um novo APK/AAB.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    gap: 12,
    padding: 20,
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
  },
  hint: {
    fontSize: 14,
    opacity: 0.85,
    lineHeight: 20,
  },
});
