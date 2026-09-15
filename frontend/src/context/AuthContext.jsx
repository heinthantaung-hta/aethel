import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('aethel_token'));
  const [loading, setLoading] = useState(true);

  // On mount, verify existing token
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await api.getMe(token);
        setUser(userData);
      } catch {
        // Token is invalid or expired
        localStorage.removeItem('aethel_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    verifyToken();
  }, [token]);

  // Login — may return requiresVerification or requires2FA
  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });

    // If email not verified, return signal
    if (data.requiresVerification) {
      return { requiresVerification: true, email: data.email, devCode: data.devCode };
    }

    // If 2FA is enabled, return temp token
    if (data.requires2FA) {
      return { requires2FA: true, tempToken: data.tempToken };
    }

    // Normal login
    localStorage.setItem('aethel_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // Verify 2FA code during login
  const verify2FA = useCallback(async (tempToken, code) => {
    const data = await api.verify2FA({ tempToken, code });
    localStorage.setItem('aethel_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // Signup — always returns requiresVerification
  const signup = useCallback(async (email, username, password) => {
    const data = await api.signup({ email, username, password });

    if (data.requiresVerification) {
      return { requiresVerification: true, email: data.email, devCode: data.devCode };
    }

    // Fallback for immediate token (shouldn't happen with new flow)
    if (data.token) {
      localStorage.setItem('aethel_token', data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  }, []);

  // Verify email code
  const verifyEmail = useCallback(async (email, code) => {
    const data = await api.verifyEmail({ email, code });
    localStorage.setItem('aethel_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  // Resend email code
  const resendCode = useCallback(async (email) => {
    return await api.resendCode({ email });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('aethel_token');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateUser,
    verifyEmail,
    resendCode,
    verify2FA,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
