import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { getSoloPreference, setSoloPreference } from '@/lib/onboarding-preference';
import type { ProfileRow } from '@/types/database.types';
import { countUserGroupMemberships, fetchProfile } from '@/services/groups';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  /** `getSession` finished at least once. */
  initialized: boolean;
  /**
   * When logged in: profile + onboarding rules loaded.
   * When logged out: true right after auth init (safe to redirect to auth stack).
   */
  routingReady: boolean;
  profile: ProfileRow | null;
  onboardingComplete: boolean;
  refreshProfile: () => Promise<void>;
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
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  const user = session?.user ?? null;

  const hydrateProfileAndOnboarding = useCallback(async (userId: string) => {
    const [solo, memberCount, profileRow] = await Promise.all([
      getSoloPreference(),
      countUserGroupMemberships(userId),
      fetchProfile(userId),
    ]);
    setProfile((profileRow ?? null) as ProfileRow | null);
    setOnboardingComplete(solo || memberCount > 0);
  }, []);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return undefined;

    let cancelled = false;

    async function sync() {
      if (!user?.id) {
        setProfile(null);
        setOnboardingComplete(false);
        setRoutingReady(true);
        return;
      }

      setRoutingReady(false);
      try {
        await hydrateProfileAndOnboarding(user.id);
      } catch {
        if (!cancelled) {
          setOnboardingComplete(false);
        }
      } finally {
        if (!cancelled) setRoutingReady(true);
      }
    }

    void sync();

    return () => {
      cancelled = true;
    };
  }, [initialized, user?.id, hydrateProfileAndOnboarding]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    const row = await fetchProfile(user.id);
    setProfile((row ?? null) as ProfileRow | null);
  }, [user?.id]);

  const refreshOnboarding = useCallback(async () => {
    if (!user?.id) return;
    const [solo, memberCount] = await Promise.all([
      getSoloPreference(),
      countUserGroupMemberships(user.id),
    ]);
    setOnboardingComplete(solo || memberCount > 0);
  }, [user?.id]);

  const confirmSoloMode = useCallback(async () => {
    await setSoloPreference(true);
    await refreshOnboarding();
  }, [refreshOnboarding]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await setSoloPreference(false);
    setProfile(null);
    setOnboardingComplete(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      initialized,
      routingReady,
      profile,
      onboardingComplete,
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
      onboardingComplete,
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
