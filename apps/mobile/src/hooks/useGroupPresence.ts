import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

function presenceStateToUserIds(state: Record<string, unknown[]>): Set<string> {
  return new Set(Object.keys(state));
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
    const channel = supabase.channel(topic, {
      config: { presence: { key: input.userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        setOnlineUserIds(
          presenceStateToUserIds(channel.presenceState() as Record<string, unknown[]>),
        );
      })
      .on('presence', { event: 'join' }, () => {
        setOnlineUserIds(
          presenceStateToUserIds(channel.presenceState() as Record<string, unknown[]>),
        );
      })
      .on('presence', { event: 'leave' }, () => {
        setOnlineUserIds(
          presenceStateToUserIds(channel.presenceState() as Record<string, unknown[]>),
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: input.userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      setOnlineUserIds(new Set());
    };
  }, [input.enabled, input.groupId, input.userId]);

  return onlineUserIds;
}
