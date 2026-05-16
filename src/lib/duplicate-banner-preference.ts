import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@meubolso/duplicate_banner_dismissed';

function storageKey(input: {
  monthLabel: string;
  userId: string;
  contextKey: string;
}): string {
  return `${PREFIX}:${input.userId}:${input.contextKey}:${input.monthLabel}`;
}

/**
 * "Começar do zero" — não voltar a sugerir cópia neste mês/contexto até limpar storage.
 */
export async function isDuplicateBannerDismissed(input: {
  monthLabel: string;
  userId: string;
  contextKey: string;
}): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(storageKey(input));
    return v === '1';
  } catch {
    return false;
  }
}

export async function dismissDuplicateBanner(input: {
  monthLabel: string;
  userId: string;
  contextKey: string;
}): Promise<void> {
  await AsyncStorage.setItem(storageKey(input), '1');
}

/** Solo ou id do grupo — identifica o escopo financeiro. */
export function financeContextStorageKey(ctx: { mode: 'solo' } | { mode: 'group'; groupId: string }): string {
  return ctx.mode === 'solo' ? 'solo' : ctx.groupId;
}
