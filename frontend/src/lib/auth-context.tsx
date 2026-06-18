import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('patchops_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('patchops_token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authApi.me()
        .then((r) => {
          setUser(r.data);
          localStorage.setItem('patchops_user', JSON.stringify(r.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const r = await authApi.login(email, password);
    const { access_token } = r.data;
    setToken(access_token);
    localStorage.setItem('patchops_token', access_token);
    const meRes = await authApi.me();
    setUser(meRes.data);
    localStorage.setItem('patchops_user', JSON.stringify(meRes.data));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('patchops_token');
    localStorage.removeItem('patchops_user');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAdmin: user?.role === 'admin', loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
