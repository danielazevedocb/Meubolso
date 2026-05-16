import { supabase } from '@/lib/supabase';
import { assertMonthLabel } from '@/lib/month-key';
import type { BillRow, FinanceContext } from '@/types/finance';

type BillRowDb = {
  id: string;
  group_id: string | null;
  user_id: string;
  month_label: string;
  company: string;
  amount: number | string | null;
  due_date: string | null;
  paid: boolean;
  note: string | null;
  copied_from: string | null;
  created_at: string;
  updated_at: string;
};

function toBillRow(row: BillRowDb): BillRow {
  const amount =
    typeof row.amount === 'number' ? row.amount : Number(row.amount ?? 0);
  return {
    id: row.id,
    group_id: row.group_id,
    user_id: row.user_id,
    month_label: row.month_label,
    company: row.company,
    amount: Number.isFinite(amount) ? amount : 0,
    due_date: row.due_date,
    paid: row.paid,
    note: row.note,
    copied_from: row.copied_from ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchBillsForMember(input: {
  ctx: FinanceContext;
  monthLabel: string;
  memberUserId: string;
}): Promise<BillRow[]> {
  const monthLabel = assertMonthLabel(input.monthLabel);
  const base = supabase
    .from('bills')
    .select(
      'id, group_id, user_id, month_label, company, amount, due_date, paid, note, copied_from, created_at, updated_at',
    )
    .eq('month_label', monthLabel)
    .eq('user_id', input.memberUserId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  const q =
    input.ctx.mode === 'solo'
      ? base.is('group_id', null)
      : base.eq('group_id', input.ctx.groupId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => toBillRow(r as BillRowDb));
}

export async function insertBill(input: {
  ctx: FinanceContext;
  monthLabel: string;
  userId: string;
  company: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  note: string | null;
  copiedFrom?: string | null;
}): Promise<BillRow> {
  const monthLabel = assertMonthLabel(input.monthLabel);
  const copiedFrom =
    input.copiedFrom === undefined || input.copiedFrom === null
      ? null
      : assertMonthLabel(input.copiedFrom);
  const row =
    input.ctx.mode === 'solo'
      ? {
          group_id: null as string | null,
          user_id: input.userId,
          month_label: monthLabel,
          company: input.company.trim(),
          amount: input.amount,
          due_date: input.due_date,
          paid: input.paid,
          note: input.note,
          copied_from: copiedFrom,
        }
      : {
          group_id: input.ctx.groupId,
          user_id: input.userId,
          month_label: monthLabel,
          company: input.company.trim(),
          amount: input.amount,
          due_date: input.due_date,
          paid: input.paid,
          note: input.note,
          copied_from: copiedFrom,
        };

  const { data, error } = await supabase.from('bills').insert(row).select().single();
  if (error) throw error;
  return toBillRow(data as BillRowDb);
}

export async function updateBill(input: {
  id: string;
  patch: Partial<{
    company: string;
    amount: number;
    due_date: string | null;
    paid: boolean;
    note: string | null;
    user_id: string;
  }>;
}): Promise<BillRow> {
  const authId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const body: Record<string, unknown> = {};
  if (authId) body.updated_by = authId;
  for (const [k, v] of Object.entries(input.patch)) {
    if (v !== undefined) body[k] = v;
  }

  const { data, error } = await supabase
    .from('bills')
    .update(body)
    .eq('id', input.id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return toBillRow(data as BillRowDb);
}

export async function softDeleteBill(billId: string): Promise<void> {
  const authId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const body: Record<string, unknown> = { deleted_at: new Date().toISOString() };
  if (authId) body.updated_by = authId;

  const { error } = await supabase.from('bills').update(body).eq('id', billId).is('deleted_at', null);

  if (error) throw error;
}
