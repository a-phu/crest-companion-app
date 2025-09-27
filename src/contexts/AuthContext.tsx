import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// Stub types for Firebase User
type User = {
  uid: string;
  email?: string | null;
  isAnonymous?: boolean;
} | null;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  ensureAnonymous: () => Promise<void>;
  linkEmailPassword: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user] = useState<User>({ uid: 'demo-user', isAnonymous: true });
  const [loading] = useState(false);

  // Stub functions - Firebase auth disabled for now
  const ensureAnonymous = async () => {
    console.log('Auth stub: ensureAnonymous called');
  };

  const linkEmailPassword = async (email: string, password: string) => {
    console.log('Auth stub: linkEmailPassword called', { email });
  };

  const createAccount = async (email: string, password: string) => {
    console.log('Auth stub: createAccount called', { email });
  };

  const signIn = async (email: string, password: string) => {
    console.log('Auth stub: signIn called', { email });
  };

  const signOut = async () => {
    console.log('Auth stub: signOut called');
  };

  return (
    <AuthContext.Provider value={{ user, loading, ensureAnonymous, linkEmailPassword, signIn, signOut, createAccount }}>
      {children}
    </AuthContext.Provider>
  );
};
