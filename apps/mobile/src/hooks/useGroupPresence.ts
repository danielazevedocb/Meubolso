import { useEffect, useState } from 'react';

import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

function presenceStateToUserIds(state: Record<string, unknown[]>): Set<string> {
  return new Set(Object.keys(state));
}

type GroupPresenceHub = {
  channel: RealtimeChannel;
  listeners: Set<(ids: ReadonlySet<string>) => void>;
};

/** Um canal por tópico: `RealtimeClient.channel()` reutiliza o mesmo canal e não permite `.on('presence')` após join. */
const groupPresenceHubs = new Map<string, GroupPresenceHub>();

function ensureGroupPresenceHub(topic: string, userId: string): GroupPresenceHub {
  let hub = groupPresenceHubs.get(topic);
  if (hub) {
    return hub;
  }

  const channel = supabase.channel(topic, {
    config: { presence: { key: userId } },
  });

  hub = { channel, listeners: new Set() };
  groupPresenceHubs.set(topic, hub);

  const notifyListeners = () => {
    const current = groupPresenceHubs.get(topic);
    if (!current) return;
    const ids = presenceStateToUserIds(current.channel.presenceState() as Record<string, unknown[]>);
    const snapshot = new Set(ids);
    current.listeners.forEach((listener) => listener(snapshot));
  };

  channel
    .on('presence', { event: 'sync' }, notifyListeners)
    .on('presence', { event: 'join' }, notifyListeners)
    .on('presence', { event: 'leave' }, notifyListeners)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

  return hub;
}

/**
 * Presence por grupo: canal `group-presence:${groupId}` com `presence.key` = `userId`.
 * Só ativa em modo grupo; requer sessão. Cleanup ao desmontar.
 */
export function useGroupPresence(input: {
  groupId: string | undefined;
  userId: string | undefined;
  enabled: boolean;
}): ReadonlySet<string> {
  const [onlineUserIds, setOnlineUserIds] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (!input.enabled || !input.groupId || !input.userId) {
      setOnlineUserIds(new Set());
      return;
    }

    const topic = `group-presence:${input.groupId}`;
    const hub = ensureGroupPresenceHub(topic, input.userId);

    const listener = (ids: ReadonlySet<string>) => {
      setOnlineUserIds(ids);
    };

    hub.listeners.add(listener);
    listener(presenceStateToUserIds(hub.channel.presenceState() as Record<string, unknown[]>));

    return () => {
      const currentHub = groupPresenceHubs.get(topic);
      if (!currentHub) {
        setOnlineUserIds(new Set());
        return;
      }

      currentHub.listeners.delete(listener);
      setOnlineUserIds(new Set());

      if (currentHub.listeners.size === 0) {
        void supabase.removeChannel(currentHub.channel).finally(() => {
          const latest = groupPresenceHubs.get(topic);
          if (latest && latest.listeners.size === 0) {
            groupPresenceHubs.delete(topic);
          }
        });
      }
    };
  }, [input.enabled, input.groupId, input.userId]);

  return onlineUserIds;
}
