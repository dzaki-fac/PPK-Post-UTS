import { FieldValue } from 'firebase-admin/firestore';

import { COLLECTIONS, db } from './config';
import {
  MidtransStatusPayload,
  PaymentStatus,
  getTransactionStatus,
  isSignatureValid,
  mapMidtransStatus,
  midtransTimeToIso,
  sha256Hex,
} from './midtrans';
import { sendToUser } from './notify';

function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

interface ApplyResult {
  outcome: 'applied' | 'ignored' | 'not-found';
  notifyStatus?: PaymentStatus;
  studentId?: string;
  fineId?: string;
  praktikum?: string;
  amount?: number;
}

export async function applyPaymentStatus(
  orderId: string,
  truth: MidtransStatusPayload
): Promise<ApplyResult> {
  const mapped = mapMidtransStatus(truth.transaction_status, truth.fraud_status);
  const paymentRef = db.collection(COLLECTIONS.payments).doc(orderId);

  const result = await db.runTransaction(async (tx): Promise<ApplyResult> => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) return { outcome: 'not-found' };
    const payment = paymentSnap.data() ?? {};

    const fineRef = db.collection(COLLECTIONS.fines).doc(String(payment.fineId));
    const fineSnap = await tx.get(fineRef);
    const fine = fineSnap.data();

    const base: ApplyResult = {
      outcome: 'ignored',
      studentId: String(payment.studentId),
      fineId: String(payment.fineId),
      praktikum: String(payment.praktikum ?? ''),
      amount: Number(payment.amount),
    };

    if (mapped === null) return base;

    const current = payment.status as PaymentStatus;
    if (current === 'success') {
      return mapped === 'success' ? { ...base, notifyStatus: 'success' } : base;
    }
    if (mapped === 'pending' && current !== 'pending') return base;

    const nowIso = new Date().toISOString();
    const settledAt =
      mapped === 'success'
        ? (midtransTimeToIso(truth.settlement_time) ?? nowIso)
        : undefined;

    tx.update(paymentRef, {
      status: mapped,
      ...(truth.transaction_status ? { midtransStatus: truth.transaction_status } : {}),
      ...(truth.fraud_status ? { fraudStatus: truth.fraud_status } : {}),
      ...(truth.payment_type ? { paymentType: truth.payment_type } : {}),
      ...(truth.transaction_id ? { transactionId: truth.transaction_id } : {}),
      ...(settledAt ? { settledAt } : {}),
      ...(mapped === 'failed'
        ? { failureReason: truth.status_message || `Status Midtrans: ${truth.transaction_status}` }
        : {}),
      lastWebhookAt: nowIso,
      updatedAt: nowIso,
    });

    if (fine) {
      if (mapped === 'success') {
        tx.update(fineRef, {
          status: 'paid',
          paidAt: settledAt ?? nowIso,
          updatedAt: nowIso,
        });
      } else if (mapped === 'failed' && fine.status !== 'paid') {
        tx.update(fineRef, {
          status: 'unpaid',
          activePaymentId: FieldValue.delete(),
          updatedAt: nowIso,
        });
      }
    }

    const changed = current !== mapped || mapped === 'pending';
    return {
      ...base,
      outcome: 'applied',
      ...(changed ? { notifyStatus: mapped } : {}),
    };
  });

  if (result.notifyStatus && result.studentId && result.fineId) {
    const label = result.praktikum || 'Praktikum';
    const nominal = formatRupiah(result.amount ?? 0);
    if (result.notifyStatus === 'success') {
      await sendToUser(
        result.studentId,
        {
          eventType: 'payment_success',
          title: 'Pembayaran Denda Berhasil',
          body: `Pembayaran denda ${label} sebesar ${nominal} telah terverifikasi lunas.`,
          relatedFineId: result.fineId,
          relatedPaymentId: orderId,
        },
        `payment_success_${orderId}`
      );
    } else if (result.notifyStatus === 'failed') {
      await sendToUser(
        result.studentId,
        {
          eventType: 'payment_failed',
          title: 'Pembayaran Gagal atau Kedaluwarsa',
          body: `Pembayaran denda ${label} tidak berhasil. Anda dapat membuat percobaan pembayaran baru.`,
          relatedFineId: result.fineId,
          relatedPaymentId: orderId,
        },
        `payment_failed_${orderId}`
      );
    } else if (result.notifyStatus === 'pending') {
      await sendToUser(
        result.studentId,
        {
          eventType: 'payment_action_required',
          title: 'Selesaikan Pembayaran Denda',
          body: `Transaksi denda ${label} sebesar ${nominal} masih menunggu penyelesaian.`,
          relatedFineId: result.fineId,
          relatedPaymentId: orderId,
        },
        `payment_action_required_${orderId}`
      );
    }
  }

  return result;
}

export async function processMidtransWebhook(payload: MidtransStatusPayload): Promise<{
  statusCode: number;
  body: Record<string, unknown>;
}> {
  const orderId = String(payload.order_id ?? '');
  const signatureValid = isSignatureValid(payload);

  const eventSeed = `${orderId}|${payload.transaction_status ?? ''}|${payload.status_code ?? ''}|${payload.transaction_time ?? ''}`;
  const eventId = sha256Hex(eventSeed);

  await db
    .collection(COLLECTIONS.paymentEvents)
    .doc(eventId)
    .set(
      {
        id: eventId,
        orderId,
        signatureValid,
        transactionStatus: payload.transaction_status ?? null,
        statusCode: payload.status_code ?? null,
        grossAmount: payload.gross_amount ?? null,
        receivedAt: new Date().toISOString(),
      },
      { merge: true }
    );

  if (!signatureValid) {
    return { statusCode: 403, body: { error: 'Invalid signature' } };
  }
  if (!orderId) {
    return { statusCode: 400, body: { error: 'Missing order_id' } };
  }

  const paymentSnap = await db.collection(COLLECTIONS.payments).doc(orderId).get();
  if (!paymentSnap.exists) {
    return { statusCode: 200, body: { ok: true, ignored: 'unknown-order' } };
  }
  const payment = paymentSnap.data() ?? {};

  const expectedAmount = Math.round(Number(payment.amount));
  const incomingAmount = Math.round(Number(payload.gross_amount ?? 0));
  if (expectedAmount !== incomingAmount) {
    return { statusCode: 400, body: { error: 'Amount mismatch' } };
  }

  const truth = await getTransactionStatus(orderId);
  if (truth.gross_amount && Math.round(Number(truth.gross_amount)) !== expectedAmount) {
    return { statusCode: 400, body: { error: 'Reconciled amount mismatch' } };
  }

  const applied = await applyPaymentStatus(orderId, truth);
  await db.collection(COLLECTIONS.paymentEvents).doc(eventId).set({ processed: true }, { merge: true });

  return { statusCode: 200, body: { ok: true, outcome: applied.outcome } };
}

export async function reconcilePendingPayments(): Promise<number> {
  const nowIso = new Date().toISOString();
  const snap = await db
    .collection(COLLECTIONS.payments)
    .where('status', '==', 'pending')
    .where('expiresAt', '<=', nowIso)
    .limit(25)
    .get();

  let count = 0;
  for (const doc of snap.docs) {
    try {
      const truth = await getTransactionStatus(doc.id);
      if (truth.transaction_status) {
        await applyPaymentStatus(doc.id, truth);
        count++;
      }
    } catch (error) {
      console.warn('Rekonsiliasi gagal untuk', doc.id, error instanceof Error ? error.message : 'unknown');
    }
  }
  return count;
}
