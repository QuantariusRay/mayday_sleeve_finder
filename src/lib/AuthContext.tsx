import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSession,
  isCurrentUserAdmin,
  signIn as supabaseSignIn,
  signOut as supabaseSignOut,
} from './auth';
import { isSupabaseConfigured } from './supabase';

const MOCK_ADMIN_KEY = 'mayday.mockAdmin';

type AuthContextValue = {
  loading: boolean;
  email: string | null;
  isAdmin: boolean;
  /** True when signed in via local demo admin (no Supabase). */
  isMockAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Offline demo: unlocks local shelf-layout edits stored on device. */
  enableMockAdmin: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMockAdmin, setIsMockAdmin] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        const mock = (await AsyncStorage.getItem(MOCK_ADMIN_KEY)) === '1';
        setIsMockAdmin(mock);
        setIsAdmin(mock);
        setEmail(mock ? 'demo@local' : null);
        return;
      }
      setIsMockAdmin(false);
      const session = await getSession();
      if (!session?.user) {
        setEmail(null);
        setIsAdmin(false);
        return;
      }
      setEmail(session.user.email ?? null);
      setIsAdmin(await isCurrentUserAdmin());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (userEmail: string, password: string) => {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase is not configured. Use Demo admin for local layout edits.');
      }
      await supabaseSignIn(userEmail, password);
      await refresh();
    },
    [refresh],
  );

  const enableMockAdmin = useCallback(async () => {
    await AsyncStorage.setItem(MOCK_ADMIN_KEY, '1');
    setIsMockAdmin(true);
    setIsAdmin(true);
    setEmail('demo@local');
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabaseSignOut();
    }
    await AsyncStorage.removeItem(MOCK_ADMIN_KEY);
    setIsMockAdmin(false);
    setIsAdmin(false);
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({
      loading,
      email,
      isAdmin,
      isMockAdmin,
      signIn,
      enableMockAdmin,
      signOut,
      refresh,
    }),
    [loading, email, isAdmin, isMockAdmin, signIn, enableMockAdmin, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
