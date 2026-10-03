/**
 * Firebase Client SDK — FinFlow AI
 *
 * Initialises the Firebase app once and exports typed handles.
 * Environment variables are injected by Vite at build time.
 * Configured for project: finflow-ray
 */
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
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
export const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyAT3oDaHzC-Q6kQxUc1abfcUCKo-1rz9s0',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN         || 'finflow-ray.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID          || 'finflow-ray',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET      || 'finflow-ray.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '584333363655',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              || '1:584333363655:web:c72686d13fe961d00fb1e2',
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID      || 'G-054455ESXC',
};

// Prevent duplicate initialisation (hot-reload safe)
export const app: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const firebaseAuth: Auth = getAuth(app);
export const firestoreDb: Firestore = getFirestore(app);

// Safe Analytics initialization (only in browser environment if supported)
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

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
  getAnalytics,
};

export default app;
