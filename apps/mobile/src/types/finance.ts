export type FinanceContext = { mode: 'solo' } | { mode: 'group'; groupId: string };

export type MemberRef = {
  userId: string;
  displayName: string;
};

export type MemberMonthSnapshot = {
  userId: string;
  displayName: string;
  salary: number;
  billsTotal: number;
  balance: number;
};
