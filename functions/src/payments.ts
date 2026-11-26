/**
 * Callable `createPayment({ fineId })`: client -> server -> Midtrans Snap.
 * Client hanya mengirim ID tagihan; nominal selalu dibaca dari Firestore.
 */

import { HttpsError, onCall } from 'firebase-functions/v2/https';

import {
  COLLECTIONS,
  MIDTRANS_SERVER_KEY,
  PAYMENT_EXPIRY_HOURS,
  PAYMENT_FINISH_REDIRECT_URL,
  REGION,
  db,
} from './config';
import { createSnapTransaction } from './midtrans';

const GENERIC_ERROR = 'Pembayaran belum dapat diproses. Silakan coba lagi beberapa saat lagi.';

export const createPayment = onCall(
  { region: REGION, secrets: [MIDTRANS_SERVER_KEY] },
  async (request): Promise<{ paymentId: string; redirectUrl: string }> => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Anda harus masuk untuk membayar tagihan.');
    }

    const fineId = typeof request.data?.fineId === 'string' ? request.data.fineId.trim() : '';
    if (!fineId) {
      throw new HttpsError('invalid-argument', 'ID tagihan tidak valid.');
    }

    const fineRef = db.collection(COLLECTIONS.fines).doc(fineId);
    const fineSnap = await fineRef.get();
    if (!fineSnap.exists) {
      throw new HttpsError('not-found', 'Tagihan tidak ditemukan.');
    }
    const fine = fineSnap.data() ?? {};

    if (fine.studentId !== uid) {
      throw new HttpsError('permission-denied', 'Tagihan ini bukan milik Anda.');
    }
    if (fine.status !== 'unpaid' && fine.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Tagihan ini sudah lunas.');
    }

    // Pakai ulang percobaan pending yang belum kedaluwarsa agar tidak ada transaksi ganda.
    if (fine.status === 'pending' && typeof fine.activePaymentId === 'string') {
      const activeSnap = await db.collection(COLLECTIONS.payments).doc(fine.activePaymentId).get();
      const active = activeSnap.data();
      if (
        active &&
        active.status === 'pending' &&
        typeof active.redirectUrl === 'string' &&
        typeof active.expiresAt === 'string' &&
        new Date(active.expiresAt).getTime() > Date.now()
      ) {
        return { paymentId: activeSnap.id, redirectUrl: active.redirectUrl };
      }
    }

    const previousAttempts = Number(fine.paymentAttempts ?? 0);
    const attempt = previousAttempts + 1;
    const orderId = `${String(fine.invoiceNumber)}-${attempt}`;
    if (orderId.length > 50) {
      throw new HttpsError('internal', GENERIC_ERROR);
    }

    const amount = Math.round(Number(fine.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpsError('failed-precondition', 'Nominal tagihan tidak valid.');
    }

    let snap: { token: string; redirectUrl: string };
    try {
      snap = await createSnapTransaction({
        orderId,
        grossAmount: amount,
        itemId: fineId,
        itemName: `Denda Terlambat ${String(fine.praktikum ?? 'Praktikum')}`,
        customerName: String(fine.studentName ?? 'Praktikan'),
        customerEmail: request.auth?.token?.email,
        expiryHours: PAYMENT_EXPIRY_HOURS,
        finishUrl: PAYMENT_FINISH_REDIRECT_URL.value() || undefined,
      });
    } catch (error) {
      console.error('Pembuatan transaksi Snap gagal:', error instanceof Error ? error.message : 'unknown');
      throw new HttpsError('internal', GENERIC_ERROR);
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    try {
      await db.runTransaction(async (tx) => {
        const freshFine = await tx.get(fineRef);
        const data = freshFine.data();
        if (
          !data ||
          data.studentId !== uid ||
          (data.status !== 'unpaid' && data.status !== 'pending') ||
          Number(data.paymentAttempts ?? 0) !== previousAttempts
        ) {
          throw new HttpsError('aborted', 'Status tagihan berubah. Silakan coba lagi.');
        }

        tx.create(db.collection(COLLECTIONS.payments).doc(orderId), {
          id: orderId,
          fineId,
          invoiceNumber: String(fine.invoiceNumber),
          attempt,
          studentId: uid,
          sessionId: String(fine.sessionId),
          attendanceId: String(fine.attendanceId),
          courseId: String(fine.courseId ?? ''),
          labId: String(fine.labId ?? ''),
          praktikum: String(fine.praktikum ?? ''),
          amount,
          status: 'pending',
          snapToken: snap.token,
          redirectUrl: snap.redirectUrl,
          expiresAt,
          createdAt: nowIso,
          updatedAt: nowIso,
        });

        tx.update(fineRef, {
          status: 'pending',
          activePaymentId: orderId,
          paymentAttempts: attempt,
          updatedAt: nowIso,
        });
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error('Penyimpanan percobaan pembayaran gagal:', error instanceof Error ? error.message : 'unknown');
      throw new HttpsError('internal', GENERIC_ERROR);
    }

    return { paymentId: orderId, redirectUrl: snap.redirectUrl };
  }
);
