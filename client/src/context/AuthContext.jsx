import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cc_user') || 'null');
    } catch {
      localStorage.removeItem('cc_user');
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('cc_token'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('cc_token')));

  const saveSession = useCallback((session) => {
    localStorage.setItem('cc_token', session.token);
    localStorage.setItem('cc_user', JSON.stringify(session.user));
    setToken(session.token);
    setUser(session.user);
  }, []);

  const loadUser = useCallback(async () => {
    const storedToken = localStorage.getItem('cc_token');
    if (!storedToken) {
      setLoading(false);
      setToken(null);
      setUser(null);
      return;
    }

    setLoading(true);
    try {
      const response = await authService.getMe();
      const currentUser = response.data.user;
      localStorage.setItem('cc_user', JSON.stringify(currentUser));
      setToken(storedToken);
      setUser(currentUser);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        localStorage.removeItem('cc_token');
        localStorage.removeItem('cc_user');
        setToken(null);
        setUser(null);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('cc_token')) {
      loadUser().catch((error) => {
        if (error.status !== 401 && error.status !== 403) {
          console.error('Unable to restore the saved login session:', error.message);
        }
      });
    }
  }, [loadUser]);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    saveSession(response.data);
    return response;
  }, [saveSession]);

  const register = useCallback(async (details) => {
    const response = await authService.register(details);
    if (response.data?.token && response.data?.user) {
      saveSession(response.data);
    }
    return response;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user');
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles) => Boolean(user && roles.includes(user.role)), [user]);
  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    register,
    logout,
    loadUser,
    hasRole,
  }), [user, token, loading, login, register, logout, loadUser, hasRole]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
