import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { loadSession, post, saveSession } from './api';
import { rememberSkipped, replayInto } from './guestCart';
import type { Session } from './types';

interface AuthValue {
  session: Session | null;
  signedIn: boolean;
  /** Where to come back to after signing in. */
  intent: string | null;
  requestSignIn: (returnTo: string) => void;
  clearIntent: () => void;
  requestOtp: (phone: string) => Promise<OtpSent>;
  verifyOtp: (phone: string, code: string, name?: string) => Promise<Session>;
  signOut: () => Promise<void>;
  /** Patch the remembered session (for example after the name is set). */
  updateSession: (patch: Partial<Session>) => void;
}

export interface OtpSent {
  sentTo: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  codeLength: number;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Signing in is deferred as long as possible.
 *
 * A shopper browses, opens things, reads prices and even builds an idea of
 * a basket without an account. The wall goes up at the first write - adding
 * to the cart - and when it does we remember where they were, so verifying
 * a code drops them back on the same product instead of on the home page
 * wondering what happened.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [intent, setIntent] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSession(loadSession());
    window.addEventListener('qc-store-session', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('qc-store-session', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const requestOtp = useCallback(
    (phone: string) => post<OtpSent>('/auth/otp/request', { phone }),
    [],
  );

  const verifyOtp = useCallback(async (phone: string, code: string, name?: string) => {
    const next = await post<Session>('/auth/otp/verify', name ? { phone, code, name } : { phone, code });
    saveSession(next);
    // Whatever they put in a basket before signing in goes into their real one.
    rememberSkipped(
      await replayInto((offeringId, qty) => post('/cart/items', { offeringId, qty })),
    );
    setSession(next);
    return next;
  }, []);

  const updateSession = useCallback((patch: Partial<Session>) => {
    const current = loadSession();
    if (!current) return;
    const next = { ...current, ...patch };
    saveSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    const current = loadSession();
    try {
      if (current?.refreshToken) {
        await post<void>('/auth/logout', { refreshToken: current.refreshToken });
      }
    } catch {
      /* the local session goes either way - a failed logout must not trap anyone */
    }
    saveSession(null);
    setSession(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      signedIn: !!session,
      intent,
      requestSignIn: setIntent,
      clearIntent: () => setIntent(null),
      requestOtp,
      verifyOtp,
      signOut,
      updateSession,
    }),
    [session, intent, requestOtp, verifyOtp, signOut, updateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
