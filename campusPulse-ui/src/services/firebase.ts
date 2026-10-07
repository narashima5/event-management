import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  Auth,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';

// Web client Firebase configuration (publicly safe, no secret admin keys)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemo-CollegeEventsKey',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'campus-pulse.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'campus-pulse',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'campus-pulse.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let isConfigured = false;

try {
  if (
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  ) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    isConfigured = true;
  }
} catch (err) {
  console.warn('Firebase Client SDK initialization notice:', err);
}

export { auth, isConfigured };

/**
 * Sign in with email and password via Firebase Authentication
 * Returns the Firebase ID token for the backend to verify
 */
export async function loginWithFirebaseAuth(email: string, pass: string): Promise<string> {
  if (auth && isConfigured) {
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    const idToken = await credential.user.getIdToken();
    return idToken;
  }
  // In dev/demo mode without live GCP project credentials
  return `dev-user:${Date.now()}:admin:${email}:${encodeURIComponent(email.split('@')[0])}`;
}

/**
 * Send password reset email via Firebase Authentication
 */
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  if (auth && isConfigured) {
    await sendPasswordResetEmail(auth, email);
    return;
  }
  // Simulated success in development mode
  console.log(`[Dev Mode] Password reset email simulated for: ${email}`);
}

/**
 * Sign out of Firebase Authentication
 */
export async function logoutFirebaseAuth(): Promise<void> {
  if (auth && isConfigured) {
    await signOut(auth);
  }
}

/**
 * Listen to Firebase Auth state changes
 */
export function onFirebaseAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  if (auth && isConfigured) {
    return onAuthStateChanged(auth, callback);
  }
  return () => {};
}
