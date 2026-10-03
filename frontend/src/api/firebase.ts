/**
 * Firebase Client SDK — FinFlow AI
 *
 * Initialises the Firebase app once and exports typed handles.
 * Environment variables are injected by Vite at build time.
 * Falls back to safe defaults so the app runs in demo mode without a .env file.
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from 'firebase/auth';
import { getFirestore, Firestore, doc, setDoc, getDoc } from 'firebase/firestore';

// ── Firebase Configuration ──────────────────────────────────────────────────
// Place your project config in frontend/.env as VITE_FIREBASE_* variables.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'demo-api-key',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         || 'finflow-ai-demo.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          || 'finflow-ai-demo',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      || 'finflow-ai-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              || '',
};

// Prevent duplicate initialisation (hot-reload safe)
const app: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const firebaseAuth: Auth = getAuth(app);
export const firestoreDb: Firestore = getFirestore(app);

// Use auth emulator if VITE_FIREBASE_USE_EMULATOR=true
if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
  const emulatorHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || 'http://127.0.0.1:9099';
  connectAuthEmulator(firebaseAuth, emulatorHost, { disableWarnings: true });
}

// Persist session across browser tabs / page reloads
setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {});

// Re-export Firebase Auth & Firestore helpers so callers don't import firebase directly
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
  doc,
  setDoc,
  getDoc,
};

export default app;
