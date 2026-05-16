import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet } from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { ScreenBody } from '@/components/ScreenBody';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { setPreferredGroupId } from '@/lib/active-group-preference';
import { setSoloPreference } from '@/lib/onboarding-preference';
import { fetchUserMembershipGroups, type UserGroupMembership } from '@/services/groups';
import { mapPostgrestOrRpcError } from '@/services/supabase-errors';

function labelColorForTint(tint: string): string {
  const normalized = tint.trim().toLowerCase();
  if (normalized === '#fff' || normalized === '#ffffff') {
    return '#111827';
  }
  return '#fff';
}

export default function MyGroupsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const tint = Colors[scheme].tint;
  const labelColor = labelColorForTint(tint);

  const { user, refreshOnboarding } = useAuth();
  const [items, setItems] = useState<UserGroupMembership[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const uid = user?.id;

  const load = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setPhase('ready');
      return;
    }
    setPhase('loading');
    setBanner(null);
    try {
      const rows = await fetchUserMembershipGroups(uid);
      setItems(rows);
      setPhase('ready');
    } catch (e) {
      setBanner(mapPostgrestOrRpcError(e as Error));
      setPhase('ready');
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    if (!uid) return;
    setRefreshing(true);
    setBanner(null);
    try {
      const rows = await fetchUserMembershipGroups(uid);
      setItems(rows);
    } catch (e) {
      setBanner(mapPostgrestOrRpcError(e as Error));
    } finally {
      setRefreshing(false);
    }
  }, [uid]);

  const onPick = async (g: UserGroupMembership) => {
    if (!uid) return;
    setBanner(null);
    setBusyId(g.group_id);
    try {
      await setSoloPreference(false);
      await setPreferredGroupId(g.group_id);
      await refreshOnboarding();
      router.push('/(app)/overview');
    } catch {
      setBanner('Não foi possível entrar neste grupo. Tente novamente.');
    } finally {
      setBusyId(null);
    }
  };

  const listBusy = refreshing || phase === 'loading';

  return (
    <ScreenBody style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Escolha um grupo</Text>
        <Text style={styles.sub}>
          Toque para abrir as contas neste espaço compartilhado. Use sempre que já pertencer a um grupo
          e quiser voltar sem um novo código.
        </Text>

        {banner ? (
          <Text accessibilityRole="alert" style={styles.banner}>
            {banner}
          </Text>
        ) : null}

        {!uid ? (
          <Text style={styles.empty}>Faça login para ver os seus grupos.</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.group_id}
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              listBusy && items.length === 0 ? (
                <ActivityIndicator
                  accessibilityLabel="A carregar grupos"
                  style={styles.spinner}
                  color={tint}
                />
              ) : null
            }
            ListEmptyComponent={
              !listBusy && items.length === 0 ? (
                banner ? (
                  <PrimaryButton label="Tentar novamente" onPress={() => void load()} />
                ) : (
                  <Text style={styles.empty}>
                    Você ainda não participa de nenhum grupo. Crie um ou entre com código de convite na
                    tela anterior.
                  </Text>
                )
              ) : null
            }
            renderItem={({ item }) => {
              const roleLabel = item.role === 'owner' ? 'Administrador' : 'Membro';
              const busy = busyId === item.group_id;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir grupo ${item.group_name}`}
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={() => void onPick(item)}
                  style={({ pressed }) => [
                    styles.rowBtn,
                    {
                      backgroundColor: tint,
                      opacity: pressed || busy ? 0.85 : 1,
                    },
                  ]}>
                  {busy ? (
                    <ActivityIndicator color={labelColor} />
                  ) : (
                    <>
                      <Text style={[styles.rowTitle, { color: labelColor }]}>{item.group_name}</Text>
                      <Text style={[styles.rowMeta, { color: labelColor }]}>{roleLabel}</Text>
                    </>
                  )}
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
          />
        )}
      </View>
    </ScreenBody>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
    marginBottom: 16,
  },
  banner: {
    marginBottom: 14,
    color: '#c62828',
    fontSize: 14,
  },
  spinner: { marginVertical: 24 },
  listContent: {
    paddingBottom: 28,
    flexGrow: 1,
  },
  rowBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 72,
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.85,
  },
  sep: { height: 12 },
  empty: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
    marginTop: 8,
  },
});
