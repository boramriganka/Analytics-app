import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, loadSession, storeSession, type Session } from './api';

interface SessionContextValue {
  session: Session | null;
  startDemo: () => Promise<Session>;
  login: (email: string, password: string) => Promise<Session>;
  register: (name: string, email: string, password: string) => Promise<Session>;
  signOut: () => void;
  resetDemo: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const queryClient = useQueryClient();

  const adopt = useCallback((s: Session) => {
    storeSession(s);
    setSession(s);
    return s;
  }, []);

  const startDemo = useCallback(async () => {
    const s = await api<Session>('/demo/session', { method: 'POST' });
    return adopt(s);
  }, [adopt]);

  const login = useCallback(
    async (email: string, password: string) => {
      const s = await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      return adopt(s);
    },
    [adopt]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const s = await api<Session>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      return adopt(s);
    },
    [adopt]
  );

  const signOut = useCallback(() => {
    storeSession(null);
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  const resetDemo = useCallback(async () => {
    await api('/demo/reset', { method: 'POST' });
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const value = useMemo(
    () => ({ session, startDemo, login, register, signOut, resetDemo }),
    [session, startDemo, login, register, signOut, resetDemo]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
