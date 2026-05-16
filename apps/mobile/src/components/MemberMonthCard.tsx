import { Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
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

export function MemberMonthCard({ snapshot, onPress, showOnlineIndicator, isOnline }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const balanceColor = snapshot.balance < 0 ? c.balanceNegative : c.balancePositive;

  const card = (
    <View style={[styles.card, { backgroundColor: c.surfaceSubtle, borderColor: c.borderSubtle }]}>
      <View style={styles.nameRow}>
        <Text style={styles.name}>{snapshot.displayName}</Text>
        {showOnlineIndicator && isOnline ? (
          <View
            accessibilityLabel={`${snapshot.displayName} está online`}
            style={[styles.onlineDot, { backgroundColor: c.balancePositive }]}
          />
        ) : null}
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.caption }]}>Total das contas</Text>
        <Text style={styles.value}>{money.format(snapshot.billsTotal)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.caption }]}>Salário</Text>
        <Text style={styles.value}>{money.format(snapshot.salary)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: c.caption }]}>Saldo</Text>
        <Text style={[styles.valueStrong, { color: balanceColor }]}>
          {money.format(snapshot.balance)}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver contas de ${snapshot.displayName}`}
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
        {card}
      </Pressable>
    );
  }

  return card;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  label: {
    fontSize: 14,
    flexShrink: 1,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
  },
  valueStrong: {
    fontSize: 16,
    fontWeight: '800',
  },
});
