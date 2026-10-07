import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Assignment, UserRole } from '../types';
import { api } from '../services/api';
import { loginWithFirebaseAuth, logoutFirebaseAuth } from '../services/firebase';

export interface DemoUserOption {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  description: string;
  token: string;
}

export const DEMO_USERS: DemoUserOption[] = [
  {
    id: 'admin_1',
    name: 'Prof. Sharma',
    email: 'admin@college.edu',
    role: 'admin',
    description: 'Full Access across all Events, Programs, Users & Reports',
    token: 'dev-admin-token',
  },
  {
    id: 'coord_1',
    name: 'Sarah Jenkins',
    email: 'dance.coord@college.edu',
    role: 'coordinator',
    description: 'Coordinator: Assigned strictly to Solo & Contemporary Dance',
    token: 'dev-coord-a-token',
  },
  {
    id: 'coord_2',
    name: 'Alan Turing',
    email: 'quiz.coord@college.edu',
    role: 'coordinator',
    description: 'Coordinator: Assigned strictly to Grand Tech Quiz',
    token: 'dev-coord-b-token',
  },
  {
    id: 'jury_1',
    name: 'Maestro David',
    email: 'dance.judge@college.edu',
    role: 'jury',
    description: 'Jury Member: Assigned strictly to Solo Dance evaluation',
    token: 'dev-jury-a-token',
  },
  {
    id: 'jury_2',
    name: 'Dr. Evelyn Fox',
    email: 'quiz.judge@college.edu',
    role: 'jury',
    description: 'Jury Member: Assigned strictly to Grand Tech Quiz judging',
    token: 'dev-jury-b-token',
  },
];

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
    // Check if matches one of demo users for instant zero-friction experience
    const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      await loginWithToken(matched.token);
      return;
    }

    // Call Firebase Auth to get live ID token
    const token = await loginWithFirebaseAuth(email, pass);
    await loginWithToken(token);
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
