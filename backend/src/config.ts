import 'dotenv/config';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initFirebaseAdmin() {
  if (getApps().length > 0) return;

  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    const parsed = JSON.parse(rawJson) as ServiceAccount;
    initializeApp({ credential: cert(parsed) });
    return;
  }

  // Fallback: GOOGLE_APPLICATION_CREDENTIALS atau Application Default Credentials
  initializeApp();
}

initFirebaseAdmin();

export const db = getFirestore();
export const adminAuth = getAuth();

export function getMidtransServerKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim();
  if (!key) {
    throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi di environment.');
  }
  return key;
}

export const MIDTRANS_BASE_URL_SNAP =
  process.env.MIDTRANS_BASE_URL_SNAP?.trim() || 'https://app.sandbox.midtrans.com';

export const MIDTRANS_BASE_URL_API =
  process.env.MIDTRANS_BASE_URL_API?.trim() || 'https://api.sandbox.midtrans.com';

export const PAYMENT_FINISH_REDIRECT_URL =
  process.env.PAYMENT_FINISH_REDIRECT_URL?.trim() || '';

export const COLLECTIONS = {
  attendances: 'attendances',
  sessions: 'sessions',
  labs: 'labs',
  users: 'users',
  fines: 'fines',
  payments: 'payments',
  paymentEvents: 'payment_events',
  notifications: 'notifications',
} as const;

export const DEFAULT_GRACE_MINUTES = 15;
export const DEFAULT_FINE_AMOUNT = 10000;
export const PAYMENT_EXPIRY_HOURS = 24;
