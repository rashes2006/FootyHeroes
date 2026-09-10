import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../lib/api';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  isFirebaseConfigured,
} from '../lib/firebase';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  profile_image?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  loginWithFirebaseGoogle: () => Promise<void>;
  loginWithFirebaseEmail: (email: string, password: string) => Promise<void>;
  registerWithFirebaseEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('footyheroes_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.getMe()
        .then(data => setUser(data.user))
        .catch(() => { localStorage.removeItem('footyheroes_token'); setToken(null); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const data = await api.login(email, password);
    localStorage.setItem('footyheroes_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string, role?: string) => {
    const data = await api.register(name, email, password, role);
    localStorage.setItem('footyheroes_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const loginWithFirebaseGoogle = async () => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase credentials not set. Please add VITE_FIREBASE_API_KEY, etc. in client/.env');
    }
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const data = await api.firebaseSync({
      email: fbUser.email || '',
      name: fbUser.displayName || undefined,
      photoURL: fbUser.photoURL || undefined,
      uid: fbUser.uid,
    });
    localStorage.setItem('footyheroes_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const loginWithFirebaseEmail = async (email: string, password: string) => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase credentials not set. Please add VITE_FIREBASE_API_KEY, etc. in client/.env');
    }
    const result = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = result.user;
    const data = await api.firebaseSync({
      email: fbUser.email || email,
      name: fbUser.displayName || undefined,
      photoURL: fbUser.photoURL || undefined,
      uid: fbUser.uid,
    });
    localStorage.setItem('footyheroes_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const registerWithFirebaseEmail = async (email: string, password: string, name: string) => {
    if (!auth || !isFirebaseConfigured) {
      throw new Error('Firebase credentials not set. Please add VITE_FIREBASE_API_KEY, etc. in client/.env');
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = result.user;
    const data = await api.firebaseSync({
      email: fbUser.email || email,
      name: name || fbUser.displayName || undefined,
      photoURL: fbUser.photoURL || undefined,
      uid: fbUser.uid,
    });
    localStorage.setItem('footyheroes_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('footyheroes_token');
    setToken(null);
    setUser(null);
    if (auth && isFirebaseConfigured) {
      try { signOut(auth); } catch { /* ignore */ }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        loginWithFirebaseGoogle,
        loginWithFirebaseEmail,
        registerWithFirebaseEmail,
        logout,
        isLoading,
        isFirebaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
