import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetCurrentUser,
  useGoogleLogin,
  useLogout,
  getGetCurrentUserQueryKey,
} from '../api/generated/auth/auth';
import type { AuthUserResponse } from '../api/model';
import { UNAUTHORIZED_EVENT } from '../api/mutator';

interface AuthContextValue {
  user: AuthUserResponse | undefined;
  isLoading: boolean;
  signIn: (credential: string) => Promise<AuthUserResponse>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [signedOut, setSignedOut] = useState(false);

  const me = useGetCurrentUser({ query: { retry: false } });
  const loginMutation = useGoogleLogin();
  const logoutMutation = useLogout();

  useEffect(() => {
    const handleUnauthorized = () => setSignedOut(true);
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const user = signedOut || me.data?.status !== 200 ? undefined : me.data.data;

  const signIn = async (credential: string) => {
    const response = await loginMutation.mutateAsync({ data: { credential } });
    if (response.status !== 200) {
      throw new Error(response.data.reason);
    }
    setSignedOut(false);
    queryClient.setQueryData(getGetCurrentUserQueryKey(), response);
    return response.data;
  };

  const signOut = async () => {
    await logoutMutation.mutateAsync();
    setSignedOut(true);
    queryClient.removeQueries({ queryKey: getGetCurrentUserQueryKey() });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: me.isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
