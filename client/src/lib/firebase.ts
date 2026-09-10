import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAJE0qHWLjMxx4G-hVTarAxcasuFWV-KYM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "football-scoretracker.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "football-scoretracker",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "football-scoretracker.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "351315799863",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:351315799863:web:0e301a9ac5d09fc025b4b2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8KF6J0T90T",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(app);
  } catch (err) {
    console.warn('Failed to initialize Firebase:', err);
  }
}

export const auth = authInstance;
export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
};
