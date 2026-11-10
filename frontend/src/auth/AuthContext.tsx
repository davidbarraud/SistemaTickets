import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, onUnauthorized } from '../api/client';
import { clearSession, loadSession, saveSession } from '../api/session';
import type { Session, User } from '../api/types';

interface AuthValue {
  user: User | null;
  /** Intercambia la credencial de Google por una sesión de la API. */
  login: (googleCredential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  useEffect(() => onUnauthorized(() => setSession(null)), []);

  const login = useCallback(async (credential: string) => {
    const next = await apiFetch<Session>('/api/auth/google', { method: 'POST', body: { credential } });
    saveSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(() => ({ user: session?.user ?? null, login, logout }), [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
