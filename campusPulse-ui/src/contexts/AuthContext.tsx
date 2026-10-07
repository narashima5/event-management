import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Assignment, UserRole } from '../types';
import { api } from '../services/api';
import { loginWithFirebaseAuth, logoutFirebaseAuth } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  assignments: Assignment[];
  loading: boolean;
  loginWithToken: (token: string) => Promise<void>;
  loginWithCredentials: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      setAssignments([]);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getCurrentProfile();
      setUser(data.user);
      setAssignments(data.assignments || []);
    } catch (err) {
      console.warn('Failed to load user profile:', err);
      localStorage.removeItem('auth_token');
      setUser(null);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const loginWithToken = async (token: string) => {
    setLoading(true);
    localStorage.setItem('auth_token', token);
    await fetchProfile();
  };

  const loginWithCredentials = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const token = await loginWithFirebaseAuth(email, pass);
      await loginWithToken(token);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    logoutFirebaseAuth().catch(() => {});
    localStorage.removeItem('auth_token');
    setUser(null);
    setAssignments([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        assignments,
        loading,
        loginWithToken,
        loginWithCredentials,
        logout,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
