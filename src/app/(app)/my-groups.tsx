import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet } from 'react-native';

import { useFocusEffect } from 'expo-router';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBody } from '@/components/ui/ScreenBody';
import { Text, View } from '@/components/ui/Themed';
import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useColorScheme } from '@/hooks/useColorScheme';
import { getPreferredGroupId, setPreferredGroupId } from '@/lib/active-group-preference';
import { setSoloPreference } from '@/lib/onboarding-preference';
import {
  deleteGroupAsCreator,
  fetchUserMembershipGroups,
  leaveGroupMembership,
  type UserGroupMembership,
} from '@/services/groups';
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
  const palette = Colors[scheme];
  const tint = palette.tint;
  const labelColor = labelColorForTint(tint);

  const { user, refreshOnboarding } = useAuth();
  const [items, setItems] = useState<UserGroupMembership[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

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
    if (!uid || removingId) return;
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

  const clearPreferredIfMatches = async (groupId: string) => {
    const preferred = await getPreferredGroupId();
    if (preferred === groupId) {
      await setPreferredGroupId(null);
    }
  };

  const performRemove = async (g: UserGroupMembership) => {
    setBanner(null);
    setRemovingId(g.group_id);
    try {
      if (g.role === 'owner') {
        await deleteGroupAsCreator(g.group_id);
      } else {
        await leaveGroupMembership(g.group_id);
      }
      await clearPreferredIfMatches(g.group_id);
      setItems((prev) => prev.filter((row) => row.group_id !== g.group_id));
    } catch (e) {
      setBanner(mapPostgrestOrRpcError(e as Error));
    } finally {
      setRemovingId(null);
    }
  };

  const confirmRemove = (g: UserGroupMembership) => {
    const isOwner = g.role === 'owner';
    Alert.alert(
      isOwner ? 'Excluir grupo?' : 'Sair do grupo?',
      isOwner
        ? `O grupo "${g.group_name}" será removido para todos os membros. Esta ação não pode ser desfeita.`
        : `Você deixa de ver as contas compartilhadas de "${g.group_name}". Pode entrar de novo com o código de convite.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isOwner ? 'Excluir grupo' : 'Sair do grupo',
          style: 'destructive',
          onPress: () => void performRemove(g),
        },
      ],
    );
  };

  const listBusy = refreshing || phase === 'loading';

  return (
    <ScreenBody style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Escolha um grupo</Text>
        <Text style={styles.sub}>
          Toque para abrir as contas neste espaço compartilhado. Use o ícone de lixeira para sair do grupo
          ou, se for administrador, excluir o grupo para todos.
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
              const opening = busyId === item.group_id;
              const removing = removingId === item.group_id;
              const rowBusy = opening || removing;
              const isOwner = item.role === 'owner';
              return (
                <View style={styles.rowWrap}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir grupo ${item.group_name}`}
                    accessibilityState={{ disabled: rowBusy }}
                    disabled={rowBusy}
                    onPress={() => void onPick(item)}
                    style={({ pressed }) => [
                      styles.rowBtn,
                      {
                        backgroundColor: tint,
                        opacity: pressed || rowBusy ? 0.85 : 1,
                      },
                    ]}>
                    {opening ? (
                      <ActivityIndicator color={labelColor} />
                    ) : (
                      <>
                        <Text style={[styles.rowTitle, { color: labelColor }]}>{item.group_name}</Text>
                        <Text style={[styles.rowMeta, { color: labelColor }]}>{roleLabel}</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isOwner ? `Excluir grupo ${item.group_name}` : `Sair do grupo ${item.group_name}`
                    }
                    accessibilityState={{ disabled: rowBusy }}
                    disabled={rowBusy}
                    onPress={() => confirmRemove(item)}
                    style={({ pressed }) => [
                      styles.removeBtn,
                      {
                        borderColor: palette.borderSubtle,
                        opacity: pressed || rowBusy ? 0.55 : 1,
                      },
                    ]}>
                    {removing ? (
                      <ActivityIndicator color={palette.balanceNegative} />
                    ) : (
                      <FontAwesome name="trash" size={18} color={palette.balanceNegative} />
                    )}
                  </Pressable>
                </View>
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
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  rowBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 72,
    justifyContent: 'center',
  },
  removeBtn: {
    width: 52,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
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
