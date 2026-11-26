/**
 * Webhook Midtrans (HTTP Notification) + rekonsiliasi terjadwal.
 *
 * Aturan mutlak: status `success`/`paid` hanya ditetapkan di sini, setelah:
 *  1. signature valid (sha512, timing-safe),
 *  2. nominal cocok dengan tagihan di Firestore,
 *  3. rekonsiliasi lewat Status API (kebenaran akhir, bukan isi webhook mentah).
 */

import { FieldValue } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { COLLECTIONS, MIDTRANS_SERVER_KEY, REGION, db } from './config';
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

/**
 * Menerapkan status Midtrans (hasil Status API) ke `payments` dan `fines` secara transaksional.
 * - `success` bersifat final.
 * - `pending` tidak boleh menimpa `success`/`failed`.
 * - Tidak pernah menulis ke `attendances` (pembayaran tidak mengubah status kehadiran).
 */
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
      midtransStatus: truth.transaction_status ?? FieldValue.delete(),
      ...(truth.fraud_status ? { fraudStatus: truth.fraud_status } : {}),
      ...(truth.payment_type ? { paymentType: truth.payment_type } : {}),
      ...(truth.transaction_id ? { transactionId: truth.transaction_id } : {}),
      ...(settledAt ? { settledAt } : {}),
      ...(mapped === 'failed'
        ? { failureReason: truth.status_message ?? truth.transaction_status ?? 'failed' }
        : {}),
      lastWebhookAt: nowIso,
      updatedAt: nowIso,
    });

    if (fine) {
      if (mapped === 'success' && fine.status !== 'paid') {
        tx.update(fineRef, { status: 'paid', paidAt: settledAt, updatedAt: nowIso });
      } else if (
        mapped === 'failed' &&
        fine.status !== 'paid' &&
        fine.activePaymentId === orderId
      ) {
        tx.update(fineRef, {
          status: 'unpaid',
          activePaymentId: FieldValue.delete(),
          updatedAt: nowIso,
        });
      }
    }

    return { ...base, outcome: 'applied', notifyStatus: mapped };
  });

  if (result.outcome !== 'not-found' && result.notifyStatus && result.studentId) {
    await notifyPaymentStatus(orderId, result);
  }
  return result;
}

async function notifyPaymentStatus(orderId: string, result: ApplyResult): Promise<void> {
  if (!result.studentId || !result.notifyStatus) return;
  const praktikum = result.praktikum || 'Praktikum';
  const nominal = formatRupiah(result.amount ?? 0);
  const common = { relatedFineId: result.fineId, relatedPaymentId: orderId };

  if (result.notifyStatus === 'success') {
    await sendToUser(
      result.studentId,
      {
        ...common,
        eventType: 'payment_success',
        title: 'Pembayaran Denda Berhasil',
        body: `${praktikum}: pembayaran denda ${nominal} telah diterima. Status kehadiran tidak berubah.`,
      },
      `payment_success_${orderId}`
    );
  } else if (result.notifyStatus === 'failed') {
    await sendToUser(
      result.studentId,
      {
        ...common,
        eventType: 'payment_failed',
        title: 'Pembayaran Denda Gagal',
        body: `${praktikum}: pembayaran denda ${nominal} gagal atau kedaluwarsa. Anda dapat membayar ulang.`,
      },
      `payment_failed_${orderId}`
    );
  } else {
    await sendToUser(
      result.studentId,
      {
        ...common,
        eventType: 'payment_action_required',
        title: 'Pembayaran Menunggu Penyelesaian',
        body: `${praktikum}: selesaikan pembayaran denda ${nominal} sebelum batas waktu transaksi berakhir.`,
      },
      `payment_action_required_${orderId}`
    );
  }
}

async function recordEvent(
  eventId: string,
  payload: MidtransStatusPayload,
  signatureValid: boolean,
  processed: boolean
): Promise<void> {
  try {
    await db
      .collection(COLLECTIONS.paymentEvents)
      .doc(eventId)
      .set(
        {
          id: eventId,
          orderId: String(payload.order_id ?? ''),
          signatureValid,
          ...(payload.transaction_status ? { transactionStatus: payload.transaction_status } : {}),
          ...(payload.status_code ? { statusCode: payload.status_code } : {}),
          ...(payload.gross_amount ? { grossAmount: payload.gross_amount } : {}),
          processed,
          receivedAt: new Date().toISOString(),
        },
        { merge: true }
      );
  } catch (error) {
    console.warn('Gagal mencatat payment_events:', error instanceof Error ? error.message : error);
  }
}

export const midtransWebhook = onRequest(
  { region: REGION, secrets: [MIDTRANS_SERVER_KEY], invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, message: 'Method not allowed' });
      return;
    }

    const payload = (req.body ?? {}) as MidtransStatusPayload;
    if (!payload.order_id || !payload.status_code || !payload.gross_amount) {
      res.status(400).json({ ok: false, message: 'Payload tidak valid' });
      return;
    }

    const eventSeed = `${payload.order_id}|${payload.transaction_status ?? ''}|${payload.status_code}|${payload.transaction_time ?? ''}`;

    if (!isSignatureValid(payload)) {
      await recordEvent(sha256Hex(`${eventSeed}|invalid|${payload.signature_key ?? ''}`), payload, false, false);
      res.status(403).json({ ok: false, message: 'Signature tidak valid' });
      return;
    }

    const orderId = payload.order_id;
    const eventId = sha256Hex(eventSeed);

    try {
      const eventSnap = await db.collection(COLLECTIONS.paymentEvents).doc(eventId).get();
      if (eventSnap.exists && eventSnap.data()?.processed === true) {
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }

      const paymentSnap = await db.collection(COLLECTIONS.payments).doc(orderId).get();
      if (!paymentSnap.exists) {
        await recordEvent(eventId, payload, true, false);
        res.status(404).json({ ok: false, message: 'Transaksi tidak dikenal' });
        return;
      }
      const expectedAmount = Number(paymentSnap.data()?.amount);

      if (Number(payload.gross_amount) !== expectedAmount) {
        await recordEvent(eventId, payload, true, false);
        res.status(400).json({ ok: false, message: 'Nominal tidak cocok' });
        return;
      }

      const truth = await getTransactionStatus(orderId);
      if (
        (truth.order_id && truth.order_id !== orderId) ||
        (truth.gross_amount && Number(truth.gross_amount) !== expectedAmount)
      ) {
        await recordEvent(eventId, payload, true, false);
        res.status(400).json({ ok: false, message: 'Rekonsiliasi tidak cocok' });
        return;
      }

      await applyPaymentStatus(orderId, truth);
      await recordEvent(eventId, payload, true, true);
      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Webhook gagal diproses:', error instanceof Error ? error.message : 'unknown');
      res.status(500).json({ ok: false, message: 'Gagal memproses notifikasi' });
    }
  }
);

/** Jaring pengaman bila webhook terlewat: periksa transaksi pending yang melewati expiresAt. */
export const reconcilePendingPayments = onSchedule(
  { schedule: 'every 15 minutes', region: REGION, secrets: [MIDTRANS_SERVER_KEY] },
  async () => {
    const nowIso = new Date().toISOString();
    const stale = await db
      .collection(COLLECTIONS.payments)
      .where('status', '==', 'pending')
      .where('expiresAt', '<', nowIso)
      .limit(100)
      .get();

    for (const doc of stale.docs) {
      try {
        const truth = await getTransactionStatus(doc.id);
        // Transaksi tidak pernah dibuat di Midtrans (404) dan sudah lewat batas = kedaluwarsa.
        const effective: MidtransStatusPayload =
          truth.status_code === '404' || !truth.transaction_status
            ? { transaction_status: 'expire', status_message: 'expired' }
            : truth;
        await applyPaymentStatus(doc.id, effective);
      } catch (error) {
        console.warn(`Rekonsiliasi ${doc.id} dilewati:`, error instanceof Error ? error.message : error);
      }
    }
  }
);
