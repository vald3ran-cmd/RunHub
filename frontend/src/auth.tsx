import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setAuthToken, getAuthToken } from './api';

type User = {
  user_id: string;
  email: string;
  name: string;
  level: string;
  tier?: string;
  tier_expires_at?: string | null;
  is_premium: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const token = await getAuthToken();
    if (!token) { setUser(null); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      await setAuthToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => { await refresh(); setLoading(false); })();
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    await setAuthToken(data.token);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const { data } = await api.post('/auth/register', { email, password, name });
    await setAuthToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await setAuthToken(null);
    setUser(null);
    try { await api.post('/auth/logout'); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
