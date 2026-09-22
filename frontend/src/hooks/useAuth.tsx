import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import { Admin } from '../types';

interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<Admin | null>(() => {
    const stored = localStorage.getItem('padel_admin');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('padel_token')
  );

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('padel_token', data.token);
    localStorage.setItem('padel_admin', JSON.stringify(data.admin));
    setToken(data.token);
    setAdmin(data.admin);
  };

  const logout = () => {
    localStorage.removeItem('padel_token');
    localStorage.removeItem('padel_admin');
    setToken(null);
    setAdmin(null);
  };

  // Vérifier que le token est encore valide au montage
  useEffect(() => {
    if (token) {
      api.get('/auth/me').catch(() => logout());
    }
  }, []);

  return (
    <AuthContext.Provider value={{ admin, token, isAuthenticated: !!token && !!admin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
