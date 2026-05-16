import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View as RNView,
  type ListRenderItemInfo,
} from 'react-native';

import { HeaderBackButton } from '@react-navigation/elements';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { MemberMonthCard } from '@/components/MemberMonthCard';
import { DuplicateBillsModal } from '@/components/DuplicateBillsModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useDuplicateMonthImport } from '@/hooks/useDuplicateMonthImport';
import { useGroupPresence } from '@/hooks/useGroupPresence';
import { useMonthOverview } from '@/hooks/useMonthOverview';
import { formatMonthHeadingPt } from '@/lib/month-key';
import { getSoloPreference, setSoloPreference } from '@/lib/onboarding-preference';
import type { MemberMonthSnapshot } from '@/types/finance';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default function HomeScreen() {
  const navigation = useNavigation();
  const { profile, user, signOut, refreshOnboarding, openOnboardingChooser } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const selfName =
    profile?.display_name?.trim() || user?.email?.split('@')[0] || 'Você';

  const [soloModeFromPrefs, setSoloModeFromPrefs] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getSoloPreference().then((solo) => setSoloModeFromPrefs(solo));
    }, []),
  );

  const {
    monthLabel,
    readOnlyMonth,
    members,
    context,
    status,
    errorMessage,
    reload,
    goPrevMonth,
    goNextMonth,
    activeBillCount,
    previousMonthBillCount,
  } = useMonthOverview({
    userId: user?.id,
    selfDisplayName: selfName,
  });

  const duplicateImport = useDuplicateMonthImport({
    context,
    members: members.map((m) => ({ userId: m.userId, displayName: m.displayName })),
    monthLabel,
    readOnlyMonth,
    activeBillCount,
    previousMonthBillCount,
    authUserId: user?.id,
    reloadData: async () => {
      await reload();
    },
    setErrorMessage: (msg) => {
      if (msg) Alert.alert('Não foi possível preparar a cópia', msg);
    },
  });

  const presenceEnabled =
    status === 'success' && context?.mode === 'group' && members.length > 1;

  const onlineUserIds = useGroupPresence({
    groupId: context?.mode === 'group' ? context.groupId : undefined,
    userId: user?.id,
    enabled: presenceEnabled,
  });

  const monthTitle = formatMonthHeadingPt(monthLabel);
  const handleHomeBackToOnboarding = useCallback(async () => {
    try {
      if (context?.mode === 'solo') {
        await setSoloPreference(false);
        await refreshOnboarding();
      } else {
        await openOnboardingChooser();
        // RootGate precisa de um paint com `reopenOnboarding` antes do replace passar no guard.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }
      router.replace('/(onboarding)');
    } catch {
      Alert.alert(
        'Não foi possível voltar',
        'Tente novamente ou encerre a sessão e entre de novo.',
      );
    }
  }, [context?.mode, refreshOnboarding, openOnboardingChooser]);

  /** Solo ou grupo: seta no header como no onboarding — volta para escolher modo / grupo. */
  const showHomeBackButton = useMemo(() => {
    if (context?.mode === 'group') return true;
    return context?.mode === 'solo' || soloModeFromPrefs;
  }, [context?.mode, soloModeFromPrefs]);

  useLayoutEffect(() => {
    if (showHomeBackButton) {
      navigation.setOptions({
        headerTintColor: palette.text,
        headerStyle: { backgroundColor: palette.background },
        headerLeft: (headerProps) => (
          <HeaderBackButton
            {...headerProps}
            displayMode="minimal"
            tintColor={palette.text}
            accessibilityLabel={
              context?.mode === 'group'
                ? 'Voltar para escolher grupo ou modo de uso'
                : 'Voltar para escolher modo de uso'
            }
            onPress={() => void handleHomeBackToOnboarding()}
          />
        ),
      });
    } else {
      navigation.setOptions({
        headerTintColor: undefined,
        headerStyle: undefined,
        headerLeft: undefined,
      });
    }
  }, [
    navigation,
    showHomeBackButton,
    palette.text,
    palette.background,
    handleHomeBackToOnboarding,
    context?.mode,
  ]);

  const groupBillsTotal = useMemo(
    () => members.reduce((acc, m) => acc + m.billsTotal, 0),
    [members],
  );

  const memberListData = status === 'success' ? members : [];

  const presenceListExtra = useMemo(() => {
    if (!presenceEnabled) return '';
    return Array.from(onlineUserIds)
      .sort()
      .join('|');
  }, [presenceEnabled, onlineUserIds]);

  const renderMemberItem = useCallback(
    ({ item: m }: ListRenderItemInfo<MemberMonthSnapshot>) => (
      <MemberMonthCard
        snapshot={m}
        showOnlineIndicator={presenceEnabled}
        isOnline={onlineUserIds.has(m.userId)}
        onPress={() =>
          router.push({
            pathname: '/(tabs)/contas',
            params: { monthLabel, memberUserId: m.userId },
          })
        }
      />
    ),
    [monthLabel, presenceEnabled, onlineUserIds],
  );

  const listHeader = useMemo(
    () => (
      <>
        <Text style={[styles.screenKicker, { color: palette.tint }]}>Resumo financeiro</Text>
        <Text style={[styles.screenTitle, { color: palette.text }]}>Visão geral do mês</Text>

        <RNView
          style={[
            styles.monthBarOuter,
            {
              borderColor: palette.borderSubtle,
              backgroundColor: palette.surfaceSubtle,
            },
            Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: scheme === 'dark' ? 0.45 : 0.12,
                shadowRadius: 14,
              },
              android: { elevation: 5 },
              default: {},
            }),
          ]}>
          <RNView style={[styles.monthAccent, { backgroundColor: palette.tint }]} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            hitSlop={12}
            onPress={goPrevMonth}
            style={({ pressed }) => [styles.monthChevron, { opacity: pressed ? 0.55 : 1 }]}>
            <FontAwesome name="chevron-left" size={18} color={palette.tint} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: palette.text }]}>{monthTitle}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            hitSlop={12}
            onPress={goNextMonth}
            style={({ pressed }) => [styles.monthChevron, { opacity: pressed ? 0.55 : 1 }]}>
            <FontAwesome name="chevron-right" size={18} color={palette.tint} />
          </Pressable>
        </RNView>

        {readOnlyMonth ? (
          <View
            style={[
              styles.readOnlyBanner,
              { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceSubtle },
            ]}
            accessibilityRole="text">
            <Text style={[styles.readOnlyTitle, { color: palette.text }]}>Somente leitura</Text>
            <Text style={[styles.readOnlyBody, { color: palette.caption }]}>
              Meses anteriores podem ser visualizados, mas não editados.
            </Text>
          </View>
        ) : null}

        {duplicateImport.showEmptyMonthBanner ? (
          <View
            style={[
              styles.dupBanner,
              { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceSubtle },
            ]}
            accessibilityRole="text">
            <Text style={[styles.dupBannerTitle, { color: palette.text }]}>
              Mês sem contas cadastradas
            </Text>
            <Text style={[styles.dupBannerBody, { color: palette.caption }]}>
              Ninguém tem contas neste mês ainda (lista vazia no banco). Deseja copiar as contas de{' '}
              <Text style={{ fontWeight: '700' }}>
                {formatMonthHeadingPt(duplicateImport.sourceMonthLabel)}
              </Text>
              ? Os salários serão alinhados ao mês anterior; a nota do mês não é copiada.
            </Text>
            <View style={styles.dupBannerActions}>
              <PrimaryButton
                label="Copiar do mês anterior"
                onPress={() => duplicateImport.requestImport(false)}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Começar do zero"
                onPress={() => void duplicateImport.dismissBanner()}
                style={({ pressed }) => [styles.dupDismiss, { opacity: pressed ? 0.65 : 1 }]}>
                <Text style={[styles.dupDismissText, { color: palette.tint }]}>Começar do zero</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {context && status === 'success' ? (
          <View
            style={[
              styles.modePill,
              {
                backgroundColor:
                  scheme === 'dark' ? 'rgba(47, 149, 220, 0.12)' : 'rgba(47, 149, 220, 0.08)',
                borderColor: 'rgba(47, 149, 220, 0.35)',
              },
            ]}
            accessibilityRole="text">
            <Text style={[styles.modeHint, { color: palette.caption }]}>
              {context.mode === 'solo'
                ? 'Modo solo — só suas contas entram aqui.'
                : 'Grupo — cada pessoa com seu salário e contas.'}
            </Text>
          </View>
        ) : null}

        {members.length > 1 && status === 'success' ? (
          <Text style={[styles.aggregate, { color: palette.caption }]}>
            Soma das contas no mês:{' '}
            <Text style={[styles.aggregateStrong, { color: palette.text }]}>
              {money.format(groupBillsTotal)}
            </Text>
          </Text>
        ) : null}

        {status === 'loading' || status === 'idle' ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={palette.tint} size="large" />
            <Text style={[styles.loadingText, { color: palette.caption }]}>
              Carregando dados do mês…
            </Text>
          </View>
        ) : null}

        {status === 'error' && errorMessage ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorTitle}>Não foi possível carregar o mês</Text>
            <Text style={styles.errorBody}>{errorMessage}</Text>
            <PrimaryButton label="Tentar novamente" onPress={() => void reload()} />
          </View>
        ) : null}
      </>
    ),
    [
      context,
      duplicateImport,
      errorMessage,
      goNextMonth,
      goPrevMonth,
      groupBillsTotal,
      members.length,
      monthTitle,
      palette.borderSubtle,
      palette.caption,
      palette.surfaceSubtle,
      palette.text,
      palette.tint,
      readOnlyMonth,
      reload,
      scheme,
      status,
    ],
  );

  const listEmpty = useMemo(() => {
    if (status !== 'success' || members.length > 0) return null;
    return (
      <Text style={[styles.empty, { color: palette.caption }]}>
        Nenhum membro encontrado para este contexto. Verifique o grupo ou entre de novo.
      </Text>
    );
  }, [members.length, palette.caption, status]);

  const listFooter = useMemo(
    () => (
      <View style={styles.actions}>
        <PrimaryButton
          label="Adicionar nova conta"
          disabled={readOnlyMonth}
          onPress={() =>
            router.push({
              pathname: '/(tabs)/contas',
              params: { monthLabel, memberUserId: user?.id ?? '' },
            })
          }
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Encerrar sessão"
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.65 : 1 }]}>
          <Text style={[styles.signOutText, { color: palette.tint }]}>Encerrar sessão</Text>
        </Pressable>
      </View>
    ),
    [monthLabel, palette.tint, readOnlyMonth, signOut, user?.id],
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={memberListData}
        keyExtractor={(m) => m.userId}
        renderItem={renderMemberItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={MemberRowSeparator}
        extraData={presenceListExtra}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      />

      <DuplicateBillsModal
        visible={duplicateImport.modalVisible}
        preview={duplicateImport.preview}
        loadingPreview={duplicateImport.loadingPreview}
        executing={duplicateImport.executing}
        mergeWarning={duplicateImport.mergeWarning}
        existingBillCount={activeBillCount}
        onClose={duplicateImport.closeModal}
        onConfirm={() => void duplicateImport.submitDuplicate()}
      />
    </View>
  );
}

function MemberRowSeparator() {
  return <RNView style={styles.memberRowSep} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  screenKicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  monthBarOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    paddingLeft: 10,
    gap: 8,
    overflow: 'hidden',
  },
  monthAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  monthChevron: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  readOnlyBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  readOnlyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  readOnlyBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  dupBanner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  dupBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  dupBannerBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  dupBannerActions: {
    gap: 10,
    marginTop: 4,
  },
  dupDismiss: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dupDismissText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modePill: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  modeHint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  aggregate: {
    fontSize: 14,
    lineHeight: 20,
  },
  aggregateStrong: {
    fontWeight: '700',
  },
  loadingBlock: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
  },
  errorBlock: {
    gap: 12,
    paddingVertical: 8,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  errorBody: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
  },
  memberRowSep: {
    height: 14,
  },
  actions: {
    gap: 14,
    marginTop: 8,
  },
  signOut: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
