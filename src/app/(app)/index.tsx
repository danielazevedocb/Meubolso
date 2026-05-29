import { router } from 'expo-router';
import { useState } from 'react';

import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { MeubolsoWordmark } from '@/components/shared/MeubolsoWordmark';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBody } from '@/components/ui/ScreenBody';
import { Text, View } from '@/components/ui/Themed';
import { useAuth } from '@/hooks/useAuth';

const ENTER_DURATION = 420;
const STAGGER_MS = 74;

function enterDown(delay: number) {
  return FadeInDown.duration(ENTER_DURATION).delay(delay);
}

export default function HubScreen() {
  const { confirmSoloMode } = useAuth();
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const handleSolo = async () => {
    setBanner(null);
    setBusy(true);
    try {
      await confirmSoloMode();
      router.push('/(app)/overview');
    } catch {
      setBanner('Não foi possível salvar a preferência. Tente de novo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBody style={styles.container}>
      <Animated.View entering={enterDown(0)}>
        <View
          style={styles.titleRow}
          accessible
          accessibilityRole="header"
          accessibilityLabel="Bem-vindo ao MeuBolso">
          <Text style={styles.welcomePrefix} importantForAccessibility="no">
            Bem-vindo ao{' '}
          </Text>
          <MeubolsoWordmark fontSize={24} variant="inline" />
        </View>
      </Animated.View>
      <Animated.View entering={enterDown(STAGGER_MS)}>
        <Text style={styles.sub}>
          Escolha criar um grupo, entrar com código, rever os grupos em que já participa ou usar só para você
          (Eu solo).
        </Text>
      </Animated.View>

      {banner ? (
        <Animated.View entering={FadeIn.duration(260)}>
          <Text accessibilityRole="alert" style={styles.banner}>
            {banner}
          </Text>
        </Animated.View>
      ) : null}

      <Animated.View entering={enterDown(STAGGER_MS * 2)}>
        <PrimaryButton
          testID="hub-create-group"
          label="Criar um grupo"
          disabled={busy}
          onPress={() => router.push('/(app)/create-group')}
        />
      </Animated.View>
      <View style={styles.spacer} />
      <Animated.View entering={enterDown(STAGGER_MS * 3)}>
        <PrimaryButton
          testID="hub-join-code"
          label="Entrar com código de convite"
          disabled={busy}
          onPress={() => router.push('/(app)/join-group')}
        />
      </Animated.View>
      <View style={styles.spacer} />
      <Animated.View entering={enterDown(STAGGER_MS * 4)}>
        <PrimaryButton
          testID="hub-my-groups"
          label="Meus grupos"
          disabled={busy}
          onPress={() => router.push('/(app)/my-groups')}
        />
      </Animated.View>
      <View style={styles.spacer} />
      <Animated.View entering={enterDown(STAGGER_MS * 5)}>
        <PrimaryButton
          testID="hub-solo"
          label="Eu (solo)"
          loading={busy}
          disabled={busy}
          onPress={() => void handleSolo()}
        />
      </Animated.View>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
    justifyContent: 'center',
  },
  titleRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  welcomePrefix: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
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
