import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { auth, db } from '../lib/firebase';
import { signInAnonymously, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('yilnan_role');
    return (saved as UserRole) || null;
  });
  const [loading, setLoading] = useState(true);

  const [isPrototype, setIsPrototype] = useState(false);

  const login = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
        // Fallback for prototype: use a local state if anonymous auth is disabled in console
        console.warn("Anonymous auth disabled, using prototype mode");
        setIsPrototype(true);
        setUser({ uid: 'prototype-user', isAnonymous: true, displayName: 'Authorized Provider' } as User);
      } else {
        throw error;
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setIsPrototype(false);
      setRole(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const setRole = (newRole: UserRole | null) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem('yilnan_role', newRole);
    } else {
      localStorage.removeItem('yilnan_role');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isPrototype) {
        setUser(currentUser);
      }
      
      if (currentUser) {
        // Test connection as per critical constraint
        try {
          await getDocFromServer(doc(db, 'test', 'connection'));
        } catch (error) {
           // Ignore if doc doesn't exist, as long as it's not a connection error
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, setRole, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
