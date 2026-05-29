import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View as RNView,
  type ListRenderItemInfo,
} from 'react-native';

import { BillEditorModal } from '@/components/shared/BillEditorModal';
import { ContasBillCard } from '@/components/shared/ContasBillCard';
import { DuplicateBillsModal } from '@/components/shared/DuplicateBillsModal';
import { FormTextField } from '@/components/ui/FormTextField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Text, View } from '@/components/ui/Themed';
import Colors from '@/constants/Colors';
import { parseMoneyInput } from '@/forms/bill-form-schema';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useContasScreen } from '@/hooks/useContasScreen';
import { useDuplicateMonthImport } from '@/hooks/useDuplicateMonthImport';
import { useGroupPresence } from '@/hooks/useGroupPresence';
import { useGroupRealtime } from '@/hooks/useGroupRealtime';
import { useKeyboardScrollPadding } from '@/hooks/useKeyboardScrollPadding';
import { useSolidStackHeader } from '@/hooks/useSolidStackHeader';
import { formatMonthHeadingPt } from '@/lib/month-key';
import type { BillRow } from '@/types/finance';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formato do campo de salário (sem símbolo de moeda) — distinto de `money`. */
const salaryFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export default function ContasScreen() {
  const { profile, user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams<{ monthLabel?: string; memberUserId?: string }>();

  const selfName =
    profile?.display_name?.trim() || user?.email?.split('@')[0] || 'Você';

  const hook = useContasScreen({
    routeMonthLabel: params.monthLabel,
    routeMemberUserId: params.memberUserId,
    authUserId: user?.id,
    selfDisplayName: selfName,
  });

  const {
    monthLabel,
    readOnlyMonth,
    context,
    members,
    memberUserId,
    setMemberUserId,
    activeMemberName,
    bills,
    monthRow,
    billsTotal,
    balance,
    status,
    errorMessage,
    dismissError,
    setPaidOptimistic,
    removeBillConfirmed,
    createBill,
    saveBill,
    saveMonthSalaryNote,
    refreshMemberData,
    activeBillCount,
    previousMonthBillCount,
    setErrorMessage,
  } = hook;

  const duplicateImport = useDuplicateMonthImport({
    context,
    members,
    monthLabel,
    readOnlyMonth,
    activeBillCount,
    previousMonthBillCount,
    authUserId: user?.id,
    reloadData: async () => {
      if (context && memberUserId) {
        await refreshMemberData(context, memberUserId, monthLabel);
      }
    },
    setErrorMessage,
  });

  const presenceEnabled =
    status === 'success' && context?.mode === 'group' && members.length > 1;

  const onlineUserIds = useGroupPresence({
    groupId: context?.mode === 'group' ? context.groupId : undefined,
    userId: user?.id,
    enabled: presenceEnabled,
  });

  // Recarrega o membro ativo quando contas/salário mudam no servidor (qualquer membro).
  useGroupRealtime({
    groupId: context?.mode === 'group' ? context.groupId : undefined,
    userId: user?.id,
    mode: context?.mode,
    enabled: status === 'success' && !!context && !!memberUserId,
    onChange: () => {
      if (context && memberUserId) {
        void refreshMemberData(context, memberUserId, monthLabel);
      }
    },
  });

  const monthHeading = useMemo(() => formatMonthHeadingPt(monthLabel), [monthLabel]);
  const balanceColor = balance < 0 ? palette.balanceNegative : palette.balancePositive;
  const isGroup = context?.mode === 'group';

  const { scrollRef, contentPaddingBottom, scrollToEndOnFocus } = useKeyboardScrollPadding();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillRow | null>(null);
  const [salaryInput, setSalaryInput] = useState('');
  const [monthNoteInput, setMonthNoteInput] = useState('');
  const [monthMetaSaving, setMonthMetaSaving] = useState(false);

  useEffect(
    () => {
      if (!monthRow) return;
      setSalaryInput(salaryFormatter.format(monthRow.salary));
      setMonthNoteInput(monthRow.note ?? '');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- evita re-sync ao trocar só a referência de `monthRow` no mesmo registro
    [monthRow?.id, monthRow?.salary, monthRow?.note],
  );

  useEffect(() => {
    if (readOnlyMonth && editorOpen) {
      setEditorOpen(false);
      setEditingBill(null);
    }
  }, [readOnlyMonth, editorOpen]);

  const openNew = useCallback(() => {
    if (readOnlyMonth) return;
    setEditingBill(null);
    setEditorOpen(true);
  }, [readOnlyMonth]);

  const openEdit = useCallback(
    (b: BillRow) => {
      if (readOnlyMonth) return;
      setEditingBill(b);
      setEditorOpen(true);
    },
    [readOnlyMonth],
  );

  const confirmDelete = useCallback((b: BillRow) => {
    Alert.alert(
      'Excluir esta conta?',
      `Isso remove "${b.company}" da lista deste mês. A exclusão é aplicada no servidor e pode ser bloqueada se você não tiver permissão.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => void removeBillConfirmed(b.id),
        },
      ],
    );
  }, [removeBillConfirmed]);

  const saveMonthMeta = useCallback(async () => {
    const sal = parseMoneyInput(salaryInput);
    if (!Number.isFinite(sal) || sal < 0) {
      Alert.alert('Salário inválido', 'Informe um valor numérico (ex.: 5.000,00).');
      return;
    }
    setMonthMetaSaving(true);
    try {
      const note = monthNoteInput.trim() || null;
      await saveMonthSalaryNote(sal, note);
    } catch {
      /* erro já exibido no banner */
    } finally {
      setMonthMetaSaving(false);
    }
  }, [monthNoteInput, salaryInput, saveMonthSalaryNote]);

  const handleTogglePaid = useCallback(
    (billId: string, nextPaid: boolean) => void setPaidOptimistic(billId, nextPaid),
    [setPaidOptimistic],
  );

  const {
    showEmptyMonthBanner,
    sourceMonthLabel: duplicateSourceMonthLabel,
    requestImport: requestDuplicateImport,
    dismissBanner: dismissDuplicateBanner,
  } = duplicateImport;

  const listHeader = useMemo(() => {
    if (status !== 'success' || !showEmptyMonthBanner) return null;
    const prevHeading = formatMonthHeadingPt(duplicateSourceMonthLabel);
    return (
      <View
        style={[
          styles.dupBanner,
          { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceSubtle },
        ]}
        accessibilityRole="text">
        <Text style={[styles.dupBannerTitle, { color: palette.text }]}>
          Sugestão: copiar contas
        </Text>
        <Text style={[styles.dupBannerBody, { color: palette.caption }]}>
          {!monthRow
            ? `Sem registro em "months" para ${activeMemberName} neste mês (salário/nota ainda não foram salvos no servidor). `
            : `Há registro do mês para ${activeMemberName}, mas não há contas cadastradas para ninguém neste mês. `}
          Deseja copiar de {prevHeading}? Itens com o mesmo nome (por membro) serão ignorados.
        </Text>
        <View style={styles.dupBannerActions}>
          <PrimaryButton
            label="Copiar do mês anterior"
            onPress={() => requestDuplicateImport(false)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Começar do zero"
            onPress={() => void dismissDuplicateBanner()}
            style={({ pressed }) => [styles.dupDismiss, { opacity: pressed ? 0.65 : 1 }]}>
            <Text style={[styles.dupDismissText, { color: palette.tint }]}>Começar do zero</Text>
          </Pressable>
        </View>
      </View>
    );
  }, [
    status,
    showEmptyMonthBanner,
    duplicateSourceMonthLabel,
    requestDuplicateImport,
    dismissDuplicateBanner,
    palette.borderSubtle,
    palette.surfaceSubtle,
    palette.text,
    palette.caption,
    palette.tint,
    monthRow,
    activeMemberName,
  ]);

  const showImportMenu =
    status === 'success' && !readOnlyMonth && duplicateImport.canOfferImport && activeBillCount > 0;

  useSolidStackHeader(
    {
      headerRight: () => (
        <RNView style={styles.headerActions}>
          {showImportMenu ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Importar contas do mês anterior"
              hitSlop={12}
              onPress={() => duplicateImport.requestImport(true)}
              style={({ pressed }) => [styles.headerIconBtn, { opacity: pressed ? 0.55 : 1 }]}>
              <FontAwesome name="ellipsis-v" size={20} color={palette.tint} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Adicionar conta"
            hitSlop={12}
            disabled={status !== 'success' || !memberUserId || readOnlyMonth}
            onPress={openNew}
            style={({ pressed }) => [
              styles.headerIconBtn,
              {
                opacity:
                  pressed || status !== 'success' || !memberUserId || readOnlyMonth ? 0.4 : 1,
              },
            ]}>
            <FontAwesome name="plus" size={22} color={palette.tint} />
          </Pressable>
        </RNView>
      ),
    },
    [
      showImportMenu,
      status,
      memberUserId,
      readOnlyMonth,
      palette.tint,
      duplicateImport,
      openNew,
    ],
  );

  const listFooter = useMemo(
    () => (
      <RNView style={styles.footer}>
        <RNView
          style={[
            styles.summaryCard,
            { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceSubtle },
            Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: palette.background === Colors.dark.background ? 0.35 : 0.1,
                shadowRadius: 16,
              },
              android: { elevation: 6 },
              default: {},
            }),
          ]}>
          <RNView style={[styles.summaryAccent, { backgroundColor: palette.tint }]} />
          <RNView
            style={[styles.summaryHeader, { borderBottomColor: palette.borderSubtle, backgroundColor: 'rgba(47,149,220,0.1)' }]}>
            <Text style={[styles.summaryKicker, { color: palette.tint }]}>Resumo</Text>
          </RNView>
          <RNView style={styles.summaryRows}>
            <RNView style={[styles.summaryRow, { borderBottomColor: palette.borderSubtle }]}>
              <Text style={[styles.summaryLabel, { color: palette.caption }]}>Total das contas</Text>
              <Text style={[styles.summaryValue, { color: palette.text }]}>{money.format(billsTotal)}</Text>
            </RNView>
            <RNView style={[styles.summaryRow, { borderBottomColor: palette.borderSubtle }]}>
              <Text style={[styles.summaryLabel, { color: palette.caption }]}>Salário (mês)</Text>
              <Text style={[styles.summaryValue, { color: palette.text }]}>
                {money.format(monthRow?.salary ?? 0)}
              </Text>
            </RNView>
            <RNView style={styles.summaryBalanceRow}>
              <Text style={[styles.summaryLabelStrong, { color: palette.caption }]}>Saldo</Text>
              <Text style={[styles.summaryValueStrong, { color: balanceColor }]}>
                {money.format(balance)}
              </Text>
            </RNView>
          </RNView>
        </RNView>

        <Text style={[styles.sectionKicker, { color: palette.tint }]}>Dados do mês</Text>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Salário e nota do mês</Text>
        <Text style={[styles.hint, { color: palette.caption }]}>
          Valem para <Text style={{ fontWeight: '700' }}>{activeMemberName}</Text> neste mês, conforme seu
          grupo ou modo solo.
        </Text>

        <FormTextField
          label="Salário (R$)"
          value={salaryInput}
          onChangeText={setSalaryInput}
          keyboardType="decimal-pad"
          editable={!!monthRow && status === 'success' && !readOnlyMonth}
          hint="Mesmo valor usado na visão geral para o saldo."
          containerStyle={styles.fieldGap}
          onFocus={scrollToEndOnFocus}
        />
        <FormTextField
          label="Nota do mês (opcional)"
          value={monthNoteInput}
          onChangeText={setMonthNoteInput}
          multiline
          editable={!!monthRow && status === 'success' && !readOnlyMonth}
          hint="Ex.: pagar com cartão de crédito."
          containerStyle={styles.fieldGap}
          onFocus={scrollToEndOnFocus}
        />
        <PrimaryButton
          label="Salvar salário e nota do mês"
          onPress={() => void saveMonthMeta()}
          disabled={!monthRow || monthMetaSaving || status !== 'success' || readOnlyMonth}
          loading={monthMetaSaving}
        />
      </RNView>
    ),
    [
      activeMemberName,
      balance,
      balanceColor,
      billsTotal,
      monthMetaSaving,
      monthNoteInput,
      monthRow,
      palette.background,
      palette.borderSubtle,
      palette.caption,
      palette.surfaceSubtle,
      palette.text,
      palette.tint,
      readOnlyMonth,
      salaryInput,
      saveMonthMeta,
      scrollToEndOnFocus,
      status,
    ],
  );

  const keyExtractor = useCallback((b: BillRow) => b.id, []);

  const renderBillItem = useCallback(
    ({ item: bill }: ListRenderItemInfo<BillRow>) => (
      <ContasBillCard
        bill={bill}
        palette={palette}
        readOnlyMonth={readOnlyMonth}
        selfUserId={user?.id}
        onTogglePaid={handleTogglePaid}
        onEdit={openEdit}
        onConfirmDelete={confirmDelete}
      />
    ),
    [palette, readOnlyMonth, user?.id, handleTogglePaid, openEdit, confirmDelete],
  );

  const listEmpty = useMemo(
    () => (
      <Text style={[styles.empty, { color: palette.caption }]}>
        {readOnlyMonth
          ? `Nenhuma conta neste mês para ${activeMemberName}.`
          : `Nenhuma conta neste mês para ${activeMemberName}. Toque em + para adicionar.`}
      </Text>
    ),
    [palette.caption, readOnlyMonth, activeMemberName],
  );

  const contentChrome = (
    <>
      <Text style={[styles.monthHeading, { color: palette.caption }]}>{monthHeading}</Text>

      {readOnlyMonth && status === 'success' ? (
        <View
          style={[
            styles.readOnlyBanner,
            { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceSubtle },
          ]}
          accessibilityRole="text">
          <Text style={[styles.readOnlyTitle, { color: palette.text }]}>Somente leitura</Text>
          <Text style={[styles.readOnlyBody, { color: palette.caption }]}>
            Este mês já encerrou no calendário. Você pode ver valores e status, mas não alterar dados.
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dispensar aviso de erro"
          accessibilityHint={errorMessage}
          hitSlop={8}
          onPress={dismissError}
          style={[styles.errBanner, { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderSubtle }]}>
          <Text style={styles.errText}>{errorMessage}</Text>
          <Text style={[styles.errDismiss, { color: palette.tint }]}>Dispensar</Text>
        </Pressable>
      ) : null}

      {isGroup && members.length > 1 ? (
        <View style={styles.memberPick}>
          <Text style={[styles.memberPickLabel, { color: palette.caption }]}>Membro</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.memberChips}>
            {members.map((m) => {
              const sel = m.userId === memberUserId;
              const online = presenceEnabled && onlineUserIds.has(m.userId);
              return (
                <Pressable
                  key={m.userId}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={
                    online ? `${m.displayName}, online neste dispositivo ou sessão` : m.displayName
                  }
                  android_ripple={{ color: 'rgba(128, 128, 128, 0.22)', foreground: true }}
                  onPress={() => setMemberUserId(m.userId)}
                  style={[
                    styles.memberChip,
                    {
                      borderColor: sel ? palette.tint : palette.borderSubtle,
                      borderWidth: sel ? 2 : StyleSheet.hairlineWidth,
                      backgroundColor: 'transparent',
                    },
                  ]}>
                  <RNView style={styles.memberChipInner}>
                    {online ? (
                      <RNView
                        style={[styles.presenceDot, { backgroundColor: palette.balancePositive }]}
                      />
                    ) : null}
                    <Text suppressHighlighting style={[styles.memberChipText, { color: palette.text }]}>
                      {m.displayName}
                    </Text>
                  </RNView>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <RNView
          style={[
            styles.singleMemberPill,
            { backgroundColor: palette.surfaceSubtle, borderColor: palette.borderSubtle },
          ]}>
          <Text style={[styles.singleMemberHint, { color: palette.caption }]}>{activeMemberName}</Text>
        </RNView>
      )}
    </>
  );

  return (
    <RNView style={[styles.safe, { backgroundColor: palette.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardFlex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {contentChrome}

        {status === 'loading' || status === 'idle' ? (
          <View style={styles.centered}>
            <ActivityIndicator color={palette.tint} size="large" />
            <Text style={[styles.loadingHint, { color: palette.caption }]}>Carregando contas…</Text>
          </View>
        ) : null}

        {status === 'error' ? (
          <View style={styles.centered}>
            <Text style={styles.errTitle}>Não foi possível carregar as contas</Text>
            {errorMessage ? <Text style={styles.errBody}>{errorMessage}</Text> : null}
            <PrimaryButton label="Voltar" onPress={() => router.back()} />
          </View>
        ) : null}

        {status === 'success' ? (
          <FlatList
            // `scrollRef` é tipado como ScrollView no hook de teclado; FlatList expõe
            // `scrollToEnd` (único método usado por `scrollToEndOnFocus`) em runtime.
            ref={scrollRef as never}
            style={styles.keyboardArea}
            data={bills}
            keyExtractor={keyExtractor}
            renderItem={renderBillItem}
            ListHeaderComponent={listHeader}
            ListFooterComponent={listFooter}
            ListEmptyComponent={listEmpty}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentContainerStyle={[
              styles.listContent,
              {
                flexGrow: 1,
                paddingBottom: contentPaddingBottom,
              },
            ]}
          />
        ) : null}
      </KeyboardAvoidingView>

      <BillEditorModal
        visible={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingBill(null);
        }}
        context={context}
        members={members}
        monthHeading={monthHeading}
        authUserId={user?.id}
        readOnly={readOnlyMonth}
        editing={editingBill}
        defaultAssigneeUserId={memberUserId}
        onSubmitCreate={createBill}
        onSubmitUpdate={saveBill}
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
    </RNView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
  keyboardFlex: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    gap: 4,
  },
  headerIconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthHeading: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dupBanner: {
    marginBottom: 12,
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
  errBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  errText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errDismiss: {
    fontSize: 14,
    fontWeight: '700',
  },
  readOnlyBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
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
  memberPick: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  memberPickLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberChips: {
    gap: 8,
    paddingVertical: 4,
  },
  memberChip: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  memberChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  memberChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  singleMemberPill: {
    alignSelf: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  singleMemberHint: {
    fontSize: 15,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingHint: {
    fontSize: 14,
  },
  errTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  errBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  empty: {
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 24,
    textAlign: 'center',
  },
  footer: {
    marginTop: 8,
    gap: 10,
    paddingBottom: 40,
  },
  summaryCard: {
    position: 'relative',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  summaryAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 1,
  },
  summaryHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  summaryRows: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
    gap: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    marginTop: 4,
    gap: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryLabelStrong: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryValueStrong: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  sectionKicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  fieldGap: {
    marginTop: 4,
  },
});
