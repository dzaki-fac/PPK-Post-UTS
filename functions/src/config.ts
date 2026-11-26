/**
 * PPK LabPortal — Konfigurasi Cloud Functions (Sprint 4 / Programmer 3).
 *
 * Satu-satunya tempat kunci rahasia Midtrans dideklarasikan adalah sebagai
 * Firebase secret (`firebase functions:secrets:set MIDTRANS_SERVER_KEY`).
 * Nilainya tidak pernah ada di kode, repositori, bundel aplikasi, maupun log.
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';

export const REGION = 'asia-southeast2';

if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();

/** Secret server key Midtrans Sandbox (hanya dibaca di runtime Functions). */
export const MIDTRANS_SERVER_KEY = defineSecret('MIDTRANS_SERVER_KEY');

/** Parameter non-rahasia: dapat diganti lewat `functions/.env` tanpa menyimpan rahasia. */
export const MIDTRANS_BASE_URL_SNAP = defineString('MIDTRANS_BASE_URL_SNAP', {
  default: 'https://app.sandbox.midtrans.com',
});

export const MIDTRANS_BASE_URL_API = defineString('MIDTRANS_BASE_URL_API', {
  default: 'https://api.sandbox.midtrans.com',
});

/** URL pengembalian opsional setelah pembayaran (tidak dipakai sebagai penentu status). */
export const PAYMENT_FINISH_REDIRECT_URL = defineString('PAYMENT_FINISH_REDIRECT_URL', {
  default: '',
});

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
