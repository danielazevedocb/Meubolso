export type FinanceContext =
  | { mode: 'solo' }
  | { mode: 'group'; groupId: string; inviteCode?: string };

export type MemberRef = {
  userId: string;
  displayName: string;
};

export type MemberMonthSnapshot = {
  userId: string;
  displayName: string;
  salary: number;
  /** Soma dos valores de todas as contas do mês. */
  billsTotal: number;
  /** Soma dos valores das contas marcadas como pagas. */
  paidTotal: number;
  balance: number;
};

/** Active bill row (mirror of `public.bills`, non-deleted). */
export type BillRow = {
  id: string;
  group_id: string | null;
  user_id: string;
  month_label: string;
  company: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  note: string | null;
  copied_from: string | null;
  created_at: string;
  updated_at: string;
};

export type MonthRowFull = {
  id: string;
  user_id: string;
  month_label: string;
  salary: number;
  note: string | null;
};
