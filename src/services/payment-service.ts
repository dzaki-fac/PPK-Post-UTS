/**
 * PPK LabPortal — Layanan Tagihan Denda & Pembayaran (Sprint 4 / Programmer 3).
 * Client HANYA membaca `fines` / `payments` dan memanggil callable `createPayment`.
 * Status pembayaran tidak pernah ditulis dari sini (hanya backend setelah webhook valid).
 */

import { getAuth } from 'firebase/auth';
import {
  Unsubscribe,
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import app, { db } from '@/lib/firebase';
import type { FineDocument, PaymentDocument } from '@/types/finance';

const FINES_COLLECTION = 'fines';
const PAYMENTS_COLLECTION = 'payments';

function getBackendUrl(): string {
  const url = process.env.EXPO_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, '');
  if (!url) {
    throw new Error('URL backend (EXPO_PUBLIC_BACKEND_URL) belum dikonfigurasi.');
  }
  return url;
}

function mapFine(id: string, raw: Record<string, unknown>): FineDocument {
  return {
    id,
    invoiceNumber: String(raw.invoiceNumber ?? id),
    studentId: String(raw.studentId ?? ''),
    studentName: String(raw.studentName ?? 'Praktikan'),
    ...(raw.studentNim ? { studentNim: String(raw.studentNim) } : {}),
    sessionId: String(raw.sessionId ?? ''),
    attendanceId: String(raw.attendanceId ?? id),
    labId: String(raw.labId ?? ''),
    courseId: String(raw.courseId ?? ''),
    praktikum: String(raw.praktikum ?? 'Praktikum'),
    sessionDate: String(raw.sessionDate ?? ''),
    lateMinutes: Number(raw.lateMinutes ?? 0),
    graceMinutes: Number(raw.graceMinutes ?? 0),
    amount: Number(raw.amount ?? 0),
    currency: 'IDR',
    status: raw.status === 'paid' || raw.status === 'pending' ? raw.status : 'unpaid',
    ...(raw.activePaymentId ? { activePaymentId: String(raw.activePaymentId) } : {}),
    paymentAttempts: Number(raw.paymentAttempts ?? 0),
    ...(raw.paidAt ? { paidAt: String(raw.paidAt) } : {}),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

function mapPayment(id: string, raw: Record<string, unknown>): PaymentDocument {
  return {
    id,
    fineId: String(raw.fineId ?? ''),
    invoiceNumber: String(raw.invoiceNumber ?? ''),
    attempt: Number(raw.attempt ?? 1),
    studentId: String(raw.studentId ?? ''),
    sessionId: String(raw.sessionId ?? ''),
    attendanceId: String(raw.attendanceId ?? ''),
    courseId: String(raw.courseId ?? ''),
    labId: String(raw.labId ?? ''),
    praktikum: String(raw.praktikum ?? 'Praktikum'),
    amount: Number(raw.amount ?? 0),
    status: raw.status === 'success' || raw.status === 'failed' ? raw.status : 'pending',
    ...(raw.midtransStatus ? { midtransStatus: String(raw.midtransStatus) } : {}),
    ...(raw.fraudStatus ? { fraudStatus: String(raw.fraudStatus) } : {}),
    ...(raw.paymentType ? { paymentType: String(raw.paymentType) } : {}),
    ...(raw.transactionId ? { transactionId: String(raw.transactionId) } : {}),
    ...(raw.redirectUrl ? { redirectUrl: String(raw.redirectUrl) } : {}),
    expiresAt: String(raw.expiresAt ?? ''),
    ...(raw.settledAt ? { settledAt: String(raw.settledAt) } : {}),
    ...(raw.failureReason ? { failureReason: String(raw.failureReason) } : {}),
    ...(raw.lastWebhookAt ? { lastWebhookAt: String(raw.lastWebhookAt) } : {}),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

function sortNewestFirst<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Listener real-time seluruh tagihan milik praktikan. */
export function subscribeStudentFines(
  studentId: string,
  onData: (fines: FineDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, FINES_COLLECTION), where('studentId', '==', studentId));
  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        sortNewestFirst(
          snapshot.docs.map((item) => mapFine(item.id, item.data() as Record<string, unknown>))
        )
      ),
    (error) => onError?.(error)
  );
}

/** Listener real-time satu tagihan. */
export function subscribeFine(
  fineId: string,
  onData: (fine: FineDocument | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, FINES_COLLECTION, fineId),
    (snapshot) =>
      onData(snapshot.exists() ? mapFine(snapshot.id, snapshot.data() as Record<string, unknown>) : null),
    (error) => onError?.(error)
  );
}

/** Listener real-time seluruh transaksi pembayaran milik praktikan. */
export function subscribeStudentPayments(
  studentId: string,
  onData: (payments: PaymentDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(collection(db, PAYMENTS_COLLECTION), where('studentId', '==', studentId));
  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        sortNewestFirst(
          snapshot.docs.map((item) => mapPayment(item.id, item.data() as Record<string, unknown>))
        )
      ),
    (error) => onError?.(error)
  );
}

/** Listener real-time percobaan pembayaran untuk satu tagihan. */
export function subscribeFinePayments(
  studentId: string,
  fineId: string,
  onData: (payments: PaymentDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('studentId', '==', studentId),
    where('fineId', '==', fineId)
  );
  return onSnapshot(
    q,
    (snapshot) =>
      onData(
        sortNewestFirst(
          snapshot.docs.map((item) => mapPayment(item.id, item.data() as Record<string, unknown>))
        )
      ),
    (error) => onError?.(error)
  );
}

/** Listener real-time satu transaksi (dipakai halaman hasil pembayaran). */
export function subscribePayment(
  paymentId: string,
  onData: (payment: PaymentDocument | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, PAYMENTS_COLLECTION, paymentId),
    (snapshot) =>
      onData(
        snapshot.exists() ? mapPayment(snapshot.id, snapshot.data() as Record<string, unknown>) : null
      ),
    (error) => onError?.(error)
  );
}

/** Membaca ulang status transaksi langsung dari server (mis. saat aplikasi kembali aktif). */
export async function fetchPaymentFromServer(paymentId: string): Promise<PaymentDocument | null> {
  const snapshot = await getDocFromServer(doc(db, PAYMENTS_COLLECTION, paymentId));
  return snapshot.exists()
    ? mapPayment(snapshot.id, snapshot.data() as Record<string, unknown>)
    : null;
}

export interface CreatePaymentResult {
  paymentId: string;
  redirectUrl: string;
}

/** Memanggil backend Express yang membuat transaksi Snap. Hanya mengirim ID tagihan. */
export async function createPaymentSession(fineId: string): Promise<CreatePaymentResult> {
  try {
    const user = getAuth(app).currentUser;
    if (!user) {
      throw new Error('Anda harus masuk untuk membayar tagihan.');
    }
    const idToken = await user.getIdToken();
    const response = await fetch(`${getBackendUrl()}/api/payments/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ fineId }),
    });

    const data = (await response.json().catch(() => ({}))) as Partial<CreatePaymentResult> & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error || 'Pembayaran belum dapat diproses. Silakan coba lagi.');
    }
    if (!data.paymentId || !data.redirectUrl) {
      throw new Error('Respons pembayaran tidak lengkap.');
    }
    return { paymentId: data.paymentId, redirectUrl: data.redirectUrl };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Pembayaran belum dapat diproses. Periksa koneksi internet lalu coba lagi.';
    throw new Error(message);
  }
}

/** Membuka halaman pembayaran Midtrans: tab baru di Web, browser dalam-aplikasi di native. */
export async function openPaymentPage(redirectUrl: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.open(redirectUrl, '_blank', 'noopener,noreferrer');
    }
    return;
  }
  await WebBrowser.openBrowserAsync(redirectUrl);
}
