import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';

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

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default function HomeScreen() {
  const { profile, user, signOut } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const selfName =
    profile?.display_name?.trim() || user?.email?.split('@')[0] || 'Você';

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
  const groupBillsTotal = members.reduce((acc, m) => acc + m.billsTotal, 0);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.screenTitle}>Visão geral do mês</Text>

        <View style={[styles.monthBar, { borderColor: palette.borderSubtle }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mês anterior"
            hitSlop={8}
            onPress={goPrevMonth}
            style={({ pressed }) => [styles.monthChevron, { opacity: pressed ? 0.55 : 1 }]}>
            <FontAwesome name="chevron-left" size={18} color={palette.tint} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthTitle}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Próximo mês"
            hitSlop={8}
            onPress={goNextMonth}
            style={({ pressed }) => [styles.monthChevron, { opacity: pressed ? 0.55 : 1 }]}>
            <FontAwesome name="chevron-right" size={18} color={palette.tint} />
          </Pressable>
        </View>

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
              <Text style={{ fontWeight: '700' }}>{formatMonthHeadingPt(duplicateImport.sourceMonthLabel)}</Text>?
              Os salários serão alinhados ao mês anterior; a nota do mês não é copiada.
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
          <Text style={[styles.modeHint, { color: palette.caption }]}>
            {context.mode === 'solo'
              ? 'Modo solo — só suas contas entram aqui.'
              : 'Grupo — cada pessoa com seu salário e contas.'}
          </Text>
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

        {status === 'success' && members.length === 0 ? (
          <Text style={[styles.empty, { color: palette.caption }]}>
            Nenhum membro encontrado para este contexto. Verifique o grupo ou entre de novo.
          </Text>
        ) : null}

        {status === 'success' && members.length > 0 ? (
          <View style={styles.cards}>
            {members.map((m) => (
              <MemberMonthCard
                key={m.userId}
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
            ))}
          </View>
        ) : null}

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
            style={({ pressed }) => [
              styles.signOut,
              { opacity: pressed ? 0.65 : 1 },
            ]}>
            <Text style={[styles.signOutText, { color: palette.tint }]}>Encerrar sessão</Text>
          </Pressable>
        </View>
      </ScrollView>

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
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 8,
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
    fontSize: 16,
    fontWeight: '700',
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
  modeHint: {
    fontSize: 14,
    lineHeight: 20,
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
  cards: {
    gap: 14,
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
