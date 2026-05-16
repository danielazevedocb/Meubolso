import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_GROUP_KEY = '@meubolso/pref_active_group_id';

/** Id do grupo ativo no dispositivo; só é usado se o utilizador ainda for membro (validado ao resolver contexto). */
export async function getPreferredGroupId(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(ACTIVE_GROUP_KEY);
    const t = v?.trim();
    return t || null;
  } catch {
    return null;
  }
}

export async function setPreferredGroupId(groupId: string | null): Promise<void> {
  if (!groupId?.trim()) {
    await AsyncStorage.removeItem(ACTIVE_GROUP_KEY);
    return;
  }
  await AsyncStorage.setItem(ACTIVE_GROUP_KEY, groupId.trim());
}
