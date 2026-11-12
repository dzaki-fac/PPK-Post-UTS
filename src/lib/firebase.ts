import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { Platform } from 'react-native';

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

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '451443064627-5tgabgh2hienk8i6thm3tuh14qhs0dk6.apps.googleusercontent.com';

export function isFirebaseConfigured(): boolean {
  const apiKey = firebaseConfig.apiKey?.trim();
  const projectId = firebaseConfig.projectId?.trim();
  const appId = firebaseConfig.appId?.trim();

  if (!apiKey || !projectId || !appId) {
    return false;
  }

  return (
    !apiKey.includes('ExampleKey') &&
    !projectId.includes('your-') &&
    !appId.includes('abcdef123456')
  );
}

// Inisialisasi aplikasi Firebase tunggal (Singleton pattern untuk mencegah inisialisasi ganda)
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inisialisasi Firebase Authentication (di Web otomatis persistensi lokal via IndexedDB)
export const auth: Auth = getAuth(app);

// Inisialisasi Cloud Firestore dengan dukungan cache offline pada Web
function createFirestoreInstance(firebaseApp: FirebaseApp): Firestore {
  if (Platform.OS === 'web') {
    try {
      return initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      return getFirestore(firebaseApp);
    }
  }
  return getFirestore(firebaseApp);
}

export const db: Firestore = createFirestoreInstance(app);

export default app;
