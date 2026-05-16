import { getPreferredGroupId } from '@/lib/active-group-preference';
import { supabase } from '@/lib/supabase';
import { getSoloPreference } from '@/lib/onboarding-preference';
import { assertMonthLabel, shiftMonthKey } from '@/lib/month-key';
import { isPostgresUniqueViolation } from '@/services/supabase-errors';
import { fetchGroupInviteCode } from '@/services/groups';
import type { FinanceContext, MemberMonthSnapshot, MemberRef } from '@/types/finance';

type MonthRow = {
  user_id: string;
  salary: number | string | null;
};

type BillRow = {
  user_id: string;
  amount: number | string | null;
  paid: boolean;
};

type BillsAggregate = {
  billsTotal: number;
  paidTotal: number;
};

function toNumber(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function resolveFinanceContext(userId: string): Promise<FinanceContext> {
  const solo = await getSoloPreference();
  if (solo) return { mode: 'solo' };

  const [{ data: memberRows, error }, preferredId] = await Promise.all([
    supabase.from('group_members').select('group_id').eq('user_id', userId).order('joined_at', {
      ascending: true,
    }),
    getPreferredGroupId(),
  ]);

  if (error) throw error;
  const ids = (memberRows ?? []).map((r) => r.group_id as string).filter(Boolean);
  if (ids.length === 0) return { mode: 'solo' };

  const resolved =
    preferredId && ids.includes(preferredId) ? preferredId : ids[0]!;
  return { mode: 'group', groupId: resolved };
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
      if (!insErr) return;
      if (isPostgresUniqueViolation(insErr)) {
        /** Concurrent load / Strict Mode → row already inserted. */
        return;
      }
      throw insErr;
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

async function fetchActiveBillCount(ctx: FinanceContext, monthLabel: string): Promise<number> {
  assertMonthLabel(monthLabel);
  const base = supabase
    .from('bills')
    .select('id', { count: 'exact', head: true })
    .eq('month_label', monthLabel)
    .is('deleted_at', null);

  const q =
    ctx.mode === 'solo' ? base.is('group_id', null) : base.eq('group_id', ctx.groupId);

  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

async function fetchBillsAggregatesByUser(
  ctx: FinanceContext,
  monthLabel: string,
  soloOrAuthUserId: string,
): Promise<Map<string, BillsAggregate>> {
  assertMonthLabel(monthLabel);

  const base = supabase
    .from('bills')
    .select('user_id, amount, paid')
    .eq('month_label', monthLabel)
    .is('deleted_at', null);

  const q =
    ctx.mode === 'solo'
      ? base.is('group_id', null).eq('user_id', soloOrAuthUserId)
      : base.eq('group_id', ctx.groupId);

  const { data, error } = await q;
  if (error) throw error;

  const map = new Map<string, BillsAggregate>();
  for (const row of (data ?? []) as BillRow[]) {
    const uid = row.user_id;
    const amt = toNumber(row.amount);
    const cur = map.get(uid) ?? { billsTotal: 0, paidTotal: 0 };
    cur.billsTotal += amt;
    if (row.paid) cur.paidTotal += amt;
    map.set(uid, cur);
  }
  return map;
}

export async function loadMonthOverview(input: {
  userId: string;
  selfDisplayName: string;
  monthLabel: string;
}): Promise<{
  context: FinanceContext;
  members: MemberMonthSnapshot[];
  activeBillCount: number;
  previousMonthBillCount: number;
}> {
  const monthLabel = assertMonthLabel(input.monthLabel);
  let ctx = await resolveFinanceContext(input.userId);
  if (ctx.mode === 'group') {
    try {
      const inviteCode = await fetchGroupInviteCode(ctx.groupId);
      ctx = { mode: 'group', groupId: ctx.groupId, inviteCode };
    } catch {
      ctx = { mode: 'group', groupId: ctx.groupId };
    }
  }
  const members = await fetchMembersForContext(ctx, input.userId, input.selfDisplayName);
  const memberIds = members.map((m) => m.userId);

  await ensureMonthRows(ctx, monthLabel, memberIds);

  const duplicateSourceMonthLabel = shiftMonthKey(monthLabel, -1);

  const [salaryByUser, billsAggByUser, activeBillCount, previousMonthBillCount] = await Promise.all([
    fetchMonthsTotals(ctx, monthLabel, memberIds),
    fetchBillsAggregatesByUser(ctx, monthLabel, input.userId),
    fetchActiveBillCount(ctx, monthLabel),
    fetchActiveBillCount(ctx, duplicateSourceMonthLabel),
  ]);

  const snapshots: MemberMonthSnapshot[] = members.map((m) => {
    const salary = salaryByUser.get(m.userId) ?? 0;
    const agg = billsAggByUser.get(m.userId) ?? { billsTotal: 0, paidTotal: 0 };
    const billsTotal = agg.billsTotal;
    const paidTotal = agg.paidTotal;
    const balance = salary - billsTotal;
    return {
      userId: m.userId,
      displayName: m.displayName,
      salary,
      billsTotal,
      paidTotal,
      balance,
    };
  });

  return {
    context: ctx,
    members: snapshots,
    activeBillCount,
    previousMonthBillCount,
  };
}
