import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as client from './api';
import type { Role, User } from './types';

type SessionState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: User };

interface Session {
  state: SessionState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<Session | null>(null);

/** On load, the refresh cookie (if any) is swapped for an access token: a reload keeps you signed in. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  const end = useCallback(() => {
    queryClient.clear();
    setState({ status: 'signed-out' });
  }, [queryClient]);

  useEffect(() => {
    let live = true;
    client.refreshSession().then(
      (user) => {
        if (live)
          setState(
            user ? { status: 'signed-in', user } : { status: 'signed-out' },
          );
      },
      () => live && setState({ status: 'signed-out' }),
    );
    const unsubscribe = client.onSessionEnded(end);
    return () => {
      live = false;
      unsubscribe();
    };
  }, [end]);

  const value = useMemo<Session>(
    () => ({
      state,
      signIn: async (email, password) => {
        const user = await client.signIn(email, password);
        setState({ status: 'signed-in', user });
      },
      signOut: async () => {
        await client.signOut();
        end();
      },
    }),
    [state, end],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Session {
  const session = use(SessionContext);
  if (!session) throw new Error('useSession needs a SessionProvider');
  return session;
}

/** The signed-in user. Only for pages behind the signed-in layout. */
export function useUser(): User {
  const { state } = useSession();
  if (state.status !== 'signed-in') throw new Error('Not signed in');
  return state.user;
}

export const STAFF: Role[] = ['admin', 'teacher'];
export const isStaff = (user: User) => STAFF.includes(user.role);
