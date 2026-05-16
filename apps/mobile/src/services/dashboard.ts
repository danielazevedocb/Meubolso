import { supabase } from '@/lib/supabase';
import { getSoloPreference } from '@/lib/onboarding-preference';
import { assertMonthLabel } from '@/lib/month-key';
import type { FinanceContext, MemberMonthSnapshot, MemberRef } from '@/types/finance';

type MonthRow = {
  user_id: string;
  salary: number | string | null;
};

type BillRow = {
  user_id: string;
  amount: number | string | null;
};

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function resolveFinanceContext(userId: string): Promise<FinanceContext> {
  const solo = await getSoloPreference();
  if (solo) return { mode: 'solo' };

  const { data, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1);

  if (error) throw error;
  const groupId = data?.[0]?.group_id;
  if (!groupId) return { mode: 'solo' };
  return { mode: 'group', groupId };
}

async function fetchGroupMembers(groupId: string): Promise<MemberRef[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, profiles(display_name)')
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const prof = row.profiles as
      | { display_name: string | null }
      | { display_name: string | null }[]
      | null;
    const first = Array.isArray(prof) ? prof[0] : prof;
    const displayName = first?.display_name?.trim() || 'Membro';
    return {
      userId: row.user_id as string,
      displayName,
    };
  });
}

export async function fetchMembersForContext(
  ctx: FinanceContext,
  userId: string,
  selfDisplayName: string,
): Promise<MemberRef[]> {
  if (ctx.mode === 'solo') {
    return [{ userId, displayName: selfDisplayName.trim() || 'Você' }];
  }
  return fetchGroupMembers(ctx.groupId);
}

async function ensureMonthRows(
  ctx: FinanceContext,
  monthLabel: string,
  memberIds: string[],
): Promise<void> {
  assertMonthLabel(monthLabel);

  await Promise.all(
    memberIds.map(async (memberId) => {
      const base = supabase
        .from('months')
        .select('id')
        .eq('month_label', monthLabel)
        .eq('user_id', memberId);

      const q =
        ctx.mode === 'solo'
          ? base.is('group_id', null)
          : base.eq('group_id', ctx.groupId);

      const { data: existing, error: selErr } = await q.maybeSingle();
      if (selErr) throw selErr;
      if (existing) return;

      const insert =
        ctx.mode === 'solo'
          ? { user_id: memberId, month_label: monthLabel, group_id: null as string | null }
          : {
              user_id: memberId,
              month_label: monthLabel,
              group_id: ctx.groupId,
            };

      const { error: insErr } = await supabase.from('months').insert(insert);
      if (insErr) throw insErr;
    }),
  );
}

async function fetchMonthsTotals(
  ctx: FinanceContext,
  monthLabel: string,
  memberIds: string[],
): Promise<Map<string, number>> {
  assertMonthLabel(monthLabel);

  const base = supabase
    .from('months')
    .select('user_id, salary')
    .eq('month_label', monthLabel)
    .in('user_id', memberIds);

  const q = ctx.mode === 'solo' ? base.is('group_id', null) : base.eq('group_id', ctx.groupId);

  const { data, error } = await q;
  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of (data ?? []) as MonthRow[]) {
    map.set(row.user_id, toNumber(row.salary));
  }
  return map;
}

async function fetchBillsTotalsByUser(
  ctx: FinanceContext,
  monthLabel: string,
  userId: string,
): Promise<Map<string, number>> {
  assertMonthLabel(monthLabel);

  const base = supabase
    .from('bills')
    .select('user_id, amount')
    .eq('month_label', monthLabel)
    .is('deleted_at', null);

  const q =
    ctx.mode === 'solo'
      ? base.is('group_id', null).eq('user_id', userId)
      : base.eq('group_id', ctx.groupId);

  const { data, error } = await q;
  if (error) throw error;

  const map = new Map<string, number>();
  for (const row of (data ?? []) as BillRow[]) {
    const uid = row.user_id;
    const prev = map.get(uid) ?? 0;
    map.set(uid, prev + toNumber(row.amount));
  }
  return map;
}

export async function loadMonthOverview(input: {
  userId: string;
  selfDisplayName: string;
  monthLabel: string;
}): Promise<{ context: FinanceContext; members: MemberMonthSnapshot[] }> {
  const monthLabel = assertMonthLabel(input.monthLabel);
  const ctx = await resolveFinanceContext(input.userId);
  const members = await fetchMembersForContext(ctx, input.userId, input.selfDisplayName);
  const memberIds = members.map((m) => m.userId);

  await ensureMonthRows(ctx, monthLabel, memberIds);

  const [salaryByUser, billsByUser] = await Promise.all([
    fetchMonthsTotals(ctx, monthLabel, memberIds),
    fetchBillsTotalsByUser(ctx, monthLabel, input.userId),
  ]);

  const snapshots: MemberMonthSnapshot[] = members.map((m) => {
    const salary = salaryByUser.get(m.userId) ?? 0;
    const billsTotal = billsByUser.get(m.userId) ?? 0;
    const balance = salary - billsTotal;
    return {
      userId: m.userId,
      displayName: m.displayName,
      salary,
      billsTotal,
      balance,
    };
  });

  return { context: ctx, members: snapshots };
}
