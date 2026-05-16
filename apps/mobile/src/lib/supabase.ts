import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function assertSupabaseEnv(): { url: string; key: string } {
  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    throw new Error(
      'Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (copie apps/mobile/.env.example para apps/mobile/.env e preencha com os valores do Dashboard).',
    );
  }
  return { url: supabaseUrl.trim(), key: supabaseKey.trim() };
}

const { url, key } = assertSupabaseEnv();

/**
 * Cliente Supabase para o app (chave publicável no bundle — proteção via RLS no projeto).
 * Persistência de sessão: AsyncStorage, padrão oficial React Native / Expo na documentação Supabase.
 */
export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
