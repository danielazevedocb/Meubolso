import { supabase } from '@/lib/supabase';
import { normalizeBillCompanyKey } from '@/lib/bill-company';
import { assertMonthLabel } from '@/lib/month-key';
import type { FinanceContext, MemberRef } from '@/types/finance';

import { fetchMonthRowForMember } from '@/services/month-settings';

export type SourceBillRow = {
  id: string;
  user_id: string;
  company: string;
  amount: number;
  due_date: string | null;
  note: string | null;
};

export type DuplicatePreviewMember = {
  userId: string;
  displayName: string;
  toInsert: number;
  skippedDuplicate: number;
  sampleLines: { company: string; amount: number }[];
};

export type DuplicatePreview = {
  sourceMonthLabel: string;
  targetMonthLabel: string;
  members: DuplicatePreviewMember[];
  totalToInsert: number;
  totalSkipped: number;
};

async function fetchBillsForMonthAllMembers(
  ctx: FinanceContext,
  monthLabel: string,
): Promise<SourceBillRow[]> {
  assertMonthLabel(monthLabel);
  const base = supabase
    .from('bills')
    .select('id, user_id, company, amount, due_date, note')
    .eq('month_label', monthLabel)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  const q =
    ctx.mode === 'solo' ? base.is('group_id', null) : base.eq('group_id', ctx.groupId);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r) => {
    const amount =
      typeof r.amount === 'number' ? r.amount : Number((r as { amount: string | number }).amount ?? 0);
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      company: r.company as string,
      amount: Number.isFinite(amount) ? amount : 0,
      due_date: (r.due_date as string | null) ?? null,
      note: (r.note as string | null) ?? null,
    };
  });
}

function buildTargetCompanyKeySet(targetBills: SourceBillRow[]): Map<string, Set<string>> {
  const byUser = new Map<string, Set<string>>();
  for (const b of targetBills) {
    const k = normalizeBillCompanyKey(b.company);
    let set = byUser.get(b.user_id);
    if (!set) {
      set = new Set<string>();
      byUser.set(b.user_id, set);
    }
    set.add(k);
  }
  return byUser;
}

export async function buildDuplicatePreview(input: {
  ctx: FinanceContext;
  members: MemberRef[];
  sourceMonthLabel: string;
  targetMonthLabel: string;
}): Promise<DuplicatePreview> {
  const sourceMonthLabel = assertMonthLabel(input.sourceMonthLabel);
  const targetMonthLabel = assertMonthLabel(input.targetMonthLabel);

  const [sourceBills, targetBills] = await Promise.all([
    fetchBillsForMonthAllMembers(input.ctx, sourceMonthLabel),
    fetchBillsForMonthAllMembers(input.ctx, targetMonthLabel),
  ]);

  const targetKeys = buildTargetCompanyKeySet(targetBills);
  const nameByUser = new Map(input.members.map((m) => [m.userId, m.displayName]));

  const byMember = new Map<
    string,
    { toInsert: number; skippedDuplicate: number; sample: { company: string; amount: number }[] }
  >();

  for (const m of input.members) {
    byMember.set(m.userId, { toInsert: 0, skippedDuplicate: 0, sample: [] });
  }

  for (const bill of sourceBills) {
    const rec = byMember.get(bill.user_id);
    if (!rec) continue;
    const norm = normalizeBillCompanyKey(bill.company);
    const existing = targetKeys.get(bill.user_id) ?? new Set<string>();
    if (existing.has(norm)) {
      rec.skippedDuplicate += 1;
      continue;
    }
    rec.toInsert += 1;
    if (rec.sample.length < 4) {
      rec.sample.push({ company: bill.company, amount: bill.amount });
    }
    existing.add(norm);
    targetKeys.set(bill.user_id, existing);
  }

  const membersOut: DuplicatePreviewMember[] = input.members.map((m) => {
    const rec = byMember.get(m.userId)!;
    return {
      userId: m.userId,
      displayName: nameByUser.get(m.userId) ?? 'Membro',
      toInsert: rec.toInsert,
      skippedDuplicate: rec.skippedDuplicate,
      sampleLines: rec.sample,
    };
  });

  const totalToInsert = membersOut.reduce((a, m) => a + m.toInsert, 0);
  const totalSkipped = membersOut.reduce((a, m) => a + m.skippedDuplicate, 0);

  return {
    sourceMonthLabel,
    targetMonthLabel,
    members: membersOut,
    totalToInsert,
    totalSkipped,
  };
}

async function upsertTargetMonthSalariesFromSource(input: {
  ctx: FinanceContext;
  memberUserIds: string[];
  sourceMonthLabel: string;
  targetMonthLabel: string;
}): Promise<void> {
  const sourceMonthLabel = assertMonthLabel(input.sourceMonthLabel);
  const targetMonthLabel = assertMonthLabel(input.targetMonthLabel);

  for (const memberId of input.memberUserIds) {
    const sourceRow = await fetchMonthRowForMember({
      ctx: input.ctx,
      monthLabel: sourceMonthLabel,
      memberUserId: memberId,
    });
    const targetRow = await fetchMonthRowForMember({
      ctx: input.ctx,
      monthLabel: targetMonthLabel,
      memberUserId: memberId,
    });

    const salary = sourceRow?.salary ?? 0;

    if (targetRow) {
      const { error } = await supabase.from('months').update({ salary }).eq('id', targetRow.id);
      if (error) throw error;
    } else {
      const insert =
        input.ctx.mode === 'solo'
          ? {
              user_id: memberId,
              month_label: targetMonthLabel,
              group_id: null as string | null,
              salary,
              note: null as string | null,
            }
          : {
              user_id: memberId,
              month_label: targetMonthLabel,
              group_id: input.ctx.groupId,
              salary,
              note: null as string | null,
            };
      const { error } = await supabase.from('months').insert(insert);
      if (error) throw error;
    }
  }
}

export type DuplicateExecutionResult = {
  inserted: number;
  skippedDuplicate: number;
};

/**
 * Copia contas do mês de origem para o destino via cliente autenticado (RLS).
 * `paid` sempre false; `copied_from` = rótulo YYYY-MM do mês de origem; não altera `months.note` no destino.
 */
export async function executeBillDuplication(input: {
  ctx: FinanceContext;
  members: MemberRef[];
  sourceMonthLabel: string;
  targetMonthLabel: string;
}): Promise<DuplicateExecutionResult> {
  const sourceMonthLabel = assertMonthLabel(input.sourceMonthLabel);
  const targetMonthLabel = assertMonthLabel(input.targetMonthLabel);

  const sourceBills = await fetchBillsForMonthAllMembers(input.ctx, sourceMonthLabel);
  const targetBills = await fetchBillsForMonthAllMembers(input.ctx, targetMonthLabel);
  const targetKeys = buildTargetCompanyKeySet(targetBills);

  const memberIds = input.members.map((m) => m.userId);
  await upsertTargetMonthSalariesFromSource({
    ctx: input.ctx,
    memberUserIds: memberIds,
    sourceMonthLabel,
    targetMonthLabel,
  });

  let inserted = 0;
  let skippedDuplicate = 0;

  for (const bill of sourceBills) {
    const norm = normalizeBillCompanyKey(bill.company);
    let set = targetKeys.get(bill.user_id);
    if (!set) {
      set = new Set<string>();
      targetKeys.set(bill.user_id, set);
    }
    if (set.has(norm)) {
      skippedDuplicate += 1;
      continue;
    }

    const row =
      input.ctx.mode === 'solo'
        ? {
            group_id: null as string | null,
            user_id: bill.user_id,
            month_label: targetMonthLabel,
            company: bill.company.trim(),
            amount: bill.amount,
            due_date: bill.due_date,
            paid: false,
            note: bill.note,
            copied_from: sourceMonthLabel,
          }
        : {
            group_id: input.ctx.groupId,
            user_id: bill.user_id,
            month_label: targetMonthLabel,
            company: bill.company.trim(),
            amount: bill.amount,
            due_date: bill.due_date,
            paid: false,
            note: bill.note,
            copied_from: sourceMonthLabel,
          };

    const { error } = await supabase.from('bills').insert(row);
    if (error) {
      const msg = typeof error.message === 'string' ? error.message : '';
      if (
        msg.includes('bills_group_company_uidx') ||
        msg.includes('bills_solo_company_uidx') ||
        msg.includes('duplicate key')
      ) {
        skippedDuplicate += 1;
        set.add(norm);
        continue;
      }
      throw error;
    }
    inserted += 1;
    set.add(norm);
  }

  return { inserted, skippedDuplicate };
}
