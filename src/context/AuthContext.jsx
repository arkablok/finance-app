import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth as authApi, getToken, getUser, clearToken } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());
  const [token, setTokenState] = useState(getToken());
  const [initializing, setInitializing] = useState(true);

  // Saat mount: kalau ada token, verifikasi ke server (auth.me)
  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!getToken()) {
        setInitializing(false);
        return;
      }
      const r = await authApi.me();
      if (cancelled) return;
      if (r.ok && r.data) {
        setUser(r.data);
      } else {
        clearToken();
        setUser(null);
        setTokenState('');
      }
      setInitializing(false);
    }
    verify();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await authApi.login({ email, password });
    if (r.ok) {
      setUser({ user_id: r.data.user_id, nama: r.data.nama, email: r.data.email });
      setTokenState(r.data.token);
    }
    return r;
  }, []);

  const register = useCallback(async (nama, email, password) => {
    const r = await authApi.register({ nama, email, password });
    if (r.ok) {
      setUser({ user_id: r.data.user_id, nama: r.data.nama, email: r.data.email });
      setTokenState(r.data.token);
    }
    return r;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setTokenState('');
  }, []);

  const value = {
    user,
    token,
    initializing,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}