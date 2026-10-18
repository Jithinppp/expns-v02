import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const ONBOARDED_KEY = 'expns.onboarded';

export type Gate = 'loading' | 'onboarding' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  gate: Gate;
  session: Session | null;
  profile: Profile | null;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, base_currency, timezone')
      .eq('id', userId)
      .maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const flag = globalThis.localStorage?.getItem(ONBOARDED_KEY) === '1';
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setOnboarded(flag);
      setSession(data.session ?? null);
      if (data.session?.user) await loadProfile(data.session.user.id);
      if (active) setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null);
      if (next?.user) {
        void loadProfile(next.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      gate: !ready ? 'loading' : session ? 'signedIn' : onboarded ? 'signedOut' : 'onboarding',
      session,
      profile,
      completeOnboarding: async () => {
        globalThis.localStorage?.setItem(ONBOARDED_KEY, '1');
        setOnboarded(true);
      },
      refreshProfile: async () => {
        if (session?.user) await loadProfile(session.user.id);
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [ready, session, onboarded, profile, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
