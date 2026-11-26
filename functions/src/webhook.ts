import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { adminDb } from './config.js';
import { getTransactionStatus, verifyMidtransSignature } from './midtrans.js';
import { applyReconciledMidtransStatus } from './payments.js';

/**
 * Menangani HTTP Notification (webhook) dari Midtrans Sandbox:
 * 1. Hanya menerima POST dengan payload wajib.
 * 2. Memverifikasi signature SHA-512 timing-safe (salah -> 403, tanpa ubah data).
 * 3. Idempoten melalui koleksi /payment_events/{eventId}.
 * 4. Mencocokkan nominal dan merekonsiliasi melalui Midtrans Status API.
 */
export async function handleMidtransWebhook(
  req: Request,
  res: Response
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const orderId = String(body.order_id ?? '').trim();
  const statusCode = String(body.status_code ?? '').trim();
  const grossAmount = String(body.gross_amount ?? '').trim();
  const signatureKey = String(body.signature_key ?? '').trim();
  const transactionStatus = String(body.transaction_status ?? '').trim();
  const transactionTime = String(body.transaction_time ?? '').trim();

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    res.status(400).json({ error: 'Payload notifikasi tidak lengkap.' });
    return;
  }

  const eventId = crypto
    .createHash('sha256')
    .update(`${orderId}|${transactionStatus}|${statusCode}|${transactionTime}`)
    .digest('hex');
  const receivedAt = new Date().toISOString();

  let signatureValid = false;
  try {
    signatureValid = verifyMidtransSignature({
      orderId,
      statusCode,
      grossAmount,
      signatureKey,
    });
  } catch {
    res.status(500).json({ error: 'Konfigurasi verifikasi backend belum siap.' });
    return;
  }

  if (!signatureValid) {
    await adminDb
      .collection('payment_events')
      .doc(`invalid_${eventId}_${Date.now()}`)
      .set({
        orderId,
        signatureValid: false,
        transactionStatus,
        statusCode,
        grossAmount,
        processed: false,
        receivedAt,
      })
      .catch(() => {});

    res.status(403).json({ error: 'Signature webhook tidak valid.' });
    return;
  }

  // Cek idempotensi webhook duplikat
  const eventSnap = await adminDb.collection('payment_events').doc(eventId).get();
  if (eventSnap.exists && eventSnap.data()?.processed === true) {
    res.status(200).json({ ok: true, duplicate: true });
    return;
  }

  // Pastikan dokumen transaksi ada & nominal cocok
  const paySnap = await adminDb.collection('payments').doc(orderId).get();
  if (!paySnap.exists) {
    res.status(404).json({ error: 'Transaksi pembayaran tidak ditemukan.' });
    return;
  }

  const payData = paySnap.data() as Record<string, unknown>;
  const expectedAmount = Math.round(Number(payData.amount ?? 0));
  const receivedAmount = Math.round(Number(grossAmount));
  if (!Number.isFinite(receivedAmount) || receivedAmount !== expectedAmount) {
    res.status(400).json({ error: 'Nominal gross_amount tidak sesuai dengan tagihan.' });
    return;
  }

  // Rekonsiliasi otoritatif ke Midtrans Status API (tidak mempercayai isi webhook mentah saja)
  try {
    const authoritativeStatus = await getTransactionStatus(orderId);
    await applyReconciledMidtransStatus({
      orderId,
      midtrans: authoritativeStatus,
      eventId,
      eventRecord: {
        id: eventId,
        orderId,
        signatureValid: true,
        transactionStatus: authoritativeStatus.transaction_status ?? transactionStatus,
        statusCode: authoritativeStatus.status_code ?? statusCode,
        grossAmount: authoritativeStatus.gross_amount ?? grossAmount,
        receivedAt,
      },
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.warn(
      '[webhook] Gagal memproses webhook Midtrans:',
      err instanceof Error ? err.message : err
    );
    res.status(500).json({ error: 'Gagal memverifikasi transaksi pembayaran.' });
  }
}
