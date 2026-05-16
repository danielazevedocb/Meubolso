import { useCallback, useEffect, useMemo, useState } from 'react';

import { currentMonthKeyNow, isReadOnlyMonth } from '@/lib/month-key';
import {
  fetchBillsForMember,
  insertBill,
  softDeleteBill,
  updateBill,
} from '@/services/bills';
import { fetchMembersForContext, loadMonthOverview, resolveFinanceContext } from '@/services/dashboard';
import { fetchMonthRowForMember, updateMonthSalaryNote } from '@/services/month-settings';
import { mapPostgrestOrRpcError } from '@/services/supabase-errors';
import type { BillRow, FinanceContext, MemberRef, MonthRowFull } from '@/types/finance';

type Status = 'idle' | 'loading' | 'success' | 'error';

function coerceMonthLabel(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v)) return v;
  return currentMonthKeyNow();
}

function coerceMemberParam(
  raw: string | string[] | undefined,
  fallbackUserId: string | undefined,
): string | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v === 'string' && v.length > 0) return v;
  return fallbackUserId;
}

export function useContasScreen(input: {
  routeMonthLabel?: string | string[];
  routeMemberUserId?: string | string[];
  authUserId: string | undefined;
  selfDisplayName: string;
}) {
  const monthLabel = useMemo(
    () => coerceMonthLabel(input.routeMonthLabel),
    [input.routeMonthLabel],
  );

  const readOnlyMonth = useMemo(() => isReadOnlyMonth(monthLabel), [monthLabel]);

  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [context, setContext] = useState<FinanceContext | null>(null);
  const [members, setMembers] = useState<MemberRef[]>([]);
  const [memberUserId, setMemberUserId] = useState<string>('');
  const [bills, setBills] = useState<BillRow[]>([]);
  const [monthRow, setMonthRow] = useState<MonthRowFull | null>(null);
  const [billsTotal, setBillsTotal] = useState(0);
  const [balance, setBalance] = useState(0);

  /** Context + member list + pick member from route (or self). */
  useEffect(() => {
    if (!input.authUserId) {
      setStatus('idle');
      setContext(null);
      setMembers([]);
      setMemberUserId('');
      setBills([]);
      setMonthRow(null);
      return;
    }

    const authUserId = input.authUserId;

    let cancelled = false;

    (async () => {
      setStatus('loading');
      setErrorMessage(null);
      try {
        const ctx = await resolveFinanceContext(authUserId);
        const mems = await fetchMembersForContext(ctx, authUserId, input.selfDisplayName);

        const fromRoute = coerceMemberParam(input.routeMemberUserId, authUserId);
        const inList = fromRoute && mems.some((m) => m.userId === fromRoute);
        const resolvedMember = inList ? fromRoute! : authUserId;

        if (cancelled) return;
        setContext(ctx);
        setMembers(mems);
        setMemberUserId(resolvedMember);
      } catch (e) {
        if (cancelled) return;
        setContext(null);
        setMembers([]);
        setMemberUserId('');
        setErrorMessage(mapPostgrestOrRpcError(e as Error));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [input.authUserId, input.selfDisplayName, input.routeMemberUserId]);

  const refreshMemberData = useCallback(
    async (ctx: FinanceContext, uid: string, label: string) => {
      if (!input.authUserId) return;

      const overview = await loadMonthOverview({
        userId: input.authUserId,
        selfDisplayName: input.selfDisplayName,
        monthLabel: label,
      });
      const [billList, mrow] = await Promise.all([
        fetchBillsForMember({ ctx, monthLabel: label, memberUserId: uid }),
        fetchMonthRowForMember({ ctx, monthLabel: label, memberUserId: uid }),
      ]);

      setBills(billList);
      setMonthRow(mrow);
      const snap = overview.members.find((m) => m.userId === uid);
      setBillsTotal(snap?.billsTotal ?? 0);
      setBalance(snap?.balance ?? 0);
      setStatus('success');
    },
    [input.authUserId, input.selfDisplayName],
  );

  useEffect(() => {
    if (!context || !memberUserId || !input.authUserId) return;

    let cancelled = false;

    (async () => {
      setStatus((s) => (s === 'error' ? s : 'loading'));
      setErrorMessage(null);
      try {
        await refreshMemberData(context, memberUserId, monthLabel);
        if (cancelled) return;
      } catch (e) {
        if (cancelled) return;
        setErrorMessage(mapPostgrestOrRpcError(e as Error));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [context, memberUserId, monthLabel, input.authUserId, refreshMemberData]);

  const setPaidOptimistic = useCallback(
    async (billId: string, nextPaid: boolean) => {
      if (!context || readOnlyMonth) return;
      const prev = bills;
      setBills((rows) => rows.map((b) => (b.id === billId ? { ...b, paid: nextPaid } : b)));
      try {
        await updateBill({ id: billId, patch: { paid: nextPaid } });
        await refreshMemberData(context, memberUserId, monthLabel);
      } catch (e) {
        setBills(prev);
        setErrorMessage(mapPostgrestOrRpcError(e as Error));
      }
    },
    [bills, context, memberUserId, monthLabel, readOnlyMonth, refreshMemberData],
  );

  const removeBillConfirmed = useCallback(
    async (billId: string) => {
      if (!context || readOnlyMonth) return;
      try {
        await softDeleteBill(billId);
        await refreshMemberData(context, memberUserId, monthLabel);
      } catch (e) {
        setErrorMessage(mapPostgrestOrRpcError(e as Error));
      }
    },
    [context, memberUserId, monthLabel, readOnlyMonth, refreshMemberData],
  );

  const createBill = useCallback(
    async (payload: {
      userId: string;
      company: string;
      amount: number;
      due_date: string | null;
      paid: boolean;
      note: string | null;
    }) => {
      if (!context) throw new Error('Contexto indisponível');
      if (readOnlyMonth) throw new Error('Este mês é somente leitura.');
      try {
        await insertBill({
          ctx: context,
          monthLabel,
          userId: payload.userId,
          company: payload.company,
          amount: payload.amount,
          due_date: payload.due_date,
          paid: payload.paid,
          note: payload.note,
        });
        await refreshMemberData(context, memberUserId, monthLabel);
      } catch (e) {
        setErrorMessage(mapPostgrestOrRpcError(e as Error));
        throw e;
      }
    },
    [context, monthLabel, memberUserId, readOnlyMonth, refreshMemberData],
  );

  const saveBill = useCallback(
    async (
      billId: string,
      patch: {
        userId: string;
        company: string;
        amount: number;
        due_date: string | null;
        paid: boolean;
        note: string | null;
      },
    ) => {
      if (!context) throw new Error('Contexto indisponível');
      if (readOnlyMonth) throw new Error('Este mês é somente leitura.');
      try {
        await updateBill({
          id: billId,
          patch: {
            user_id: patch.userId,
            company: patch.company,
            amount: patch.amount,
            due_date: patch.due_date,
            paid: patch.paid,
            note: patch.note,
          },
        });
        await refreshMemberData(context, memberUserId, monthLabel);
      } catch (e) {
        setErrorMessage(mapPostgrestOrRpcError(e as Error));
        throw e;
      }
    },
    [context, memberUserId, monthLabel, readOnlyMonth, refreshMemberData],
  );

  const saveMonthSalaryNote = useCallback(
    async (salary: number, note: string | null) => {
      if (!context || !monthRow || readOnlyMonth) return;
      try {
        await updateMonthSalaryNote({
          monthId: monthRow.id,
          salary,
          note,
        });
        await refreshMemberData(context, memberUserId, monthLabel);
      } catch (e) {
        setErrorMessage(mapPostgrestOrRpcError(e as Error));
        throw e;
      }
    },
    [context, monthRow, memberUserId, monthLabel, readOnlyMonth, refreshMemberData],
  );

  const dismissError = useCallback(() => setErrorMessage(null), []);

  const activeMemberName =
    members.find((m) => m.userId === memberUserId)?.displayName ?? 'Membro';

  return {
    monthLabel,
    readOnlyMonth,
    context,
    members,
    memberUserId,
    setMemberUserId,
    activeMemberName,
    bills,
    monthRow,
    billsTotal,
    balance,
    status,
    errorMessage,
    dismissError,
    refreshMemberData,
    setPaidOptimistic,
    removeBillConfirmed,
    createBill,
    saveBill,
    saveMonthSalaryNote,
  };
}
