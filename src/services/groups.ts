import type { User } from '@supabase/supabase-js';
import { generateInviteCode } from '@/lib/invite-code';
import { supabase } from '@/lib/supabase';
import type { InviteLookupRow } from '@/types/database.types';

const MAX_MEMBERS_DEFAULT = 6;

export type UserGroupMembership = {
  group_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  group_name: string;
};

/** Lista grupos em que o utilizador é membro (nome para UI). */
export async function fetchUserMembershipGroups(userId: string): Promise<UserGroupMembership[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id, role, joined_at, groups(name)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const g = row.groups as { name: string } | { name: string }[] | null;
    const nameWrap = Array.isArray(g) ? g[0] : g;
    const name = nameWrap?.name?.trim() || 'Grupo';
    return {
      group_id: row.group_id as string,
      role: row.role as 'owner' | 'member',
      joined_at: row.joined_at as string,
      group_name: name,
    };
  });
}

export async function countUserGroupMemberships(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Garante linha em `public.profiles` para o utilizador autenticado.
 * Necessário para FKs (`months.user_id`, etc.) quando o trigger `on_auth_user_created`
 * não correu (utilizador antigo ou criado manualmente no painel).
 */
export async function ensureSelfProfile(authUser: User): Promise<void> {
  const metaName = authUser.user_metadata?.name;
  const displayName =
    (typeof metaName === 'string' && metaName.trim()) ||
    authUser.email?.split('@')[0]?.trim() ||
    'Utilizador';

  const { error } = await supabase.from('profiles').upsert(
    { id: authUser.id, display_name: displayName },
    { onConflict: 'id' },
  );

  if (error) throw error;
}

export async function lookupInvite(inviteCode: string): Promise<InviteLookupRow[]> {
  const { data, error } = await supabase.rpc('lookup_group_by_invite', {
    p_invite_code: inviteCode.trim(),
  });

  if (error) throw error;
  return (data ?? []) as InviteLookupRow[];
}

export function isGroupFull(row: InviteLookupRow): boolean {
  return row.current_member_count >= MAX_MEMBERS_DEFAULT;
}

export async function joinGroupByInvite(inviteCode: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group_by_invite', {
    p_invite_code: inviteCode.trim(),
  });

  if (error) throw error;
  return data as string;
}

const INSERT_CONFLICT_CODE = '23505';
const MAX_INVITE_RETRIES = 5;

export async function createGroup(input: { name: string; creatorId: string }): Promise<{
  inviteCode: string;
}> {
  const trimmed = input.name.trim();

  for (let attempt = 0; attempt < MAX_INVITE_RETRIES; attempt++) {
    const inviteCode = generateInviteCode();

    // Omit `.insert().select()` so PostgREST does not force `return=representation` SELECT on
    // `groups`; that path can fail against `groups_select_members` until the owner membership row exists.
    const { error } = await supabase.from('groups').insert({
      name: trimmed,
      invite_code: inviteCode,
      created_by: input.creatorId,
    });

    if (!error) {
      return { inviteCode };
    }

    if (error?.code === INSERT_CONFLICT_CODE) {
      continue;
    }

    throw error;
  }

  throw new Error('Não foi possível gerar um código de convite único. Tente novamente.');
}

/** Código de convite atual do grupo (membros: RLS `groups_select_members`). */
export async function fetchGroupInviteCode(groupId: string): Promise<string> {
  const { data, error } = await supabase
    .from('groups')
    .select('invite_code')
    .eq('id', groupId)
    .maybeSingle();

  if (error) throw error;
  const code = typeof data?.invite_code === 'string' ? data.invite_code.trim() : '';
  if (!code) {
    throw new Error('Código de convite indisponível.');
  }
  return code;
}
