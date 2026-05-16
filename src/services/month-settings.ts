import { supabase } from '@/lib/supabase';
import { assertMonthLabel } from '@/lib/month-key';
import type { FinanceContext, MonthRowFull } from '@/types/finance';

type MonthDb = {
  id: string;
  user_id: string;
  month_label: string;
  salary: number | string | null;
  note: string | null;
};

function toMonthFull(row: MonthDb): MonthRowFull {
  const salary =
    typeof row.salary === 'number' ? row.salary : Number(row.salary ?? 0);
  return {
    id: row.id,
    user_id: row.user_id,
    month_label: row.month_label,
    salary: Number.isFinite(salary) ? salary : 0,
    note: row.note,
  };
}

export async function fetchMonthRowForMember(input: {
  ctx: FinanceContext;
  monthLabel: string;
  memberUserId: string;
}): Promise<MonthRowFull | null> {
  const monthLabel = assertMonthLabel(input.monthLabel);
  const base = supabase
    .from('months')
    .select('id, user_id, month_label, salary, note')
    .eq('month_label', monthLabel)
    .eq('user_id', input.memberUserId);

  const q =
    input.ctx.mode === 'solo' ? base.is('group_id', null) : base.eq('group_id', input.ctx.groupId);

  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return toMonthFull(data as MonthDb);
}

export async function updateMonthSalaryNote(input: {
  monthId: string;
  salary: number;
  note: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('months')
    .update({
      salary: input.salary,
      note: input.note,
    })
    .eq('id', input.monthId);

  if (error) throw error;
}
