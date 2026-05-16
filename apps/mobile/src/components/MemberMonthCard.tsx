import FontAwesome from '@expo/vector-icons/FontAwesome';
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View as RNView } from 'react-native';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { MemberMonthSnapshot } from '@/types/finance';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

type Props = {
  snapshot: MemberMonthSnapshot;
  /** Abre a lista de contas do membro no mês atual. */
  onPress?: () => void;
  /** Modo grupo: mostra bolinha quando o membro está com sessão ativa (Realtime Presence). */
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
};

export const MemberMonthCard = memo(function MemberMonthCard({
  snapshot,
  onPress,
  showOnlineIndicator,
  isOnline,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const balanceColor = snapshot.balance < 0 ? c.balanceNegative : c.balancePositive;

  const headerTint =
    scheme === 'dark' ? 'rgba(47, 149, 220, 0.18)' : 'rgba(47, 149, 220, 0.12)';

  const cardShadow =
    scheme === 'dark'
      ? Platform.select({
          ios: {
            shadowColor: '#2f95dc',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.22,
            shadowRadius: 20,
          },
          android: { elevation: 8 },
          default: {},
        })
      : Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
          },
          android: { elevation: 4 },
          default: {},
        });

  const card = (
    <RNView
      style={[
        styles.cardOuter,
        { borderColor: c.borderSubtle, backgroundColor: c.surfaceSubtle },
        cardShadow,
      ]}>
      <RNView
        style={[
          styles.cardHeader,
          { backgroundColor: headerTint, borderBottomColor: c.borderSubtle },
        ]}>
        <RNView style={styles.nameRow}>
          <Text style={[styles.name, { color: c.text }]}>{snapshot.displayName}</Text>
          {showOnlineIndicator && isOnline ? (
            <RNView
              accessibilityLabel={`${snapshot.displayName} está online`}
              style={[styles.onlineDot, { backgroundColor: c.balancePositive }]}
            />
          ) : null}
          {onPress ? (
            <FontAwesome
              name="chevron-right"
              size={18}
              color={c.tint}
              importantForAccessibility="no"
            />
          ) : null}
        </RNView>
      </RNView>

      <RNView style={styles.rows}>
        <RNView style={[styles.row, { borderBottomColor: c.borderSubtle }]}>
          <Text style={[styles.label, { color: c.caption }]}>Total das contas</Text>
          <Text style={[styles.value, { color: c.text }]}>{money.format(snapshot.billsTotal)}</Text>
        </RNView>
        <RNView style={[styles.row, { borderBottomColor: c.borderSubtle }]}>
          <Text style={[styles.label, { color: c.caption }]}>Total pago</Text>
          <Text style={[styles.value, { color: c.balancePositive }]}>
            {money.format(snapshot.paidTotal)}
          </Text>
        </RNView>
        <RNView style={[styles.row, { borderBottomColor: c.borderSubtle }]}>
          <Text style={[styles.label, { color: c.caption }]}>Salário</Text>
          <Text style={[styles.value, { color: c.text }]}>{money.format(snapshot.salary)}</Text>
        </RNView>
        <RNView style={[styles.balanceRow, { borderTopColor: c.borderSubtle }]}>
          <Text style={[styles.labelStrong, { color: c.caption }]}>Saldo</Text>
          <Text style={[styles.balanceValue, { color: balanceColor }]}>
            {money.format(snapshot.balance)}
          </Text>
        </RNView>
      </RNView>
    </RNView>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver contas de ${snapshot.displayName}`}
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }, styles.pressable]}>
        {card}
      </Pressable>
    );
  }

  return card;
});

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 20,
  },
  cardOuter: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardHeader: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    letterSpacing: -0.3,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rows: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  label: {
    fontSize: 14,
    flexShrink: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  labelStrong: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
});
