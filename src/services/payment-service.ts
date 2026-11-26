import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Unsubscribe,
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';

import { DEFAULT_FINE_AMOUNT, DEFAULT_GRACE_MINUTES } from '@/constants/praktikum-config';
import { auth, db } from '@/lib/firebase';
import { FineDocument, PaymentDocument } from '@/types/praktikum';

const FINES_COLLECTION = 'fines';
const PAYMENTS_COLLECTION = 'payments';

const getFinesCacheKey = (uid: string) => `@ppk_labportal_fines_${uid}`;
const getPaymentsCacheKey = (uid: string) => `@ppk_labportal_payments_${uid}`;

function getPaymentApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_PAYMENT_API_URL?.trim() || '';
  return raw.replace(/\/+$/, '');
}

async function getFirebaseIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sesi autentikasi tidak ditemukan. Silakan masuk ulang.');
  }
  return user.getIdToken();
}

function mapFineSnapshot(id: string, raw: Record<string, unknown>): FineDocument {
  const statusRaw = raw.status;
  const status = statusRaw === 'paid' || statusRaw === 'pending' ? statusRaw : 'unpaid';

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
    praktikum: String(raw.praktikum ?? 'Praktikum PPK'),
    sessionDate: String(raw.sessionDate ?? ''),
    lateMinutes: Number(raw.lateMinutes ?? 0),
    graceMinutes: Number(raw.graceMinutes ?? DEFAULT_GRACE_MINUTES),
    amount: Number(raw.amount ?? DEFAULT_FINE_AMOUNT),
    currency: 'IDR',
    status,
    ...(raw.activePaymentId ? { activePaymentId: String(raw.activePaymentId) } : {}),
    paymentAttempts: Number(raw.paymentAttempts ?? 0),
    ...(raw.paidAt ? { paidAt: String(raw.paidAt) } : {}),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

function mapPaymentSnapshot(id: string, raw: Record<string, unknown>): PaymentDocument {
  const statusRaw = raw.status;
  const status = statusRaw === 'success' || statusRaw === 'failed' ? statusRaw : 'pending';

  return {
    id,
    fineId: String(raw.fineId ?? ''),
    invoiceNumber: String(raw.invoiceNumber ?? id),
    attempt: Number(raw.attempt ?? 1),
    studentId: String(raw.studentId ?? ''),
    sessionId: String(raw.sessionId ?? ''),
    attendanceId: String(raw.attendanceId ?? ''),
    courseId: String(raw.courseId ?? ''),
    labId: String(raw.labId ?? ''),
    praktikum: String(raw.praktikum ?? 'Praktikum PPK'),
    amount: Number(raw.amount ?? 0),
    status,
    ...(raw.midtransStatus ? { midtransStatus: String(raw.midtransStatus) } : {}),
    ...(raw.fraudStatus ? { fraudStatus: String(raw.fraudStatus) } : {}),
    ...(raw.paymentType ? { paymentType: String(raw.paymentType) } : {}),
    ...(raw.transactionId ? { transactionId: String(raw.transactionId) } : {}),
    snapToken: String(raw.snapToken ?? ''),
    redirectUrl: String(raw.redirectUrl ?? ''),
    expiresAt: String(raw.expiresAt ?? ''),
    ...(raw.settledAt ? { settledAt: String(raw.settledAt) } : {}),
    ...(raw.failureReason ? { failureReason: String(raw.failureReason) } : {}),
    ...(raw.lastWebhookAt ? { lastWebhookAt: String(raw.lastWebhookAt) } : {}),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  };
}

/**
 * Listener real-time tagihan denda milik praktikan dengan cache AsyncStorage per-UID
 * agar tetap terbaca setelah aplikasi ditutup & dibuka kembali atau saat offline.
 */
export function subscribeStudentFines(
  studentId: string,
  onData: (fines: FineDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!studentId) {
    onData([]);
    return () => {};
  }

  let active = true;

  AsyncStorage.getItem(getFinesCacheKey(studentId))
    .then((raw) => {
      if (raw && active) {
        try {
          const parsed = JSON.parse(raw) as FineDocument[];
          if (Array.isArray(parsed)) {
            onData(parsed);
          }
        } catch {}
      }
    })
    .catch(() => {});

  const q = query(
    collection(db, FINES_COLLECTION),
    where('studentId', '==', studentId)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => mapFineSnapshot(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      AsyncStorage.setItem(getFinesCacheKey(studentId), JSON.stringify(items)).catch(
        () => {}
      );
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );

  return () => {
    active = false;
    unsub();
  };
}

export function subscribeFineById(
  fineId: string,
  onData: (fine: FineDocument | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!fineId) {
    onData(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, FINES_COLLECTION, fineId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(mapFineSnapshot(snap.id, snap.data() as Record<string, unknown>));
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

/**
 * Listener real-time riwayat transaksi pembayaran milik praktikan dengan cache AsyncStorage.
 */
export function subscribeStudentPayments(
  studentId: string,
  onData: (payments: PaymentDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!studentId) {
    onData([]);
    return () => {};
  }

  let active = true;

  AsyncStorage.getItem(getPaymentsCacheKey(studentId))
    .then((raw) => {
      if (raw && active) {
        try {
          const parsed = JSON.parse(raw) as PaymentDocument[];
          if (Array.isArray(parsed)) {
            onData(parsed);
          }
        } catch {}
      }
    })
    .catch(() => {});

  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('studentId', '==', studentId)
  );

  const unsub = onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => mapPaymentSnapshot(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      AsyncStorage.setItem(getPaymentsCacheKey(studentId), JSON.stringify(items)).catch(
        () => {}
      );
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );

  return () => {
    active = false;
    unsub();
  };
}

export function subscribePaymentsByFineId(
  fineId: string,
  onData: (payments: PaymentDocument[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const uid = auth.currentUser?.uid;
  if (!fineId || !uid) {
    onData([]);
    return () => {};
  }

  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('fineId', '==', fineId),
    where('studentId', '==', uid)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => mapPaymentSnapshot(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.attempt - a.attempt);
      onData(items);
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export function subscribePaymentById(
  paymentId: string,
  onData: (payment: PaymentDocument | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (!paymentId) {
    onData(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, PAYMENTS_COLLECTION, paymentId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(mapPaymentSnapshot(snap.id, snap.data() as Record<string, unknown>));
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export interface CreatePaymentResponse {
  paymentId: string;
  redirectUrl: string;
  reused?: boolean;
}

/**
 * Meminta backend membuat transaksi Midtrans Snap Sandbox (client hanya mengirim fineId).
 */
export async function createPaymentTransaction(
  fineId: string
): Promise<CreatePaymentResponse> {
  const baseUrl = getPaymentApiBaseUrl();
  if (!baseUrl) {
    throw new Error(
      'URL backend pembayaran (EXPO_PUBLIC_PAYMENT_API_URL) belum dikonfigurasi di .env.'
    );
  }

  const token = await getFirebaseIdToken();
  const res = await fetch(`${baseUrl}/api/payments/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fineId }),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    paymentId?: string;
    redirectUrl?: string;
    reused?: boolean;
    error?: string;
  };

  if (!res.ok || !payload.paymentId || !payload.redirectUrl) {
    throw new Error(
      payload.error || 'Gagal membuat transaksi pembayaran melalui server.'
    );
  }

  return {
    paymentId: payload.paymentId,
    redirectUrl: payload.redirectUrl,
    reused: payload.reused,
  };
}

/**
 * Memicu rekonsiliasi status transaksi melalui Status API Midtrans di backend.
 */
export async function reconcilePaymentStatus(paymentId: string): Promise<void> {
  const baseUrl = getPaymentApiBaseUrl();
  if (!baseUrl || !paymentId) return;

  try {
    const token = await getFirebaseIdToken();
    await fetch(`${baseUrl}/api/payments/reconcile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentId }),
    });
  } catch {
    // Non-blocking: listener Firestore tetap menjadi sumber kebenaran UI
  }
}

/**
 * Memicu evaluasi keterlambatan otoritatif di backend segera setelah presensi ditulis.
 */
export async function requestServerLatenessEvaluation(
  attendanceId: string
): Promise<void> {
  const baseUrl = getPaymentApiBaseUrl();
  if (!baseUrl || !attendanceId) return;

  try {
    const token = await getFirebaseIdToken();
    await fetch(`${baseUrl}/api/attendances/evaluate-lateness`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ attendanceId }),
    });
  } catch {
    // Non-blocking: watcher backend tetap dapat mengevaluasi dokumen secara otomatis
  }
}
