import { useEffect, useRef } from 'react';

import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type RealtimeHub = {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
};

type ScopeFilter = { column: 'group_id' | 'user_id'; value: string };

/** Tabelas com Realtime publicado que afetam a visão de contas/saldo. */
const WATCHED_TABLES = ['bills', 'months'] as const;

/** Um canal por escopo (grupo ou usuário solo); reutilizado entre telas. */
const groupRealtimeHubs = new Map<string, RealtimeHub>();

function ensureRealtimeHub(topic: string, filter: ScopeFilter): RealtimeHub {
  const existing = groupRealtimeHubs.get(topic);
  if (existing) {
    return existing;
  }

  const channel = supabase.channel(topic);
  const hub: RealtimeHub = { channel, listeners: new Set() };
  groupRealtimeHubs.set(topic, hub);

  const notifyListeners = () => {
    groupRealtimeHubs.get(topic)?.listeners.forEach((listener) => listener());
  };

  const filterStr = `${filter.column}=eq.${filter.value}`;
  for (const table of WATCHED_TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: filterStr },
      notifyListeners,
    );
  }
  channel.subscribe();

  return hub;
}

/**
 * Sincronização em tempo real por escopo: subscreve `postgres_changes` em
 * `bills` e `months` filtrado por `group_id` (modo grupo) ou `user_id` (solo).
 * Qualquer alteração dispara `onChange` (com debounce) — usado para recarregar
 * a visão geral / lista de contas sem reload manual. Cleanup ao desmontar.
 *
 * A RLS garante que cada cliente só recebe mudanças que pode ler.
 */
export function useGroupRealtime(input: {
  groupId: string | undefined;
  userId: string | undefined;
  mode: 'solo' | 'group' | undefined;
  enabled: boolean;
  onChange: () => void;
  debounceMs?: number;
}): void {
  // Mantém o callback mais recente sem re-subscrever o canal a cada render.
  const onChangeRef = useRef(input.onChange);
  onChangeRef.current = input.onChange;

  const { enabled, mode, groupId, userId } = input;
  const debounceMs = input.debounceMs ?? 300;

  useEffect(() => {
    if (!enabled || !mode) return;

    const filter: ScopeFilter | null =
      mode === 'group' && groupId
        ? { column: 'group_id', value: groupId }
        : userId
          ? { column: 'user_id', value: userId }
          : null;

    if (!filter) return;

    const topic = `group-realtime:${filter.column}:${filter.value}`;
    const hub = ensureRealtimeHub(topic, filter);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const listener = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        onChangeRef.current();
      }, debounceMs);
    };

    hub.listeners.add(listener);

    return () => {
      if (timer) clearTimeout(timer);
      const current = groupRealtimeHubs.get(topic);
      if (!current) return;

      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        void supabase.removeChannel(current.channel).finally(() => {
          const latest = groupRealtimeHubs.get(topic);
          if (latest && latest.listeners.size === 0) {
            groupRealtimeHubs.delete(topic);
          }
        });
      }
    };
  }, [enabled, mode, groupId, userId, debounceMs]);
}
