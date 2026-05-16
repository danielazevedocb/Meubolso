import FontAwesome from '@expo/vector-icons/FontAwesome';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { aboutLinks, isConfiguredExternalUrl } from '@/constants/about';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { stackHeaderScreenOptions, type AppColorScheme } from '@/navigation/theme';

function resolveAppVersion(): string {
  return (
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    // fallback em desenvolvimento sem manifest nativo completo
    '—'
  );
}

async function openAboutDestination(url: string): Promise<void> {
  if (url.startsWith('mailto:')) {
    await Linking.openURL(url);
    return;
  }
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

export default function ModalScreen() {
  const router = useRouter();
  const appScheme: AppColorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = Colors[appScheme];
  const version = resolveAppVersion();

  const linkEntries: { key: string; label: string; url: string }[] = [
    aboutLinks.privacyPolicyUrl &&
      isConfiguredExternalUrl(aboutLinks.privacyPolicyUrl) && {
        key: 'privacy',
        label: 'Política de privacidade',
        url: aboutLinks.privacyPolicyUrl,
      },
    aboutLinks.supportUrl &&
      isConfiguredExternalUrl(aboutLinks.supportUrl) && {
        key: 'support',
        label: 'Suporte',
        url: aboutLinks.supportUrl,
      },
    aboutLinks.termsUrl &&
      isConfiguredExternalUrl(aboutLinks.termsUrl) && {
        key: 'terms',
        label: 'Termos de uso',
        url: aboutLinks.termsUrl,
      },
  ].filter((item): item is { key: string; label: string; url: string } => Boolean(item));

  return (
    <>
      <Stack.Screen
        options={{
          ...stackHeaderScreenOptions(appScheme),
          title: 'Sobre',
          headerShown: true,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.closeBtn}>
              <Text style={[styles.closeLabel, { color: palette.tint }]}>Fechar</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <Text style={[styles.appName, { color: palette.text }]}>MeuBolso</Text>
        <Text style={[styles.versionLine, { color: palette.caption }]}>
          Versão {version}
        </Text>
        <Text style={[styles.lead, { color: palette.text }]}>
          Acompanhe contas a pagar e o saldo do mês em conjunto com o seu grupo. Use as abas em
          baixo para mudar de área e registe pagamentos para ver o saldo atualizado.
        </Text>
        {linkEntries.length > 0 ? (
          <View
            style={[
              styles.linkCard,
              {
                borderColor: palette.borderSubtle,
                backgroundColor: palette.surfaceSubtle,
              },
            ]}>
            {linkEntries.map((entry, index) => (
              <Pressable
                key={entry.key}
                accessibilityRole="link"
                accessibilityLabel={`${entry.label} — abre no navegador`}
                onPress={() => void openAboutDestination(entry.url)}
                style={({ pressed }) => [
                  styles.linkRow,
                  index < linkEntries.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: palette.borderSubtle,
                  },
                  { opacity: pressed ? 0.75 : 1 },
                ]}>
                <Text style={[styles.linkLabel, { color: palette.text }]}>{entry.label}</Text>
                <FontAwesome name="chevron-right" size={14} color={palette.caption} />
              </Pressable>
            ))}
          </View>
        ) : null}
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
    gap: 16,
  },
  appName: {
    fontSize: 22,
    fontWeight: '700',
  },
  versionLine: {
    fontSize: 15,
    marginTop: -8,
  },
  lead: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.95,
  },
  linkCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: 8,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  linkLabel: {
    fontSize: 17,
    flex: 1,
    paddingRight: 12,
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
    fontWeight: '600',
  },
});
