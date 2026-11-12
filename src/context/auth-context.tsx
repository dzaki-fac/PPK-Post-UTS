import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

import { GOOGLE_WEB_CLIENT_ID, auth, db, isFirebaseConfigured } from '@/lib/firebase';
import { UserDocument, UserRole } from '@/types/praktikum';

if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
}

export type { UserDocument, UserRole };

export interface GoogleLoginResult {
  user: User;
  userDoc: UserDocument | null;
  isNewUser: boolean;
}

interface AuthContextType {
  user: User | null;
  userDoc: UserDocument | null;
  loading: boolean;
  role: UserRole | null;
  needsProfileCompletion: boolean;
  login: (email: string, password: string) => Promise<UserDocument | null>;
  register: (
    email: string,
    password: string,
    nama: string,
    peran: UserRole,
    nim?: string,
    kelas?: 'A' | 'B',
    peranLab?: string
  ) => Promise<UserDocument>;
  loginWithGoogle: () => Promise<GoogleLoginResult>;
  completeGoogleProfile: (
    nama: string,
    peran: UserRole,
    nim?: string,
    kelas?: 'A' | 'B',
    peranLab?: string
  ) => Promise<UserDocument>;
  logout: () => Promise<void>;
  refreshUserDoc: () => Promise<UserDocument | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NIM_REGEX = /^\d{14}$/;

function mapFirebaseAuthError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.';
    case 'auth/invalid-email':
      return 'Format alamat email tidak valid.';
    case 'auth/email-already-in-use':
      return 'Alamat email ini sudah terdaftar. Silakan masuk menggunakan akun tersebut.';
    case 'auth/weak-password':
      return 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan masuk. Tunggu beberapa saat sebelum mencoba lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi internet terputus. Periksa jaringan Anda lalu coba lagi.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Proses masuk dengan Google dibatalkan.';
    case 'auth/popup-blocked':
      return 'Popup Google diblokir oleh browser. Izinkan popup untuk situs ini.';
    case 'auth/operation-not-allowed':
      return 'Metode autentikasi ini belum diaktifkan di Firebase Console.';
    case 'auth/invalid-api-key':
    case 'auth/configuration-not-found':
      return 'Konfigurasi Firebase (.env) belum valid atau belum diisi.';
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }
      return 'Terjadi kesalahan pada proses autentikasi. Silakan coba lagi.';
  }
}

function validateProfileFields(
  nama: string,
  peran: UserRole,
  nim?: string,
  kelas?: 'A' | 'B'
): { cleanNama: string; cleanNim?: string; cleanKelas?: 'A' | 'B' } {
  const cleanNama = nama.trim();
  if (cleanNama.length < 2) {
    throw new Error('Nama lengkap wajib diisi minimal 2 karakter.');
  }

  if (peran === 'praktikan') {
    const cleanNim = (nim ?? '').replace(/\s+/g, '');
    if (!NIM_REGEX.test(cleanNim)) {
      throw new Error('NIM praktikan wajib berisi 14 digit angka (contoh: 24060122130001).');
    }
    if (kelas !== 'A' && kelas !== 'B') {
      throw new Error('Silakan pilih kelas praktikum (Kelas A atau Kelas B).');
    }
    return { cleanNama, cleanNim, cleanKelas: kelas };
  }

  return { cleanNama };
}

function buildUserDocument(
  uid: string,
  email: string,
  nama: string,
  peran: UserRole,
  nim?: string,
  kelas?: 'A' | 'B',
  peranLab?: string
): UserDocument {
  const now = new Date().toISOString();
  const base: UserDocument = {
    uid,
    email: email.trim().toLowerCase(),
    nama: nama.trim(),
    peran,
    createdAt: now,
    updatedAt: now,
  };

  if (peran === 'praktikan') {
    base.nim = nim;
    base.kelas = kelas;
  } else {
    base.peranLab = peranLab?.trim() || 'Pengampu Lab Komputasi';
  }

  return base;
}

const CACHED_USER_DOC_KEY = '@ppk_labportal_user_doc';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState<boolean>(false);

  const persistUserDoc = useCallback((docData: UserDocument | null) => {
    setUserDoc(docData);
    if (docData) {
      AsyncStorage.setItem(CACHED_USER_DOC_KEY, JSON.stringify(docData)).catch(() => {});
    } else {
      AsyncStorage.removeItem(CACHED_USER_DOC_KEY).catch(() => {});
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Muat profil dari AsyncStorage untuk pemulihan instan saat cold start aplikasi
    AsyncStorage.getItem(CACHED_USER_DOC_KEY)
      .then((raw) => {
        if (raw && isMounted) {
          try {
            const parsed = JSON.parse(raw) as UserDocument;
            setUserDoc((prev) => prev || parsed);
          } catch {}
        }
      })
      .catch(() => {});

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setUser(firebaseUser);

      if (!firebaseUser) {
        persistUserDoc(null);
        setNeedsProfileCompletion(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const userRef = doc(db, 'users', firebaseUser.uid);

      unsubscribeProfile = onSnapshot(
        userRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserDocument;
            persistUserDoc({ ...data, uid: snap.id });
            setNeedsProfileCompletion(false);
          } else {
            persistUserDoc(null);
            setNeedsProfileCompletion(true);
          }
          setLoading(false);
        },
        () => {
          // Pertahankan userDoc yang sudah tercache jika terjadi gangguan jaringan sementara
          setLoading(false);
        }
      );
    });

    return () => {
      isMounted = false;
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      unsubscribeAuth();
    };
  }, [persistUserDoc]);

  const refreshUserDoc = useCallback(async (): Promise<UserDocument | null> => {
    const current = auth.currentUser;
    if (!current) {
      persistUserDoc(null);
      setNeedsProfileCompletion(false);
      return null;
    }
    const snap = await getDoc(doc(db, 'users', current.uid));
    if (snap.exists()) {
      const data = { ...(snap.data() as UserDocument), uid: snap.id };
      persistUserDoc(data);
      setNeedsProfileCompletion(false);
      return data;
    }
    persistUserDoc(null);
    setNeedsProfileCompletion(true);
    return null;
  }, [persistUserDoc]);

  const login = useCallback(async (email: string, password: string): Promise<UserDocument | null> => {
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Konfigurasi Firebase belum diisi di berkas .env. Salin .env.example menjadi .env dan lengkapi kredensial project.'
      );
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      throw new Error('Email dan kata sandi wajib diisi.');
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const snap = await getDoc(doc(db, 'users', credential.user.uid));
      if (snap.exists()) {
        const data = { ...(snap.data() as UserDocument), uid: snap.id };
        persistUserDoc(data);
        setNeedsProfileCompletion(false);
        return data;
      }
      persistUserDoc(null);
      setNeedsProfileCompletion(true);
      return null;
    } catch (error) {
      throw new Error(mapFirebaseAuthError(error));
    }
  }, [persistUserDoc]);

  const register = useCallback(
    async (
      email: string,
      password: string,
      nama: string,
      peran: UserRole,
      nim?: string,
      kelas?: 'A' | 'B',
      peranLab?: string
    ): Promise<UserDocument> => {
      if (!isFirebaseConfigured()) {
        throw new Error(
          'Konfigurasi Firebase belum diisi di berkas .env. Salin .env.example menjadi .env dan lengkapi kredensial project.'
        );
      }

      const cleanEmail = email.trim();
      if (!cleanEmail) {
        throw new Error('Alamat email wajib diisi.');
      }
      if (password.length < 6) {
        throw new Error('Kata sandi wajib minimal 6 karakter.');
      }

      const { cleanNama, cleanNim, cleanKelas } = validateProfileFields(nama, peran, nim, kelas);

      try {
        const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        try {
          await updateProfile(credential.user, { displayName: cleanNama });
        } catch {
          // Non-fatal if displayName update fails
        }

        const profile = buildUserDocument(
          credential.user.uid,
          credential.user.email ?? cleanEmail,
          cleanNama,
          peran,
          cleanNim,
          cleanKelas,
          peranLab
        );

        await setDoc(doc(db, 'users', credential.user.uid), profile);
        persistUserDoc(profile);
        setNeedsProfileCompletion(false);
        return profile;
      } catch (error) {
        throw new Error(mapFirebaseAuthError(error));
      }
    },
    [persistUserDoc]
  );

  const loginWithGoogle = useCallback(async (): Promise<GoogleLoginResult> => {
    if (!isFirebaseConfigured()) {
      throw new Error(
        'Konfigurasi Firebase belum diisi di berkas .env. Salin .env.example menjadi .env dan lengkapi kredensial project.'
      );
    }

    try {
      let firebaseUser: User;

      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const credential = await signInWithPopup(auth, provider);
        firebaseUser = credential.user;
      } else {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        if (signInResult.type === 'cancelled') {
          throw new Error('Proses masuk dengan Akun Google dibatalkan.');
        }
        const idToken = signInResult.data?.idToken;
        if (!idToken) {
          throw new Error('Gagal mendapatkan ID token dari Akun Google.');
        }
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        firebaseUser = userCredential.user;
      }

      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (snap.exists()) {
        const data = { ...(snap.data() as UserDocument), uid: snap.id };
        persistUserDoc(data);
        setNeedsProfileCompletion(false);
        return { user: firebaseUser, userDoc: data, isNewUser: false };
      }

      persistUserDoc(null);
      setNeedsProfileCompletion(true);
      return { user: firebaseUser, userDoc: null, isNewUser: true };
    } catch (error: any) {
      if (
        error?.code === statusCodes.SIGN_IN_CANCELLED ||
        error?.message?.includes('dibatalkan')
      ) {
        throw new Error('Proses masuk dengan Akun Google dibatalkan.');
      }
      if (error?.code === statusCodes.IN_PROGRESS) {
        throw new Error('Proses masuk dengan Akun Google sedang berjalan.');
      }
      if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Layanan Google Play Services tidak tersedia pada perangkat.');
      }
      if (error?.code === '10' || error?.message?.includes('DEVELOPER_ERROR')) {
        throw new Error(
          'Konfigurasi SHA-1 belum terdaftar di Firebase Console (SHA-1: 58:3A:22:E2:5F:01:A3:82:E1:87:F2:8F:FB:F4:62:24:91:0F:7D:B2).'
        );
      }
      throw new Error(mapFirebaseAuthError(error));
    }
  }, [persistUserDoc]);

  const completeGoogleProfile = useCallback(
    async (
      nama: string,
      peran: UserRole,
      nim?: string,
      kelas?: 'A' | 'B',
      peranLab?: string
    ): Promise<UserDocument> => {
      const current = auth.currentUser;
      if (!current) {
        throw new Error('Sesi autentikasi tidak ditemukan. Silakan masuk ulang.');
      }

      const { cleanNama, cleanNim, cleanKelas } = validateProfileFields(nama, peran, nim, kelas);

      try {
        if (current.displayName !== cleanNama) {
          try {
            await updateProfile(current, { displayName: cleanNama });
          } catch {
            // Non-fatal
          }
        }

        const profile = buildUserDocument(
          current.uid,
          current.email ?? '',
          cleanNama,
          peran,
          cleanNim,
          cleanKelas,
          peranLab
        );

        await setDoc(doc(db, 'users', current.uid), profile);
        persistUserDoc(profile);
        setNeedsProfileCompletion(false);
        return profile;
      } catch (error) {
        throw new Error(mapFirebaseAuthError(error));
      }
    },
    [persistUserDoc]
  );

  const logout = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        try {
          await GoogleSignin.signOut();
        } catch {
          // Abaikan bila sebelumnya tidak masuk via Google Sign-In
        }
      }
      await signOut(auth);
      setUser(null);
      persistUserDoc(null);
      setNeedsProfileCompletion(false);
    } catch (error) {
      throw new Error(mapFirebaseAuthError(error));
    }
  }, [persistUserDoc]);

  const role: UserRole | null = userDoc?.peran ?? null;

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      userDoc,
      loading,
      role,
      needsProfileCompletion,
      login,
      register,
      loginWithGoogle,
      completeGoogleProfile,
      logout,
      refreshUserDoc,
    }),
    [
      user,
      userDoc,
      loading,
      role,
      needsProfileCompletion,
      login,
      register,
      loginWithGoogle,
      completeGoogleProfile,
      logout,
      refreshUserDoc,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return context;
}

