import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * ==============================================================================
 * PPK LabPortal — Firebase SDK Client Initialization
 * ==============================================================================
 * Konfigurasi otomatis membaca variabel lingkungan (.env) dengan prefix EXPO_PUBLIC_.
 * Tidak menyertakan kredensial secara hardcode agar aman saat kolaborasi tim.
 */

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Inisialisasi aplikasi Firebase tunggal (Singleton pattern untuk mencegah inisialisasi ganda)
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inisialisasi Firebase Authentication
export const auth: Auth = getAuth(app);

// Inisialisasi Cloud Firestore Database
export const db: Firestore = getFirestore(app);

export default app;

