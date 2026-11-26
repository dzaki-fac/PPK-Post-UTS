import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson) as Record<string, unknown>;
    return initializeApp({
      credential: cert(parsed as Parameters<typeof cert>[0]),
      ...(projectId ? { projectId } : {}),
    });
  }

  return initializeApp(projectId ? { projectId } : undefined);
}

const adminApp = initFirebaseAdmin();

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);

export const PORT = Number(process.env.PORT || 8080);

export const MIDTRANS_BASE_URL_SNAP = (
  process.env.MIDTRANS_BASE_URL_SNAP || 'https://app.sandbox.midtrans.com'
).replace(/\/+$/, '');

export const MIDTRANS_BASE_URL_API = (
  process.env.MIDTRANS_BASE_URL_API || 'https://api.sandbox.midtrans.com'
).replace(/\/+$/, '');

export const MIDTRANS_FINISH_REDIRECT_URL =
  process.env.MIDTRANS_FINISH_REDIRECT_URL?.trim() || undefined;

export function getMidtransServerKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY?.trim() || '';
  if (!key || key.includes('REPLACE_WITH_YOUR')) {
    throw new Error('Konfigurasi MIDTRANS_SERVER_KEY pada backend belum diatur.');
  }
  return key;
}

export const DEFAULT_GRACE_MINUTES = 15;
export const DEFAULT_FINE_AMOUNT = 10000;
export const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
export const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
