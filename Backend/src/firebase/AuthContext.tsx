import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  User,
} from 'firebase/auth';
import { auth } from '../firebase/config';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const ensureAnonymous = async () => {
    // If there's already a signed-in user, do nothing. Otherwise sign in anonymously.
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  };

  const linkEmailPassword = async (email: string, password: string) => {
    if (!auth.currentUser) throw new Error('No current user to link');
    if (!auth.currentUser.isAnonymous) throw new Error('Current user is already persistent');
    const credential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(auth.currentUser, credential);
  };

  const createAccount = async (email: string, password: string) => {
    // Create a persistent account; you may choose to link instead if an
    // anonymous user exists. This function creates a new email/password user.
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, ensureAnonymous, linkEmailPassword, signIn, signOut, createAccount }}>
      {children}
    </AuthContext.Provider>
  );
};
