import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ecoroute_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('ecoroute_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // ── Sync user and token to storage ──────────────────────────────────────────
  const setAuthSession = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    if (newToken) {
      localStorage.setItem('ecoroute_token', newToken);
    } else {
      localStorage.removeItem('ecoroute_token');
    }
    if (newUser) {
      localStorage.setItem('ecoroute_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('ecoroute_user');
    }
  }, []);

  // ── Check session validity on startup ───────────────────────────────────────
  useEffect(() => {
    const verifyToken = async () => {
      const savedToken = localStorage.getItem('ecoroute_token');
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await getMe();
        if (res.data?.success && res.data?.data) {
          const freshUser = res.data.data;
          setUser(freshUser);
          localStorage.setItem('ecoroute_user', JSON.stringify(freshUser));
        }
      } catch (err) {
        console.warn('Session expired or invalid, logging out:', err.message);
        setAuthSession(null, null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [setAuthSession]);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    setAuthSession(receivedToken, receivedUser);
    return receivedUser;
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const register = async (userData) => {
    const res = await registerUser(userData);
    const { token: receivedToken, user: receivedUser } = res.data.data;
    setAuthSession(receivedToken, receivedUser);
    return receivedUser;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setAuthSession(null, null);
  }, [setAuthSession]);

  // ── Refresh user profile (e.g. after status or assignment change) ──────────
  const refreshUser = async () => {
    try {
      const res = await getMe();
      if (res.data?.success && res.data?.data) {
        const freshUser = res.data.data;
        setUser(freshUser);
        localStorage.setItem('ecoroute_user', JSON.stringify(freshUser));
        return freshUser;
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
    return null;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    role: user?.role || null,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
