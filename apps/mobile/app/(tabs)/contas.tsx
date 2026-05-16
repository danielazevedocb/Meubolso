import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View as RNView,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BillEditorModal } from '@/components/BillEditorModal';
import { DuplicateBillsModal } from '@/components/DuplicateBillsModal';
import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { parseMoneyInput } from '@/forms/bill-form-schema';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useContasScreen } from '@/hooks/useContasScreen';
import { useDuplicateMonthImport } from '@/hooks/useDuplicateMonthImport';
import { useGroupPresence } from '@/hooks/useGroupPresence';
import { formatMonthHeadingPt } from '@/lib/month-key';
import type { BillRow } from '@/types/finance';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

type ThemePalette = (typeof Colors)['light'];

type ContasBillCardProps = {
  bill: BillRow;
  palette: ThemePalette;
  readOnlyMonth: boolean;
  selfUserId: string | undefined;
  onTogglePaid: (billId: string, nextPaid: boolean) => void;
  onEdit: (bill: BillRow) => void;
  onConfirmDelete: (bill: BillRow) => void;
};

const ContasBillCard = memo(function ContasBillCard({
  bill,
  palette,
  readOnlyMonth,
  selfUserId,
  onTogglePaid,
  onEdit,
  onConfirmDelete,
}: ContasBillCardProps) {
  const foreign = !!selfUserId && bill.user_id !== selfUserId;
  const canMutate = !readOnlyMonth;

  const cardShadow = Platform.select({
    ios: {
      shadowColor: '#2f95dc',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
    },
    android: { elevation: 5 },
    default: {},
  });

  const headerTint =
    palette.background === Colors.dark.background
      ? 'rgba(47, 149, 220, 0.16)'
      : 'rgba(47, 149, 220, 0.1)';

  return (
    <RNView
      style={[
        styles.billCard,
        { borderColor: palette.borderSubtle, backgroundColor: palette.surfaceSubtle },
        cardShadow,
      ]}>
      <RNView style={[styles.billCardHeader, { backgroundColor: headerTint, borderBottomColor: palette.borderSubtle }]}>
        <RNView style={styles.billTop}>
          <RNView style={styles.billTitleCol}>
            <Text style={[styles.billCompany, { color: palette.text }]}>{bill.company}</Text>
            {foreign ? (
              <Text style={[styles.foreignHint, { color: palette.caption }]}>Conta de outro membro</Text>
            ) : null}
          </RNView>
          <Text style={[styles.billAmount, { color: palette.text }]}>{money.format(bill.amount)}</Text>
        </RNView>
      </RNView>
      <RNView style={styles.billCardBody}>
        <RNView style={styles.billMeta}>
          {bill.due_date ? (
            <Text style={[styles.due, { color: palette.caption }]}>Vence em {bill.due_date}</Text>
          ) : (
            <Text style={[styles.due, { color: palette.caption }]}>Sem vencimento</Text>
          )}
          <Text
            style={[styles.paidTag, { color: bill.paid ? palette.balancePositive : palette.caption }]}>
            {bill.paid ? 'Pago' : 'Pendente'}
          </Text>
        </RNView>
        {bill.note ? (
          <Text style={[styles.billNote, { color: palette.caption }]}>{bill.note}</Text>
        ) : null}
        <RNView style={[styles.billActions, { borderTopColor: palette.borderSubtle }]}>
          <RNView style={styles.paidToggle}>
            <Text style={[styles.paidToggleLabel, { color: palette.text }]}>Pago</Text>
            <Switch
              accessibilityLabel={`Marcar ${bill.company} como ${bill.paid ? 'pendente' : 'pago'}`}
              value={bill.paid}
              disabled={!canMutate}
              onValueChange={(v) => onTogglePaid(bill.id, v)}
              trackColor={{ false: '#888', true: palette.tint }}
            />
          </RNView>
          <RNView style={styles.inlineBtns}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Editar ${bill.company}`}
              accessibilityState={{ disabled: !canMutate }}
              disabled={!canMutate}
              onPress={() => onEdit(bill)}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.55 : !canMutate ? 0.35 : 1 }]}>
              <FontAwesome name="pencil" size={18} color={palette.tint} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Excluir ${bill.company}`}
              accessibilityState={{ disabled: !canMutate }}
              disabled={!canMutate}
              onPress={() => onConfirmDelete(bill)}
              style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.55 : !canMutate ? 0.35 : 1 }]}>
              <FontAwesome name="trash" size={18} color={palette.balanceNegative} />
            </Pressable>
          </RNView>
        </RNView>
      </RNView>
    </RNView>
  );
});

export default function ContasScreen() {
  const { profile, user } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
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

  const monthHeading = useMemo(() => formatMonthHeadingPt(monthLabel), [monthLabel]);
  const balanceColor = balance < 0 ? palette.balanceNegative : palette.balancePositive;
  const isGroup = context?.mode === 'group';

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<BillRow | null>(null);
  const [salaryInput, setSalaryInput] = useState('');
  const [monthNoteInput, setMonthNoteInput] = useState('');
  const [monthMetaSaving, setMonthMetaSaving] = useState(false);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const listRef = useRef<FlatList<BillRow>>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardPad(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardPad(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollFooterInputsIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(
    () => {
      if (!monthRow) return;
      setSalaryInput(
        new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(
          monthRow.salary,
        ),
      );
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

  const renderBill = useCallback(
    ({ item }: ListRenderItemInfo<BillRow>) => (
      <ContasBillCard
        bill={item}
        palette={palette}
        readOnlyMonth={readOnlyMonth}
        selfUserId={user?.id}
        onTogglePaid={handleTogglePaid}
        onEdit={openEdit}
        onConfirmDelete={confirmDelete}
      />
    ),
    [confirmDelete, handleTogglePaid, openEdit, palette, readOnlyMonth, user?.id],
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
          onFocus={scrollFooterInputsIntoView}
        />
        <FormTextField
          label="Nota do mês (opcional)"
          value={monthNoteInput}
          onChangeText={setMonthNoteInput}
          multiline
          editable={!!monthRow && status === 'success' && !readOnlyMonth}
          hint="Ex.: pagar com cartão de crédito."
          containerStyle={styles.fieldGap}
          onFocus={scrollFooterInputsIntoView}
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
      scrollFooterInputsIntoView,
      status,
    ],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]} edges={['top']}>
      <RNView style={[styles.topBar, { borderBottomColor: palette.borderSubtle }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.55 : 1 }]}>
          <FontAwesome name="chevron-left" size={22} color={palette.text} />
        </Pressable>
        <RNView style={styles.topTitles}>
          <Text style={[styles.topKicker, { color: palette.tint }]}>Contas do mês</Text>
          <Text style={[styles.screenTitle, { color: palette.text }]}>Contas</Text>
          <Text style={[styles.subTitle, { color: palette.caption }]}>{monthHeading}</Text>
        </RNView>
        <RNView style={styles.topBarTrail}>
          {showImportMenu ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Importar contas do mês anterior"
              hitSlop={12}
              onPress={() => duplicateImport.requestImport(true)}
              style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.55 : 1 }]}>
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
              styles.backBtn,
              {
                opacity:
                  pressed || status !== 'success' || !memberUserId || readOnlyMonth ? 0.4 : 1,
              },
            ]}>
            <FontAwesome name="plus" size={22} color={palette.tint} />
          </Pressable>
        </RNView>
      </RNView>

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
                  onPress={() => setMemberUserId(m.userId)}
                  style={[
                    styles.memberChip,
                    {
                      borderColor: sel ? palette.tint : palette.borderSubtle,
                      backgroundColor: sel ? palette.surfaceSubtle : 'transparent',
                    },
                  ]}>
                  <View style={styles.memberChipInner}>
                    {online ? (
                      <View
                        style={[styles.presenceDot, { backgroundColor: palette.balancePositive }]}
                      />
                    ) : null}
                    <Text style={[styles.memberChipText, { color: sel ? palette.tint : palette.text }]}>
                      {m.displayName}
                    </Text>
                  </View>
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
        <KeyboardAvoidingView
          style={styles.keyboardArea}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 64 : 0}>
          <FlatList
            ref={listRef}
            data={bills}
            keyExtractor={(b) => b.id}
            renderItem={renderBill}
            ListHeaderComponent={listHeader ?? undefined}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: palette.caption }]}>
                {readOnlyMonth
                  ? `Nenhuma conta neste mês para ${activeMemberName}.`
                  : `Nenhuma conta neste mês para ${activeMemberName}. Toque em + para adicionar.`}
              </Text>
            }
            ListFooterComponent={listFooter}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: (keyboardPad > 0 ? keyboardPad + 28 : 32) + insets.bottom,
              },
            ]}
          />
        </KeyboardAvoidingView>
      ) : null}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  keyboardArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitles: {
    flex: 1,
    gap: 2,
  },
  topKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topBarTrail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 14,
    marginTop: 2,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
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
    fontWeight: '600',
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
  billCard: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    overflow: 'hidden',
  },
  billCardHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  billCardBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  billTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  billTitleCol: {
    flex: 1,
    gap: 4,
  },
  billCompany: {
    fontSize: 16,
    fontWeight: '700',
  },
  foreignHint: {
    fontSize: 12,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  billMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  due: {
    fontSize: 13,
  },
  paidTag: {
    fontSize: 13,
    fontWeight: '700',
  },
  billNote: {
    fontSize: 13,
    lineHeight: 18,
  },
  billActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  paidToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paidToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  inlineBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
