import FontAwesome from '@expo/vector-icons/FontAwesome';
import { memo } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  View as RNView,
} from 'react-native';

import { Text } from '@/components/ui/Themed';
import Colors from '@/constants/Colors';
import type { BillRow } from '@/types/finance';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export type ThemePalette = (typeof Colors)['light'];

export type ContasBillCardProps = {
  bill: BillRow;
  palette: ThemePalette;
  readOnlyMonth: boolean;
  selfUserId: string | undefined;
  onTogglePaid: (billId: string, nextPaid: boolean) => void;
  onEdit: (bill: BillRow) => void;
  onConfirmDelete: (bill: BillRow) => void;
};

export const ContasBillCard = memo(function ContasBillCard({
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

const styles = StyleSheet.create({
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
});
