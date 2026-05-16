import { useCallback, useEffect, useState } from 'react';

import { currentMonthKeyNow, isReadOnlyMonth, shiftMonthKey } from '@/lib/month-key';
import { loadMonthOverview } from '@/services/dashboard';
import { mapPostgrestOrRpcError } from '@/services/supabase-errors';
import type { FinanceContext, MemberMonthSnapshot } from '@/types/finance';

type Status = 'loading' | 'success' | 'error' | 'idle';

export function useMonthOverview(input: {
  userId: string | undefined;
  selfDisplayName: string;
}) {
  const [monthLabel, setMonthLabel] = useState(currentMonthKeyNow);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberMonthSnapshot[]>([]);
  const [context, setContext] = useState<FinanceContext | null>(null);
  const [activeBillCount, setActiveBillCount] = useState(0);
  const [previousMonthBillCount, setPreviousMonthBillCount] = useState(0);

  const load = useCallback(async () => {
    if (!input.userId) {
      setMembers([]);
      setContext(null);
      setActiveBillCount(0);
      setPreviousMonthBillCount(0);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);
    setMembers([]);
    setContext(null);
    setActiveBillCount(0);
    setPreviousMonthBillCount(0);

    try {
      const result = await loadMonthOverview({
        userId: input.userId,
        selfDisplayName: input.selfDisplayName,
        monthLabel,
      });
      setMembers(result.members);
      setContext(result.context);
      setActiveBillCount(result.activeBillCount);
      setPreviousMonthBillCount(result.previousMonthBillCount);
      setStatus('success');
    } catch (e) {
      setErrorMessage(mapPostgrestOrRpcError(e as Error));
      setStatus('error');
    }
  }, [input.userId, input.selfDisplayName, monthLabel]);

  useEffect(() => {
    void load();
  }, [load]);

  const goPrevMonth = useCallback(() => {
    setMonthLabel((k) => shiftMonthKey(k, -1));
  }, []);

  const goNextMonth = useCallback(() => {
    setMonthLabel((k) => shiftMonthKey(k, 1));
  }, []);

  const readOnlyMonth = isReadOnlyMonth(monthLabel);

  return {
    monthLabel,
    readOnlyMonth,
    members,
    context,
    activeBillCount,
    previousMonthBillCount,
    status,
    errorMessage,
    reload: load,
    goPrevMonth,
    goNextMonth,
  };
}
