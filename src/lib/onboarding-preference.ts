import AsyncStorage from '@react-native-async-storage/async-storage';

export const SOLO_PREFERENCE_KEY = '@meubolso/pref_solo_mode';

export async function getSoloPreference(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(SOLO_PREFERENCE_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function setSoloPreference(active: boolean): Promise<void> {
  if (active) {
    await AsyncStorage.setItem(SOLO_PREFERENCE_KEY, '1');
    return;
  }
  await AsyncStorage.removeItem(SOLO_PREFERENCE_KEY);
}
