import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_CONFIG_ERROR =
  'Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY (EAS Secrets ou .env na raiz).';

/** `false` em builds EAS sem secrets — evita crash nativo na abertura. */
export const isSupabaseConfigured = Boolean(supabaseUrl?.trim() && supabaseKey?.trim());

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

let client: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }
  return createClient(supabaseUrl!.trim(), supabaseKey!.trim(), {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createSupabaseClient();
  }
  return client;
}

/**
 * Cliente Supabase (chave publicável no bundle — proteção via RLS no projeto).
 * Só acesse após `isSupabaseConfigured` ou use `getSupabase()`.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const resolved = getSupabase();
    const value = Reflect.get(resolved, prop, resolved) as unknown;
    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(resolved);
    }
    return value;
  },
});
