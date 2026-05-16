import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function assertSupabaseEnv(): { url: string; key: string } {
  if (!supabaseUrl?.trim() || !supabaseKey?.trim()) {
    throw new Error(
      'Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (copie src/.env.example para src/.env e preencha com os valores do Dashboard).',
    );
  }
  return { url: supabaseUrl.trim(), key: supabaseKey.trim() };
}

const { url, key } = assertSupabaseEnv();

/**
 * Web/SSR: o bundle pode correr em Node (sem `window`). AsyncStorage RN usa `window` no web e rebenta.
 * Usamos `localStorage` no cliente e fallback em memória durante SSR/SSG.
 */
function createWebAuthStorage(): SupportedStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (key: string) => {
      if (typeof window === 'undefined') {
        return Promise.resolve(memory.get(key) ?? null);
      }
      try {
        return Promise.resolve(window.localStorage.getItem(key));
      } catch {
        return Promise.resolve(null);
      }
    },
    setItem: (key: string, value: string) => {
      if (typeof window === 'undefined') {
        memory.set(key, value);
        return Promise.resolve();
      }
      try {
        window.localStorage.setItem(key, value);
      } catch {
        memory.set(key, value);
      }
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      if (typeof window === 'undefined') {
        memory.delete(key);
        return Promise.resolve();
      }
      try {
        window.localStorage.removeItem(key);
      } catch {
        memory.delete(key);
      }
      return Promise.resolve();
    },
  };
}

const authStorage: SupportedStorage =
  Platform.OS === 'web' ? createWebAuthStorage() : AsyncStorage;

/**
 * Cliente Supabase para o app (chave publicável no bundle — proteção via RLS no projeto).
 * Persistência: AsyncStorage no iOS/Android; web usa localStorage (e memória só durante SSR).
 */
export const supabase = createClient(url, key, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
