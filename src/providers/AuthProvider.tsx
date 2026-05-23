import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { setPreferredGroupId } from '@/lib/active-group-preference';
import { setSoloPreference } from '@/lib/onboarding-preference';
import type { ProfileRow } from '@/types/database.types';
import {
  ensureSelfProfile,
  fetchProfile,
} from '@/services/groups';
import { configureGoogleSignIn } from '@/services/google-auth';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** `getSession` finished at least once. */
  initialized: boolean;
  /**
   * When logged in: profile loaded.
   * When logged out: true right after auth init (safe to redirect to auth stack).
   */
  routingReady: boolean;
  profile: ProfileRow | null;
  refreshProfile: () => Promise<void>;
  /** Mantido para compatibilidade após escolher grupo/solo (sem gate de onboarding). */
  refreshOnboarding: () => Promise<void>;
  confirmSoloMode: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [routingReady, setRoutingReady] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const user = session?.user ?? null;

  const hydrateProfile = useCallback(async (authUser: User) => {
    let profileRow = await fetchProfile(authUser.id);
    if (!profileRow) {
      await ensureSelfProfile(authUser);
      profileRow = await fetchProfile(authUser.id);
    }
    setProfile((profileRow ?? null) as ProfileRow | null);
  }, []);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  useEffect(() => {
    let mounted = true;
    let bootFinished = false;

    const finishBoot = (nextSession: Session | null) => {
      if (!mounted || bootFinished) return;
      bootFinished = true;
      setSession(nextSession);
      setInitialized(true);
    };

    const bootTimeout = setTimeout(() => finishBoot(null), 12_000);

    void supabase.auth
      .getSession()
      .then(({ data }) => finishBoot(data.session ?? null))
      .catch(() => finishBoot(null))
      .finally(() => clearTimeout(bootTimeout));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      clearTimeout(bootTimeout);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return undefined;

    let cancelled = false;

    async function sync() {
      if (!user?.id) {
        setProfile(null);
        setRoutingReady(true);
        return;
      }

      setRoutingReady(false);
      try {
        await Promise.race([
          hydrateProfile(user),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('profile_hydrate_timeout')), 15_000);
          }),
        ]);
      } catch {
        setProfile(null);
      } finally {
        if (!cancelled) setRoutingReady(true);
      }
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [initialized, user, hydrateProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    let row = await fetchProfile(user.id);
    if (!row) {
      await ensureSelfProfile(user);
      row = await fetchProfile(user.id);
    }
    setProfile((row ?? null) as ProfileRow | null);
  }, [user]);

  const refreshOnboarding = useCallback(async () => {
    /* Gate removido; chamadas após grupo/solo permanecem sem efeito no routing. */
  }, []);

  const confirmSoloMode = useCallback(async () => {
    await setSoloPreference(true);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await setSoloPreference(false);
    await setPreferredGroupId(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      initialized,
      routingReady,
      profile,
      refreshProfile,
      refreshOnboarding,
      confirmSoloMode,
      signOut,
    }),
    [
      session,
      user,
      initialized,
      routingReady,
      profile,
      refreshProfile,
      refreshOnboarding,
      confirmSoloMode,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
