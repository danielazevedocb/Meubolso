declare namespace NodeJS {
  interface ProcessEnv {
    /** Supabase project URL (Dashboard → Connect → App frameworks → Expo). */
    EXPO_PUBLIC_SUPABASE_URL?: string;
    /**
     * Supabase anon JWT (legacy) or publishable key (`sb_publishable_…`).
     * Never commit real values; use `.env` locally (ignored by git).
     */
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
  }
}
