import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { api, ApiError } from '../api/client';

export interface User {
  id: number;
  // Legacy accounts only — new accounts (registered by email, GitHub
  // issue #12) never get one.
  username: string | null;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  subscribed: boolean;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string, extra?: { turnstileToken?: string }) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    extra?: { company?: string; turnstileToken?: string },
  ) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  verifyEmail: (code: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  addEmail: (email: string) => Promise<void>;
  setSubscribed: (subscribed: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const { user } = await api.get<{ user: User }>('/auth/me');
        return user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: (input: { identifier: string; password: string; turnstileToken?: string }) =>
      api.post<{ user: User }>('/auth/login', input),
    onSuccess: (data) => queryClient.setQueryData(['me'], data.user),
  });

  const registerMutation = useMutation({
    mutationFn: (input: {
      email: string;
      password: string;
      displayName: string;
      company?: string;
      turnstileToken?: string;
    }) => api.post<{ message: string }>('/auth/register', input),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => queryClient.setQueryData(['me'], null),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => api.post('/auth/delete-account', { password }),
    onSuccess: () => {
      queryClient.setQueryData(['me'], null);
      // Scores are gone too, so leaderboards cached in the browser are stale.
      queryClient.invalidateQueries();
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: (code: string) => api.post<{ user: User }>('/auth/verify-email', { code }),
    onSuccess: (data) => queryClient.setQueryData(['me'], data.user),
  });

  const resendVerificationMutation = useMutation({
    mutationFn: () => api.post('/auth/resend-verification'),
  });

  const addEmailMutation = useMutation({
    mutationFn: (email: string) => api.post<{ user: User }>('/auth/add-email', { email }),
    onSuccess: (data) => queryClient.setQueryData(['me'], data.user),
  });

  const subscribeMutation = useMutation({
    mutationFn: (subscribed: boolean) => api.post<{ user: User }>('/auth/subscribe', { subscribed }),
    onSuccess: (data) => queryClient.setQueryData(['me'], data.user),
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      login: async (identifier, password, extra) => {
        await loginMutation.mutateAsync({ identifier, password, ...extra });
      },
      register: async (email, password, displayName, extra) => {
        await registerMutation.mutateAsync({ email, password, displayName, ...extra });
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      deleteAccount: async (password) => {
        await deleteAccountMutation.mutateAsync(password);
      },
      verifyEmail: async (code) => {
        await verifyEmailMutation.mutateAsync(code);
      },
      resendVerification: async () => {
        await resendVerificationMutation.mutateAsync();
      },
      addEmail: async (email) => {
        await addEmailMutation.mutateAsync(email);
      },
      setSubscribed: async (subscribed) => {
        await subscribeMutation.mutateAsync(subscribed);
      },
    }),
    [
      meQuery.data,
      meQuery.isLoading,
      loginMutation,
      registerMutation,
      logoutMutation,
      deleteAccountMutation,
      verifyEmailMutation,
      resendVerificationMutation,
      addEmailMutation,
      subscribeMutation,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
