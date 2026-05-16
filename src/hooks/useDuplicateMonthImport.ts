import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import {
  dismissDuplicateBanner,
  financeContextStorageKey,
  isDuplicateBannerDismissed,
} from '@/lib/duplicate-banner-preference';
import { shiftMonthKey } from '@/lib/month-key';
import {
  buildDuplicatePreview,
  executeBillDuplication,
  type DuplicatePreview,
} from '@/services/bill-duplication';
import { mapPostgrestOrRpcError } from '@/services/supabase-errors';
import type { FinanceContext, MemberRef } from '@/types/finance';

type Options = {
  context: FinanceContext | null;
  members: MemberRef[];
  monthLabel: string;
  readOnlyMonth: boolean;
  activeBillCount: number;
  previousMonthBillCount: number;
  authUserId: string | undefined;
  reloadData: () => Promise<void>;
  setErrorMessage: (msg: string | null) => void;
};

export function useDuplicateMonthImport({
  context,
  members,
  monthLabel,
  readOnlyMonth,
  activeBillCount,
  previousMonthBillCount,
  authUserId,
  reloadData,
  setErrorMessage,
}: Options) {
  const sourceMonthLabel = useMemo(() => shiftMonthKey(monthLabel, -1), [monthLabel]);

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [preview, setPreview] = useState<DuplicatePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [mergeWarning, setMergeWarning] = useState(false);

  const contextKey = context ? financeContextStorageKey(context) : null;

  useEffect(() => {
    let cancelled = false;
    if (!authUserId || !contextKey) {
      setBannerDismissed(false);
      return;
    }

    void (async () => {
      const d = await isDuplicateBannerDismissed({
        monthLabel,
        userId: authUserId,
        contextKey,
      });
      if (!cancelled) setBannerDismissed(d);
    })();

    return () => {
      cancelled = true;
    };
  }, [authUserId, contextKey, monthLabel]);

  const showEmptyMonthBanner =
    !!context &&
    !readOnlyMonth &&
    previousMonthBillCount > 0 &&
    activeBillCount === 0 &&
    !bannerDismissed;

  const canOfferImport = !!context && !readOnlyMonth && previousMonthBillCount > 0;

  const dismissBanner = useCallback(async () => {
    if (!authUserId || !contextKey) return;
    await dismissDuplicateBanner({
      monthLabel,
      userId: authUserId,
      contextKey,
    });
    setBannerDismissed(true);
  }, [authUserId, contextKey, monthLabel]);

  const closeModal = useCallback(() => {
    if (executing) return;
    setModalVisible(false);
    setPreview(null);
    setMergeWarning(false);
  }, [executing]);

  const runPreview = useCallback(
    async (merge: boolean) => {
      if (!context || readOnlyMonth) return;
      setMergeWarning(merge);
      setModalVisible(true);
      setLoadingPreview(true);
      setPreview(null);
      try {
        const p = await buildDuplicatePreview({
          ctx: context,
          members,
          sourceMonthLabel,
          targetMonthLabel: monthLabel,
        });
        setPreview(p);
      } catch (e) {
        setModalVisible(false);
        setErrorMessage(mapPostgrestOrRpcError(e as Error));
      } finally {
        setLoadingPreview(false);
      }
    },
    [context, readOnlyMonth, members, monthLabel, setErrorMessage, sourceMonthLabel],
  );

  const requestImport = useCallback(
    (fromNonEmptyMonth: boolean) => {
      if (!context || readOnlyMonth) return;
      if (fromNonEmptyMonth && activeBillCount > 0) {
        Alert.alert(
          'Importar do mês anterior',
          `Este mês já tem ${activeBillCount} conta(s). As importadas serão adicionadas sem apagar as existentes. Contas com o mesmo nome (por membro) serão ignoradas. Deseja continuar?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => void runPreview(true) },
          ],
        );
        return;
      }
      void runPreview(false);
    },
    [context, readOnlyMonth, activeBillCount, runPreview],
  );

  const submitDuplicate = useCallback(async () => {
    if (!context || !preview || preview.totalToInsert <= 0) return;
    setExecuting(true);
    setErrorMessage(null);
    try {
      const { inserted, skippedDuplicate } = await executeBillDuplication({
        ctx: context,
        members,
        sourceMonthLabel,
        targetMonthLabel: monthLabel,
      });
      await reloadData();
      closeModal();
      const parts: string[] = [`${inserted} conta(s) importada(s).`];
      if (skippedDuplicate > 0) {
        parts.push(`${skippedDuplicate} ignorada(s) (nome já existente neste mês).`);
      }
      Alert.alert('Cópia concluída', parts.join(' '));
    } catch (e) {
      setErrorMessage(mapPostgrestOrRpcError(e as Error));
    } finally {
      setExecuting(false);
    }
  }, [context, members, preview, sourceMonthLabel, monthLabel, reloadData, setErrorMessage, closeModal]);

  return {
    sourceMonthLabel,
    showEmptyMonthBanner,
    canOfferImport,
    dismissBanner,
    modalVisible,
    preview,
    loadingPreview,
    executing,
    mergeWarning,
    closeModal,
    requestImport,
    submitDuplicate,
  };
}
