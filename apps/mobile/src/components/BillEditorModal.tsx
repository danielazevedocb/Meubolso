import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { billFormSchema, type BillFormValues, parseMoneyInput } from '@/forms/bill-form-schema';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { BillRow, FinanceContext, MemberRef } from '@/types/finance';

const moneyBr = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatAmountForInput(n: number): string {
  return moneyBr.format(n);
}

type Props = {
  visible: boolean;
  onClose: () => void;
  context: FinanceContext | null;
  members: MemberRef[];
  monthHeading: string;
  authUserId: string | undefined;
  /** Mês encerrado: formulário bloqueado, apenas fechar. */
  readOnly?: boolean;
  /** Bill being edited, or null for new. */
  editing: BillRow | null;
  defaultAssigneeUserId: string;
  onSubmitCreate: (v: {
    userId: string;
    company: string;
    amount: number;
    due_date: string | null;
    paid: boolean;
    note: string | null;
  }) => Promise<void>;
  onSubmitUpdate: (
    billId: string,
    v: {
      userId: string;
      company: string;
      amount: number;
      due_date: string | null;
      paid: boolean;
      note: string | null;
    },
  ) => Promise<void>;
};

export function BillEditorModal({
  visible,
  onClose,
  context,
  members,
  monthHeading,
  authUserId,
  readOnly = false,
  editing,
  defaultAssigneeUserId,
  onSubmitCreate,
  onSubmitUpdate,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const isGroup = context?.mode === 'group';

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: {
      company: '',
      amountInput: '',
      paid: false,
      due_date: '',
      note: '',
      assigneeUserId: defaultAssigneeUserId,
    },
  });

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      reset({
        company: editing.company,
        amountInput: formatAmountForInput(editing.amount),
        paid: editing.paid,
        due_date: editing.due_date ?? '',
        note: editing.note ?? '',
        assigneeUserId: editing.user_id,
      });
    } else {
      reset({
        company: '',
        amountInput: '',
        paid: false,
        due_date: '',
        note: '',
        assigneeUserId: defaultAssigneeUserId,
      });
    }
  }, [visible, editing?.id, defaultAssigneeUserId, editing, reset]);

  const foreignBill =
    !!editing && !!authUserId && editing.user_id !== authUserId;

  const submit = handleSubmit(async (vals) => {
    if (readOnly) return;
    const amount = parseMoneyInput(vals.amountInput);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('amountInput', { message: 'Valor inválido.' });
      return;
    }
    const due = vals.due_date.trim() || null;
    const noteTrim = vals.note.trim() || null;
    const uid = isGroup ? vals.assigneeUserId : defaultAssigneeUserId;

    if (editing) {
      await onSubmitUpdate(editing.id, {
        userId: uid,
        company: vals.company.trim(),
        amount,
        due_date: due,
        paid: vals.paid,
        note: noteTrim,
      });
    } else {
      await onSubmitCreate({
        userId: uid,
        company: vals.company.trim(),
        amount,
        due_date: due,
        paid: vals.paid,
        note: noteTrim,
      });
    }
    onClose();
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.sheet, { backgroundColor: c.background }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>{editing ? 'Editar conta' : 'Nova conta'}</Text>
          <Text style={[styles.subtitle, { color: c.caption }]}>
            {monthHeading}
            {isGroup ? ' · toque em um membro abaixo para atribuir a conta' : ''}
          </Text>

          {readOnly ? (
            <View
              style={[
                styles.banner,
                { borderColor: c.borderSubtle, backgroundColor: c.surfaceSubtle },
              ]}>
              <Text style={styles.bannerText}>
                Este mês está em somente leitura. Não é possível criar ou alterar contas de meses
                anteriores.
              </Text>
            </View>
          ) : null}

          {foreignBill ? (
            <View
              style={[
                styles.banner,
                { borderColor: c.borderSubtle, backgroundColor: c.surfaceSubtle },
              ]}>
              <Text style={styles.bannerText}>
                Esta conta está em nome de outro membro. Ao salvar, as regras do servidor (RLS)
                definem se a alteração é permitida. Se for bloqueado, você verá uma mensagem
                clara na tela principal.
              </Text>
            </View>
          ) : null}

          {isGroup ? (
            <View style={styles.assigneeBlock}>
              <Text style={styles.assigneeLabel}>Membro</Text>
              <Controller
                control={control}
                name="assigneeUserId"
                render={({ field: { value, onChange } }) => (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipsRow}>
                    {members.map((m) => (
                      <Pressable
                        key={m.userId}
                        accessibilityRole="button"
                        accessibilityState={{ selected: value === m.userId, disabled: readOnly }}
                        accessibilityLabel={`Atribuir a ${m.displayName}`}
                        disabled={readOnly}
                        onPress={() => onChange(m.userId)}
                        style={[
                          styles.chip,
                          {
                            borderColor: value === m.userId ? c.tint : c.borderSubtle,
                            backgroundColor:
                              value === m.userId ? c.surfaceSubtle : 'transparent',
                          },
                        ]}>
                        <Text
                          style={[
                            styles.chipText,
                            { color: value === m.userId ? c.tint : c.text },
                          ]}>
                          {m.displayName}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              />
              {errors.assigneeUserId ? (
                <Text accessibilityRole="alert" style={styles.fieldErr}>
                  {errors.assigneeUserId.message}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Controller
            control={control}
            name="company"
            render={({ field: { value, onChange, onBlur } }) => (
              <FormTextField
                label="Empresa ou descrição"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                errorText={errors.company?.message}
                autoCapitalize="sentences"
                editable={!readOnly}
              />
            )}
          />

          <Controller
            control={control}
            name="amountInput"
            render={({ field: { value, onChange, onBlur } }) => (
              <FormTextField
                label="Valor (R$)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="decimal-pad"
                errorText={errors.amountInput?.message}
                hint="Use vírgula para centavos (ex.: 380,50)."
                containerStyle={styles.fieldGap}
                editable={!readOnly}
              />
            )}
          />

          <Controller
            control={control}
            name="due_date"
            render={({ field: { value, onChange, onBlur } }) => (
              <FormTextField
                label="Vencimento"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                errorText={errors.due_date?.message}
                hint="Como preferir (ex.: 10/mai)."
                containerStyle={styles.fieldGap}
                editable={!readOnly}
              />
            )}
          />

          <View style={styles.paidRow}>
            <Text style={styles.paidLabel}>Pago</Text>
            <Controller
              control={control}
              name="paid"
              render={({ field: { value, onChange } }) => (
                <Switch
                  accessibilityLabel="Marcar como pago"
                  value={value}
                  onValueChange={onChange}
                  disabled={readOnly}
                  trackColor={{ false: '#888', true: c.tint }}
                />
              )}
            />
          </View>

          <Controller
            control={control}
            name="note"
            render={({ field: { value, onChange, onBlur } }) => (
              <FormTextField
                label="Nota (opcional)"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                errorText={errors.note?.message}
                multiline
                containerStyle={styles.fieldGap}
                editable={!readOnly}
              />
            )}
          />

          {readOnly ? null : (
            <PrimaryButton
              label={editing ? 'Salvar alterações' : 'Adicionar conta'}
              loading={isSubmitting}
              disabled={isSubmitting}
              onPress={() => {
                void submit().catch(() => {});
              }}
            />
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.65 : 1 }]}>
            <Text style={[styles.secondaryLabel, { color: c.tint }]}>Fechar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  banner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  assigneeBlock: {
    marginBottom: 12,
    gap: 8,
  },
  assigneeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fieldGap: {
    marginTop: 12,
  },
  fieldErr: {
    color: '#c62828',
    fontSize: 13,
    marginTop: 4,
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 12,
    minHeight: 44,
  },
  paidLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
