import { createContext, useContext, useMemo, useState } from 'react';
import { adminApi } from '../services/api.js';

const STORAGE_KEY = 'tierra-mate-admin-session';
const AuthContext = createContext(null);

function readSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return value?.token && value?.admin ? value : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const value = useMemo(() => ({
    session,
    async login(credentials) {
      const { data } = await adminApi.login(credentials);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSession(data);
    },
    logout() {
      sessionStorage.removeItem(STORAGE_KEY);
      setSession(null);
    },
  }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return value;
}
