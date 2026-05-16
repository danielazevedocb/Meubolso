import { router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

export default function OnboardingHomeScreen() {
  const { confirmSoloMode } = useAuth();
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const handleSolo = async () => {
    setBanner(null);
    setBusy(true);
    try {
      await confirmSoloMode();
      router.replace('/(tabs)');
    } catch {
      setBanner('Não foi possível salvar a preferência. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Como você vai usar?' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Bem-vindo ao Meubolso</Text>
        <Text style={styles.sub}>
          Escolha criar um grupo, entrar com código, rever os grupos em que já participa ou usar no modo
          solo (sem grupo).
        </Text>

        {banner ? (
          <Text accessibilityRole="alert" style={styles.banner}>
            {banner}
          </Text>
        ) : null}

        <PrimaryButton
          label="Criar um grupo"
          disabled={busy}
          onPress={() => router.push('/(onboarding)/create-group')}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          label="Entrar com código de convite"
          disabled={busy}
          onPress={() => router.push('/(onboarding)/join-group')}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          label="Meus grupos"
          disabled={busy}
          onPress={() => router.push('/(onboarding)/my-groups')}
        />
        <View style={styles.spacer} />
        <PrimaryButton
          label="Usar solo (sem grupo)"
          loading={busy}
          disabled={busy}
          onPress={() => void handleSolo()}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
    marginBottom: 28,
  },
  banner: {
    marginBottom: 16,
    color: '#c62828',
    fontSize: 14,
  },
  spacer: {
    height: 12,
  },
});
